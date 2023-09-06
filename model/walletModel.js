const mongoose = require("mongoose");

const userWalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    minlength: 10,
    maxlength: 10,
  },
  balance: {
    type: Number,
    required: true,
    default: 5000,
  },
  cryptoHoldings: [
    {
      coinSymbol: String,
      amount: Number,
    },
  ],
  cryptoAddresses: {
    type: Map,
    of: String, // Map of coinSymbol to address (e.g., { "bitcoin": "address1", "ethereum": "address2" })
  },
});

// Create a UserWallet model
const UserWallet = mongoose.model("UserWallet", userWalletSchema);

module.exports = UserWallet;
