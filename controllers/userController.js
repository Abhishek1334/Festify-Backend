import User from "../models/userModel.js";
import Event from "../models/eventModel.js";

// Get User by ID
export const getUserById = async (req, res) => {
	try {
		const user = await User.findById(req.params.id).select("name email");
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		res.json(user);
	} catch (error) {
		console.error("Error fetching user:", error);
		res.status(500).json({ message: "Server error" });
	}
};

// Get Events the User Has RSVP'd To
export const getUserRsvps = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// ✅ Find events where the user's ID is in the "attendees" list
		const events = await Event.find({ attendees: req.params.id });

		res.json(events);
	} catch (error) {
		console.error("Error fetching RSVPs:", error);
		res.status(500).json({ message: "Server error" });
	}
};
