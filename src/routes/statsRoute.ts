import { Router } from "express";
import { StatsController } from "../controllers/StatsController";
import { authenticateToken, requireRole } from "../middleware/authMiddleware";

const router = Router();
const controller = new StatsController();

// All stats routes require authentication and Admin/SuperAdmin role
router.use(authenticateToken);
router.use(requireRole(["ADMIN", "SUPERADMIN"]));

// 1. Get All System Statistics (GET /stats/system)
router.get("/system", controller.getSystemStats);

export default router;
