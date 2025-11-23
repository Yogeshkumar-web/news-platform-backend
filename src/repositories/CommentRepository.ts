import db from "../config/database";
import { Prisma } from "@prisma/client";

export class CommentsRepository {
    // Get comments for an article with user details
    async findByArticleId(
        articleId: string,
        options: {
            skip?: number;
            take?: number;
            orderBy?: Prisma.CommentOrderByWithRelationInput;
            includeSpam?: boolean;
            includeUnapproved?: boolean;
        } = {}
    ) {
        const {
            skip = 0,
            take = 20,
            orderBy = { createdAt: "desc" },
            includeSpam = false,
            includeUnapproved = false,
        } = options;

        // Build where clause for filtering
        const where: Prisma.CommentWhereInput = {
            articleId,
            ...(includeSpam ? {} : { isSpam: false }),
            ...(includeUnapproved ? {} : { isApproved: true }),
        };

        return db.comment.findMany({
            where,
            skip,
            take,
            orderBy,
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                        role: true,
                    },
                },
            },
        });
    }

    // Count comments for an article
    async countByArticleId(
        articleId: string,
        includeSpam: boolean = false,
        includeUnapproved: boolean = false
    ): Promise<number> {
        const where: Prisma.CommentWhereInput = {
            articleId,
            ...(includeSpam ? {} : { isSpam: false }),
            ...(includeUnapproved ? {} : { isApproved: true }),
        };

        return db.comment.count({ where });
    }

    // Create a new comment
    async create(data: {
        content: string;
        articleId: string;
        authorId: string;
        isApproved?: boolean;
    }) {
        const comment = await db.comment.create({
            data: {
                content: data.content.trim(),
                articleId: data.articleId,
                authorId: data.authorId,
                isApproved: data.isApproved ?? true,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                        role: true,
                    },
                },
            },
        });

        // Update article comment count (if you track it separately)
        // This is optional - you can calculate it dynamically
        await this.updateArticleCommentCount(data.articleId);

        return comment;
    }

    // Find comment by ID with author details
    async findById(id: string) {
        return db.comment.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                        role: true,
                    },
                },
                article: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
            },
        });
    }

    // Update comment content
    async update(
        id: string,
        data: { content?: string; isApproved?: boolean; isSpam?: boolean }
    ) {
        const updateData: Prisma.CommentUpdateInput = {};

        if (data.content !== undefined) {
            updateData.content = data.content.trim();
            updateData.updatedAt = new Date();
        }

        if (data.isApproved !== undefined) {
            updateData.isApproved = data.isApproved;
        }

        if (data.isSpam !== undefined) {
            updateData.isSpam = data.isSpam;
        }

        return db.comment.update({
            where: { id },
            data: updateData,
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                        role: true,
                    },
                },
            },
        });
    }

    // Delete comment
    async delete(id: string) {
        const comment = await db.comment.findUnique({
            where: { id },
            select: { articleId: true },
        });

        if (!comment) {
            throw new Error("Comment not found");
        }

        await db.comment.delete({
            where: { id },
        });

        // Update article comment count
        await this.updateArticleCommentCount(comment.articleId);

        return true;
    }

    // Get user's comments with pagination
    async findByUserId(
        userId: string,
        options: {
            skip?: number;
            take?: number;
            orderBy?: Prisma.CommentOrderByWithRelationInput;
        } = {}
    ) {
        const {
            skip = 0,
            take = 20,
            orderBy = { createdAt: "desc" },
        } = options;

        return db.comment.findMany({
            where: {
                authorId: userId,
                isSpam: false, // Don't show spam comments to user
            },
            skip,
            take,
            orderBy,
            include: {
                article: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        thumbnail: true,
                    },
                },
            },
        });
    }

    // Mark comment as spam
    async markAsSpam(id: string) {
        return this.update(id, { isSpam: true, isApproved: false });
    }

    // Mark comment as approved
    async approve(id: string) {
        return this.update(id, { isApproved: true, isSpam: false });
    }

    // Get comments pending approval (for moderation)
    async findPendingApproval(
        options: {
            skip?: number;
            take?: number;
        } = {}
    ) {
        const { skip = 0, take = 50 } = options;

        return db.comment.findMany({
            where: {
                isApproved: false,
                isSpam: false,
            },
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                        role: true,
                    },
                },
                article: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
            },
        });
    }

    // Helper method to update article comment count
    private async updateArticleCommentCount(articleId: string) {
        // This is optional - you can calculate comment count dynamically
        // Or maintain a separate counter for performance

        const count = await db.comment.count({
            where: {
                articleId,
                isSpam: false,
                isApproved: true,
            },
        });

        // If you have a commentCount field in Article model, update it
        // await db.article.update({
        //   where: { id: articleId },
        //   data: { commentCount: count },
        // });

        return count;
    }

    // Get recent comments across all articles (for admin dashboard)
    async findRecent(limit: number = 10) {
        return db.comment.findMany({
            take: limit,
            orderBy: { createdAt: "desc" },
            where: {
                isSpam: false,
                isApproved: true,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                    },
                },
                article: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
            },
        });
    }

    // Search comments by content
    async search(
        query: string,
        options: {
            skip?: number;
            take?: number;
        } = {}
    ) {
        const { skip = 0, take = 20 } = options;

        return db.comment.findMany({
            where: {
                content: {
                    contains: query,
                    mode: "insensitive",
                },
                isSpam: false,
                isApproved: true,
            },
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                    },
                },
                article: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
            },
        });
    }

    async updateStatus(commentId: string, status: string) {
        const updatedComment = await db.comment.update({
            where: { id: commentId },
            data: {
                status: status as any,
                updatedAt: new Date(),
            },
            select: {
                id: true,
                content: true,
                status: true,
                createdAt: true,
                // Include other necessary fields for the service layer DTO
            },
        });
        return updatedComment;
    }
}
