# NEXORA — P2P Криптобиржа (MVP)

Полностью рабочий бэкенд + фронтенд для P2P-обмена крипты на фиат:
регистрация/логин (JWT), у каждого пользователя автоматически создаётся
реальный криптокошелёк (адрес + приватный ключ, зашифрованный AES-256-GCM
перед сохранением в БД), объявления (buy/sell), сделки с эскроу
(заморозка/разморозка баланса), чат по сделке, споры и их разрешение
администратором.

## Стек

- Node.js + Express
- PostgreSQL + Sequelize
- JWT-авторизация, bcrypt для паролей
- ethers.js — генерация Ethereum-совместимого кошелька на каждого юзера
- Ванильный HTML/JS фронтенд (без сборки) с премиальным тёмно-золотым
  дизайном в духе крупных бирж: стеклянные карточки, анимированный
  степпер статуса сделки, тосты вместо `alert()`, count-up анимация
  баланса, пружинные переходы между вкладками

## ⚠️ Важно перед реальным запуском с настоящими деньгами

1. **Депозиты не детектируются автоматически.** Сейчас пополнение баланса
   происходит только через админ-эндпоинт `/api/wallet/admin/credit`
   (вручную, после того как вы сами проверили ончейн-транзакцию). Для
   продакшна нужен слушатель блокчейна (например, через Alchemy/Infura
   webhooks или собственную ноду), который сам зачисляет баланс при
   подтверждении депозита.
2. **Выводы (withdrawal) не реализованы** — в MVP это внутренний
   (custodial) баланс. Реальный вывод на внешний адрс требует подписания
   и отправки транзакции приватным ключом пользователя — это отдельный,
   более чувствительный модуль, который стоит делать после аудита
   безопасности.
3. **Юридическая сторона.** Биржа, работающая с реальными деньгами
   пользователей (тем более P2P-фиат), в большинстве стран требует
   регистрации как финансовый оператор / лицензии на денежные переводы,
   а также KYC/AML-процедур. Это не техническая, а юридическая
   обязанность — код её не заменяет.
4. Перед продакшном стоит провести независимый security review, особенно
   вокруг `WALLET_ENCRYPTION_KEY`, хранения приватных ключей и логики
   эскроу.

## Локальный запуск

```bash
git clone <ваш-репозиторий>
cd p2p-exchange
npm install
cp .env.example .env
# отредактируйте .env: DATABASE_URL, JWT_SECRET, WALLET_ENCRYPTION_KEY
npm run dev
```

Сгенерировать `WALLET_ENCRYPTION_KEY` (32 байта в hex):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Локально нужна PostgreSQL. Проще всего через Docker:

```bash
docker run --name p2p-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=p2p_exchange -p 5432:5432 -d postgres:16
```

и в `.env`:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/p2p_exchange
```

Открой `http://localhost:3000`.

## Деплой: GitHub + Render

### 1. Залить код на GitHub

```bash
cd p2p-exchange
git init
git add .
git commit -m "Initial commit: P2P exchange MVP"
git branch -M main
git remote add origin https://github.com/<ваш-юзернейм>/p2p-exchange.git
git push -u origin main
```

### 2. Деплой на Render

Вариант А — через `render.yaml` (Blueprint, самый быстрый):

1. Зайдите на https://dashboard.render.com
2. New → Blueprint
3. Подключите ваш GitHub-репозиторий с этим кодом
4. Render сам прочитает `render.yaml`, создаст PostgreSQL-базу и веб-сервис,
   сам сгенерирует `JWT_SECRET` и `WALLET_ENCRYPTION_KEY`
5. Нажмите Apply — через пару минут сервис будет доступен по адресу вида
   `https://p2p-exchange.onrender.com`

Вариант Б — вручную:

1. New → PostgreSQL → создайте базу, скопируйте Internal Database URL
2. New → Web Service → подключите репозиторий
   - Build Command: `npm install`
   - Start Command: `npm start`
3. В Environment добавьте переменные из `.env.example`:
   - `DATABASE_URL` = Internal Database URL из шага 1
   - `JWT_SECRET` = сгенерированная случайная строка
   - `WALLET_ENCRYPTION_KEY` = 64-символьный hex (см. команду выше)
   - `NODE_ENV=production`
4. Deploy

При первом старте `sequelize.sync()` сам создаст все таблицы в базе.

## API — краткий обзор

| Метод | Путь | Описание |
|---|---|---|
| POST | /api/auth/register | Регистрация + автосоздание кошелька |
| POST | /api/auth/login | Вход, возвращает JWT |
| GET | /api/auth/me | Текущий пользователь + кошельки |
| GET | /api/wallet/me | Адрес кошелька и баланс |
| POST | /api/wallet/admin/credit | (админ) ручное пополнение баланса |
| GET | /api/offers | Список объявлений |
| POST | /api/offers | Создать объявление |
| POST | /api/offers/:id/close | Закрыть своё объявление |
| POST | /api/trades | Открыть сделку по объявлению (эскроу) |
| POST | /api/trades/:id/paid | Покупатель отмечает оплату |
| POST | /api/trades/:id/release | Продавец подтверждает и отпускает крипту |
| POST | /api/trades/:id/dispute | Открыть спор |
| POST | /api/trades/:id/cancel | Отменить сделку до оплаты |
| POST | /api/trades/:id/message | Сообщение в чат сделки |
| POST | /api/trades/:id/resolve | (админ) разрешить спор |

## Как сделать первого администратора

После регистрации обычного пользователя зайдите в базу и выполните:

```sql
UPDATE users SET "isAdmin" = true WHERE email = 'ваш@email.com';
```

(например через Render → ваша база → Shell/psql, или любой Postgres-клиент
по External Database URL).
