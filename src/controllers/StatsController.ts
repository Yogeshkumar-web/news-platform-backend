import { Request, Response } from "express";
import { StatsService } from "../services/StatsService";
import { ResponseHandler } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../types";

const statsService = new StatsService();

export class StatsController {
    /**
     * Admin: Get all key system statistics (GET /stats/system)
     */
    getSystemStats = asyncHandler(async (req: Request, res: Response) => {
        const stats = await statsService.getSystemStats();

        return ResponseHandler.success(
            res,
            stats,
            "System statistics retrieved successfully"
        );
    });

    getDashboardStats = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const userRole = req.user?.role || "USER";

            const stats = await statsService.getDashboardStats(userRole);

            return ResponseHandler.success(
                res,
                stats,
                "Dashboard statistics retrieved successfully"
            );
        }
    );

    // Task 3.2: Get SUPERADMIN System Config
    getSystemConfig = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            // Middleware ne check kar liya hai ki yeh SUPERADMIN hai
            const config = await statsService.getSystemConfig();

            return ResponseHandler.success(
                res,
                config,
                "System configuration retrieved successfully"
            );
        }
    );
}
