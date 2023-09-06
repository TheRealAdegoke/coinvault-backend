// cryptoAddressUtils.js
function generateRandomAddress(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let address = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    address += characters.charAt(randomIndex);
  }
  return address;
}

module.exports = {
  generateRandomAddress,
};
