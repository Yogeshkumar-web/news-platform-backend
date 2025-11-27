import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { ResponseHandler } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../types";

const userService = new UserService();

export class UserController {
    /**
     * Admin: Get paginated list of all users. (GET /users)
     */
    getUsers = asyncHandler(async (req: Request, res: Response) => {
        const result = await userService.getAllUsers({
            page: req.query.page,
            pageSize: req.query.pageSize,
            role: req.query.role as any,
            status: req.query.status as any,
        });
        return ResponseHandler.success(
            res,
            result.users,
            "Users retrieved successfully",
            result.pagination
        );
    });

    /**
     * Admin: Update user's role. (PATCH /users/:id/role)
     */
    updateRole = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const targetUserId = req.params.id;
            const newRole = req.body.role as any;
            const adminRole = req.user?.role as any;
            const currentUserId = req.user?.id;

            // Security check: Admin cannot change their own role.
            if (targetUserId === currentUserId) {
                return ResponseHandler.error(
                    res,
                    "Cannot change your own role via this endpoint",
                    403,
                    "NOT_AUTHORIZED"
                );
            }

            const user = await userService.updateUserRole(
                targetUserId,
                newRole,
                adminRole
            );

            return ResponseHandler.success(
                res,
                user,
                "User role updated successfully"
            );
        }
    );

    /**
     * Admin: Ban or Unban a user. (PATCH /users/:id/status)
     */
    toggleStatus = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const targetUserId = req.params.id;
            const newStatus = req.body.status as any;
            const adminRole = req.user?.role as any;
            const currentUserId = req.user?.id;

            // Security check: Admin cannot ban/unban themselves.
            if (targetUserId === currentUserId) {
                return ResponseHandler.error(
                    res,
                    "Cannot change your own status via this endpoint",
                    403,
                    "NOT_AUTHORIZED"
                );
            }

            const user = await userService.updateUserStatus(
                targetUserId,
                newStatus,
                adminRole
            );

            return ResponseHandler.success(
                res,
                user,
                `User status set to ${newStatus}`
            );
        }
    );

    getSavedArticles = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const userId = req.user?.id;

            if (!userId) {
                // Yeh authenticateToken se handle ho jayega, par defensive check accha hai
                return ResponseHandler.error(
                    res,
                    "Authentication required",
                    401,
                    "AUTH_REQUIRED"
                );
            }

            const result = await userService.getSavedArticles(
                userId,
                req.query
            );

            return ResponseHandler.success(
                res,
                result.articles,
                "Saved articles retrieved successfully",
                result.pagination
            );
        }
    );

    getSubscriptionStatus = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const userId = req.user?.id;

            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "Authentication required",
                    401,
                    "AUTH_REQUIRED"
                );
            }

            const result = await userService.getSubscriptionStatus(userId);

            const message = result
                ? `Subscription status retrieved successfully. Status: ${result.status}`
                : "User is not currently subscribed.";

            return ResponseHandler.success(res, result, message);
        }
    );

    // Task 4.2: Create Subscription Checkout
    createSubscriptionCheckout = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const userId = req.user?.id;
            const { planId } = req.body; // Frontend se planId aayega

            if (!userId || !planId) {
                // Plan ID validation should ideally be in middleware
                return ResponseHandler.error(
                    res,
                    "Plan ID and authentication are required",
                    400,
                    "VALIDATION_ERROR"
                );
            }

            // Service will call payment gateway
            const result = await userService.createSubscriptionCheckout(
                userId
                // planId
            );

            return ResponseHandler.success(
                res,
                result,
                "Subscription checkout session created. Redirect user to checkoutUrl."
            );
        }
    );
}
