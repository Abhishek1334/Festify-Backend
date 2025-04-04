import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getUserById, getUserRsvps } from "../controllers/userController.js";

const router = express.Router();

// ✅ Get User by ID (for attendee lookup)
router.get("/:id", protect, getUserById);

// ✅ Get Events the User Has RSVP'd To
router.get("/:id/rsvps", protect, getUserRsvps);

export default router;
