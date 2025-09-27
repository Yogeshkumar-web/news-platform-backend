import bcrypt from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import db from "../config/database";
import { env } from "../config/environment";
import {
    ConflictError,
    AuthenticationError,
    NotFoundError,
    AuthTokenPayload,
} from "../types";
import logger from "../utils/logger";

export interface RegisterData {
    name: string;
    email: string;
    password: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export class AuthService {
    /**
     * Registers a new user with hashed password.
     */
    async register(data: RegisterData) {
        const { name, email, password } = data;

        // Enforce minimal validation here as an extra safety
        if (!name || !email || !password) {
            throw new AuthenticationError(
                "Missing required fields",
                "MISSING_FIELDS"
            );
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictError("Email already registered", "EMAIL_EXISTS");
        }

        // Hash password safely
        const saltRounds =
            typeof env.BCRYPT_SALT_ROUNDS === "string"
                ? parseInt(env.BCRYPT_SALT_ROUNDS, 10)
                : env.BCRYPT_SALT_ROUNDS;
        if (!saltRounds || saltRounds < 10) {
            // Minimum recommended salt rounds
            logger.warn("BCRYPT_SALT_ROUNDS too low, defaulting to 10");
        }
        const passwordHash = await bcrypt.hash(password, saltRounds || 10);

        // Create user
        const user = await db.user.create({
            data: {
                name,
                email,
                hashedPass: passwordHash,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        logger.info("User registered successfully", { userId: user.id, email });

        return user;
    }

    /**
     * Logs in user, returns JWT and safe user info.
     */
    async login(data: LoginData) {
        const { email, password } = data;

        if (!email || !password) {
            throw new AuthenticationError(
                "Missing email or password",
                "MISSING_CREDENTIALS"
            );
        }

        // Find user
        const user = await db.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Avoid leaking which credential is wrong
            throw new AuthenticationError(
                "Invalid credentials",
                "INVALID_CREDENTIALS"
            );
        }

        // Check if user is suspended (must exist in schema)
        if ((user as any).isSuspended) {
            throw new AuthenticationError(
                "Account suspended",
                "ACCOUNT_SUSPENDED"
            );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.hashedPass);
        if (!isValidPassword) {
            throw new AuthenticationError(
                "Invalid credentials",
                "INVALID_CREDENTIALS"
            );
        }

        // Generate token
        const tokenPayload: AuthTokenPayload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };

        const token = jwt.sign(
            tokenPayload,
            env.JWT_SECRET as Secret,
            {
                expiresIn: env.JWT_EXPIRES_IN,
            } as SignOptions
        );

        logger.info("User logged in successfully", { userId: user.id, email });

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
        };
    }

    /**
     * Get the profile of a user by ID.
     */
    async getProfile(userId: string) {
        if (!userId) {
            throw new AuthenticationError(
                "User ID is required",
                "MISSING_USER_ID"
            );
        }

        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profileImage: true,
                bio: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundError("User not found", "USER_NOT_FOUND");
        }

        return user;
    }

    /**
     * Cookie options for storing JWT.
     */
    getCookieOptions(isProduction: boolean) {
        return {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax" as const,
            maxAge: this.getTokenExpiryMs(),
            path: "/",
        };
    }

    /**
     * Converts env.JWT_EXPIRES_IN to milliseconds for cookies.
     */
    private getTokenExpiryMs(): number {
        const match = /^(\d+)(d|h|m|s)$/.exec(env.JWT_EXPIRES_IN);
        if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

        const value = Number(match[1]);
        const unit = match[2];

        switch (unit) {
            case "d":
                return value * 24 * 60 * 60 * 1000;
            case "h":
                return value * 60 * 60 * 1000;
            case "m":
                return value * 60 * 1000;
            case "s":
                return value * 1000;
            default:
                return 7 * 24 * 60 * 60 * 1000;
        }
    }
}
