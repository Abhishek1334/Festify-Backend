import QRCode from "qrcode";

// Function to generate QR code from ticket data
export const generateQRCode = async (ticketId) => {
	try {
		const qrCodeDataURL = await QRCode.toDataURL(ticketId);
		return qrCodeDataURL;
	} catch (error) {
		console.error("Error generating QR Code:", error);
		throw new Error("Failed to generate QR Code");
	}
};
