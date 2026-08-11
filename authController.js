const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Wallet } = require('../models');
const { generateWallet } = require('../utils/wallet');

function signToken(user) {
  return jwt.sign(
    { userId: user.id, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Заполните email, username и password' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Пароль должен быть не короче 8 символов' });
    }

    const existing = await User.findOne({
      where: { [require('sequelize').Op.or]: [{ email }, { username }] }
    });
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким email или username уже существует' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, username, passwordHash });

    // Автоматически создаём криптокошелёк для нового пользователя
    const generated = generateWallet();
    const wallet = await Wallet.create({
      userId: user.id,
      address: generated.address,
      encryptedPrivateKey: generated.encryptedPrivateKey,
      mnemonicEncrypted: generated.mnemonicEncrypted
    });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, username: user.username },
      wallet: { address: wallet.address, network: wallet.network }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Ошибка регистрации' });
  }
};

exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Укажите логин и пароль' });
    }

    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: { [Op.or]: [{ email: emailOrUsername }, { username: emailOrUsername }] }
    });
    if (!user) {
      return res.status(401).json({ error: 'Неверные учётные данные' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверные учётные данные' });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, balance: user.balance }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Ошибка входа' });
  }
};

exports.me = async (req, res) => {
  const user = await User.findByPk(req.userId, {
    attributes: ['id', 'email', 'username', 'balance', 'balanceLocked', 'createdAt']
  });
  const wallets = await Wallet.findAll({
    where: { userId: req.userId },
    attributes: ['address', 'network', 'createdAt']
  });
  return res.json({ user, wallets });
};
