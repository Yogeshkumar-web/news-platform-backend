import { Router } from "express";
import { CategoryController } from "../controllers/CategoryController";
import { authenticateToken, requireRole } from "../middleware/authMiddleware";
import {
    categoryValidation,
    handleValidationErrors,
} from "../middleware/validation";

const router = Router();
const controller = new CategoryController();

// Public route to get all categories
// Path: /api/categories
router.get("/", controller.getCategories);

// Admin routes require authentication and Admin/SuperAdmin role
router.use(authenticateToken);
router.use(requireRole(["ADMIN", "SUPERADMIN"]));

// 1. Create Category (POST /categories)
router.post(
    "/",
    categoryValidation.createCategory,
    handleValidationErrors,
    controller.createCategory
);

// 2. Get All Categories (Admin List - GET /categories/admin/all)
router.get("/admin/all", controller.getAllCategories);

// 3. Update Category (PUT /categories/:id)
router.put(
    "/:id",
    categoryValidation.updateCategory,
    handleValidationErrors,
    controller.updateCategory
);

// 4. Delete Category (DELETE /categories/:id)
router.delete(
    "/:id",
    categoryValidation.deleteCategory,
    handleValidationErrors,
    controller.deleteCategory
);

export default router;
