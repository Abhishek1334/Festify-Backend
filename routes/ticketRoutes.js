import express from "express";
import {
	bookTicket,
	getUserTickets,
	getEventTickets,
	checkInTicket,
	cancelTicket,
	verifyTicket
} from "../controllers/ticketController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🎟 Book a ticket (Only for authenticated users)
router.post("/book", protect, bookTicket);

// 🗂 Get all tickets booked by the authenticated user
router.get("/my-tickets", protect, getUserTickets);

// 🎟 Get all tickets for a specific event
router.get("/event/:eventId", protect, getEventTickets);

// ✅ Check-in a ticket using its ID
router.post("/check-in", protect, checkInTicket);

// ❌ Cancel a Ticket
router.delete("/cancel/:ticketId", protect, cancelTicket);

router.post("/verify", protect, verifyTicket);

export default router;
