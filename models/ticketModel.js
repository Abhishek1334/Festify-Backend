import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		eventId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Event",
			required: true,
		},
		organizerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User", // Assuming organizer is a User
			required: true,
		},
		rfid: {
			type: String,
			required: true,
			unique: true,
		},
		userName: {
			type: String,
			required: true,
		},
		qrCode: {
			type: String,
		},
		checkedIn: {
			type: Boolean,
			default: false,
		},
		
		expired: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

// Middleware to set expiration status
ticketSchema.pre("save", async function (next) {
	try {
		const event = await mongoose.model("Event").findById(this.eventId);
		if (event) {
			this.expired = new Date() > new Date(event.endTime);
		}
	} catch (error) {
		console.error("Error in ticket expiration middleware:", error);
	}
	next();
});

const Ticket = mongoose.model("Ticket", ticketSchema);
export default Ticket;
