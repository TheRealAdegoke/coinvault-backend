const jwt = require("jsonwebtoken");

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send({ error: "Access token not found" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send({ error: "Invalid or expired token" });
    }

    // Assuming you have access to the user data here
    const { firstName, lastName } = user;

    // Add the user's first name and last name to the request object
    req.firstName = firstName;
    req.lastName = lastName;

    next();
  });
};

// Route to get user data
router.get("/v1/auth/user", authenticateToken, async (req, res) => {
  try {
    // Retrieve the user's first name and last name from the request object
    const { firstName, lastName } = req;

    res.status(200).send({ firstName, lastName });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});