import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import {
    AuthenticatedRequest,
    AuthTokenPayload,
    AuthenticationError,
} from "../types";
import { env } from "../config/environment";
import { ResponseHandler } from "../utils/response";

/**
 * Middleware to authenticate JWT and attach user payload to req.user.
 */
export const authenticateToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        // Prefer Authorization header but also allow cookie fallback
        const authHeader = req.headers.authorization;
        const token =
            req.cookies?.token ||
            (authHeader && authHeader.startsWith("Bearer ")
                ? authHeader.split(" ")[1]
                : undefined);

        if (!token) {
            throw new AuthenticationError("No token provided");
        }

        // Verify JWT
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

        // Type guard for expected payload structure
        const payload = decoded as AuthTokenPayload;
        if (
            !payload ||
            typeof payload.id !== "string" ||
            typeof payload.email !== "string" ||
            !payload.role
        ) {
            throw new AuthenticationError("Invalid token payload");
        }

        // Attach to req
        req.user = payload;
        next();
    } catch (error: any) {
        // Handle our custom error separately
        if (error instanceof AuthenticationError) {
            return ResponseHandler.error(
                res,
                error.message,
                error.statusCode,
                error.code,
                undefined,
                req.traceId
            );
        }

        // Handle JWT library errors more granularly
        if (error.name === "TokenExpiredError") {
            return ResponseHandler.error(
                res,
                "Token expired",
                401,
                "TOKEN_EXPIRED",
                undefined,
                req.traceId
            );
        }

        if (error.name === "JsonWebTokenError") {
            return ResponseHandler.error(
                res,
                "Invalid token",
                401,
                "INVALID_TOKEN",
                undefined,
                req.traceId
            );
        }

        // Default error
        return ResponseHandler.error(
            res,
            "Authentication failed",
            401,
            "AUTH_FAILED",
            undefined,
            req.traceId
        );
    }
};

/**
 * Middleware factory to enforce user roles.
 */
export const requireRole = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        // Defensive check: ensure user attached
        if (!req.user) {
            return ResponseHandler.error(
                res,
                "Authentication required",
                401,
                "AUTH_REQUIRED",
                undefined,
                req.traceId
            );
        }

        // Defensive check: ensure user.role is present and string
        const userRole = String(req.user.role || "");
        if (!roles.includes(userRole)) {
            return ResponseHandler.error(
                res,
                "Insufficient permissions",
                403,
                "INSUFFICIENT_PERMISSIONS",
                undefined,
                req.traceId
            );
        }

        next();
    };
};
