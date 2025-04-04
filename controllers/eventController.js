import Event from "../models/eventModel.js";
import crypto from "crypto";
import axios from "axios";
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;


// Get all events
export const getEvents = async (req, res) => {
	try {
		const events = await Event.find().populate("organizerId", "name");
		res.json(
			events.map((event) => ({
				...event.toObject(),
				organizerName: event.organizerId
					? event.organizerId.name
					: "Unknown",
			}))
		);
	} catch (error) {
		console.error("Error fetching events:", error);
		res.status(500).json({ message: "Server error" });
	}
};

// Get a single event by ID
export const getEventById = async (req, res) => {
	try {
		const event = await Event.findById(req.params.id).populate(
			"organizerId",
			"name"
		);
		if (!event) return res.status(404).json({ message: "Event not found" });

		res.json({
			...event.toObject(),
			organizerName: event.organizerId
				? event.organizerId.name
				: "Unknown",
		});
	} catch (error) {
		console.error("Error fetching event:", error);
		res.status(500).json({ message: "Server error" });
	}
};


// Create a new event
export const createEvent = async (req, res) => {
	try {
		const {
			title,
			description,
			date,
			startTime,
			endTime,
			location,
			organizerId,
			organizerName,
			capacity,
			category,
			image, // ✅ Get image from req.body
		} = req.body;

		const parsedDate = new Date(date);
		const parsedStartTime = new Date(startTime);
		const parsedEndTime = new Date(endTime);

		if (
			isNaN(parsedDate) ||
			isNaN(parsedStartTime) ||
			isNaN(parsedEndTime)
		) {
			return res.status(400).json({
				message: "Invalid date format. Please provide a valid date.",
			});
		}

		if (parsedStartTime >= parsedEndTime) {
			return res.status(400).json({
				message: "Start time must be before end time.",
			});
		}

		const event = new Event({
			title,
			description,
			date: parsedDate,
			startTime: parsedStartTime,
			endTime: parsedEndTime,
			location,
			image, // ✅ Use image from req.body
			organizerId,
			organizerName,
			capacity,
			category,
		});

		await event.save();
		res.status(201).json({ message: "Event created successfully", event });
	} catch (error) {
		console.error("Error creating event:", error);
		res.status(500).json({ message: "Server Error" });
	}
};

// Update an event by ID
export const updateEvent = async (req, res) => {
	try {
		const {
			title,
			description,
			category,
			date,
			startTime,
			endTime,
			location,
			capacity,
			image, // ✅ Make sure we extract image from req.body
		} = req.body;
		const eventId = req.params.id;

		let event = await Event.findById(eventId);
		if (!event) {
			return res.status(404).json({ message: "Event not found" });
		}

		// Ensure only the organizer can update
		if (event.organizerId.toString() !== req.user.id) {
			return res
				.status(403)
				.json({ message: "Unauthorized to update this event" });
		}

		// ✅ Update event fields
		event.title = title || event.title;
		event.description = description || event.description;
		event.category = category || event.category;
		event.location = location || event.location;

		// ✅ Update date and time if provided
		if (date) event.date = new Date(date);
		if (startTime) event.startTime = new Date(startTime);
		if (endTime) event.endTime = new Date(endTime);

		// ✅ Ensure capacity is updated if a valid number is provided
		if (
			capacity !== undefined &&
			!isNaN(capacity) &&
			Number(capacity) > 0
		) {
			event.capacity = Number(capacity);
		}

		// ✅ Save only the public_id of the image
		if (image) {
			event.image = image; // Store only public_id
		}
		console.log("Event before save:", event); // Log event before saving

		await event.save();
		res.json(event);
	} catch (err) {
		console.error("Update Event Error:", err);
		res.status(500).json({ message: "Server error", error: err.message });
	}
};





// Delete Event Controller
export const deleteEvent = async (req, res) => {
	try {
		// Find event by ID
		const event = await Event.findById(req.params.id);
		if (!event) return res.status(404).json({ message: "Event not found" });

		// Check if the event has an image and delete it from Cloudinary
		if (event.image) {
			// Extract public ID from image URL (assuming it's stored as a full URL)
			const publicId = event.image.split("/").pop().split(".")[0]; // Extract public ID

			// Generate a timestamp
			const timestamp = Math.round(new Date().getTime() / 1000);

			// Create a signature using Cloudinary API secret
			const signature = crypto
				.createHash("sha1")
				.update(
					`public_id=${publicId}&timestamp=${timestamp}${cloudinaryApiSecret}`
				)
				.digest("hex");

			// Call Cloudinary API to delete the image
			const response = await axios.post(
				`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/destroy`,
				new URLSearchParams({
					public_id: publicId,
					api_key: cloudinaryApiKey,
					timestamp: timestamp,
					signature: signature,
				})
			);

			// Check Cloudinary response
			if (response.data.result !== "ok") {
				console.error("Cloudinary error:", response.data);
				return res.status(500).json({
					message: "Failed to delete image from Cloudinary",
					error: response.data,
				});
			}

			console.log("Image deleted from Cloudinary.");
		}

		// Proceed with deleting the event from the database
		await event.deleteOne();
		res.json({ message: "Event deleted successfully" });
	} catch (error) {
		console.error("Error deleting event:", error);

		// Handle Cloudinary API authentication errors
		if (error.response && error.response.status === 401) {
			return res.status(401).json({
				message:
					"Unauthorized request, please check your Cloudinary API credentials",
			});
		}

		// Handle general server errors
		res.status(500).json({ message: "Server error" });
	}
};

export const getUserEvents = async (req, res) => {
	try {
		const userId = req.user.id;
		const events = await Event.find({ organizerId: userId });
		res.json(events);
	} catch (error) {
		console.error("Error fetching user events:", error);
		res.status(500).json({ message: "Server error" });
	}
};
