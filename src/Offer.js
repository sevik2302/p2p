const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Offer = sequelize.define('Offer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('buy', 'sell'),
    allowNull: false
  },
  asset: {
    type: DataTypes.STRING,
    defaultValue: 'USDT'
  },
  fiatCurrency: {
    type: DataTypes.STRING,
    defaultValue: 'RUB'
  },
  price: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false
  },
  minAmount: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false
  },
  maxAmount: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false
  },
  availableAmount: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false
  },
  terms: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'closed'),
    defaultValue: 'active'
  }
}, {
  tableName: 'offers',
  timestamps: true
});

module.exports = Offer;
