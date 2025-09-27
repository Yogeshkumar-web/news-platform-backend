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

// Create comment (authenticated users only)
router.post(
    "/",
    commentRateLimit, // Apply comment-specific rate limiting
    commentValidation.create,
    handleValidationErrors,
    commentsController.createComment
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

// Get user's comments (current user or admin viewing others)
router.get(
    "/user/:userId?",
    commentValidation.getUserComments,
    handleValidationErrors,
    commentsController.getUserComments
);

// Admin/Moderator only routes
router.use(requireRole(["ADMIN", "MODERATOR"]));

// Mark comment as spam
router.post(
    "/:id/spam",
    commentValidation.moderate,
    handleValidationErrors,
    commentsController.markAsSpam
);

// Approve comment
router.post(
    "/:id/approve",
    commentValidation.moderate,
    handleValidationErrors,
    commentsController.approveComment
);

// Get recent comments across all articles
router.get("/admin/recent", commentsController.getRecentComments);

export default router;
