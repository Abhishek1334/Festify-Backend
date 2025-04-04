import multer from "multer";
import cloudinary from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";
dotenv.config();
import process from "process";

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup storage
const storage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: "uploads", // Folder in Cloudinary
		allowed_formats: ["jpg", "png", "jpeg"],
		transformation: [{ width: 500, height: 500, crop: "limit" }],
	},
});

const upload = multer({ storage: storage });

export default upload;
