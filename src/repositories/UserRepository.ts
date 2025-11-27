import db from "../config/database";
// Import Prisma types for full type safety in create/update operations
import { Prisma } from "../generated/prisma/client";

export class UserRepository {
    /**
     * Finds a user by ID. Excludes sensitive data like hashedPass by default.
     */
    async findById(userId: string) {
        return db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                bio: true,
                profileImage: true,
                status: true, // For status management
                isSuspended: true, // For suspension check
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    /**
     * Finds a user by email. Returns ALL fields, including 'hashedPass' for authentication.
     */
    async findByEmail(email: string) {
        return db.user.findUnique({
            where: { email },
            // NOTE: Selecting all fields by default (omitting 'select')
            // ensures 'hashedPass' is included for login process.
        });
    }

    /**
     * Creates a new user during registration.
     */
    async create(data: Prisma.UserCreateInput) {
        return db.user.create({
            data,
            // Select only safe fields to return after creation
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                status: true,
            },
        });
    }

    /**
     * Updates non-sensitive user profile details.
     */
    async updateProfile(userId: string, data: Prisma.UserUpdateInput) {
        return db.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                bio: true,
                profileImage: true,
                updatedAt: true,
            },
        });
    }

    /**
     * Finds a user and includes their subscription details. Used by UserService.
     */
    async findUserWithSubscription(userId: string) {
        return db.user.findUnique({
            where: { id: userId },
            // FIX: Removed 'include' and nested the subscription selection under 'select'
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                bio: true,
                profileImage: true,
                createdAt: true,
                status: true,
                isSuspended: true,
                // Nested select for the relation
                subscription: {
                    select: {
                        status: true,
                        planId: true,
                        startDate: true,
                        endDate: true,
                        isAutoRenew: true,
                    },
                },
            },
        });
    }
}
