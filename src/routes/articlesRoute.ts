import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { ArticleController } from "../controllers/ArticleController";
import { authenticateToken, requireRole } from "../middleware/authMiddleware";
import {
    articleValidation,
    categoryValidation,
    handleValidationErrors,
} from "../middleware/validation";

const router = Router();
const controller = new ArticleController();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads/images");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for image uploads with TypeScript support
const storage = multer.diskStorage({
    destination: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void
    ) => {
        cb(null, uploadDir);
    },
    filename: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void
    ) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed"));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: fileFilter,
});

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
    upload.single("image"),
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

export default router;

// import { Router } from "express";
// import { ArticleController } from "../controllers/ArticleController";

// const router = Router();
// const controller = new ArticleController();

// router.get("/", controller.getArticles);
// router.get("/category/:categoryName", controller.getArticlesByCategory);
// router.get("/:slug", controller.getArticleBySlug);

// export default router;
