const { ethers } = require('ethers');
const { encrypt } = require('./crypto');

/**
 * Генерирует новый реальный кошелёк (адрес + приватный ключ).
 * Приватный ключ шифруется перед возвратом — хранить в БД нужно
 * только зашифрованную версию.
 */
function generateWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    encryptedPrivateKey: encrypt(wallet.privateKey),
    mnemonicEncrypted: wallet.mnemonic ? encrypt(wallet.mnemonic.phrase) : null
  };
}

module.exports = { generateWallet };
