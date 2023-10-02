const Notification = require("../model/notificationSchema");


async function getNotifications(userId) {
  try {
    // Find the user's notifications
    const userNotifications = await Notification.findOne({ userId });

    if (!userNotifications) {
      return [];
    }

    return userNotifications.notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw new Error("Failed to fetch notifications");
  }
}

async function markAllAsRead(userId) {
  try {
    // Update all notifications to mark them as read
    await Notification.updateOne({ userId }, { $set: { "notifications.$[].status": "read" } });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    throw new Error("Failed to mark notifications as read");
  }
}


module.exports = {
  getNotifications,
  markAllAsRead,
};
