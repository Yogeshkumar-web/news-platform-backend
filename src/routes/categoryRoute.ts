// import { Router } from "express";
// import { CategoryController } from "../controllers/CategoryController";
// import { authenticateToken, requireRole } from "../middleware/authMiddleware";
// import {
//     categoryValidation,
//     handleValidationErrors,
// } from "../middleware/validation";

// const router = Router();
// const controller = new CategoryController();

// // Middleware helpers
// const adminAuth = [authenticateToken, requireRole(["ADMIN", "SUPERADMIN"])];

// // Public route
// router.get("/", controller.getCategories);

// // Admin routes - explicit middleware
// router.get("/admin/all", ...adminAuth, controller.getAllCategories);

// router.post(
//     "/",
//     ...adminAuth,
//     categoryValidation.createCategory,
//     handleValidationErrors,
//     controller.createCategory
// );

// router.put(
//     "/:id",
//     ...adminAuth,
//     categoryValidation.updateCategory,
//     handleValidationErrors,
//     controller.updateCategory
// );

// router.delete(
//     "/:id",
//     ...adminAuth,
//     categoryValidation.deleteCategory,
//     handleValidationErrors,
//     controller.deleteCategory
// );

// export default router;

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

// Admin routes - PEHLE specific routes, phir generic routes
router.get(
    "/admin/all",
    authenticateToken,
    requireRole(["ADMIN", "SUPERADMIN"]),
    controller.getAllCategories
);

// Ab baaki admin routes ke liye middleware apply karo
router.use(authenticateToken);
router.use(requireRole(["ADMIN", "SUPERADMIN"]));

// Create Category (POST /categories)
router.post(
    "/",
    categoryValidation.createCategory,
    handleValidationErrors,
    controller.createCategory
);

// Update Category (PUT /categories/:id)
router.put(
    "/:id",
    categoryValidation.updateCategory,
    handleValidationErrors,
    controller.updateCategory
);

// Delete Category (DELETE /categories/:id)
router.delete(
    "/:id",
    categoryValidation.deleteCategory,
    handleValidationErrors,
    controller.deleteCategory
);

export default router;
