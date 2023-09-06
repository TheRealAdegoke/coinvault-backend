const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  coinSymbol: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  totalCost: {
    type: Number,
    required: true,
  },
  cryptoPrice: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
