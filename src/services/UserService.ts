import db from "../config/database";
import logger from "../utils/logger";
import { normalizePageParams, buildPaginationMeta } from "../utils/pagination";
import {
    NotFoundError,
    AuthorizationError,
    AuthenticationError,
    ValidationError,
} from "../types"; // Assuming error types exist

// Assuming UserRole and UserStatus definitions
type UserRole = "ADMIN" | "SUPERADMIN" | "WRITER" | "USER";
type UserStatus = "ACTIVE" | "BANNED";

export interface GetUsersQuery {
    page?: any;
    pageSize?: any;
    role?: UserRole;
    status?: UserStatus;
}

export class UserService {
    /**
     * Admin: Get a paginated list of all users.
     */
    async getAllUsers(query: GetUsersQuery) {
        const { page, limit, skip } = normalizePageParams(
            query.page,
            query.pageSize
        );

        const where: any = {};
        if (query.role) where.role = query.role;
        if (query.status) where.status = query.status;

        // Default to ACTIVE users if status filter is missing
        if (!where.status) {
            where.status = "ACTIVE";
        }

        const selectFields = {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            profileImage: true,
        };

        const [total, usersRaw] = await Promise.all([
            db.user.count({ where }),
            db.user.findMany({
                where,
                skip,
                take: limit,
                select: selectFields,
                orderBy: { createdAt: "desc" },
            }),
        ]);

        return {
            users: usersRaw,
            pagination: buildPaginationMeta(page, limit, total),
        };
    }

    /**
     * Admin: Update a user's role by ID.
     */
    async updateUserRole(
        targetUserId: string,
        newRole: UserRole,
        adminRole: UserRole
    ) {
        const user = await db.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, role: true },
        });

        if (!user) {
            throw new NotFoundError("User not found", "USER_NOT_FOUND");
        }

        // Security check: Prevent non-SuperAdmins from managing high-level roles.
        if (
            adminRole !== "SUPERADMIN" &&
            (user.role === "SUPERADMIN" || user.role === "ADMIN")
        ) {
            throw new AuthorizationError(
                "Only SuperAdmins can manage high-level roles.",
                "NOT_AUTHORIZED"
            );
        }

        const updatedUser = await db.user.update({
            where: { id: targetUserId },
            data: { role: newRole },
            select: { id: true, name: true, role: true, email: true },
        });

        logger.info("User role updated", { targetUserId, newRole });
        return updatedUser;
    }

    /**
     * Admin: Ban or Unban a user by ID.
     */
    async updateUserStatus(
        targetUserId: string,
        newStatus: UserStatus,
        adminRole: UserRole
    ) {
        const user = await db.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, role: true, status: true },
        });

        if (!user) {
            throw new NotFoundError("User not found", "USER_NOT_FOUND");
        }

        // Prevent Banning/Unbanning SuperAdmins by anyone other than another SuperAdmin
        if (user.role === "SUPERADMIN" && adminRole !== "SUPERADMIN") {
            throw new AuthorizationError(
                "Only SuperAdmins can modify the status of other SuperAdmins.",
                "NOT_AUTHORIZED"
            );
        }

        const updatedUser = await db.user.update({
            where: { id: targetUserId },
            data: { status: newStatus },
            select: { id: true, name: true, email: true, status: true },
        });

        logger.info("User status updated", { targetUserId, newStatus });
        return updatedUser;
    }
}
