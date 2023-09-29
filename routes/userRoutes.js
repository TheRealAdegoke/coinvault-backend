const User = require("../model/userModel");
const UserWallet = require("../model/walletModel");
const upload = require("../upload/upload")
const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const transactionHistoryModule = require("../Utils/transactionHistory");


// ! Route to handle image upload
router.post("/upload-profile-image", upload.single("profileImage"), async (req, res) => {
  try {
    const userId = req.body.userId; // ! Assuming you pass the user ID from the frontend

    // ! Check if the uploaded file size is larger than 3MB
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image" });
    }
    if (req.file.size > 3 * 1024 * 1024) {
      return res.status(400).json({ message: "Image file is larger than 3MB" });
    }

    // ! Update the user's profileImage field with the uploaded image URL
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ! Assuming the file path from Cloudinary is stored in req.file.path
    user.profileImage = req.file.path;
    await user.save();

    res.json({ message: "Profile image uploaded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to upload profile image" });
  }
});

// Function to create transaction history
async function createTransactionHistory(userId, status, message) {
  return transactionHistoryModule.createTransactionHistory(userId, status, message);
}


// ! Route to handle profile image deletion
router.delete("/delete-profile-image/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.profileImage) {
      const cloudinaryPublicId = user.profileImage.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(cloudinaryPublicId);

      user.profileImage = null; // ! Clear the profileImage field in the user document
      await user.save();
      return res.json({ message: "Profile image deleted successfully" });
    } else {
      return res.status(400).json({ message: "User does not have a profile image" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete profile image" });
  }
});

// ! Route to handle user deletion
router.delete("/delete-account/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ! Delete user's profile image from Cloudinary
    if (user.profileImage) {
      const cloudinaryPublicId = user.profileImage.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(cloudinaryPublicId);
    }

    // ! Delete the userWallet associated with the user account
    const userWallet = await UserWallet.findOne({ user: userId });
    if (userWallet) {
      await UserWallet.deleteOne({ user: userId });
    }

    // ! Delete the user account
    await User.deleteOne({ _id: userId });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete account" });
  }
});

// ! Update user's firstName and lastName
router.put("/users/name-change/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { firstName, lastName } = req.body;

    // ! Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ! Update the user's firstName and lastName
    user.firstName = firstName;
    user.lastName = lastName;

    // ! Save the changes
    await user.save();

    return res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while updating user" });
  }
});

// ! Update user's card design
router.put("/update-selected-card/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { selectedCard } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.selectedCard = selectedCard;
    await user.save();

    res.json({ message: "Selected Card updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update selected card" });
  }
});

// ! Get user's card design
router.get("/get-selected-card/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const selectedCard = user.selectedCard

    res.json({ selectedCard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get selected card" });
  }
});

// ! Transfer routes
router.post("/transfer-funds", async (req, res) => {
  try {
    const { receiverAccountNumber, amount, pin } = req.body;

    // Check if the amount is less than the minimum transfer amount
    if (amount < 50) {
      return res.status(400).send({ error: "Minimum transfer amount is 50 USD" });
    }

    // Retrieve the userId and account number from the authenticated user's JWT token
    const token = req.header("Authorization").replace("Bearer ", "");
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const senderUserId = decodedToken.userId;
    const userId = decodedToken.userId;

    // Fetch sender's information
    const sender = await User.findById(userId);

    if (!sender) {
      return res.status(400).send({ error: "Sender not found" });
    }

    // Fetch sender's wallet and user information
    const senderWallet = await UserWallet.findOne({ userId: senderUserId });
    const senderUser = await User.findById(senderUserId);

    // Check if the sender has enough balance
    if (senderWallet.balance < amount) {
      await createTransactionHistory(userId, "failed", `Failed to send funds to ${receiverAccountNumber}`)
      return res.status(400).send({ error: "Insufficient balance" });
    }

    // Verify the PIN provided by the sender
    const isPinValid = await bcrypt.compare(pin, senderUser.pin);
    if (!isPinValid) {
      return res.status(400).send({ error: "Invalid Transaction PIN" });
    }

    // Fetch receiver's wallet
    const receiverWallet = await UserWallet.findOne({
      accountNumber: receiverAccountNumber,
    });

    if (!receiverWallet) {
      return res.status(400).send({ error: "Receiver account not found" });
    }

    // Check if the sender's account number is the same as the receiver's account number
    if (senderWallet.accountNumber === receiverAccountNumber) {
      return res.status(400).send({ error: "Cannot send funds to your own account" });
    }

    // Update sender's balance
    senderWallet.balance -= amount;
    await senderWallet.save();

    // Update receiver's balance
    receiverWallet.balance += amount;
    await receiverWallet.save();

    // Log the buy transaction
    await createTransactionHistory(userId, "successful", `You Sent ${amount} USD to ${receiverAccountNumber}`);

    // Log the transfer transaction for the receiver
    await createTransactionHistory(receiverWallet.userId, "received", `You Received ${amount} USD from ${sender.firstName} ${sender.lastName}`);


    res.status(200).send({ message: "Funds transferred successfully" });
  } catch (error) {
    console.error("Error transferring funds:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

module.exports = router;