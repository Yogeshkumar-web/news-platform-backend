import { StatsRepository } from "../repositories/StatsRepository";
import { DashboardStats } from "../types";
import logger from "../utils/logger";

export class StatsService {
    private statsRepository: StatsRepository;

    constructor() {
        this.statsRepository = new StatsRepository();
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
            this.statsRepository.getUserCounts(),
            this.statsRepository.getArticleCounts(),
            this.statsRepository.getTotalViews(),
            this.statsRepository.getCategoryCount(),
            this.statsRepository.getCommentCounts(),
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

    async getDashboardStats(role: string): Promise<DashboardStats> {
        // Example logic:
        const totalArticles = await this.statsRepository.countTotalArticles();
        const publishedArticles =
            await this.statsRepository.countPublishedArticles();
        const totalUsers = await this.statsRepository.countTotalUsers();

        let stats: DashboardStats = {
            totalArticles,
            publishedArticles,
            draftArticles: totalArticles - publishedArticles, // Simple calculation
            pendingReviews: await this.statsRepository.countPendingReviews(),
            totalUsers,
            activeUsers: await this.statsRepository.countActiveUsers(),
        };

        // SUPERADMIN ke liye additional stats
        if (role === "SUPERADMIN") {
            stats.premiumArticleCount =
                await this.statsRepository.countPremiumArticles();
            stats.systemHealth = "OK"; // Simple health check
        }

        return stats;
    }

    // Task 3.2: Get SUPERADMIN system config/data
    async getSystemConfig() {
        // Yahan sensitive config data, logs, ya advanced system stats return honge.
        return {
            logRetentionDays: 30,
            databaseVersion: "15.4",
            activeConnections: 5,
            lastBackup: new Date().toISOString(),
        };
    }
}
