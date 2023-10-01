const mongoose = require("mongoose");

const transactionHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  histories: [
    {
      status: {
        type: String,
        enum: ["successful", "failed", "received"],
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      date: {
        type: Date,
        default: Date.now,
      },
      unread: {
        type: Boolean,
        default: true, // Set to true by default for new transactions
      },
    },
  ],
  readAll: {
    type: Boolean,
    default: false,
  },
});


const TransactionHistory = mongoose.model("TransactionHistory", transactionHistorySchema);

module.exports = TransactionHistory;
