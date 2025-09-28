import db from "../config/database";
import { Prisma } from "@prisma/client";
import {
    FindByAuthorOptions,
    FindCategoriesOptions,
    FindManyOptions,
    FindPopularOptions,
    FindPublishedOptions,
    SearchOptions,
} from "../types";

export class ArticleRepository {
    // Existing methods...
    async countPublished(where: any = {}): Promise<number> {
        return db.article.count({ where: { status: "PUBLISHED", ...where } });
    }

    async count(where: any = {}): Promise<number> {
        return db.article.count({ where });
    }

    async findPublished({
        where = {},
        skip = 0,
        take = 10,
        orderBy = { createdAt: "desc" as const },
        select = undefined,
    }: FindPublishedOptions) {
        return db.article.findMany({
            where: { status: "PUBLISHED", ...where },
            orderBy,
            skip,
            take,
            select,
        });
    }

    async findMany({
        where = {},
        skip = 0,
        take = 10,
        orderBy = { createdAt: "desc" as const },
        select = undefined,
    }: FindManyOptions) {
        return db.article.findMany({
            where,
            orderBy,
            skip,
            take,
            select,
        });
    }

    async findBySlug(slug: string, select?: any) {
        return db.article.findUnique({
            where: { slug },
            select: select || {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                content: true,
                status: true,
                thumbnail: true,
                isPremium: true,
                viewCount: true,
                createdAt: true,
                updatedAt: true,
                authorId: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                        bio: true,
                    },
                },
                articleCategories: {
                    include: {
                        category: {
                            select: { id: true, key: true, label: true },
                        },
                    },
                },
                comments: {
                    where: { isApproved: true, isSpam: false },
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                profileImage: true,
                            },
                        },
                    },
                    orderBy: [{ createdAt: "desc" as const }],
                },
                _count: { select: { likes: true, comments: true } },
            },
        });
    }

    // NEW METHODS FOR ARTICLE MANAGEMENT

    // Find article by ID
    async findById(id: string, select?: any) {
        return db.article.findUnique({
            where: { id },
            select: select || {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                content: true,
                status: true,
                thumbnail: true,
                featured: true,
                isPremium: true,
                viewCount: true,
                createdAt: true,
                updatedAt: true,
                authorId: true,
                author: {
                    select: { id: true, name: true, profileImage: true },
                },
                articleCategories: {
                    include: {
                        category: {
                            select: { id: true, key: true, label: true },
                        },
                    },
                },
                _count: { select: { likes: true, comments: true } },
            },
        });
    }

    // Create new article
    async create(data: Prisma.ArticleCreateInput, select?: any) {
        return db.article.create({
            data,
            select: select || {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                content: true,
                status: true,
                thumbnail: true,
                featured: true,
                isPremium: true,
                viewCount: true,
                createdAt: true,
                updatedAt: true,
                author: {
                    select: { id: true, name: true, profileImage: true },
                },
                articleCategories: {
                    include: {
                        category: {
                            select: { id: true, key: true, label: true },
                        },
                    },
                },
                _count: { select: { likes: true, comments: true } },
            },
        });
    }

    // Update article
    async update(id: string, data: Prisma.ArticleUpdateInput, select?: any) {
        return db.article.update({
            where: { id },
            data,
            select: select || {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                content: true,
                status: true,
                thumbnail: true,
                featured: true,
                isPremium: true,
                viewCount: true,
                createdAt: true,
                updatedAt: true,
                author: {
                    select: { id: true, name: true, profileImage: true },
                },
                articleCategories: {
                    include: {
                        category: {
                            select: { id: true, key: true, label: true },
                        },
                    },
                },
                _count: { select: { likes: true, comments: true } },
            },
        });
    }

    // Delete article
    async delete(id: string) {
        return db.article.delete({
            where: { id },
        });
    }

    // Update article categories
    async updateCategories(
        articleId: string,
        categoryKeys: string[]
    ): Promise<void> {
        await db.$transaction(async (tx) => {
            // Remove existing categories
            await tx.articleCategory.deleteMany({
                where: { articleId },
            });

            // Add new categories
            if (categoryKeys && categoryKeys.length > 0) {
                // First, ensure categories exist
                for (const key of categoryKeys) {
                    await tx.category.upsert({
                        where: { key },
                        create: {
                            key,
                            label: key
                                .replace(/-/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase()),
                            count: 1,
                        },
                        update: {
                            count: { increment: 1 },
                        },
                    });
                }

                // Then create article-category relationships
                const categoryIds = await tx.category.findMany({
                    where: { key: { in: categoryKeys } },
                    select: { id: true, key: true },
                });

                await tx.articleCategory.createMany({
                    data: categoryIds.map((category) => ({
                        articleId,
                        categoryId: category.id,
                    })),
                });
            }
        });
    }

    async incrementViewCount(id: string) {
        return db.article.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
        });
    }

    async findCategories({
        select = { key: true, label: true, count: true },
        orderBy = { count: "desc" as const },
    }: FindCategoriesOptions = {}) {
        return db.category.findMany({ select, orderBy });
    }

    // Get articles by author
    async findByAuthor(authorId: string, options: FindByAuthorOptions = {}) {
        const {
            skip = 0,
            take = 10,
            orderBy = { updatedAt: "desc" as const },
            select = undefined,
            status = undefined,
        } = options;

        const where: any = { authorId };
        if (status) {
            where.status = status;
        }

        return db.article.findMany({
            where,
            orderBy,
            skip,
            take,
            select,
        });
    }

    // Search articles
    async search(query: string, options: SearchOptions = {}) {
        const {
            skip = 0,
            take = 10,
            orderBy = { createdAt: "desc" as const },
            select = undefined,
        } = options;

        return db.article.findMany({
            where: {
                status: "PUBLISHED",
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { excerpt: { contains: query, mode: "insensitive" } },
                    { content: { contains: query, mode: "insensitive" } },
                ],
            },
            orderBy,
            skip,
            take,
            select,
        });
    }

    // Get featured articles
    async findFeatured(options: Omit<FindByAuthorOptions, "status"> = {}) {
        const {
            skip = 0,
            take = 5,
            orderBy = { createdAt: "desc" as const },
            select = undefined,
        } = options;

        return db.article.findMany({
            where: {
                status: "PUBLISHED",
                featured: true,
            },
            orderBy,
            skip,
            take,
            select,
        });
    }

    // Get popular articles (by view count)
    async findPopular(options: FindPopularOptions = {}) {
        const {
            skip = 0,
            take = 10,
            select = undefined,
            daysBack = 30,
        } = options;

        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - daysBack);

        return db.article.findMany({
            where: {
                status: "PUBLISHED",
                createdAt: { gte: dateFrom },
            },
            orderBy: { viewCount: "desc" as const },
            skip,
            take,
            select,
        });
    }
}
