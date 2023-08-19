const User = require("../model/userModel");
const UserWallet = require("../model/walletModel");
const upload = require("../upload/upload")
const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2


// Route to handle image upload
router.post("/upload-profile-image", upload.single("profileImage"), async (req, res) => {
  try {
    const userId = req.body.userId; // Assuming you pass the user ID from the frontend

    // Check if the uploaded file size is larger than 3MB
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image" });
    }
    if (req.file.size > 3 * 1024 * 1024) {
      return res.status(400).json({ message: "Image file is larger than 3MB" });
    }

    // Update the user's profileImage field with the uploaded image URL
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Assuming the file path from Cloudinary is stored in req.file.path
    user.profileImage = req.file.path;
    await user.save();

    res.json({ message: "Profile image uploaded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to upload profile image" });
  }
});


// Route to handle profile image deletion
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

      user.profileImage = null; // Clear the profileImage field in the user document
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

// Route to handle user deletion
router.delete("/delete-account/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user's profile image from Cloudinary
    if (user.profileImage) {
      const cloudinaryPublicId = user.profileImage.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(cloudinaryPublicId);
    }

    // Delete the userWallet associated with the user account
    const userWallet = await UserWallet.findOne({ user: userId });
    if (userWallet) {
      await UserWallet.deleteOne({ user: userId });
    }

    // Delete the user account
    await User.deleteOne({ _id: userId });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete account" });
  }
});

// Update user's firstName and lastName
router.put("/users/name-change/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { firstName, lastName } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the user's firstName and lastName
    user.firstName = firstName;
    user.lastName = lastName;

    // Save the changes
    await user.save();

    return res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while updating user" });
  }
});


module.exports = router;