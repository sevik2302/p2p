const { Offer, User } = require('../models');

exports.createOffer = async (req, res) => {
  try {
    const { type, asset, fiatCurrency, price, minAmount, maxAmount, availableAmount, paymentMethod, terms } = req.body;

    if (!type || !price || !minAmount || !maxAmount || !availableAmount || !paymentMethod) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    if (!['buy', 'sell'].includes(type)) {
      return res.status(400).json({ error: 'type должен быть buy или sell' });
    }

    // Если это объявление на продажу — блокируем нужную сумму крипты у продавца сразу,
    // чтобы нельзя было выставить объявление на то, чего у тебя нет.
    if (type === 'sell') {
      const user = await User.findByPk(req.userId);
      const free = Number(user.balance) - Number(user.balanceLocked);
      if (free < Number(availableAmount)) {
        return res.status(400).json({ error: 'Недостаточно свободного баланса для этого объявления' });
      }
      user.balanceLocked = Number(user.balanceLocked) + Number(availableAmount);
      await user.save();
    }

    const offer = await Offer.create({
      userId: req.userId,
      type, asset: asset || 'USDT', fiatCurrency: fiatCurrency || 'RUB',
      price, minAmount, maxAmount, availableAmount, paymentMethod, terms
    });

    return res.status(201).json(offer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Ошибка создания объявления' });
  }
};

exports.listOffers = async (req, res) => {
  const { type, asset, fiatCurrency } = req.query;
  const where = { status: 'active' };
  if (type) where.type = type;
  if (asset) where.asset = asset;
  if (fiatCurrency) where.fiatCurrency = fiatCurrency;

  const offers = await Offer.findAll({
    where,
    include: [{ model: User, attributes: ['id', 'username'] }],
    order: [['price', 'ASC']]
  });
  return res.json(offers);
};

exports.getOffer = async (req, res) => {
  const offer = await Offer.findByPk(req.params.id, {
    include: [{ model: User, attributes: ['id', 'username'] }]
  });
  if (!offer) return res.status(404).json({ error: 'Объявление не найдено' });
  return res.json(offer);
};

exports.closeOffer = async (req, res) => {
  const offer = await Offer.findByPk(req.params.id);
  if (!offer) return res.status(404).json({ error: 'Объявление не найдено' });
  if (offer.userId !== req.userId) return res.status(403).json({ error: 'Не ваше объявление' });

  if (offer.type === 'sell') {
    const user = await User.findByPk(req.userId);
    user.balanceLocked = Math.max(0, Number(user.balanceLocked) - Number(offer.availableAmount));
    await user.save();
  }

  offer.status = 'closed';
  await offer.save();
  return res.json({ ok: true });
};
