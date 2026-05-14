import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import {
    AuthenticatedRequest,
    AuthTokenPayload,
    AuthenticationError,
    AuthorizationError,
} from "../types";
import { env } from "../config/environment";
import { ResponseHandler } from "../utils/response";
import db from "../config/database";

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
            (authHeader && authHeader.startsWith("Bearer ")
                ? authHeader.split(" ")[1]
                : undefined) ||
            req.cookies?.token;

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

        const currentUser = await db.user.findUnique({
            where: { id: payload.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                isSuspended: true,
                subscription: {
                    select: { status: true },
                },
            },
        });

        if (!currentUser) {
            throw new AuthenticationError("User not found", "USER_NOT_FOUND");
        }

        if (currentUser.isSuspended || currentUser.status === "BANNED") {
            throw new AuthenticationError(
                "Account suspended. Please contact support.",
                "ACCOUNT_SUSPENDED"
            );
        }

        // Attach current DB-backed auth context to req.
        req.user = {
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role as any,
            isSubscriber: currentUser.subscription?.status === "ACTIVE",
            iat: payload.iat,
            exp: payload.exp,
        };
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
        const userRole = String(req.user.role || "")
            .trim()
            .toUpperCase();
        if (!roles.includes(userRole)) {
            const error = new AuthorizationError();
            return ResponseHandler.error(
                res,
                error.message,
                error.statusCode,
                error.code,
                undefined,
                req.traceId
            );
        }

        next();
    };
};

export const requireSuperAdmin = requireRole(["SUPERADMIN"]);

// NEW: 2. Auth Guard for SUBSCRIBER only
export const requireSubscriber = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return ResponseHandler.error(
            res,
            "Authentication required for subscription check",
            401,
            "AUTH_REQUIRED",
            undefined,
            req.traceId
        );
    }

    // Check the flag which should be present in the JWT payload
    if (!req.user.isSubscriber) {
        // Use AuthorizationError for subscription access issues
        const error = new AuthorizationError(
            "Subscription required to access this feature",
            "SUBSCRIPTION_REQUIRED"
        );
        return ResponseHandler.error(
            res,
            error.message,
            error.statusCode,
            error.code,
            undefined,
            req.traceId
        );
    }

    next();
};
