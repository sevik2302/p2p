require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const offerRoutes = require('./routes/offers');
const tradeRoutes = require('./routes/trades');

const app = express();

app.use(cors());
app.use(express.json());

// Базовая защита от перебора на роутах авторизации
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/trades', tradeRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Фронтенд (статика)
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    // В деве/на старте создаёт таблицы, если их ещё нет.
    // Для продакшна лучше перейти на настоящие миграции (sequelize-cli).
    await sequelize.sync();
    app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
  } catch (err) {
    console.error('Не удалось подключиться к базе данных:', err);
    process.exit(1);
  }
}

start();
