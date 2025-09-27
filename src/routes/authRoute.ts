import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import {
    authValidation,
    handleValidationErrors,
    sanitizeInput,
} from "../middleware/validation";
import { authRateLimit } from "../middleware/rateLimiter";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();
const authController = new AuthController();

// Apply rate limiting to all auth routes
router.use(authRateLimit);

// Apply input sanitization
router.use(sanitizeInput);

// Register route
router.post(
    "/register",
    authValidation.register,
    handleValidationErrors,
    authController.register
);

// Login route
router.post(
    "/login",
    authValidation.login,
    handleValidationErrors,
    authController.login
);

// Get current user profile (protected)
router.get("/me", authenticateToken, authController.getProfile);

// Logout route
router.post("/logout", authController.logout);

export default router;
