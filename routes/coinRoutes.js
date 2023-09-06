const express = require("express");
const router = express.Router();
const axios = require("axios");
const UserWallet = require("../model/walletModel");
const supportedCoins = require("../Utils/supportedCoins");
const jwt = require("jsonwebtoken");
const JWT_SECRET = require("../Middleware/jwt")


// Function to fetch cryptocurrency price from CoinGecko API
async function getCryptoPrice(coinSymbol) {
  try {
    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinSymbol}&vs_currencies=usd`;

    // Send a GET request to the CoinGecko API
    const response = await axios.get(apiUrl);

    if (response.status === 200 && response.data[coinSymbol] && response.data[coinSymbol].usd) {
      return response.data[coinSymbol].usd; // Return the USD price of the coin
    } else {
      throw new Error(`Failed to fetch cryptocurrency price for ${coinSymbol}`);
    }
  } catch (error) {
    console.error("Error fetching cryptocurrency price:", error.message);
    throw new Error(`Failed to fetch cryptocurrency price for ${coinSymbol}: ${error.message}`);
  }
}

// Route to buy cryptocurrency
router.post("/v1/auth/buy-crypto", async (req, res) => {
  try {
    const { coinSymbol, amountToBuy } = req.body;

    // Ensure the amount to buy is greater than 0
    if (amountToBuy <= 0) {
      return res.status(400).send({ error: "Invalid amount" });
    }

    // Check if the requested coin is in the allowed list
    if (!supportedCoins.includes(coinSymbol)) {
      return res.status(400).send({ error: "Coin not available for purchase" });
    }

    // Retrieve the userId from the authenticated user's JWT token
    const token = req.header("Authorization").replace("Bearer ", "");
    const decodedToken = jwt.verify(token, JWT_SECRET);
    const userId = decodedToken.userId;

    // Fetch user's wallet
    const wallet = await UserWallet.findOne({ userId });

    if (!wallet) {
      return res.status(400).send({ error: "User wallet not found" });
    }

    // Fetch the current price of the cryptocurrency (1 unit in USD)
    const cryptoPrice = await getCryptoPrice(coinSymbol);

    if (!cryptoPrice) {
      return res.status(400).send({ error: "Failed to fetch cryptocurrency price" });
    }

    // Calculate the equivalent amount of the cryptocurrency
    const equivalentAmount = amountToBuy / cryptoPrice;

    if (equivalentAmount <= 0) {
      return res.status(400).send({ error: "Invalid amount or cryptocurrency" });
    }

    // Check if the user already holds this cryptocurrency
    const existingHoldingIndex = wallet.cryptoHoldings.findIndex(
      (holding) => holding.coinSymbol === coinSymbol
    );

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
    wallet.balance -= amountToBuy;

    // Save the updated user document
    await wallet.save();

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

    // Ensure the amount to sell is greater than 0
    if (amountToSell <= 0) {
      return res.status(400).send({ error: "Invalid amount" });
    }

    // Check if the requested coin is in the allowed list
    if (!supportedCoins.includes(coinSymbol)) {
      return res.status(400).send({ error: "Coin not available for sale" });
    }

    // Retrieve the userId from the authenticated user's JWT token
    const token = req.header("Authorization").replace("Bearer ", "");
    const decodedToken = jwt.verify(token, JWT_SECRET);
    const userId = decodedToken.userId;

    // Fetch user's wallet
    const wallet = await UserWallet.findOne({ userId });

    if (!wallet) {
      return res.status(400).send({ error: "User wallet not found" });
    }

    // Check if the user has the specified cryptocurrency in their wallet
    const holding = wallet.cryptoHoldings.find((holding) => holding.coinSymbol === coinSymbol);

    if (!holding || holding.amount < amountToSell) {
      return res.status(400).send({ error: "Insufficient balance or no holdings for sale" });
    }

    // Fetch the current price of the cryptocurrency (1 unit in USD)
    const cryptoPrice = await getCryptoPrice(coinSymbol);

    if (!cryptoPrice) {
      return res.status(400).send({ error: "Failed to fetch cryptocurrency price" });
    }

    // Calculate the equivalent amount in USD for the sold cryptocurrency
    const equivalentAmountInUSD = amountToSell * cryptoPrice;

    // Deduct the cryptocurrency from the user's holdings
    holding.amount -= amountToSell;

    // Add the equivalent amount in USD to the user's wallet balance
    wallet.balance += equivalentAmountInUSD;

    // If the user has no more of this cryptocurrency, remove it from the holdings
    if (holding.amount === 0) {
      wallet.cryptoHoldings = wallet.cryptoHoldings.filter((h) => h.coinSymbol !== coinSymbol);
    }

    // Save the updated user document
    await wallet.save();

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

// Route to transfer cryptocurrency for various coins using only receiver's address
router.post("/v1/auth/transfer-crypto", async (req, res) => {
  try {
    const { receiverCryptoCoinAddress, cryptoAmountToSend, CryptoToSend } = req.body;

    // Retrieve the userId from the authenticated user's JWT token
    const token = req.header("Authorization").replace("Bearer ", "");
    const decodedToken = jwt.verify(token, JWT_SECRET);
    const senderUserId = decodedToken.userId;

    // Fetch sender's wallet
    const senderWallet = await UserWallet.findOne({ userId: senderUserId });

    if (!senderWallet) {
      return res.status(400).send({ error: "Sender wallet not found" });
    }

    // Check if the sender has enough balance of the specified cryptocurrency
    const senderCryptoHolding = senderWallet.cryptoHoldings.find(
      (holding) => holding.coinSymbol === CryptoToSend
    );

    if (!senderCryptoHolding || senderCryptoHolding.amount < cryptoAmountToSend) {
      return res.status(400).send({ error: "Insufficient balance" });
    }

    // Find the receiver's wallet by matching the crypto address
    const receiverWallet = await UserWallet.findOne({
      [`cryptoAddresses.${CryptoToSend.toLowerCase()}`]: receiverCryptoCoinAddress,
    });

    if (!receiverWallet) {
      return res.status(400).send({ error: "Receiver wallet not found" });
    }

    // Check if the receiver's address belongs to the sender
    if (receiverWallet.userId.equals(senderUserId)) {
      return res.status(400).send({ error: "Can't send coins to your own address" });
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

    res.status(200).send({
      message: `Transferred ${cryptoAmountToSend} ${CryptoToSend} successfully`,
      senderBalance: senderWallet.balance,
      receiverBalance: receiverWallet.balance,
    });
  } catch (error) {
    console.error("Error transferring cryptocurrency:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});



module.exports = router;