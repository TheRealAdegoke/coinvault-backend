const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema({
  receiverAccountNumber: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 10,
  },
  amount: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Transfer = mongoose.model("Transfer", transferSchema);

module.exports = Transfer;
