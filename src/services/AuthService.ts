import bcrypt from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import db from "../config/database";
import { env } from "../config/environment";
import {
    ConflictError,
    AuthenticationError,
    NotFoundError,
    AuthTokenPayload,
    ValidationError,
} from "../types";
import logger from "../utils/logger";
import ImageKit from "imagekit";
import {
    compareTokens,
    generateVerificationToken,
    hashTokenForLookup,
} from "../utils/token";
import { emailService } from "./EmailService";

export interface UpdateProfileData {
    name?: string;
    email?: string;
    bio?: string;
    profileImage?: string | null;
}

export interface ChangePasswordData {
    oldPassword: string;
    newPassword: string;
}

export interface SetPasswordData {
    newPassword: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
}

export interface LoginData {
    email: string;
    password: string;
}

// ImageKit Instance Initialization
const imagekit = new ImageKit({
    publicKey: env.IMAGEKIT_PUBLIC_KEY as string,
    privateKey: env.IMAGEKIT_PRIVATE_KEY as string,
    urlEndpoint: env.IMAGEKIT_URL_ENDPOINT as string,
});

export class AuthService {
    private getExpiryDate(duration = env.VERIFICATION_TOKEN_EXPIRES_IN): Date {
        const match = /^(\d+)(d|h|m|s)$/.exec(duration);
        const fallbackMs = 60 * 60 * 1000;
        if (!match) return new Date(Date.now() + fallbackMs);

        const value = Number(match[1]);
        const unit = match[2];
        const multiplier =
            unit === "d"
                ? 24 * 60 * 60 * 1000
                : unit === "h"
                  ? 60 * 60 * 1000
                  : unit === "m"
                    ? 60 * 1000
                    : 1000;

        return new Date(Date.now() + value * multiplier);
    }

    private async createAuthToken(
        userId: string,
        purpose: "EMAIL_VERIFY" | "OAUTH_LOGIN_CODE" | "SET_PASSWORD",
        expiresIn?: string
    ): Promise<string> {
        const rawToken = generateVerificationToken();

        await db.authToken.create({
            data: {
                userId,
                purpose: purpose as any,
                tokenHash: hashTokenForLookup(rawToken),
                expiresAt: this.getExpiryDate(expiresIn),
            },
        });

        return rawToken;
    }

    private async consumeAuthToken(
        rawToken: string,
        purpose: "EMAIL_VERIFY" | "OAUTH_LOGIN_CODE" | "SET_PASSWORD"
    ) {
        const token = await db.authToken.findFirst({
            where: {
                tokenHash: hashTokenForLookup(rawToken),
                purpose: purpose as any,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            include: {
                user: {
                    include: {
                        subscription: {
                            where: { status: "ACTIVE" as any },
                        },
                    },
                },
            },
        });

        if (!token) {
            throw new NotFoundError(
                "Invalid or expired token.",
                "INVALID_TOKEN"
            );
        }

        await db.authToken.update({
            where: { id: token.id },
            data: { consumedAt: new Date() },
        });

        return token.user;
    }

    private async ensurePasswordIdentity(userId: string, email: string) {
        await db.authIdentity.upsert({
            where: {
                provider_providerAccountId: {
                    provider: "PASSWORD" as any,
                    providerAccountId: email,
                },
            },
            create: {
                userId,
                provider: "PASSWORD" as any,
                providerAccountId: email,
                providerEmail: email,
            },
            update: {
                userId,
                providerEmail: email,
            },
        });
    }

    private async ensureGoogleIdentity(
        userId: string,
        googleId: string,
        email: string
    ) {
        await db.authIdentity.upsert({
            where: {
                provider_providerAccountId: {
                    provider: "GOOGLE" as any,
                    providerAccountId: googleId,
                },
            },
            create: {
                userId,
                provider: "GOOGLE" as any,
                providerAccountId: googleId,
                providerEmail: email,
            },
            update: {
                userId,
                providerEmail: email,
            },
        });
    }

    async register(data: RegisterData) {
        const { name, email, password } = data;

        // 1. Validation Check (Minimal validation)
        if (!name || !email || !password) {
            throw new ValidationError(
                "Missing required fields: name, email, and password.",
                "MISSING_FIELDS",
            );
        }

        // 2. Check if user already exists
        const existingUser = await db.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictError("Email already registered");
        }

        // 3. Hash Password (Simplifying salt round logic as Zod should handle type conversion)
        const saltRounds = env.BCRYPT_SALT_ROUNDS;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 4. Create user (isVerified: false)
        const user = await db.user.create({
            data: {
                name,
                email,
                hashedPass: passwordHash,
                role: "USER" as any, // Default role
                isVerified: false, // Default to NOT verified
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                isVerified: true,
            },
        });

        await this.ensurePasswordIdentity(user.id, user.email);
        const rawToken = await this.createAuthToken(user.id, "EMAIL_VERIFY");

        // 5. Send Verification Email
        await emailService.sendVerificationEmail(
            user.email,
            user.name,
            rawToken, // Send the raw token in the link
        );

        logger.info("User registered, verification email sent", {
            userId: user.id,
            email,
        });

        return {
            message:
                "Registration successful. Please check your email to verify your account.",
        };
    }

    /**
     * Logs in user, returns JWT and safe user info.
     */
    async login(data: LoginData) {
        const { email, password } = data;

        if (!email || !password) {
            throw new AuthenticationError(
                "Missing email or password",
                "MISSING_CREDENTIALS",
            );
        }

        // 1. Find user (including subscription for token payload)
        const user = await db.user.findUnique({
            where: { email },
            // FIX: Include subscription to check if user is subscriber
            include: {
                subscription: {
                    select: { status: true },
                    where: { status: "ACTIVE" as any }, // Only check for ACTIVE subscription
                },
            },
        });

        if (!user) {
            throw new AuthenticationError(
                "Invalid credentials",
                "INVALID_CREDENTIALS",
            );
        }

        // 2. NEW: Check if email is verified
        if (!user.isVerified) {
            throw new AuthenticationError(
                "Account not verified. Please check your email for the verification link.",
                "EMAIL_NOT_VERIFIED",
            );
        }

        // 3. Check if user is suspended (assuming 'isSuspended' exists on model)
        if (user.isSuspended) {
            throw new AuthenticationError(
                "Account suspended. Please contact support.",
                "ACCOUNT_SUSPENDED",
            );
        }

        // 4. Verify password
        if (!user.hashedPass) {
            throw new AuthenticationError(
                "This account uses Google sign-in. Set a password before using email login.",
                "PASSWORD_NOT_SET",
            );
        }
        const isValidPassword = await bcrypt.compare(password, user.hashedPass);
        if (!isValidPassword) {
            throw new AuthenticationError(
                "Invalid credentials",
                "INVALID_CREDENTIALS",
            );
        }

        // 5. Determine Subscription Status
        const isSubscriber = !!user.subscription; // True if subscription object exists
        await this.ensurePasswordIdentity(user.id, user.email);

        // 6. Generate token payload (corrected isSubscriber)
        const tokenPayload: AuthTokenPayload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            // FIX: Correctly check for active subscription
            isSubscriber: isSubscriber,
        };

        const token = this.generateToken(tokenPayload);

        logger.info("User logged in successfully", { userId: user.id, email });

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isSubscriber: isSubscriber, // Send status to frontend
                createdAt: user.createdAt,
            },
        };
    }

    async verifyUser(rawToken: string) {
        let user: any;

        try {
            user = await this.consumeAuthToken(rawToken, "EMAIL_VERIFY");
        } catch (error) {
            // Legacy fallback for users created before AuthToken existed.
            const legacyUsers = await db.user.findMany({
                where: { isVerified: false, verificationToken: { not: null } },
            });
            user = undefined;
            for (const candidate of legacyUsers) {
                if (
                    candidate.verificationToken &&
                    (await compareTokens(rawToken, candidate.verificationToken))
                ) {
                    user = candidate;
                    break;
                }
            }

            if (!user) throw error;
        }

        if (user.isVerified) {
            return { message: "Email already verified." };
        }

        // Update user status
        await db.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationToken: null, // Clear the token
            },
        });
        return { message: "Email successfully verified. You can now log in." };
    }

    async resendVerificationEmail(email: string) {
        const user = await db.user.findUnique({ where: { email } });

        if (!user) {
            // Security: return success without confirming user existence
            return {
                message:
                    "If an account with that email exists and is not verified, a new verification link has been sent.",
            };
        }

        if (user.isVerified) {
            throw new ConflictError(
                "Email is already verified.",
                "EMAIL_ALREADY_VERIFIED",
            );
        }

        await db.authToken.updateMany({
            where: {
                userId: user.id,
                purpose: "EMAIL_VERIFY" as any,
                consumedAt: null,
            },
            data: { consumedAt: new Date() },
        });

        const rawToken = await this.createAuthToken(user.id, "EMAIL_VERIFY");

        await emailService.sendVerificationEmail(
            user.email,
            user.name,
            rawToken,
        );

        return {
            message: "A new verification link has been sent to your email.",
        };
    }

    /**
     * Get the profile of a user by ID.
     */
    async getProfile(userId: string) {
        if (!userId) {
            throw new AuthenticationError(
                "User ID is required",
                "MISSING_USER_ID",
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
     * Updates user profile information.
     */
    async updateProfile(userId: string, data: UpdateProfileData) {
        if (data.email) {
            const existingUser = await db.user.findUnique({
                where: { email: data.email },
            });
            if (existingUser && existingUser.id !== userId) {
                throw new ConflictError("Email already registered");
            }
        }

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: data,
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

        logger.info("User profile updated successfully", { userId });
        return updatedUser;
    }

    async uploadAvatar(file?: Express.Multer.File): Promise<string> {
        if (!file) {
            throw new ValidationError("No file provided", "NO_FILE");
        }

        // Convert file buffer (from memory storage) to Base64 for ImageKit
        const base64File = file.buffer.toString("base64");

        try {
            const result = await imagekit.upload({
                file: base64File,
                fileName: `avatar-${Date.now()}-${file.originalname}`,
                folder: "/user-avatars", // Dedicated folder on ImageKit
            });

            logger.info("ImageKit avatar upload successful", {
                url: result.url,
            });

            return result.url; // <--- RETURNS FULL IMAGEKIT URL
        } catch (error) {
            logger.error("ImageKit avatar upload failed", { error });
            throw new Error("Failed to upload avatar to cloud storage");
        }
    }

    /**
     * Changes user's password after verifying old password.
     */
    async changePassword(userId: string, data: ChangePasswordData) {
        const { oldPassword, newPassword } = data;

        const user = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, hashedPass: true },
        });

        if (!user) {
            throw new NotFoundError("User not found", "USER_NOT_FOUND");
        }

        if (!user.hashedPass) {
            throw new AuthenticationError(
                "You don't have a password set.",
                "PASSWORD_NOT_SET",
            );
        }
        const isValidPassword = await bcrypt.compare(
            oldPassword,
            user.hashedPass,
        );
        if (!isValidPassword) {
            throw new AuthenticationError(
                "Incorrect old password",
                "INVALID_CREDENTIALS",
            );
        }

        const saltRounds =
            typeof env.BCRYPT_SALT_ROUNDS === "string"
                ? parseInt(env.BCRYPT_SALT_ROUNDS, 10)
                : env.BCRYPT_SALT_ROUNDS;
        const newPasswordHash = await bcrypt.hash(
            newPassword,
            saltRounds || 10,
        );

        await db.user.update({
            where: { id: userId },
            data: { hashedPass: newPasswordHash },
        });

        logger.info("User password changed successfully", { userId });
    }

    async setPassword(userId: string, data: SetPasswordData) {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, hashedPass: true },
        });

        if (!user) {
            throw new NotFoundError("User not found", "USER_NOT_FOUND");
        }

        if (user.hashedPass) {
            throw new ConflictError(
                "Password already set. Use change password instead.",
                "PASSWORD_ALREADY_SET"
            );
        }

        const newPasswordHash = await bcrypt.hash(
            data.newPassword,
            env.BCRYPT_SALT_ROUNDS
        );

        await db.user.update({
            where: { id: userId },
            data: { hashedPass: newPasswordHash },
        });

        await this.ensurePasswordIdentity(user.id, user.email);

        logger.info("Password set successfully", { userId });
    }

    async handleGoogleProfile(profile: any) {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const emailVerified = profile.emails?.[0]?.verified !== false;

        if (!email || !emailVerified) {
            throw new AuthenticationError(
                "Google account must have a verified email.",
                "GOOGLE_EMAIL_NOT_VERIFIED"
            );
        }

        const googleId = profile.id;
        const activeSubscription = {
            where: { status: "ACTIVE" as any },
        };

        const existingGoogleIdentity = await db.authIdentity.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: "GOOGLE" as any,
                    providerAccountId: googleId,
                },
            },
            include: { user: { include: { subscription: activeSubscription } } },
        });

        if (existingGoogleIdentity) {
            return {
                ...existingGoogleIdentity.user,
                isSubscriber: !!existingGoogleIdentity.user.subscription,
            };
        }

        const existingGoogleUser = await db.user.findUnique({
            where: { googleId },
            include: { subscription: activeSubscription },
        });

        if (existingGoogleUser) {
            await this.ensureGoogleIdentity(existingGoogleUser.id, googleId, email);
            return {
                ...existingGoogleUser,
                isSubscriber: !!existingGoogleUser.subscription,
            };
        }

        const existingEmailUser = await db.user.findUnique({
            where: { email },
            include: { subscription: activeSubscription },
        });

        if (existingEmailUser) {
            const updatedUser = await db.user.update({
                where: { id: existingEmailUser.id },
                data: {
                    googleId,
                    isVerified: true,
                    profileImage:
                        existingEmailUser.profileImage ||
                        profile.photos?.[0]?.value ||
                        null,
                },
                include: { subscription: activeSubscription },
            });
            await this.ensureGoogleIdentity(updatedUser.id, googleId, email);
            if (updatedUser.hashedPass) {
                await this.ensurePasswordIdentity(updatedUser.id, updatedUser.email);
            }
            return {
                ...updatedUser,
                isSubscriber: !!updatedUser.subscription,
            };
        }

        const newUser = await db.user.create({
            data: {
                googleId,
                email,
                name: profile.displayName || email.split("@")[0],
                profileImage: profile.photos?.[0]?.value || null,
                isVerified: true,
                role: "USER" as any,
                status: "ACTIVE" as any,
                isSuspended: false,
                hashedPass: null,
                bio: "",
            },
            include: { subscription: activeSubscription },
        });

        await this.ensureGoogleIdentity(newUser.id, googleId, email);

        return {
            ...newUser,
            isSubscriber: !!newUser.subscription,
        };
    }

    async createOAuthLoginCode(userId: string) {
        await db.authToken.updateMany({
            where: {
                userId,
                purpose: "OAUTH_LOGIN_CODE" as any,
                consumedAt: null,
            },
            data: { consumedAt: new Date() },
        });

        return this.createAuthToken(userId, "OAUTH_LOGIN_CODE", "5m");
    }

    async exchangeOAuthLoginCode(code: string) {
        const user = await this.consumeAuthToken(code, "OAUTH_LOGIN_CODE");
        if (user.isSuspended || user.status === "BANNED") {
            throw new AuthenticationError(
                "Account suspended. Please contact support.",
                "ACCOUNT_SUSPENDED"
            );
        }

        const tokenPayload = this.createTokenPayload({
            ...user,
            isSubscriber: !!user.subscription,
        });
        const token = this.generateToken(tokenPayload);

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isSubscriber: !!user.subscription,
                createdAt: user.createdAt,
            },
        };
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

    /**
     * Generates a JWT token.
     */
    generateToken(payload: AuthTokenPayload): string {
        return jwt.sign(
            payload,
            env.JWT_SECRET as Secret,
            {
                expiresIn: env.JWT_EXPIRES_IN,
            } as SignOptions,
        );
    }

    /**
     * Generates token payload from user object.
     */
    createTokenPayload(user: any): AuthTokenPayload {
        const isSubscriber = user.isSubscriber ?? !!user.subscription;
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isSubscriber: isSubscriber,
        };
    }
}
