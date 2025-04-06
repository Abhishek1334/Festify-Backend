import Ticket from "../models/ticketModel.js";
import Event from "../models/eventModel.js";
import User from "../models/userModel.js";
import moment from "moment-timezone";
import crypto from "crypto";

const generateRFID = () => {
	const buffer = crypto.randomBytes(4); // Generate 4 random bytes
	return buffer
		.toString("hex")
		.toUpperCase()
		.match(/.{1,2}/g)
		.join(" "); // Convert to hex & format
};

// 📦 Install QR Code library if not done yet:
// npm install qrcode

import QRCode from "qrcode";

// 🎟️ Create Ticket & Embed Ticket ID as QR Code
export const bookTicket = async (req, res) => {
	try {
		const { eventId } = req.body;
		const userId = req.user.id;

		// 1. Check if event exists
		const event = await Event.findById(eventId);
		if (!event) {
			return res.status(404).json({ message: "Event not found." });
		}

		// 2. Check if event is sold out based on capacity
		if (event.ticketsSold >= event.capacity) {
			return res
				.status(400)
				.json({ message: "❌ Sorry, this event is sold out." });
		}

		// 3. Prevent duplicate bookings
		const existingTicket = await Ticket.findOne({ eventId, userId });
		if (existingTicket) {
			return res
				.status(400)
				.json({ message: "🎟️ You already booked this event." });
		}

		const user = await User.findById(userId);

		// 4. Create ticket
		const ticket = new Ticket({
			eventId,
			userId,
			userName: user.name,
			organizerId: event.organizerId,
			rfid: generateRFID(),
		});

		// 5. Increment ticketsSold
		await Event.findByIdAndUpdate(event._id, {
			$inc: { ticketsSold: 1 }, // ✅ fixed
		});

		// 6. Generate QR Code
		const ticketId = ticket._id.toString();
		const qrCode = await QRCode.toDataURL(ticketId);
		ticket.qrCode = qrCode;

		// 7. Save ticket
		await ticket.save();

		res.status(201).json(ticket);
	} catch (error) {
		console.error("🚨 Ticket booking error:", error);
		res.status(500).json({ message: "Failed to book ticket." });
	}
};


export const cancelTicket = async (req, res) => {
	try {
		const { ticketId } = req.params;

		const ticket = await Ticket.findById(ticketId);
		if (!ticket) {
			return res.status(404).json({ message: "Ticket not found." });
		}

		// Optional: Only the owner can delete their ticket
		if (ticket.userId.toString() !== req.user.id) {
			return res
				.status(403)
				.json({ message: "Unauthorized to cancel this ticket." });
		}
		

		await Ticket.findByIdAndDelete(ticketId);
		// Decrement ticketsSold
		await Event.findByIdAndUpdate(ticket.event, {
			$inc: { ticketsSold: -1 }, // ✅ fixed
		});

		return res
			.status(200)
			.json({ message: "Ticket cancelled successfully." });
	} catch (error) {
		console.error("❌ Error cancelling ticket:", error);
		return res.status(500).json({ message: "Server error cancelling the ticket." });
	}
};



// 🗂 Get User's Tickets (with populated event details)
export const getUserTickets = async (req, res) => {
	try {
		const userId = req.user.id;

		const tickets = await Ticket.find({ userId })
			.populate("eventId", "title date startTime endTime location image") // ✅ added date
			.select("eventId userId userName rfid qrCode checkedIn createdAt");

		res.status(200).json(tickets);
	} catch (error) {
		console.error("❌ Failed to get user tickets:", error);
		res.status(500).json({
			message: "Server error while fetching tickets.",
		});
	}
};




// 🎟 Get All Tickets for a Specific Event
export const getEventTickets = async (req, res) => {
	try {
		const { eventId } = req.params;

		const event = await Event.findById(eventId);
		if (!event) {
			return res.status(404).json({ message: "Event not found." });
		}

		const tickets = await Ticket.find({ eventId })
			.populate("eventId", "title date startTime endTime location image") // ✅ added date
			.select("userName rfid qrCode userId checkedIn createdAt eventId");

		res.status(200).json(tickets);
	} catch (error) {
		console.error("❌ Failed to fetch event tickets:", error);
		res.status(500).json({
			message: "Server error while fetching tickets.",
		});
	}
};


export const checkInTicket = async (req, res) => {
	try {
		const { ticketId, eventId } = req.body;

		if (!ticketId || !eventId) {
			return res.status(400).json({
				message: "⚠️ Ticket ID and Event ID are required.",
			});
		}

		const ticket = await Ticket.findOne({ _id: ticketId, eventId });
		if (!ticket) {
			return res.status(404).json({ message: "❌ Ticket not found." });
		}

		const event = await Event.findById(eventId);
		if (!event) {
			return res.status(404).json({ message: "❌ Event not found." });
		}

		const now = new Date();
		if (now < new Date(event.startTime)) {
			return res.status(400).json({
				message: "⏳ Event has not started yet. You cannot check in.",
			});
		}
		if (now > new Date(event.endTime)) {
			return res.status(400).json({
				message: "⛔ Ticket expired. The event has already ended.",
			});
		}
		if (ticket.checkedIn) {
			return res.status(200).json({
				message: "✔️ Ticket already checked in.",
				ticket,
			});
		}

		ticket.checkedIn = true;
		ticket.checkedInAt = now;
		await ticket.save();

		return res.status(200).json({
			message: "✅ Check-in successful!",
			ticket,
		});
	} catch (error) {
		console.error("🚨 Error during check-in:", error);
		res.status(500).json({ message: "❌ Internal server error." });
	}
};


// ✅ Verify Ticket via Ticket ID or RFID — Organizer Only
export const verifyTicket = async (req, res) => {
	try {
		const { rfid, ticketId, eventId } = req.body;

		if (!rfid && !ticketId) {
			return res
				.status(400)
				.json({ message: "⚠️ Provide either RFID or Ticket ID." });
		}

		if (!eventId) {
			return res.status(400).json({
				message: "⚠️ Event ID is required.",
			});
		}

		// Find the ticket based on input
		const ticket = await Ticket.findOne(
			rfid ? { rfid, eventId } : { _id: ticketId, eventId }
		);

		if (!ticket) {
			return res.status(404).json({ message: "❌ Ticket not found." });
		}

		// Find the event
		const event = await Event.findById(eventId);
		if (!event) {
			return res.status(404).json({ message: "❌ Event not found." });
		}

		// 🔐 Only the event organizer can verify
		if (ticket.organizerId.toString() !== req.user.id) {
			return res.status(403).json({
				message:
					"⛔ Unauthorized. Only the event organizer can verify this ticket.",
			});
		}

		// 		// Helper: Convert UTC to IST
		// const toIST = (date) => {
		//   const utc = new Date(date);
		//   const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5.5 hrs
		//   return new Date(utc.getTime() + istOffset);
		// };
		
		// // Get current IST time
		// const nowIST = toIST(Date.now());
		// // Convert event start & end times to IST
		// const eventStartIST = toIST(event.startTime);
		// const eventEndIST = toIST(event.endTime);
		
		// // Check: Has the event started?
		// if (nowIST < eventStartIST) {
		//   return res.status(400).json({
		//     message: "⏳ Event has not started yet. You cannot check in.",
		//   });
		// }
		
		// // Optional: Check if event is already over
		// if (nowIST > eventEndIST) {
		//   return res.status(400).json({
		//     message: "⛔ Event has already ended. You cannot check in.",
		//   });
		// }


		// Check if ticket is already verified - add debugging
		console.log("Ticket check-in status:", ticket.checkedIn);
		
		if (ticket.checkedIn === true) {
			console.log("Sending 'already verified' response");
			return res.status(200).json({
				message: "ALREADY_VERIFIED",  // Use a consistent key that's easier to match
				status: "already_verified",   // Add an additional field for clarity
				ticket,
			});
		}

		// ✅ Mark as checked in
		ticket.checkedIn = true;

		await ticket.save();
		
		console.log("Ticket verified successfully");
		
		// This response is only sent for newly verified tickets
		res.status(200).json({
			message: "VERIFIED_SUCCESS",  // Use a consistent key
			status: "success",            // Add an additional field
			ticket,
		});
	} catch (error) {
		console.error("🚨 Verify Ticket Error:", error);
		res.status(500).json({ message: "❌ Internal Server Error." });
	}
};
