/**
 * Base class for all anticipated, operational errors (4xx, controlled 5xx).
 */
export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: string;
    public readonly isOperational: boolean; // Indicates errors we expect/handle

    constructor(
        message: string,
        statusCode: number,
        errorCode: string,
        isOperational: boolean = true
    ) {
        // Parent constructor call
        super(message);

        // Assign properties
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 500 Internal Server Error (Jise hum ArticleService ya DB layer mein use karenge)
 */
export class InternalError extends ApiError {
    constructor(
        message: string = "Internal Server Error. Please try again later."
    ) {
        super(
            message,
            500, // Status Code 500
            "INTERNAL_ERROR",
            true // Operational errors me rakha hai taaki response clean jaye
        );
    }
}

/**
 * Example: 404 Not Found Error (A common operational error)
 */
export class NotFoundError extends ApiError {
    constructor(message: string = "Resource not found.") {
        super(message, 404, "NOT_FOUND", true);
    }
}

/**
 * Example: 401 Unauthorized Error (Agar AuthMiddleware fail ho jaye toh)
 */
export class UnauthorizedError extends ApiError {
    constructor(message: string = "Authentication failed or access denied.") {
        super(message, 401, "UNAUTHORIZED", true);
    }
}
