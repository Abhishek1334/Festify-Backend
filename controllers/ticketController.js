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

export const bookTicket = async (req, res) => {
	try {
		if (!req.user || !req.user.id) {
			return res
				.status(401)
				.json({ message: "Unauthorized. Please log in." });
		}

		const { eventId } = req.body;

		if (!eventId) {
			return res.status(400).json({ message: "Event ID is required." });
		}

		// Fetch event details
		const event = await Event.findById(eventId);
		if (!event) {
			return res.status(404).json({ message: "Event not found." });
		}

		// ✅ Convert event start & end time to IST for proper comparison
		const currentTime = moment().tz("Asia/Kolkata"); // Current time in IST
		const eventStartTime = moment(event.startTime).tz("Asia/Kolkata");
		const eventEndTime = moment(event.endTime).tz("Asia/Kolkata");

		// 🛑 Stop booking when event starts
		if (currentTime.isSameOrAfter(eventStartTime)) {
			return res
				.status(400)
				.json({ message: "Ticket sales closed. Event has started." });
		}

		// 🛑 Stop booking when event ends
		if (currentTime.isSameOrAfter(eventEndTime)) {
			return res.status(400).json({
				message: "Event has ended. No more tickets available.",
			});
		}

		// Check if user already booked a ticket
		const existingTicket = await Ticket.findOne({
			eventId,
			userId: req.user.id,
		});
		if (existingTicket) {
			return res.status(400).json({
				message: "You already booked a ticket for this event.",
			});
		}

		// Check event capacity
		if (event.ticketsSold >= event.capacity) {
			return res
				.status(400)
				.json({ message: "No more tickets available." });
		}

		// Fetch user details
		const user = await User.findById(req.user.id);
		if (!user) {
			return res.status(404).json({ message: "User not found." });
		}

		// ✅ Generate Unique RFID (Retry if Duplicate)
		let rfid;
		let isUnique = false;
		let attempts = 0;
		const maxAttempts = 5;
		while (!isUnique && attempts < maxAttempts) {
			rfid = generateRFID();
			const existingRFID = await Ticket.findOne({ rfid });
			if (!existingRFID) isUnique = true;
			attempts++;
		}
		if (!isUnique) {
			return res
				.status(500)
				.json({ message: "Failed to generate a unique RFID." });
		}


		// ✅ Generate QR Code with Embedded RFID & Ticket ID
		const qrData = `${req.user.id}-${eventId}-RFID:${rfid}`;
		const qrCode = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
			qrData
		)}`;


		// ✅ Create Ticket with RFID
		const ticket = await Ticket.create({
			eventId,
			userId: req.user.id,
			userName: user.name,
			qrCode,
			rfid,
		});

		// ✅ Increase ticket count
		const totalTickets = await Ticket.countDocuments({ eventId });
		if (totalTickets >= event.capacity) {
			return res
				.status(400)
				.json({ message: "No more tickets available." });
		}


		res.status(201).json(ticket);
	} catch (error) {
	console.error("Ticket booking error:", error);

	res.status(500).json({
		error: true,
		message: error.message || "Internal server error.",
	});
}
};



// 🗂 Get User's Tickets
export const getUserTickets = async (req, res) => {
	try {
		const userId = req.user.id;
		const tickets = await Ticket.find({ userId }).populate(
			"eventId",
			"name date"
		);

		res.status(200).json(tickets);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};

// 🎟 Get All Tickets for a Specific Event
export const getEventTickets = async (req, res) => {
	try {
		const { eventId } = req.params;

		// Check if the event exists
		const event = await Event.findById(eventId);
		if (!event) {
			return res.status(404).json({ message: "Event not found" });
		}

		// Get all tickets for the event
		const tickets = await Ticket.find({ eventId }).select(
			"userName checkedIn createdAt updatedAt qrCode userId eventId"
		);

		res.status(200).json(tickets);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};

// ✅ Check-In a Ticket
export const checkInTicket = async (req, res) => {
	try {
		const { ticketId, rfid, eventId } = req.body; // Accept both RFID and Ticket ID

		// ✅ Ensure at least one identifier is provided
		if (!ticketId && !rfid) {
			return res.status(400).json({
				message:
					"⚠️ Please provide either Ticket ID or RFID for check-in.",
			});
		}

		// ✅ Find the ticket by either Ticket ID or RFID
		const ticket = await Ticket.findOne({
			$or: [{ _id: ticketId }, { rfid }],
		});

		if (!ticket) {
			return res.status(404).json({
				message: "❌ Ticket not found. Please check the ID or RFID.",
			});
		}

		// ✅ Ensure the ticket belongs to the correct event
		if (ticket.event.toString() !== eventId) {
			return res.status(400).json({
				message: "⚠️ This ticket does not belong to this event.",
			});
		}

		// ✅ Check if the ticket has already been checked in
		if (ticket.checkedIn) {
			return res.status(400).json({
				message: "⚠️ Ticket has already been checked in.",
			});
		}

		// ✅ Mark ticket as checked in
		ticket.checkedIn = true;
		await ticket.save();

		res.status(200).json({
			message: "✅ Check-in successful.",
			ticket,
		});
	} catch (error) {
		console.error("🚨 Error during check-in:", error);
		res.status(500).json({
			message: "❌ Internal server error. Please try again.",
		});
	}
};



// ❌ Cancel a Ticket
export const cancelTicket = async (req, res) => {
	try {
		const { ticketId } = req.params;
		const userId = req.user.id;

		// Find the ticket
		const ticket = await Ticket.findById(ticketId);
		if (!ticket) {
			return res.status(404).json({ message: "Ticket not found" });
		}

		// Ensure the ticket belongs to the logged-in user
		if (ticket.userId.toString() !== userId) {
			return res
				.status(403)
				.json({ message: "Unauthorized to cancel this ticket" });
		}

		// Fetch the event and update ticketsSold atomically
		const event = await Event.findById(ticket.eventId);
		if (!event) {
			return res.status(404).json({ message: "Event not found" });
		}

		// ❌ Delete the ticket first
		await Ticket.findByIdAndDelete(ticketId);

		// ✅ Atomically decrement ticketsSold (prevent negative values)
		await Event.findByIdAndUpdate(
			ticket.eventId,
			{ $inc: { ticketsSold: -1 } },
			{ new: true }
		);

		// Ensure ticketsSold is never negative
		await Event.findByIdAndUpdate(
			ticket.eventId,
			{ $max: { ticketsSold: 0 } } // Ensures ticketsSold never goes below 0
		);

		res.status(200).json({ message: "Ticket canceled successfully" });
	} catch (error) {
		console.error("Error canceling ticket:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};


// ✅ Ticket Verification API
export const verifyTicket = async (req, res) => {
	try {
		const { rfid, ticketId, eventId } = req.body;

		// ✅ Ensure eventId is provided
		if (!eventId) {
			return res.status(400).json({ message: "Event ID is required." });
		}

		// ✅ Fetch event details
		const event = await Event.findById(eventId);
		if (!event) {
			return res.status(404).json({ message: "Event not found." });
		}

		// ✅ Convert event times to IST
		const currentTime = moment().tz("Asia/Kolkata");
		const eventStartTime = moment(event.startTime).tz("Asia/Kolkata");
		const eventEndTime = moment(event.endTime).tz("Asia/Kolkata");

		// 🛑 Event not started yet
		if (currentTime.isBefore(eventStartTime)) {
			return res
				.status(400)
				.json({ message: "Event has not started yet." });
		}

		// 🛑 Event has ended
		if (currentTime.isAfter(eventEndTime)) {
			return res
				.status(400)
				.json({ message: "Ticket expired. Event has ended." });
		}

		// ✅ Find ticket using RFID or Ticket ID
		let ticket;
		if (rfid) {
			ticket = await Ticket.findOne({ rfid, eventId });
		} else if (ticketId) {
			ticket = await Ticket.findOne({ _id: ticketId, eventId });
		} else {
			return res
				.status(400)
				.json({ message: "Provide RFID or Ticket ID." });
		}

		// 🛑 Invalid ticket
		if (!ticket) {
			return res
				.status(404)
				.json({ message: "Invalid Ticket. Not found." });
		}

		// ✅ Check if ticket is already verified
		if (ticket.checkedIn) {
			return res.status(200).json({
				message: "Ticket already verified.",
				ticket,
			});
		}

		// ✅ Mark ticket as verified (checked-in)
		ticket.checkedIn = true;
		await ticket.save();

		return res.status(200).json({
			message: "Ticket Verified Successfully!",
			ticket,
		});
	} catch (error) {
		console.error("Ticket verification error:", error);
		res.status(500).json({ message: "Internal Server Error." });
	}
};
