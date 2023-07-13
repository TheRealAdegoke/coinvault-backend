const User = require("../model/userModel")
const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")

// Email validation regex pattern
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email validation regex pattern
const usernameRegex = /^[a-z0-9]+$/i;

// Registration route
router.post('/signup', async (req, res) => {
  const { username, firstName, lastName, pin, email, password } = req.body;

  // Check if all input fields are filled
  if (!username || !firstName || !lastName || !pin || !email || !password) {
    return res.status(400).send({ error: 'Please fill in all fields' });
  }

  // Check if the email is valid
  if (!emailRegex.test(email)) {
    return res.status(400).send({ error: 'Invalid email address' });
  }

  try {
    // Check if the username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).send({ error: 'Username already exists' });
    }

    //Username regex
    if (username.length < 4 || username.length > 20) {
        return res.status(400).send("Username must be between 2 and 20 characters long");
    }

    if (Number(username) || Number(username) === 0) {
         return res.status(400).send("Username cannot contain only numbers");
    }

    const matchUsername = username.match(usernameRegex)
    if (!matchUsername) {
        return res.status(400).send("Username can only contain letters and numbers");
    }

    // Check if the email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).send({ error: 'Email already exists' });
    }

    // Check if the password is at least 6 characters long
    if (password.length < 6) {
      return res.status(400).send({ error: 'Password should be at least 6 characters long' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance
    const newUser = new User({
      username,
      firstName,
      lastName,
      pin: hashedPassword,
      email,
      password: hashedPassword
    });

    // Save the user to the database
    await newUser.save();
    res.status(200).send({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});

module.exports = router