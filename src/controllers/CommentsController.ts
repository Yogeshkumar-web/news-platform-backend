import { Request, Response } from "express";
import { CommentsService } from "../services/CommentsService";
import { ResponseHandler } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../types";

export class CommentsController {
    private commentsService = new CommentsService();

    // GET /api/comments/:articleId - Get comments for an article
    getCommentsByArticle = asyncHandler(async (req: Request, res: Response) => {
        const { articleId } = req.params;
        const { page, limit, includeSpam, includeUnapproved } = req.query;

        // Validate articleId
        if (!articleId) {
            return ResponseHandler.error(
                res,
                "Article ID is required",
                400,
                "MISSING_ARTICLE_ID"
            );
        }

        // Only admins/moderators can see spam/unapproved comments
        const user = (req as AuthenticatedRequest).user;
        const canSeeHidden =
            user?.role === "ADMIN" || user?.role === "MODERATOR";

        const result = await this.commentsService.getCommentsByArticleId(
            articleId,
            page,
            limit,
            canSeeHidden && includeSpam === "true",
            canSeeHidden && includeUnapproved === "true"
        );

        return ResponseHandler.success(
            res,
            result.comments,
            `Retrieved ${result.comments.length} comments`,
            result.pagination
        );
    });

    moderateComment = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const commentId = req.params.id;
            const newStatus = req.body.status as any;
            const adminRole = req.user?.role as any;

            // Middleware handles primary authentication and role check.

            const updatedComment = await this.commentsService.moderateComment(
                commentId,
                newStatus,
                adminRole
            );

            return ResponseHandler.success(
                res,
                updatedComment,
                `Comment status updated to ${newStatus}`
            );
        }
    );

    // POST /api/comments - Create a new comment (authenticated)
    createComment = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const { content, articleId } = req.body;
            const userId = req.user?.id;

            // Validate required fields
            if (!content || !articleId) {
                return ResponseHandler.error(
                    res,
                    "Content and article ID are required",
                    400,
                    "MISSING_REQUIRED_FIELDS"
                );
            }

            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "Authentication required",
                    401,
                    "AUTH_REQUIRED"
                );
            }

            const comment = await this.commentsService.createComment({
                content,
                articleId,
                authorId: userId,
            });

            return ResponseHandler.created(
                res,
                comment,
                "Comment created successfully"
            );
        }
    );

    // DELETE /api/comments/:id - Delete a comment (owner/admin only)
    deleteComment = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;
            const userRole = req.user?.role;

            if (!id) {
                return ResponseHandler.error(
                    res,
                    "Comment ID is required",
                    400,
                    "MISSING_COMMENT_ID"
                );
            }

            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "Authentication required",
                    401,
                    "AUTH_REQUIRED"
                );
            }

            const result = await this.commentsService.deleteComment(
                id,
                userId,
                userRole || "USER"
            );

            return ResponseHandler.success(res, null, result.message);
        }
    );

    // PUT /api/comments/:id - Update a comment (owner only)
    updateComment = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const { id } = req.params;
            const { content } = req.body;
            const userId = req.user?.id;

            if (!id) {
                return ResponseHandler.error(
                    res,
                    "Comment ID is required",
                    400,
                    "MISSING_COMMENT_ID"
                );
            }

            if (!content) {
                return ResponseHandler.error(
                    res,
                    "Content is required",
                    400,
                    "MISSING_CONTENT"
                );
            }

            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "Authentication required",
                    401,
                    "AUTH_REQUIRED"
                );
            }

            const comment = await this.commentsService.updateComment(
                id,
                content,
                userId
            );

            return ResponseHandler.success(
                res,
                comment,
                "Comment updated successfully"
            );
        }
    );

    // GET /api/comments/user/:userId - Get user's comments (optional userId, defaults to current user)
    getUserComments = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const { userId } = req.params;
            const { page, limit } = req.query;
            const currentUserId = req.user?.id;

            if (!currentUserId) {
                return ResponseHandler.error(
                    res,
                    "Authentication required",
                    401,
                    "AUTH_REQUIRED"
                );
            }

            // Users can only see their own comments unless they're admin
            const targetUserId = userId || currentUserId;
            const canViewOthers =
                req.user?.role === "ADMIN" || req.user?.role === "MODERATOR";

            if (targetUserId !== currentUserId && !canViewOthers) {
                return ResponseHandler.error(
                    res,
                    "You can only view your own comments",
                    403,
                    "INSUFFICIENT_PERMISSIONS"
                );
            }

            const result = await this.commentsService.getUserComments(
                targetUserId,
                page,
                limit
            );

            return ResponseHandler.success(
                res,
                result.comments,
                `Retrieved ${result.comments.length} comments`,
                result.pagination
            );
        }
    );

    // POST /api/comments/:id/spam - Mark comment as spam (admin/moderator only)
    markAsSpam = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;
            const userRole = req.user?.role;

            if (!id) {
                return ResponseHandler.error(
                    res,
                    "Comment ID is required",
                    400,
                    "MISSING_COMMENT_ID"
                );
            }

            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "Authentication required",
                    401,
                    "AUTH_REQUIRED"
                );
            }

            const comment = await this.commentsService.markAsSpam(
                id,
                userId,
                userRole || "USER"
            );

            return ResponseHandler.success(
                res,
                comment,
                "Comment marked as spam"
            );
        }
    );

    // POST /api/comments/:id/approve - Approve comment (admin/moderator only)
    approveComment = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;
            const userRole = req.user?.role;

            if (!id) {
                return ResponseHandler.error(
                    res,
                    "Comment ID is required",
                    400,
                    "MISSING_COMMENT_ID"
                );
            }

            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "Authentication required",
                    401,
                    "AUTH_REQUIRED"
                );
            }

            const comment = await this.commentsService.approveComment(
                id,
                userId,
                userRole || "USER"
            );

            return ResponseHandler.success(
                res,
                comment,
                "Comment approved successfully"
            );
        }
    );

    // GET /api/comments/recent - Get recent comments (admin dashboard)
    getRecentComments = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const { limit } = req.query;
            const userRole = req.user?.role;

            // Only admins and moderators can see recent comments across all articles
            if (userRole !== "ADMIN" && userRole !== "MODERATOR") {
                return ResponseHandler.error(
                    res,
                    "Insufficient permissions",
                    403,
                    "INSUFFICIENT_PERMISSIONS"
                );
            }

            const comments = await this.commentsService.getRecentComments(
                limit ? parseInt(limit as string, 10) : 10
            );

            return ResponseHandler.success(
                res,
                comments,
                `Retrieved ${comments.length} recent comments`
            );
        }
    );

    // GET /api/comments/stats/:articleId - Get comment statistics for an article
    getCommentStats = asyncHandler(async (req: Request, res: Response) => {
        const { articleId } = req.params;

        if (!articleId) {
            return ResponseHandler.error(
                res,
                "Article ID is required",
                400,
                "MISSING_ARTICLE_ID"
            );
        }

        // Get total approved comments count
        const result = await this.commentsService.getCommentsByArticleId(
            articleId,
            1,
            1, // Just need count, not actual comments
            false, // Don't include spam
            false // Don't include unapproved
        );

        return ResponseHandler.success(
            res,
            {
                total: result.pagination.total,
                articleId,
            },
            "Comment statistics retrieved"
        );
    });
}
