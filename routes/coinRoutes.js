const express = require("express");
const router = express.Router();
const axios = require("axios");
const UserWallet = require("../model/walletModel");
const User = require("../model/userModel");
const supportedCoins = require("../Utils/supportedCoins");
const jwt = require("jsonwebtoken");
const transactionHistoryModule = require("../Utils/transactionHistory");
const notificationModule = require("../Utils/NotificationHistory");

// Function to fetch cryptocurrency price from CoinGecko API
async function getCryptoPrice(coinSymbol) {
  try {
    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinSymbol}&vs_currencies=usd`;

    // Send a GET request to the CoinGecko API
    const response = await axios.get(apiUrl);

    if (
      response.status === 200 &&
      response.data[coinSymbol] &&
      response.data[coinSymbol].usd
    ) {
      return response.data[coinSymbol].usd; // Return the USD price of the coin
    } else {
      throw new Error(`Failed to fetch cryptocurrency price for ${coinSymbol}`);
    }
  } catch (error) {
    console.error("Error fetching cryptocurrency price:", error.message);
    throw new Error(
      `Failed to fetch cryptocurrency price for ${coinSymbol}: ${error.message}`
    );
  }
}

// Function to create transaction history
async function createTransactionHistory(userId, status, message) {
  return transactionHistoryModule.createTransactionHistory(
    userId,
    status,
    message
  );
}

// Route to buy cryptocurrency
router.post("/v1/auth/buy-crypto", async (req, res) => {
  try {
    const { coinSymbol, amountToBuy } = req.body;

    // Retrieve the userId from the authenticated user's JWT token
    const token = req.header("Authorization").replace("Bearer ", "");
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Ensure the amount to buy is greater than 0
    if (amountToBuy <= 0) {
      return res.status(400).send({ error: "Invalid amount" });
    }

    // Ensure the amount to buy is greater than or equal to 50
    if (amountToBuy < 50) {
      // Log the failed transaction
      await createTransactionHistory(
        userId,
        "failed",
        `An unexpected error occurred while trying to purchase ${coinSymbol}`
      );
      return res
        .status(400)
        .send({ error: "Amount to buy must be at least 50 USD" });
    }

    // Check if the requested coin is in the allowed list
    if (!supportedCoins.includes(coinSymbol)) {
      return res.status(400).send({ error: "Coin not available for purchase" });
    }

    // Fetch user's wallet
    const wallet = await UserWallet.findOne({ userId });

    if (!wallet) {
      return res.status(400).send({ error: "User wallet not found" });
    }

    // Fetch the current price of the cryptocurrency (1 unit in USD)
    const cryptoPrice = await getCryptoPrice(coinSymbol);

    if (!cryptoPrice) {
      return res
        .status(400)
        .send({ error: "Failed to fetch cryptocurrency price" });
    }

    // Calculate the equivalent amount of the cryptocurrency
    const equivalentAmount = amountToBuy / cryptoPrice;

    if (equivalentAmount <= 0) {
      return res
        .status(400)
        .send({ error: "Invalid amount or cryptocurrency" });
    }

    // Check if the user already holds this cryptocurrency
    const existingHoldingIndex = wallet.cryptoHoldings.findIndex(
      (holding) => holding.coinSymbol === coinSymbol
    );

    // Calculate the total cost of the purchase
    const totalCost = amountToBuy;

    // Check if the user has sufficient balance to make the purchase
    if (totalCost > wallet.balance) {
      // Log the failed transaction
      await createTransactionHistory(
        userId,
        "failed",
        `An unexpected error occurred while trying to purchase ${coinSymbol}`
      );
      return res
        .status(400)
        .send({ error: "Insufficient balance to make the purchase" });
    }

    if (existingHoldingIndex !== -1) {
      // If the user already holds this cryptocurrency, update the amount
      wallet.cryptoHoldings[existingHoldingIndex].amount += equivalentAmount;
    } else {
      // If not, add the equivalent amount of the cryptocurrency to the user's balance
      wallet.cryptoHoldings.push({
        coinSymbol,
        amount: equivalentAmount,
      });
    }

    // Deduct the equivalent amount in USD from the user's wallet balance
    wallet.balance -= totalCost;

    // Save the updated user document
    await wallet.save();

    // Log the buy transaction
    await createTransactionHistory(
      userId,
      "successful",
      `Your Purchase of ${coinSymbol} was successful and ${amountToBuy} USD has been deducted from your account.`
    );

    res.status(200).send({
      message: "Cryptocurrency purchased successfully",
      walletBalance: wallet.balance,
      cryptoHoldings: wallet.cryptoHoldings,
    });
  } catch (error) {
    console.error("Error buying cryptocurrency:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Route to sell cryptocurrency
router.post("/v1/auth/sell-crypto", async (req, res) => {
  try {
    const { coinSymbol, amountToSell } = req.body;

    // Retrieve the userId from the authenticated user's JWT token
    const token = req.header("Authorization").replace("Bearer ", "");
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Ensure the amount to sell is greater than 0
    if (amountToSell <= 0) {
      await createTransactionHistory(
        userId,
        "failed",
        `Unable to sell ${amountToSell} ${coinSymbol}, Please input a valid amount`
      );
      return res.status(400).send({ error: "Invalid amount" });
    }

    // Check if the requested coin is in the allowed list
    if (!supportedCoins.includes(coinSymbol)) {
      return res.status(400).send({ error: "Coin not available for sale" });
    }

    // Fetch user's wallet
    const wallet = await UserWallet.findOne({ userId });

    if (!wallet) {
      return res.status(400).send({ error: "User wallet not found" });
    }

    // Check if the user has the specified cryptocurrency in their wallet
    const holding = wallet.cryptoHoldings.find(
      (holding) => holding.coinSymbol === coinSymbol
    );

    if (!holding || holding.amount < amountToSell) {
      await createTransactionHistory(
        userId,
        "failed",
        `Unable to sell ${amountToSell} ${coinSymbol}. Ensure that you have enough ${coinSymbol} in your account to cover the sale`
      );
      return res
        .status(400)
        .send({ error: "Insufficient balance or no holdings for sale" });
    }

    // Fetch the current price of the cryptocurrency (1 unit in USD)
    const cryptoPrice = await getCryptoPrice(coinSymbol);

    if (!cryptoPrice) {
      return res
        .status(400)
        .send({ error: "Failed to fetch cryptocurrency price" });
    }

    // Calculate the equivalent amount in USD for the sold cryptocurrency
    const equivalentAmountInUSD = amountToSell * cryptoPrice;

    // Deduct the cryptocurrency from the user's holdings
    holding.amount -= amountToSell;

    // Add the equivalent amount in USD to the user's wallet balance
    wallet.balance += equivalentAmountInUSD;

    // If the user has no more of this cryptocurrency, remove it from the holdings
    if (holding.amount === 0) {
      wallet.cryptoHoldings = wallet.cryptoHoldings.filter(
        (h) => h.coinSymbol !== coinSymbol
      );
    }

    // Save the updated user document
    await wallet.save();

    // Log the sell transaction
    await createTransactionHistory(
      userId,
      "successful",
      `You Successfully sold ${coinSymbol} and ${amountToSell} ${coinSymbol} has been deducted from your wallet`
    );

    res.status(200).send({
      message: "Cryptocurrency sold successfully",
      walletBalance: wallet.balance,
      cryptoHoldings: wallet.cryptoHoldings,
    });
  } catch (error) {
    console.error("Error selling cryptocurrency:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Route to swap cryptocurrency from one supported coin to another supported coin
router.post("/v1/auth/swap-crypto", async (req, res) => {
  try {
    const { fromCoinSymbol, toCoinSymbol, amountToSwap } = req.body;

    // Retrieve the userId from the authenticated user's JWT token
    const token = req.header("Authorization").replace("Bearer ", "");
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Ensure the amount to swap is greater than 0
    if (amountToSwap <= 0) {
      await createTransactionHistory(
        userId,
        "failed",
        `Unable to swap ${amountToSwap} ${fromCoinSymbol} to ${toCoinSymbol}, please input a valid amount`
      );
      return res.status(400).send({ error: "Invalid amount" });
    }

    // Check if both the fromCoin and toCoin are supported
    if (
      !supportedCoins.includes(fromCoinSymbol) ||
      !supportedCoins.includes(toCoinSymbol)
    ) {
      return res
        .status(400)
        .send({ error: "One or both coins are not available for swapping" });
    }

    // Fetch user's wallet
    const wallet = await UserWallet.findOne({ userId });

    if (!wallet) {
      return res.status(400).send({ error: "User wallet not found" });
    }

    // Check if the user has the specified cryptocurrency in their wallet
    const fromCoinHolding = wallet.cryptoHoldings.find(
      (holding) => holding.coinSymbol === fromCoinSymbol
    );

    if (!fromCoinHolding || fromCoinHolding.amount < amountToSwap) {
      await createTransactionHistory(
        userId,
        "failed",
        `Unable to swap ${amountToSwap} ${fromCoinSymbol} to ${toCoinSymbol}. Ensure that you have enough ${fromCoinSymbol} to be able to swap to ${toCoinSymbol}`
      );
      return res
        .status(400)
        .send({ error: "Insufficient balance or no holdings for swapping" });
    }

    // Fetch the current price of both the fromCoin and toCoin (1 unit in USD)
    const fromCoinPrice = await getCryptoPrice(fromCoinSymbol);
    const toCoinPrice = await getCryptoPrice(toCoinSymbol);

    if (!fromCoinPrice || !toCoinPrice) {
      return res
        .status(400)
        .send({ error: "Failed to fetch cryptocurrency prices" });
    }

    // Calculate the equivalent amount in USD for the fromCoin and toCoin
    const equivalentAmountInUSDFromCoin = amountToSwap * fromCoinPrice;
    const equivalentAmountInUSDToCoin =
      equivalentAmountInUSDFromCoin / toCoinPrice;

    // Deduct the fromCoin from the user's holdings
    fromCoinHolding.amount -= amountToSwap;

    // Check if the user already holds the toCoin
    const toCoinHolding = wallet.cryptoHoldings.find(
      (holding) => holding.coinSymbol === toCoinSymbol
    );

    if (toCoinHolding) {
      // If the user already holds the toCoin, update the amount
      toCoinHolding.amount += equivalentAmountInUSDToCoin;
    } else {
      // If not, add the equivalent amount of the toCoin to the user's balance
      wallet.cryptoHoldings.push({
        coinSymbol: toCoinSymbol,
        amount: equivalentAmountInUSDToCoin,
      });
    }

    // Save the updated user document
    await wallet.save();

    // Log the swap transaction
    await createTransactionHistory(
      userId,
      "successful",
      `You successfully Swapped ${amountToSwap} ${fromCoinSymbol} to ${toCoinSymbol}`
    );

    res.status(200).send({
      message: `Cryptocurrency swapped successfully from ${fromCoinSymbol} to ${toCoinSymbol}`,
      walletBalance: wallet.balance,
      cryptoHoldings: wallet.cryptoHoldings,
    });
  } catch (error) {
    console.error("Error swapping cryptocurrency:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Route to transfer cryptocurrency for various coins using only receiver's address
router.post("/v1/auth/transfer-crypto", async (req, res) => {
  try {
    const { receiverCryptoCoinAddress, cryptoAmountToSend, CryptoToSend } =
      req.body;

    // Retrieve the userId from the authenticated user's JWT token
    const token = req.header("Authorization").replace("Bearer ", "");
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const senderUserId = decodedToken.userId;
    const userId = decodedToken.userId;

    // Fetch sender's information
    const sender = await User.findById(userId);

    if (!sender) {
      return res.status(400).send({ error: "Sender not found" });
    }

    // Fetch sender's wallet
    const senderWallet = await UserWallet.findOne({ userId: senderUserId });

    if (!senderWallet) {
      return res.status(400).send({ error: "Sender wallet not found" });
    }

    // Check if the sender has enough balance of the specified cryptocurrency
    const senderCryptoHolding = senderWallet.cryptoHoldings.find(
      (holding) => holding.coinSymbol === CryptoToSend
    );

    if (
      !senderCryptoHolding ||
      senderCryptoHolding.amount < cryptoAmountToSend
    ) {
      await createTransactionHistory(
        senderUserId,
        "failed",
        `An unexpected error occurred while trying to transfer ${CryptoToSend} to ${receiverCryptoCoinAddress}`
      );
      return res.status(400).send({ error: "Insufficient balance" });
    }

    // Find the receiver's wallet by matching the crypto address
    const receiverWallet = await UserWallet.findOne({
      [`cryptoAddresses.${CryptoToSend.toLowerCase()}`]:
        receiverCryptoCoinAddress,
    });

    if (!receiverWallet) {
      return res.status(400).send({ error: "Receiver wallet not found" });
    }

    // Check if the receiver's address belongs to the sender
    if (receiverWallet.userId.equals(senderUserId)) {
      return res
        .status(400)
        .send({ error: "Can't send coins to your own address" });
    }

    // Deduct the specified cryptocurrency from the sender's balance
    senderCryptoHolding.amount -= cryptoAmountToSend;

    // Add the transferred cryptocurrency to the receiver's balance
    const receiverCryptoHolding = receiverWallet.cryptoHoldings.find(
      (holding) => holding.coinSymbol === CryptoToSend
    );

    if (receiverCryptoHolding) {
      receiverCryptoHolding.amount += cryptoAmountToSend;
    } else {
      receiverWallet.cryptoHoldings.push({
        coinSymbol: CryptoToSend,
        amount: cryptoAmountToSend,
      });
    }

    // Save the updated sender and receiver documents
    await senderWallet.save();
    await receiverWallet.save();

    // Log the transfer transaction for the sender
    await createTransactionHistory(
      senderUserId,
      "successful",
      `You Transferred ${cryptoAmountToSend} ${CryptoToSend} to ${receiverCryptoCoinAddress}. ${cryptoAmountToSend} ${CryptoToSend} has been deducted from your wallet`
    );

    // Log the transfer transaction for the receiver
    await createTransactionHistory(
      receiverWallet.userId,
      "received",
      `You Received ${cryptoAmountToSend} ${CryptoToSend} from ${sender.firstName} ${sender.lastName} and ${cryptoAmountToSend} ${CryptoToSend} has been added to your wallet`
    );

    res.status(200).send({
      message: `Transferred ${cryptoAmountToSend.toFixed(
        4
      )} ${CryptoToSend} successfully`,
      senderBalance: senderWallet.balance,
      receiverBalance: receiverWallet.balance,
    });
  } catch (error) {
    console.error("Error transferring cryptocurrency:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Route to fetch transaction history
router.get("/v1/auth/transaction-history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = await transactionHistoryModule.getTransactionHistory(
      userId
    );
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Route to fetch user's coin data
router.get("/v1/auth/user-crypto-holdings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch user's wallet
    const wallet = await UserWallet.findOne({ userId });

    if (!wallet) {
      return res.status(400).json({ error: "User wallet not found" });
    }

    // Create an array to store the user's crypto data
    const userCryptoData = [];

    // Fetch the current price and additional data of cryptocurrencies from CoinGecko
    const coinSymbols = supportedCoins.join(",");
    const coinInfoResponse = await axios.get(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinSymbols}`
    );

    if (coinInfoResponse.status !== 200) {
      return res
        .status(400)
        .json({ error: "Failed to fetch cryptocurrency information" });
    }

    const coinInfoData = coinInfoResponse.data;

    // Iterate through supported coins and add them to userCryptoData
    for (const coinSymbol of supportedCoins) {
      const cryptoHolding = wallet.cryptoHoldings.find(
        (holding) => holding.coinSymbol === coinSymbol
      );

      // Calculate the equivalent amount
      let amount = 0;

      if (cryptoHolding) {
        amount = cryptoHolding.amount;
      }

      // Find the coin information in the response data
      const coinInfo = coinInfoData.find((info) => info.id === coinSymbol);

      if (!coinInfo) {
        return res
          .status(400)
          .json({ error: `Coin information not found for ${coinSymbol}` });
      }

      // Get the coin image URL from CoinGecko API
      const imageUrl = coinInfo.image;

      // Get the symbol from CoinGecko API
      const symbol = coinInfo.symbol || "";

      // Get the 24h price change percentage from CoinGecko API
      const price_change_percentage_24h =
        coinInfo.price_change_percentage_24h || 0;

      // Calculate the fiat value (worth in USD)
      const cryptoPriceInUSD = coinInfo.current_price; // The current price in USD from CoinGecko
      const fiatValue = amount * cryptoPriceInUSD;

      // Define the address based on your application's logic
      const address =
        wallet.cryptoAddresses.get(coinSymbol.toLowerCase()) || "";

      // Create the user's crypto data object
      const cryptoData = {
        userId,
        id: coinSymbol,
        symbol, // Use the fetched symbol
        name: coinSymbol.charAt(0).toUpperCase() + coinSymbol.slice(1), // You can fetch the name from CoinGecko API if needed
        address,
        amount,
        fiatValue, // Add the calculated fiat value
        image: imageUrl, // Use the fetched image URL
        price_change_percentage_24h,
      };

      userCryptoData.push(cryptoData);
    }

    res.status(200).json(userCryptoData);
  } catch (error) {
    console.error("Error fetching user crypto holdings:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to fetch notifications
router.get("/v1/auth/notifications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await notificationModule.getNotifications(userId);
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Route to mark all notifications as read
router.put("/v1/auth/notifications/mark-as-read/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    await notificationModule.markAllAsRead(userId);
    res.status(200).send("Notifications marked as read");
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

module.exports = router;
