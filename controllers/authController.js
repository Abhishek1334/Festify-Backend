import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import process from "process";

// Generate JWT with expiry
export const generateToken = (userId) => {
	return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
		expiresIn: "7d", // Token expires in 7 days
	});
};

// @desc   Register new user
// @route  POST /api/auth/signup
// @access Public
export const registerUser = async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const { name, email, password } = req.body;

	try {
		// Normalize email (case-insensitive login and unique storage)
		const normalizedEmail = email.toLowerCase();

		// Check if email or name already exists
		let existingUser = await User.findOne({
			$or: [{ email: normalizedEmail }, { name }],
		});

		if (existingUser) {
			if (existingUser.email === normalizedEmail) {
				return res
					.status(400)
					.json({ message: "Email already in use" });
			}
			if (existingUser.name === name) {
				return res
					.status(400)
					.json({ message: "Username already taken" });
			}
		}

		
		// Create new user
		const user = new User({
			name,
			email: normalizedEmail, // Store in lowercase
			password,
		});

		await user.save();

		res.status(201).json({
			id: user._id,
			name: user.name,
			email: user.email,
			token: generateToken(user._id),
		});
	} catch (error) {
		console.error("Signup Error:", error);
		res.status(500).json({
			message: "Server error, please try again later",
		});
	}
};

// @desc   Login user
// @route  POST /api/auth/login
// @access Public
export const loginUser = async (req, res) => {
	const { email, password } = req.body;

	try {
		const normalizedEmail = email.toLowerCase();
		const user = await User.findOne({ email: normalizedEmail });

		if (!user) {
			return res
				.status(400)
				.json({ message: "Invalid email or password" });
		}

		// Use bcrypt.compare() directly if matchPassword is not in the model
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res
				.status(400)
				.json({ message: "Invalid email or password" });
		}

		// Generate token with expiry
		const token = generateToken(user._id);

		res.status(200).json({
			id: user._id,
			name: user.name,
			email: user.email,
			token,
			tokenExpiry: "7d", // Sending expiry info for frontend
		});
	} catch (error) {
		console.error("Login Error:", error);
		res.status(500).json({
			message: "Server error. Please try again later.",
		});
	}
};

// @desc   Logout user
// @route  POST /api/auth/logout
// @access Private
export const logoutUser = async (req, res) => {
	try {
		// If using JWT in cookies, clear the cookie
		res.clearCookie("token", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // Secure in production
			sameSite: "strict",
		});

		res.status(200).json({ message: "User logged out successfully" });
	} catch (error) {
		console.error("Logout Error:", error);
		res.status(500).json({ message: "Logout failed. Please try again." });
	}
};
