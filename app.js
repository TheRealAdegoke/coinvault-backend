const express = require("express")
const app = express()
const cors = require("cors")
const connectDB = require("./Database/connect")
require("dotenv").config()
const port = process.env.PORT || 8080

app.use(express.json());
app.use(cors({
    origin: ["https://coinvault.onrender.com/", "https://www.google.com/", "http://localhost:5173"],
    methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH']
}))


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