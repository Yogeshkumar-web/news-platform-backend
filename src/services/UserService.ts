import db from "../config/database";
import logger from "../utils/logger";
import { normalizePageParams, buildPaginationMeta } from "../utils/pagination";
import {
    NotFoundError,
    AuthorizationError,
    ConflictError,
    AuthenticationError,
    ValidationError,
    UserRole,
    SubscriptionInfo,
} from "../types"; // Assuming error types exist
import { UserRepository } from "../repositories/UserRepository";
import { ArticleRepository } from "../repositories/ArticleRepository";

type UserStatus = "ACTIVE" | "BANNED";

export interface GetUsersQuery {
    page?: any;
    pageSize?: any;
    role?: UserRole;
    status?: UserStatus;
}

export class UserService {
    private userRepository: UserRepository;
    private articleRepository: ArticleRepository;

    constructor() {
        this.userRepository = new UserRepository();
        // Assuming ArticleRepository class exists and is exported
        this.articleRepository = new ArticleRepository();
    }
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
     * Get a user's subscription status.
     * @param userId The ID of the user.
     * @returns SubscriptionInfo or null if user has no subscription record.
     */
    async getSubscriptionStatus(
        userId: string
    ): Promise<SubscriptionInfo | null> {
        // Use repository to find user and include subscription data
        const user = await this.userRepository.findUserWithSubscription(userId);

        if (!user) {
            throw new NotFoundError("User not found.", "USER_NOT_FOUND");
        }

        // Return the subscription object, which is null if no record exists
        return user.subscription || null;
    }

    /**
     * Initiates the subscription checkout process. (Placeholder for Payment Gateway integration)
     * @param userId The ID of the user.
     * @returns An object containing the checkout session URL/ID.
     */
    async createSubscriptionCheckout(
        userId: string
    ): Promise<{ checkoutUrl: string; orderId: string }> {
        // 1. Check if user already has an active or trial subscription
        const userSubscription = await this.getSubscriptionStatus(userId);

        if (
            userSubscription &&
            (userSubscription.status === "ACTIVE" ||
                userSubscription.status === "TRIAL")
        ) {
            throw new ConflictError(
                "User already has an active or trial subscription.",
                "ALREADY_SUBSCRIBED"
            );
        }

        // 2. Placeholder for Payment Gateway Integration (e.g., calling a Stripe/Razorpay service)
        const mockOrderId = `ORDER_${Date.now()}_${userId.substring(0, 4)}`;

        // NOTE: In a real app, 'FRONTEND_URL' would be read from process.env
        const mockCheckoutUrl = `/api/v1/payment/checkout?order_id=${mockOrderId}`;

        logger.info("Subscription checkout initiated (Mock)", {
            userId,
            orderId: mockOrderId,
        });

        // 3. Return the necessary details to the client
        return {
            checkoutUrl: mockCheckoutUrl,
            orderId: mockOrderId,
        };
    }

    async getSavedArticles(
        userId: string,
        query: { page?: any; pageSize?: any }
    ) {
        // normalizePageParams call gives us 'limit', not 'pageSize'
        const { page, limit, skip } = normalizePageParams(
            query.page,
            query.pageSize
        );

        // ArticleRepository mein is method ko define karna hoga
        const { articles, total } =
            await this.articleRepository.getSavedArticlesByUser(
                userId,
                page,
                limit // Use normalized limit/pageSize
            );

        // FIX: Use imported function 'buildPaginationMeta' with correct positional arguments (page, limit, total)
        const pagination = buildPaginationMeta(page, limit, total);

        return { articles, pagination };
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
