const TransactionHistory = require("../model/transactionSchema");
const Notification = require("../model/notificationSchema");

async function createTransactionHistory(userId, status, message) {
  try {
    // Find the user's transaction history or create a new one
    let userTransactionHistory = await TransactionHistory.findOne({ userId });

    if (!userTransactionHistory) {
      userTransactionHistory = new TransactionHistory({ userId, histories: [] });
    }

    // Add the new transaction to the histories array
    userTransactionHistory.histories.push({ status, message, date: Date.now() });

    // Save the updated transaction history
    await userTransactionHistory.save();

    // Create a notification for the user
    await Notification.findOneAndUpdate(
      { userId },
      {
        $push: {
          notifications: {
            status: "unread",
            message,
            date: Date.now(),
          },
        },
      },
      { upsert: true }
    );

    return userTransactionHistory;
  } catch (error) {
    console.error("Error creating transaction history:", error);
    throw new Error("Failed to create transaction history");
  }
}

async function getTransactionHistory(userId) {
  try {
    // Find the user's transaction history
    const userTransactionHistory = await TransactionHistory.findOne({ userId });

    if (!userTransactionHistory) {
      return [];
    }

    return userTransactionHistory.histories;
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    throw new Error("Failed to fetch transaction history");
  }
}

module.exports = {
  createTransactionHistory,
  getTransactionHistory,
};