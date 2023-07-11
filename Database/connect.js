const mongoose = require("mongoose")

// ! Connect to database
const connectDB = async (url) => {
    try {
        await mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    } catch (error) {
        console.log(error);
    }
}

module.exports = connectDB