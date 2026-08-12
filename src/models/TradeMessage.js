const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TradeMessage = sequelize.define('TradeMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tradeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'trade_messages',
  timestamps: true
});

module.exports = TradeMessage;
