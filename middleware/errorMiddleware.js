import process from "process";

const errorHandler = (err, req, res, next) => {
	console.error(`Error: ${err.message}`);

	const statusCode =
		res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

	res.status(statusCode).json({
		success: false,
		message: err.message || "Internal Server Error",
		stack: process.env.NODE_ENV === "production" ? null : err.stack,
	});
};

const notFoundHandler = (req, res, next) => {
	const error = new Error(`Not Found - ${req.originalUrl}`);
	res.status(404);
	next(error); // Pass to errorHandler
};

export { errorHandler, notFoundHandler };
