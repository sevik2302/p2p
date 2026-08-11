const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  encryptedPrivateKey: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  mnemonicEncrypted: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  network: {
    type: DataTypes.STRING,
    defaultValue: 'ethereum'
  }
}, {
  tableName: 'wallets',
  timestamps: true
});

module.exports = Wallet;
