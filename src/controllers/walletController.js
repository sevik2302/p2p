const { User, Wallet } = require('../models');

exports.getMyWallet = async (req, res) => {
  const wallet = await Wallet.findOne({ where: { userId: req.userId } });
  const user = await User.findByPk(req.userId);
  if (!wallet) return res.status(404).json({ error: 'Кошелёк не найден' });
  return res.json({
    address: wallet.address,
    network: wallet.network,
    internalBalance: user.balance,
    lockedInEscrow: user.balanceLocked
  });
};

/**
 * ВНИМАНИЕ: это демонстрационный/ручной эндпоинт для тестового пополнения
 * внутреннего баланса (например, администратором после проверки реального
 * ончейн-депозита). В проде депозиты должны детектироваться автоматически
 * через слушатель блокчейна / провайдера (Alchemy, Infura webhooks и т.п.),
 * а не через этот эндпоинт с произвольного клиента.
 */
exports.adminCredit = async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Укажите userId и положительный amount' });
  }
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  user.balance = Number(user.balance) + Number(amount);
  await user.save();
  return res.json({ ok: true, newBalance: user.balance });
};
