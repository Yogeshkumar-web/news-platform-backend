import db from "../config/database"; // Assuming your Prisma client is imported here

export class StatsRepository {
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
}
