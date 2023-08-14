const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env file
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: "profile-images", // The folder where images will be stored
  allowedFormats: ["jpg", "jpeg", "png"], // Allowed image formats
  transformation: [{ width: 200, height: 200, crop: "limit" }], // Optional: resize the image
  filename: (req, file, cb) => {
    // Generate a unique filename for the uploaded image
    const uniqueFilename = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
