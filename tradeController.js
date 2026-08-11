const { Trade, Offer, User, TradeMessage, sequelize } = require('../models');

/**
 * Открыть сделку по объявлению.
 * Крипта продавца замораживается в эскроу (переносится в разряд "locked")
 * до подтверждения оплаты.
 */
exports.openTrade = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { offerId, amountCrypto } = req.body;
    const offer = await Offer.findByPk(offerId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!offer || offer.status !== 'active') {
      await t.rollback();
      return res.status(404).json({ error: 'Объявление недоступно' });
    }
    if (offer.userId === req.userId) {
      await t.rollback();
      return res.status(400).json({ error: 'Нельзя открыть сделку по своему объявлению' });
    }
    const amount = Number(amountCrypto);
    if (amount < Number(offer.minAmount) || amount > Number(offer.maxAmount) || amount > Number(offer.availableAmount)) {
      await t.rollback();
      return res.status(400).json({ error: 'Сумма вне допустимого диапазона объявления' });
    }

    const sellerId = offer.type === 'sell' ? offer.userId : req.userId;
    const buyerId = offer.type === 'sell' ? req.userId : offer.userId;

    const seller = await User.findByPk(sellerId, { transaction: t, lock: t.LOCK.UPDATE });
    const free = Number(seller.balance) - Number(seller.balanceLocked);

    // Если объявление типа sell — сумма уже была заблокирована при создании объявления,
    // здесь просто проверяем, что залоченного средства хватает под конкретную сделку.
    if (offer.type === 'sell' && Number(seller.balanceLocked) < amount) {
      await t.rollback();
      return res.status(400).json({ error: 'У продавца недостаточно средств в эскроу' });
    }
    // Если объявление типа buy (мы продаём инициатору) — блокируем средства сейчас.
    if (offer.type === 'buy') {
      if (free < amount) {
        await t.rollback();
        return res.status(400).json({ error: 'Недостаточно свободного баланса' });
      }
      seller.balanceLocked = Number(seller.balanceLocked) + amount;
      await seller.save({ transaction: t });
    }

    offer.availableAmount = Number(offer.availableAmount) - amount;
    if (Number(offer.availableAmount) <= 0) offer.status = 'closed';
    await offer.save({ transaction: t });

    const amountFiat = (amount * Number(offer.price)).toFixed(2);

    const trade = await Trade.create({
      offerId: offer.id,
      sellerId,
      buyerId,
      amountCrypto: amount,
      amountFiat,
      status: 'pending_payment'
    }, { transaction: t });

    await t.commit();
    return res.status(201).json(trade);
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Ошибка открытия сделки' });
  }
};

// Покупатель отмечает "я оплатил фиатом"
exports.markPaid = async (req, res) => {
  const trade = await Trade.findByPk(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Сделка не найдена' });
  if (trade.buyerId !== req.userId) return res.status(403).json({ error: 'Только покупатель может отметить оплату' });
  if (trade.status !== 'pending_payment') return res.status(400).json({ error: 'Неверный статус сделки' });

  trade.status = 'paid';
  await trade.save();
  return res.json(trade);
};

// Продавец подтверждает получение оплаты -> эскроу освобождает крипту покупателю
exports.releaseTrade = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const trade = await Trade.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!trade) { await t.rollback(); return res.status(404).json({ error: 'Сделка не найдена' }); }
    if (trade.sellerId !== req.userId) { await t.rollback(); return res.status(403).json({ error: 'Только продавец может подтвердить сделку' }); }
    if (!['paid', 'disputed'].includes(trade.status)) { await t.rollback(); return res.status(400).json({ error: 'Неверный статус сделки' }); }

    const seller = await User.findByPk(trade.sellerId, { transaction: t, lock: t.LOCK.UPDATE });
    const buyer = await User.findByPk(trade.buyerId, { transaction: t, lock: t.LOCK.UPDATE });

    const amount = Number(trade.amountCrypto);
    seller.balance = Number(seller.balance) - amount;
    seller.balanceLocked = Number(seller.balanceLocked) - amount;
    buyer.balance = Number(buyer.balance) + amount;

    await seller.save({ transaction: t });
    await buyer.save({ transaction: t });

    trade.status = 'completed';
    await trade.save({ transaction: t });

    await t.commit();
    return res.json(trade);
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Ошибка подтверждения сделки' });
  }
};

// Любая сторона открывает спор
exports.disputeTrade = async (req, res) => {
  const trade = await Trade.findByPk(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Сделка не найдена' });
  if (![trade.sellerId, trade.buyerId].includes(req.userId)) {
    return res.status(403).json({ error: 'Вы не участник этой сделки' });
  }
  if (!['pending_payment', 'paid'].includes(trade.status)) {
    return res.status(400).json({ error: 'Спор нельзя открыть на этом этапе' });
  }
  trade.status = 'disputed';
  trade.disputeReason = req.body.reason || null;
  await trade.save();
  return res.json(trade);
};

// Отмена сделки (только пока не оплачена) — средства возвращаются продавцу
exports.cancelTrade = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const trade = await Trade.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!trade) { await t.rollback(); return res.status(404).json({ error: 'Сделка не найдена' }); }
    if (![trade.sellerId, trade.buyerId].includes(req.userId)) {
      await t.rollback();
      return res.status(403).json({ error: 'Вы не участник этой сделки' });
    }
    if (trade.status !== 'pending_payment') {
      await t.rollback();
      return res.status(400).json({ error: 'Отменить можно только сделку без отметки оплаты' });
    }

    const seller = await User.findByPk(trade.sellerId, { transaction: t, lock: t.LOCK.UPDATE });
    seller.balanceLocked = Math.max(0, Number(seller.balanceLocked) - Number(trade.amountCrypto));
    await seller.save({ transaction: t });

    trade.status = 'cancelled';
    await trade.save({ transaction: t });

    await t.commit();
    return res.json(trade);
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Ошибка отмены сделки' });
  }
};

// Админ решает спор в пользу покупателя или продавца
exports.resolveDispute = async (req, res) => {
  const { winner } = req.body; // 'buyer' | 'seller'
  const t = await sequelize.transaction();
  try {
    const trade = await Trade.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!trade || trade.status !== 'disputed') {
      await t.rollback();
      return res.status(400).json({ error: 'Нет активного спора по этой сделке' });
    }
    const seller = await User.findByPk(trade.sellerId, { transaction: t, lock: t.LOCK.UPDATE });
    const buyer = await User.findByPk(trade.buyerId, { transaction: t, lock: t.LOCK.UPDATE });
    const amount = Number(trade.amountCrypto);

    if (winner === 'buyer') {
      seller.balance = Number(seller.balance) - amount;
      seller.balanceLocked = Number(seller.balanceLocked) - amount;
      buyer.balance = Number(buyer.balance) + amount;
      trade.status = 'completed';
    } else {
      seller.balanceLocked = Number(seller.balanceLocked) - amount;
      trade.status = 'cancelled';
    }

    await seller.save({ transaction: t });
    await buyer.save({ transaction: t });
    await trade.save({ transaction: t });

    await t.commit();
    return res.json(trade);
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Ошибка разрешения спора' });
  }
};

exports.getTrade = async (req, res) => {
  const trade = await Trade.findByPk(req.params.id, {
    include: [
      { model: TradeMessage },
      { model: Offer }
    ]
  });
  if (!trade) return res.status(404).json({ error: 'Сделка не найдена' });
  if (![trade.sellerId, trade.buyerId].includes(req.userId) && !req.isAdmin) {
    return res.status(403).json({ error: 'Нет доступа к этой сделке' });
  }
  return res.json(trade);
};

exports.myTrades = async (req, res) => {
  const { Op } = require('sequelize');
  const trades = await Trade.findAll({
    where: { [Op.or]: [{ sellerId: req.userId }, { buyerId: req.userId }] },
    order: [['createdAt', 'DESC']]
  });
  return res.json(trades);
};

exports.sendMessage = async (req, res) => {
  const trade = await Trade.findByPk(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Сделка не найдена' });
  if (![trade.sellerId, trade.buyerId].includes(req.userId)) {
    return res.status(403).json({ error: 'Нет доступа к этой сделке' });
  }
  const msg = await TradeMessage.create({
    tradeId: trade.id,
    senderId: req.userId,
    message: req.body.message
  });
  return res.status(201).json(msg);
};
