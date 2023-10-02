const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const cookieParser = require("cookie-parser");
const connectDB = require("./Database/connect");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 8080;

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: [
      'https://coinvault.onrender.com',
      'https://www.google.com',
      'http://localhost:5173',
      'https://coin-vault.vercel.app',
      'http://localhost:8080',
      'http://192.168.43.251:5173',
    ],
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    credentials: true, // Enable credentials (cookies, authorization headers, etc.)
  })
);

// Additional CORS headers for Socket.io
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://coinvault.onrender.com',
      'https://www.google.com',
      'http://localhost:5173',
      'https://coin-vault.vercel.app',
      'http://localhost:8080',
      'http://192.168.43.251:5173',
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, UPDATE, PUT, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Credentials', 'true');

  next();
});

// Routes
app.get("/", (req, res) => {
  res.send("<h1>Giddy Up Soldier</h1>");
});

const authRoute = require("./routes/authRoutes");
const userRoute = require("./routes/userRoutes");
const coinRoute = require("./routes/coinRoutes");

app.use("/", authRoute);
app.use("/", userRoute);

// WebSocket integration
app.use("/", coinRoute(io));

// Start the server
const startServer = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    server.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}...`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
};

startServer();
