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

// --- START: Profile Avatar Upload Setup ---

// // Ensure a new upload directory for avatars exists
// const uploadDir = path.join(process.cwd(), "uploads/avatars");
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir, { recursive: true });
// }

// Configure multer for avatar uploads (similar to articlesRoute.ts but dedicated)
// const storage = multer.diskStorage({
//     destination: (req: Request, file, cb) => {
//         cb(null, uploadDir);
//     },
//     filename: (req: Request, file, cb) => {
//         const userId = (req as any).user?.id || "guest"; // Get user ID from Auth Middleware
//         const uniqueSuffix = Date.now();
//         const ext = path.extname(file.originalname);
//         // Filename: avatar-userId-timestamp.ext
//         cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
//     },
// });

const storage = multer.memoryStorage();

const fileFilter = (
    req: Request,
    file: { mimetype: string },
    cb: multer.FileFilterCallback
) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed"));
    }
};

const avatarUpload = multer({
    storage: storage,
    limits: {
        fileSize: 1 * 1024 * 1024, // 1MB limit for profile images
    },
    fileFilter: fileFilter,
});

// --- END: Profile Avatar Upload Setup ---

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
