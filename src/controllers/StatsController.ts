import { Request, Response } from "express";
import { StatsService } from "../services/StatsService";
import { ResponseHandler } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";

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
}
