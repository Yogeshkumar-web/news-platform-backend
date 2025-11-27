import db from "../config/database"; // Assuming your Prisma client is imported here
import { ArticleStatus, UserStatus } from "../generated/prisma/client";

export class StatsRepository {
    /**
     * Counts all articles regardless of status.
     */
    async countTotalArticles(): Promise<number> {
        return db.article.count();
    }
    /**
     * Counts only articles with 'PUBLISHED' status.
     */
    async countPublishedArticles(): Promise<number> {
        // Type assertion is used here for Prisma enum values
        const PUBLISHED: ArticleStatus = "PUBLISHED" as any;
        return db.article.count({ where: { status: PUBLISHED } });
    }
    /**
     * Counts articles with 'PENDING_REVIEW' status.
     */
    async countPendingReviews(): Promise<number> {
        const PENDING_REVIEW: ArticleStatus = "PENDING_REVIEW" as any;
        return db.article.count({ where: { status: PENDING_REVIEW } });
    }
    /**
     * Counts published premium articles (used for SuperAdmin/Admin dashboard).
     */
    async countPremiumArticles(): Promise<number> {
        const PUBLISHED: ArticleStatus = "PUBLISHED" as any;
        return db.article.count({
            where: { isPremium: true, status: PUBLISHED },
        });
    }

    /**
     * Gets total count of users grouped by role and status.
     */
    async getUserCounts() {
        const total = await db.user.count();

        const byRole = await db.user.groupBy({
            by: ["role"],
            _count: { id: true },
        });

        const byStatus = await db.user.groupBy({
            by: ["status"], // Assuming 'status' field exists (e.g., ACTIVE, BANNED)
            _count: { id: true },
        });

        return { total, byRole, byStatus };
    }

    /**
     * Gets total count of articles grouped by status.
     */
    async getArticleCounts() {
        const total = await db.article.count();

        const byStatus = await db.article.groupBy({
            by: ["status"], // Assuming 'status' field exists (e.g., PUBLISHED, DRAFT)
            _count: { id: true },
        });

        return { total, byStatus };
    }

    /**
     * Calculates the sum of view counts for all articles.
     */
    async getTotalViews() {
        const result = await db.article.aggregate({
            _sum: { viewCount: true },
        });
        return result._sum.viewCount || 0;
    }

    /**
     * Gets the count of all categories.
     */
    async getCategoryCount() {
        return db.category.count();
    }

    /**
     * Gets total count of comments grouped by status.
     */
    async getCommentCounts() {
        const total = await db.comment.count();

        const byStatus = await db.comment.groupBy({
            by: ["status"], // Assuming 'status' field exists (e.g., APPROVED, SPAM)
            _count: { id: true },
        });

        return { total, byStatus };
    }

    /**
     * Counts all users regardless of status.
     */
    async countTotalUsers(): Promise<number> {
        return db.user.count();
    }

    /**
     * Counts only users with 'ACTIVE' status.
     */
    async countActiveUsers(): Promise<number> {
        const ACTIVE: UserStatus = "ACTIVE" as any;
        return db.user.count({ where: { status: ACTIVE } });
    }

    // --- OTHER STATS (from previous file structure) ---

    /**
     * Calculates the sum of view counts for all articles.
     */
    async countTotalViews(): Promise<number> {
        const result = await db.article.aggregate({
            _sum: { viewCount: true },
        });
        return result._sum.viewCount || 0;
    }

    /**
     * Gets the count of all categories.
     */
    async countTotalCategories(): Promise<number> {
        return db.category.count();
    }

    /**
     * Gets total count of comments grouped by status (retains original logic for complexity).
     */
    async getCommentCountsByStatus() {
        const total = await db.comment.count();

        const byStatus = await db.comment.groupBy({
            by: ["status"],
            _count: { id: true },
        });

        return { total, byStatus };
    }
}
