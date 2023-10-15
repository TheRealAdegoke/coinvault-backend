const express = require("express");
const cors = require("cors");
const connectDB = require("./Database/connect");
require("dotenv").config();
const app = express();
const cookieParser = require("cookie-parser");

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
      'https://coinvault-backend.vercel.app/'
    ],
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    credentials: true, // Enable credentials (cookies, authorization headers, etc.)
  })
);

const authRoute = require("./routes/authRoutes");
const userRoute = require("./routes/userRoutes");
const coinRoute = require("./routes/coinRoutes");

// API endpoint
app.get("/", (req, res) => {
  res.send("<h1>Giddy Up Soldier</h1>");
});

app.use("/", authRoute);
app.use("/", userRoute);
app.use("/", coinRoute);

// ! Server Port 
const port = process.env.PORT || 8080;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}...`);
    });
  } catch (error) {
    console.log(error);
  }
};

start();
