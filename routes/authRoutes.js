const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const User = require("../model/userModel");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken")
const crypto = require("crypto")

// Generate a secure JWT secret
const generateJWTSecret = () => {
  const secret = crypto.randomBytes(64).toString('hex');
  return secret;
};

// Set the JWT secret
const JWT_SECRET = generateJWTSecret();

// Email validation regex pattern
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Username validation regex
const usernameRegex = /^[a-z0-9]+$/i;

// Map to store verification codes and their expiration times
const verificationCodes = new Map();

// Registration route
router.post("/v1/auth/signup", async (req, res) => {
  try {
    const { userName, firstName, lastName, pin, email, password } = req.body;

    // Generate a random 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set verification code expiration time to 2 minutes
    const expirationTime = Date.now() + 2 * 60 * 1000; // Current time + 2 minutes

    // Check if all input fields are filled
    if (!userName || !firstName || !lastName || !pin || !email || !password) {
      return res.status(400).send({ error: "Please fill in all fields" });
    }

    // Check if the email is valid
    if (!emailRegex.test(email)) {
      return res.status(400).send({ error: "Invalid email address" });
    }

    // Check if the username already exists
    const existingUsername = await User.findOne({ userName });
    if (existingUsername) {
      return res.status(400).send({ error: "Username already exists" });
    }

    // Check if the email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).send({ error: "Email already exists" });
    }

    // Check if the username is valid
    if (userName.length < 4 || userName.length > 20) {
      return res
        .status(400)
        .send({ error: "Username must be between 4 and 20 characters long" });
    }

    if (Number(userName) || Number(userName) === 0) {
      return res.status(400).send({ error: "Username cannot contain only numbers" });
    }

    const validUsername = userName.match(usernameRegex);
    if (!validUsername) {
      return res
        .status(400)
        .send({ error: "Username can only contain letters and numbers" });
    }

    // Check if the password is at least 6 characters long
    if (password.length < 6) {
      return res
        .status(400)
        .send({ error: "Password should be at least 6 characters long" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance
    const newUser = new User({
      userName,
      firstName,
      lastName,
      pin: hashedPassword,
      email,
      password: hashedPassword,
      verificationCode,
    });

    // Save the user to the database
    await newUser.save();

    // Store the verification code and its expiration time
    verificationCodes.set(verificationCode, expirationTime);

    // Send the verification code to the user's email address
    sendVerificationEmail(email, userName, verificationCode);

    res.status(200).send({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Verification route
router.post("/v1/auth/verify-email", async (req, res) => {
  try {
    const { verificationCode } = req.body;

    // Check if the verification code is provided
    if (!verificationCode) {
      return res.status(400).send({ error: "Verification code is required" });
    }

    // Check if the verification code exists and is not expired
    const expirationTime = verificationCodes.get(verificationCode);
    if (!expirationTime || Date.now() > expirationTime) {
      return res.status(400).send({ error: "Invalid or expired verification code" });
    }

    // Find the user by verification status and verification code
    const user = await User.findOne({
      verificationCode: String(verificationCode),
    });

    if (!user) {
      return res.status(400).send({ error: "Invalid verification code" });
    }

    // Update the user's verification status
    user.isVerified = true;
    user.verificationCode = null;
    await user.save();

    // Remove the verification code from the map
    verificationCodes.delete(verificationCode);

    res.status(200).send({ message: "Email verified" });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Resend verification code route
router.post("/v1/auth/resend-verification-code", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email is provided
    if (!email) {
      return res.status(400).send({ error: "Email is required" });
    }

    // Check if the email is valid
    if (!emailRegex.test(email)) {
      return res.status(400).send({ error: "Invalid email address" });
    }

    // Find the user by email
    const user = await User.findOne({ email });

    // Check if the user exists
    if (!user) {
      return res.status(400).send({ error: "User not found" });
    }

    // Generate a new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set verification code expiration time to 2 minutes
    const expirationTime = Date.now() + 2 * 60 * 1000; // Current time + 2 minutes

    // Update the user's verification code and its expiration time
    user.verificationCode = verificationCode;
    await user.save();

    // Store the new verification code and its expiration time
    verificationCodes.set(verificationCode, expirationTime);

    // Send the new verification code to the user's email address
    sendVerificationEmail(email, user.userName, verificationCode);

    res.status(200).send({ message: "Verification code resent successfully" });
  } catch (error) {
    console.error("Error resending verification code:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Function to send the verification email
async function sendVerificationEmail(email, userName, verificationCode) {
  try {
    const transporter = nodemailer.createTransport({
      // Configure the email service provider details
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: "Email Verification",
      text: `Hey there, ${userName},\n\nThank you for registering with CoinVault!. To complete the registration process, please use the following verification code: ${verificationCode}\n\nBest regards,\nCoinVault Team`,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
}

// Login route
router.post("/v1/auth/login", async (req, res) => {
  try {
    const { userName, password } = req.body;

    // Check if the username and password are provided
    if (!userName || !password) {
      return res.status(400).send({ error: "Please provide username and password" });
    }

    // Find the user by the provided username
    const user = await User.findOne({ userName });

    // Check if the user exists
    if (!user) {
      return res.status(401).send({ error: "Invalid username or password" });
    }

    // Compare the provided password with the stored password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // Check if the password is valid
    if (!isPasswordValid) {
      return res.status(401).send({ error: "Invalid username or password" });
    }

    // Check if the user is verified
    if (!user.isVerified) {
      return res.status(401).send({ error: "Please verify your email address" });
    }

    // Create and sign a JSON Web Token (JWT)
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1h", // Token expiration time
    });

    res.status(200).send({ token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

module.exports = router;