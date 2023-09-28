const TransactionHistory = require("../model/transactionSchema");

async function createTransactionHistory(userId, status, message) {
  try {
    // Find the user's transaction history or create a new one
    let userTransactionHistory = await TransactionHistory.findOne({ userId });

    if (!userTransactionHistory) {
      userTransactionHistory = new TransactionHistory({ userId, histories: [] });
    }

    // Add the new transaction to the histories array
    userTransactionHistory.histories.push({ status, message });

    // Save the updated transaction history
    await userTransactionHistory.save();

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
