const crypto = require("crypto");

// Generate a secure JWT secret
const generateJWTSecret = () => {
  const secret = crypto.randomBytes(64).toString("hex");
  return secret;
};

// Set the JWT secret
const JWT_SECRET = generateJWTSecret();

// Export the JWT_SECRET
module.exports = JWT_SECRET;