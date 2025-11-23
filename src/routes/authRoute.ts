import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import {
    authValidation,
    handleValidationErrors,
    sanitizeInput,
} from "../middleware/validation";
import { authRateLimit } from "../middleware/rateLimiter";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();
const authController = new AuthController();

const storage = multer.memoryStorage();

const fileFilter = (
    req: Request,
    file: { mimetype: string },
    cb: multer.FileFilterCallback
) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        // Validation error will be caught by error handler middleware
        cb(new Error("Only image files are allowed"));
    }
};

const avatarUpload = multer({
    storage: storage, // Using memory storage
    limits: {
        fileSize: 1 * 1024 * 1024, // 1MB limit for profile images
    },
    fileFilter: fileFilter,
});

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

// New: Update user profile (PUT /auth/profile)
router.put(
    "/profile",
    authenticateToken,
    authValidation.updateProfile,
    handleValidationErrors,
    authController.updateProfile
);

// New: Upload profile avatar (POST /auth/avatar)
router.post(
    "/avatar",
    authenticateToken,
    avatarUpload.single("avatar"), // Frontend should send file with key 'avatar'
    authController.uploadAvatar
);

// New: Change password (PATCH /auth/password-change)
router.patch(
    "/password-change",
    authenticateToken,
    authValidation.changePassword,
    handleValidationErrors,
    authController.changePassword
);

export default router;
