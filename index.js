const sequelize = require('../config/db');
const User = require('./User');
const Wallet = require('./Wallet');
const Offer = require('./Offer');
const Trade = require('./Trade');
const TradeMessage = require('./TradeMessage');

// Связи
User.hasMany(Wallet, { foreignKey: 'userId' });
Wallet.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Offer, { foreignKey: 'userId' });
Offer.belongsTo(User, { foreignKey: 'userId' });

Offer.hasMany(Trade, { foreignKey: 'offerId' });
Trade.belongsTo(Offer, { foreignKey: 'offerId' });

User.hasMany(Trade, { foreignKey: 'sellerId', as: 'salesAsSeller' });
User.hasMany(Trade, { foreignKey: 'buyerId', as: 'salesAsBuyer' });
Trade.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Trade.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });

Trade.hasMany(TradeMessage, { foreignKey: 'tradeId' });
TradeMessage.belongsTo(Trade, { foreignKey: 'tradeId' });

module.exports = { sequelize, User, Wallet, Offer, Trade, TradeMessage };
