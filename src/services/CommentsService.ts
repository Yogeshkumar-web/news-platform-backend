import { normalizePageParams, buildPaginationMeta } from "../utils/pagination";
import logger from "../utils/logger";
import { NotFoundError, AuthorizationError, ValidationError } from "../types";
import { CommentsRepository } from "../repositories/CommentRepository";

export class CommentsService {
    private repo = new CommentsRepository();

    // Get comments for an article with pagination
    async getCommentsByArticleId(
        articleId: string,
        page?: any,
        limit?: any,
        includeSpam: boolean = false,
        includeUnapproved: boolean = false
    ) {
        try {
            const {
                page: normalizedPage,
                limit: normalizedLimit,
                skip,
            } = normalizePageParams(page, limit, 50);

            // Get comments and total count in parallel
            const [comments, total] = await Promise.all([
                this.repo.findByArticleId(articleId, {
                    skip,
                    take: normalizedLimit,
                    orderBy: { createdAt: "asc" }, // Oldest first for better conversation flow
                    includeSpam,
                    includeUnapproved,
                }),
                this.repo.countByArticleId(
                    articleId,
                    includeSpam,
                    includeUnapproved
                ),
            ]);

            logger.info(
                `Retrieved ${comments.length} comments for article ${articleId}`
            );

            return {
                comments: comments.map(this.mapCommentToDto),
                pagination: buildPaginationMeta(
                    normalizedPage,
                    normalizedLimit,
                    total
                ),
            };
        } catch (error) {
            logger.error("Error fetching comments:", { articleId, error });
            throw error;
        }
    }

    // Create a new comment
    async createComment(data: {
        content: string;
        articleId: string;
        authorId: string;
    }) {
        try {
            // Validate input
            this.validateCommentContent(data.content);

            // Check if article exists
            const articleExists = await this.checkArticleExists(data.articleId);
            if (!articleExists) {
                throw new NotFoundError(
                    "Article not found",
                    "ARTICLE_NOT_FOUND"
                );
            }

            // Create comment
            const comment = await this.repo.create({
                content: data.content,
                articleId: data.articleId,
                authorId: data.authorId,
                isApproved: true, // Auto-approve for now
            });

            logger.info(`Comment created successfully`, {
                commentId: comment.id,
                articleId: data.articleId,
                authorId: data.authorId,
            });

            return this.mapCommentToDto(comment);
        } catch (error) {
            logger.error("Error creating comment:", { error, data });
            throw error;
        }
    }

    // Delete a comment (only by author or admin)
    async deleteComment(commentId: string, userId: string, userRole: string) {
        try {
            // Find the comment
            const comment = await this.repo.findById(commentId);
            if (!comment) {
                throw new NotFoundError(
                    "Comment not found",
                    "COMMENT_NOT_FOUND"
                );
            }

            // Check permissions
            const canDelete =
                comment.authorId === userId || // Owner can delete
                userRole === "ADMIN" || // Admin can delete
                userRole === "MODERATOR"; // Moderator can delete

            if (!canDelete) {
                throw new AuthorizationError(
                    "You can only delete your own comments",
                    "INSUFFICIENT_PERMISSIONS"
                );
            }

            await this.repo.delete(commentId);

            logger.info(`Comment deleted successfully`, {
                commentId,
                deletedBy: userId,
                originalAuthor: comment.authorId,
            });

            return { success: true, message: "Comment deleted successfully" };
        } catch (error) {
            logger.error("Error deleting comment:", {
                commentId,
                userId,
                error,
            });
            throw error;
        }
    }

    // Update a comment (only by author)
    async updateComment(commentId: string, content: string, userId: string) {
        try {
            // Validate content
            this.validateCommentContent(content);

            // Find the comment
            const existingComment = await this.repo.findById(commentId);
            if (!existingComment) {
                throw new NotFoundError(
                    "Comment not found",
                    "COMMENT_NOT_FOUND"
                );
            }

            // Check permissions - only author can edit
            if (existingComment.authorId !== userId) {
                throw new AuthorizationError(
                    "You can only edit your own comments",
                    "INSUFFICIENT_PERMISSIONS"
                );
            }

            const updatedComment = await this.repo.update(commentId, {
                content,
            });

            logger.info(`Comment updated successfully`, {
                commentId,
                authorId: userId,
            });

            return this.mapCommentToDto(updatedComment);
        } catch (error) {
            logger.error("Error updating comment:", {
                commentId,
                userId,
                error,
            });
            throw error;
        }
    }

    // Get user's comments
    async getUserComments(userId: string, page?: any, limit?: any) {
        try {
            const {
                page: normalizedPage,
                limit: normalizedLimit,
                skip,
            } = normalizePageParams(page, limit, 20);

            const comments = await this.repo.findByUserId(userId, {
                skip,
                take: normalizedLimit,
                orderBy: { createdAt: "desc" },
            });

            // Get total count
            const total = await this.repo.countByArticleId("", false, false); // TODO: Implement user comment count

            return {
                comments: comments.map((comment) => ({
                    id: comment.id,
                    content: comment.content,
                    createdAt: comment.createdAt,
                    updatedAt: comment.updatedAt,
                    article: {
                        id: comment.article.id,
                        title: comment.article.title,
                        slug: comment.article.slug,
                        thumbnail: comment.article.thumbnail,
                    },
                })),
                pagination: buildPaginationMeta(
                    normalizedPage,
                    normalizedLimit,
                    total
                ),
            };
        } catch (error) {
            logger.error("Error fetching user comments:", { userId, error });
            throw error;
        }
    }

    // Mark comment as spam (admin/moderator only)
    async markAsSpam(commentId: string, userId: string, userRole: string) {
        try {
            if (userRole !== "ADMIN" && userRole !== "MODERATOR") {
                throw new AuthorizationError(
                    "Only admins and moderators can mark comments as spam",
                    "INSUFFICIENT_PERMISSIONS"
                );
            }

            const comment = await this.repo.markAsSpam(commentId);

            logger.info(`Comment marked as spam`, {
                commentId,
                markedBy: userId,
            });

            return this.mapCommentToDto(comment);
        } catch (error) {
            logger.error("Error marking comment as spam:", {
                commentId,
                userId,
                error,
            });
            throw error;
        }
    }

    // Approve comment (admin/moderator only)
    async approveComment(commentId: string, userId: string, userRole: string) {
        try {
            if (userRole !== "ADMIN" && userRole !== "MODERATOR") {
                throw new AuthorizationError(
                    "Only admins and moderators can approve comments",
                    "INSUFFICIENT_PERMISSIONS"
                );
            }

            const comment = await this.repo.approve(commentId);

            logger.info(`Comment approved`, {
                commentId,
                approvedBy: userId,
            });

            return this.mapCommentToDto(comment);
        } catch (error) {
            logger.error("Error approving comment:", {
                commentId,
                userId,
                error,
            });
            throw error;
        }
    }

    // Get recent comments (for dashboard)
    async getRecentComments(limit: number = 10) {
        try {
            const comments = await this.repo.findRecent(limit);
            return comments.map(this.mapCommentToDto);
        } catch (error) {
            logger.error("Error fetching recent comments:", { error });
            throw error;
        }
    }

    // Private helper methods
    private validateCommentContent(content: string) {
        if (!content || typeof content !== "string") {
            throw new ValidationError(
                "Comment content is required",
                "CONTENT_REQUIRED"
            );
        }

        const trimmedContent = content.trim();

        if (trimmedContent.length === 0) {
            throw new ValidationError(
                "Comment cannot be empty",
                "EMPTY_CONTENT"
            );
        }

        if (trimmedContent.length > 1000) {
            throw new ValidationError(
                "Comment is too long (max 1000 characters)",
                "CONTENT_TOO_LONG"
            );
        }

        if (trimmedContent.length < 3) {
            throw new ValidationError(
                "Comment is too short (min 3 characters)",
                "CONTENT_TOO_SHORT"
            );
        }

        // Basic spam detection
        const spamPatterns = [
            /(.)\1{4,}/gi, // Repeated characters (aaaaa)
            /(https?:\/\/[^\s]+)/gi, // URLs (simple detection)
            /\b(viagra|casino|poker|lottery)\b/gi, // Common spam words
        ];

        for (const pattern of spamPatterns) {
            if (pattern.test(trimmedContent)) {
                logger.warn("Potential spam comment detected", {
                    content: trimmedContent,
                });
                // For now, just log. You can implement auto-moderation later
                break;
            }
        }
    }

    private async checkArticleExists(articleId: string): Promise<boolean> {
        try {
            // Import ArticleRepository here to avoid circular dependency
            const { ArticleRepository } = await import(
                "../repositories/ArticleRepository"
            );
            const articleRepo = new ArticleRepository();

            const article = await articleRepo.findPublished({
                where: { id: articleId },
                select: { id: true },
                take: 1,
            });

            return article.length > 0;
        } catch (error) {
            logger.error("Error checking article existence:", {
                articleId,
                error,
            });
            return false;
        }
    }

    private mapCommentToDto(comment: any) {
        return {
            id: comment.id,
            content: comment.content,
            isApproved: comment.isApproved,
            isSpam: comment.isSpam,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            author: {
                id: comment.author.id,
                name: comment.author.name,
                profileImage: comment.author.profileImage,
                role: comment.author.role,
            },
        };
    }
}
