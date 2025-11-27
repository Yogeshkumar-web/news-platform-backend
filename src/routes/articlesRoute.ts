import { Router } from "express";
import { ArticleController } from "../controllers/ArticleController";
import { authenticateToken, requireRole } from "../middleware/authMiddleware";
import {
    articleValidation,
    categoryValidation,
    handleValidationErrors,
    sanitizeInput,
} from "../middleware/validation";
import { imageUploadMiddleware } from "../middleware/fileUpload";

const router = Router();
const controller = new ArticleController();

// PUBLIC ROUTES
router.get(
    "/",
    articleValidation.getArticles,
    handleValidationErrors,
    controller.getArticles
);

router.get(
    "/category/:categoryName",
    categoryValidation.getByCategory, // Using slug validation for categoryName
    handleValidationErrors,
    controller.getArticlesByCategory
);

// PROTECTED ROUTES (require authentication)

// Upload image for rich text editor
router.post(
    "/upload-image",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN", "WRITER"]),
    imageUploadMiddleware.single("image"),
    controller.uploadImage
);

// Get user's own articles (for dashboard)
router.get(
    "/my/articles",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN", "WRITER"]),
    articleValidation.getArticles,
    handleValidationErrors,
    controller.getMyArticles
);

// Create new article
router.post(
    "/",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN", "WRITER"]),
    sanitizeInput,
    articleValidation.createArticle,
    handleValidationErrors,
    controller.createArticle
);

// Get article for editing (by ID)
router.get(
    "/edit/:id",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN", "WRITER"]),
    articleValidation.getById,
    handleValidationErrors,
    controller.getArticleForEdit
);

// Update article
router.put(
    "/:id",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN", "WRITER"]),
    articleValidation.getById, // Validate ID param
    articleValidation.updateArticle, // Validate body
    handleValidationErrors,
    controller.updateArticle
);

// Toggle article status
router.patch(
    "/:id/status",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN", "WRITER"]),
    articleValidation.getById, // Validate ID param
    articleValidation.toggleStatus, // Validate status in body
    handleValidationErrors,
    controller.toggleArticleStatus
);

// Delete article
router.delete(
    "/:id",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN", "WRITER"]),
    articleValidation.getById,
    handleValidationErrors,
    controller.deleteArticle
);

// ADMIN ONLY ROUTES (additional management features)

// Get all articles (for admin dashboard)
router.get(
    "/admin/all",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN"]),
    articleValidation.getArticles,
    handleValidationErrors,
    controller.getArticles
);

// Bulk status update (admin feature)
router.patch(
    "/admin/bulk-status",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN"]),
    [
        // Add bulk validation here if needed
    ],
    handleValidationErrors
    // controller.bulkStatusUpdate // You can implement this later
);

// Get featured articles
router.get(
    "/featured",
    articleValidation.getArticles,
    handleValidationErrors
    // controller.getFeaturedArticles // You can implement this later
);

// Get popular articles
router.get(
    "/popular",
    articleValidation.getArticles,
    handleValidationErrors
    // controller.getPopularArticles // You can implement this later
);

// Search articles
router.get(
    "/search",
    [
        // Add search validation
        // query("q").isString().isLength({ min: 1, max: 100 }).withMessage("Search query is required and must be between 1-100 characters"),
    ],
    handleValidationErrors
    // controller.searchArticles // You can implement this later
);

// Public route for article by slug (keep at end to avoid conflicts with other routes)
router.get(
    "/:slug",
    articleValidation.getBySlug,
    handleValidationErrors,
    controller.getArticleBySlug
);

router.patch(
    "/admin/bulk-status",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN"]),
    articleValidation.bulkStatusUpdate,
    handleValidationErrors,
    controller.bulkStatusUpdate
);

export default router;
