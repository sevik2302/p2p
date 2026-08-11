const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Статусы сделки:
// pending_payment  -> крипта продавца заморожена (эскроу), покупатель ждёт реквизиты и платит фиатом
// paid             -> покупатель отметил "я оплатил", ждём подтверждения продавца
// completed        -> продавец подтвердил получение оплаты, крипта переведена покупателю
// disputed         -> открыт спор, ожидает решения администратора
// cancelled        -> сделка отменена, средства возвращены продавцу
const Trade = sequelize.define('Trade', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  offerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  amountCrypto: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false
  },
  amountFiat: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending_payment', 'paid', 'completed', 'disputed', 'cancelled'),
    defaultValue: 'pending_payment'
  },
  disputeReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'trades',
  timestamps: true
});

module.exports = Trade;
