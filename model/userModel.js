const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  pin: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  verificationCode: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserWallet',
    select: false,
  },
   profileImage: {
    type: String,
    default: null,
  },
  selectedCard: {
    type: String,
    default: null,
  },
  dateJoined: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
