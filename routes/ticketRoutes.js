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

router.post("/checkInTicket", checkInTicket); // ✅ Match this path exactly

// ❌ Cancel a Ticket
router.delete("/cancel/:ticketId", protect, cancelTicket);

router.post("/verify", protect, verifyTicket);

export default router;
