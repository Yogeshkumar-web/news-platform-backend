import { Router } from "express";
import { CommentsController } from "../controllers/CommentsController";
import { authenticateToken, requireRole } from "../middleware/authMiddleware";
import { commentRateLimit } from "../middleware/rateLimiter";
import {
    commentValidation,
    handleValidationErrors,
    sanitizeInput,
} from "../middleware/validation";

const router = Router();
const commentsController = new CommentsController();

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Create comment (authenticated users only)
router.post(
    "/create",

    commentRateLimit, // Apply comment-specific rate limiting
    authenticateToken,
    commentValidation.create,
    handleValidationErrors,
    commentsController.createComment
);

// Public routes - Get comments for an article
router.get(
    "/:articleId",
    commentValidation.getByArticle,
    handleValidationErrors,
    commentsController.getCommentsByArticle
);

// Get comment statistics for an article
router.get(
    "/stats/:articleId",
    commentValidation.getByArticle,
    handleValidationErrors,
    commentsController.getCommentStats
);

// Protected routes - Require authentication
router.use(authenticateToken);

// Get user's comments (current user or admin viewing others)
router.get(
    "/user/:userId?",
    commentValidation.getUserComments,
    handleValidationErrors,
    commentsController.getUserComments
);

// Update comment (comment owner only)
router.put(
    "/:id",
    commentValidation.update,
    handleValidationErrors,
    commentsController.updateComment
);

// Delete comment (comment owner, admin, or moderator)
router.delete(
    "/:id",
    commentValidation.delete,
    handleValidationErrors,
    commentsController.deleteComment
);

// Admin routes
router.get(
    "/admin/all",
    requireRole(["ADMIN", "SUPERADMIN"]),
    commentsController.getAdminComments
);

// Backward-compatible recent comments route
router.get(
    "/admin/recent",
    requireRole(["ADMIN", "SUPERADMIN"]),
    commentsController.getRecentComments
);

router.patch(
    "/:id/status",
    requireRole(["ADMIN", "SUPERADMIN"]),
    commentValidation.moderate,
    handleValidationErrors,
    commentsController.moderateComment
);

// Mark comment as spam
router.post(
    "/:id/spam",
    requireRole(["ADMIN", "SUPERADMIN"]),
    commentValidation.delete,
    handleValidationErrors,
    commentsController.markAsSpam
);

// Approve comment
router.post(
    "/:id/approve",
    requireRole(["ADMIN", "SUPERADMIN"]),
    commentValidation.delete,
    handleValidationErrors,
    commentsController.approveComment
);

export default router;
