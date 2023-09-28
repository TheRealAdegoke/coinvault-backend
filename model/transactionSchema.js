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
    },
  ],
});

transactionHistorySchema.methods.getFormattedDate = function () {
  // Format date to "Month day, Year"
  const options = { month: "long", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat("en-US", options).format(this.date);
};

const TransactionHistory = mongoose.model("TransactionHistory", transactionHistorySchema);

module.exports = TransactionHistory;