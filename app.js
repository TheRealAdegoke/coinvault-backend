const express = require("express")
const app = express()
const connectDB = require("./DataBase/connect")
require("dotenv").config()
const port = process.env.PORT || 8080

app.use(express.json());

// ? api endPoint
app.get("/", (req, res) => {
  res.send(`<h1>We are live</h1>`)
});

// ? imported routes
const authRoute = require("./routes/authRoutes")

// ? routes
app.use("/v1/auth", authRoute)


const start = async () => {
    try {
        await connectDB(process.env.MONGO_URI)
        app.listen(port, console.log(`server is listening on port ${port}...`))
    } catch (error) {
        console.log(error);
    }
}

start()