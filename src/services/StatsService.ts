import { StatsRepository } from "../repositories/StatsRepository";
import logger from "../utils/logger";

export class StatsService {
    private repo: StatsRepository;

    constructor() {
        this.repo = new StatsRepository();
    }

    /**
     * Fetches and aggregates all key system statistics for the admin dashboard.
     */
    async getSystemStats() {
        // Fetch data concurrently
        const [
            userCountsRaw,
            articleCountsRaw,
            totalViews,
            categoryCount,
            commentCountsRaw,
        ] = await Promise.all([
            this.repo.getUserCounts(),
            this.repo.getArticleCounts(),
            this.repo.getTotalViews(),
            this.repo.getCategoryCount(),
            this.repo.getCommentCounts(),
        ]);

        // Function to transform grouped arrays into a key-value object
        const mapCounts = (arr: any) =>
            arr.reduce((acc: Record<string, number>, curr: any) => {
                // Assumes curr has a single key for grouping (e.g., 'role' or 'status')
                const key = Object.keys(curr).find((k) => k !== "_count");
                if (key) {
                    acc[curr[key]] = curr._count.id;
                }
                return acc;
            }, {});

        const users = {
            total: userCountsRaw.total,
            byRole: mapCounts(userCountsRaw.byRole),
            byStatus: mapCounts(userCountsRaw.byStatus),
        };

        const articles = {
            total: articleCountsRaw.total,
            byStatus: mapCounts(articleCountsRaw.byStatus),
            totalViews: totalViews,
        };

        const comments = {
            total: commentCountsRaw.total,
            byStatus: mapCounts(commentCountsRaw.byStatus),
        };

        const categories = {
            total: categoryCount,
        };

        logger.info("System statistics retrieved successfully");

        return {
            users,
            articles,
            comments,
            categories,
            lastUpdated: new Date().toISOString(),
        };
    }
}
