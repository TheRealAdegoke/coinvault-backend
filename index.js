const express = require("express");
const cors = require("cors");
const connectDB = require("./Database/connect");
require("dotenv").config();
const app = express();
const cookieParser = require("cookie-parser")

app.use(cookieParser())
app.use(express.json());

app.use(cors({
     origin: ['https://coinvault.onrender.com', "https://coin-vault.vercel.app", 'https://www.google.com/',"http://localhost:5173", "http://localhost:8080"],
     methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH']
}));


const authRoute = require("./routes/authRoutes");
const userRoute = require("./routes/userRoutes");


// API endpoint
app.get("/", (req, res) => {
  res.send("<h1>We are live</h1>");
});

app.use("/", authRoute);
app.use("/", userRoute);

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