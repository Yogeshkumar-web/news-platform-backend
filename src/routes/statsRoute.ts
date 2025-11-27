import { Router } from "express";
import { StatsController } from "../controllers/StatsController";
import {
    authenticateToken,
    requireRole,
    requireSuperAdmin,
} from "../middleware/authMiddleware";

const router = Router();
const controller = new StatsController();

// All stats routes require authentication and Admin/SuperAdmin role
router.use(authenticateToken);
// router.use(requireRole(["ADMIN", "SUPERADMIN"]));

// Task 3.3: Admin/Writer Dashboard Stats (Common Stats)
router.get(
    "/dashboard",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN", "WRITER"]), // Writers can see their stats
    controller.getDashboardStats
);

// Task 3.2: SUPERADMIN System Settings/Stats (Sensitive Data)
router.get(
    "/admin/system-config",
    authenticateToken,
    requireSuperAdmin,
    controller.getSystemConfig
);

// 1. Get All System Statistics (GET /stats/system)
router.get("/system", controller.getSystemStats);

export default router;
