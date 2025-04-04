import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
	{
		title: { type: String, required: true },
		description: { type: String, required: true },
		date: {
			type: Date,
			required: true,
			validate: {
				validator: (value) => !isNaN(new Date(value).getTime()),
				message: "Invalid date format",
			},
		},
		startTime: {
			type: Date,
			required: true,
			validate: {
				validator: (value) => !isNaN(new Date(value).getTime()),
				message: "Invalid start time format",
			},
		},
		endTime: {
			type: Date,
			required: true,
			validate: {
				validator: function (value) {
					return (
						!isNaN(new Date(value).getTime()) &&
						value > this.startTime
					);
				},
				message: "End time must be after start time",
			},
		},
		location: { type: String, required: true },
		image: { type: String, required: true }, // ✅ Updated for Cloudinary (stores URL)
		organizerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		organizerName: { type: String, required: true },
		capacity: { type: Number, required: true },
		ticketsSold: { type: Number, default: 0 },
		category: { type: String, required: true },
	},
	{ timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);
export default Event;
