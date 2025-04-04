import express from "express";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js"; // Import middleware
import {
	registerUser,
	loginUser,
	logoutUser,
} from "../controllers/authController.js";

const router = express.Router();

// User Signup
router.post(
	"/signup",
	[
		body("name").not().isEmpty().withMessage("Name is required"),
		body("email").isEmail().withMessage("Please enter a valid email"),
		body("password")
			.isLength({ min: 6 })
			.withMessage("Password must be 6 or more characters"),
	],
	registerUser
);

// User Login
router.post("/login", loginUser);

// User Logout
router.post("/logout", logoutUser);

// ✅ Get Logged-in User Details
router.get("/me", protect, async (req, res) => {
	try {
		if (!req.user) {
			return res.status(404).json({ message: "User not found" });
		}
		res.json(req.user);
	} catch (error) {
		console.error("❌ ERROR fetching user:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Protected Test Route
router.get("/protected", protect, (req, res) => {

	res.json({ message: "Access granted!", user: req.user });
});

export default router;
