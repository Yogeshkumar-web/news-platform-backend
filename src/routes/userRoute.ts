import { Router } from "express";
import { UserController } from "../controllers/UserController";
import {
    authenticateToken,
    requireRole,
    requireSuperAdmin,
} from "../middleware/authMiddleware";
import {
    userValidation,
    handleValidationErrors,
    articleValidation,
} from "../middleware/validation";

const router = Router();
const controller = new UserController();

// All routes in this file require authentication and Admin/SuperAdmin role
router.use(authenticateToken);

// router.get(
//     "/me/subscription",
//     authenticateToken
//     // controller.getSubscriptionStatus
// );

// Create a new subscription/checkout session
// router.post(
//     "/subscription/checkout",
//     authenticateToken
//     // Validation for planId is required here
//     // ...
//     // controller.createSubscriptionCheckout
// );

router.get(
    "/me/saved-articles",
    authenticateToken,
    articleValidation.getArticles,
    handleValidationErrors,
    controller.getSavedArticles
);

router.use(requireRole(["ADMIN", "SUPERADMIN"]));

// 1. Get List of Users (GET /users)
router.get(
    "/",
    userValidation.getUsers,
    handleValidationErrors,
    controller.getUsers
);

// 2. Update User Role (PATCH /users/:id/role)
router.put(
    "/:id/role",
    authenticateToken,

    requireSuperAdmin,
    userValidation.updateRole,
    handleValidationErrors,
    controller.updateRole
);

// 3. Ban/Unban User (PATCH /users/:id/status)
router.patch(
    "/:id/status",
    userValidation.toggleStatus,
    handleValidationErrors,
    controller.toggleStatus
);

export default router;
