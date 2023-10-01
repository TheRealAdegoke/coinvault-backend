const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  notifications: [
    {
      status: {
        type: String,
        enum: ["unread", "read"],
        default: "unread",
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      date: {
        type: Date,
        required: true,
      },
    },
  ],
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
