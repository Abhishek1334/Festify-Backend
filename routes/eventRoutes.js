import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
	getEvents,
	getEventById,
	createEvent,
	updateEvent,
	deleteEvent,
	getUserEvents,
} from "../controllers/eventController.js";
import upload from "../middleware/uploadMiddleware.js";
import Event from "../models/eventModel.js"; // Ensure Event model is imported

const router = express.Router();

// ✅ Get all events & Create an event (with image upload)
router
	.route("/")
	.get(getEvents)
	.post(protect, upload.single("image"), createEvent);

// ✅ Get events created by the logged-in user
router.get("/my-events", protect, getUserEvents);

// ✅ Get events for a specific user (if different from `/my-events`, otherwise remove)
router.get("/user", protect, getUserEvents);

// ✅ Get, update, and delete event by ID
router
	.route("/:id")
	.get(getEventById)
	.put(protect, upload.single("image"), updateEvent)
	.delete(protect, deleteEvent);

// ✅ Get events by category (Fixed Syntax Errors)
router.get("/category/:category", async (req, res) => {
	try {
		const { category } = req.params;
		const events = await Event.find({ category });

		if (!events.length) {
			return res
				.status(404)
				.json({ message: `No events found in category: ${category}` });
		}

		res.status(200).json(events);
	} catch (error) {
		console.error(
			`Error fetching events by category (${req.params.category}):`,
			error
		);
		res.status(500).json({ message: "Error fetching events" });
	}
});

export default router;
