import { ArticleRepository } from "../repositories/ArticleRepository";
import { normalizePageParams, buildPaginationMeta } from "../utils/pagination";
import { categoryKey } from "../utils/category";
import logger from "../utils/logger";
import ImageKit from "imagekit";

import {
    NotFoundError,
    AuthorizationError,
    ValidationError,
    CreateArticleData,
    UpdateArticleData,
    GetMyArticlesQuery,
    GetArticlesQuery,
} from "../types";
import { env } from "../config/environment";

const imagekit = new ImageKit({
    publicKey: env.IMAGEKIT_PUBLIC_KEY,
    privateKey: env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
});

// DEFAULT SELECT - use `select` for nested shapes to avoid include/select mismatch
const DEFAULT_SELECT = {
    id: true,
    title: true,
    slug: true,
    excerpt: true,
    thumbnail: true,
    isPremium: true,
    viewCount: true,
    status: true,
    createdAt: true,
    author: { select: { id: true, name: true, profileImage: true } },
    _count: { select: { likes: true, comments: true } },
    articleCategories: {
        select: {
            category: { select: { id: true, key: true, label: true } },
        },
    },
} as const;

const EDIT_SELECT = {
    ...DEFAULT_SELECT,
    content: true,
    status: true,
    featured: true,
    updatedAt: true,
} as const;

// Pragmatic: mark DB payload types as `any` to avoid deep Prisma generic instantiation issues.
// We'll still validate fields at runtime before use.
type ArticleDb = any;
type EditArticleDb = any;

export class ArticleService {
    private repo: ArticleRepository;

    constructor() {
        this.repo = new ArticleRepository();
    }

    // Map DB article to frontend DTO
    // Accept `any` to avoid TypeScript union mis-inference from Prisma selects
    private mapArticleDbToDto(dbArticle: ArticleDb | EditArticleDb) {
        const a = dbArticle as any;

        const tags = (a.articleCategories || [])
            .map((ac: any) => ac?.category?.label)
            .filter(Boolean) as string[];

        const categories = (a.articleCategories || [])
            .map((ac: any) =>
                ac?.category
                    ? { key: ac.category.key, label: ac.category.label }
                    : null
            )
            .filter(Boolean) as Array<{ key: string; label: string }>;

        return {
            id: a.id,
            title: a.title,
            slug: a.slug,
            excerpt: a.excerpt,
            content: "content" in a ? a.content : undefined,
            tags,
            categories,
            thumbnail: a.thumbnail,
            isPremium: a.isPremium,
            viewCount: a.viewCount,
            status: "status" in a ? a.status : undefined,
            featured: "featured" in a ? a.featured : undefined,
            createdAt: a.createdAt,
            updatedAt: "updatedAt" in a ? a.updatedAt : undefined,
            author: a.author,
            _count: a._count,
        };
    }

    // Generate unique slug
    private async generateSlug(
        title: string,
        existingId?: string | null
    ): Promise<string> {
        let baseSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .trim();

        let slug = baseSlug;
        let counter = 1;

        while (true) {
            const existing = (await this.repo.findBySlug(slug)) as {
                id: string;
            } | null;
            if (!existing) break;
            if (existingId && existing.id === existingId) break;
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }

    // Validate article data
    private validateArticleData(data: {
        title?: string;
        content?: string;
        excerpt?: string;
    }): void {
        const errors: Array<{ field: string; message: string }> = [];

        if (
            data.title !== undefined &&
            (!data.title || data.title.trim().length < 5)
        ) {
            errors.push({
                field: "title",
                message: "Title must be at least 5 characters long",
            });
        }

        if (
            data.content !== undefined &&
            (!data.content || data.content.trim().length < 50)
        ) {
            errors.push({
                field: "content",
                message: "Content must be at least 50 characters long",
            });
        }

        if (data.excerpt && data.excerpt.length > 500) {
            errors.push({
                field: "excerpt",
                message: "Excerpt cannot exceed 500 characters",
            });
        }

        if (errors.length > 0) {
            throw new ValidationError(
                "Article validation failed",
                "ARTICLE_VALIDATION_ERROR"
            );
        }
    }

    // CREATE ARTICLE
    async createArticle(articleData: CreateArticleData) {
        this.validateArticleData(articleData);

        const slug = await this.generateSlug(articleData.title);

        // Build Prisma-compatible create payload (author relation connect)
        const data: any = {
            title: articleData.title.trim(),
            slug,
            content: articleData.content,
            excerpt: articleData.excerpt?.trim() || null,
            thumbnail: articleData.thumbnail || null,
            // cast status to any to avoid enum typing friction now:
            status: (articleData.status || "DRAFT") as any,
            featured: articleData.featured || false,
            isPremium: articleData.isPremium || false,
            author: { connect: { id: articleData.authorId } },
        };

        const article = await this.repo.create(data as any, EDIT_SELECT as any);

        // Handle categories if provided
        if (articleData.categories && articleData.categories.length > 0) {
            await this.repo.updateCategories(
                (article as any).id,
                articleData.categories
            );
        }

        logger.info("Article created successfully", {
            articleId: article.id,
            authorId: articleData.authorId,
        });

        return this.mapArticleDbToDto(article as EditArticleDb);
    }

    // UPDATE ARTICLE
    async updateArticle(
        articleId: string,
        updateData: UpdateArticleData,
        userId: string,
        userRole?: string
    ) {
        const existingArticle = (await this.repo.findById(articleId)) as any;

        if (!existingArticle) {
            throw new NotFoundError("Article not found", "ARTICLE_NOT_FOUND");
        }

        // Check permissions
        if (
            existingArticle.authorId !== userId &&
            !["ADMIN", "SUPERADMIN"].includes(userRole || "")
        ) {
            throw new AuthorizationError(
                "Not authorized to edit this article",
                "NOT_AUTHORIZED"
            );
        }

        // Validate if provided
        if (updateData.title || updateData.content) {
            this.validateArticleData({
                title: updateData.title || existingArticle.title,
                content: updateData.content || existingArticle.content,
                excerpt: updateData.excerpt,
            });
        }

        const data: Partial<{
            title: string;
            slug: string;
            content: string;
            excerpt: string | null;
            thumbnail: string | null;
            status: any;
            featured: boolean;
            isPremium: boolean;
        }> = {};

        if (updateData.title && updateData.title !== existingArticle.title) {
            data.title = updateData.title.trim();
            data.slug = await this.generateSlug(updateData.title, articleId);
        }

        if (updateData.content !== undefined) data.content = updateData.content;
        if (updateData.excerpt !== undefined)
            data.excerpt = updateData.excerpt?.trim() || null;
        if (updateData.thumbnail !== undefined)
            data.thumbnail = updateData.thumbnail;
        if (updateData.status !== undefined)
            data.status = updateData.status as any;
        if (updateData.featured !== undefined)
            data.featured = updateData.featured;
        if (updateData.isPremium !== undefined)
            data.isPremium = updateData.isPremium;

        const updatedArticle = await this.repo.update(
            articleId,
            data as any,
            EDIT_SELECT as any
        );

        // Handle category updates
        if (updateData.categories) {
            await this.repo.updateCategories(articleId, updateData.categories);
        }

        logger.info("Article updated successfully", {
            articleId,
            userId,
            updatedFields: Object.keys(data),
        });

        return this.mapArticleDbToDto(updatedArticle as EditArticleDb);
    }

    // DELETE ARTICLE
    async deleteArticle(
        articleId: string,
        userId: string,
        userRole?: string
    ): Promise<void> {
        const article = (await this.repo.findById(articleId)) as any;

        if (!article) {
            throw new NotFoundError("Article not found", "ARTICLE_NOT_FOUND");
        }

        if (
            article.authorId !== userId &&
            !["ADMIN", "SUPERADMIN"].includes(userRole || "")
        ) {
            throw new AuthorizationError(
                "Not authorized to delete this article",
                "NOT_AUTHORIZED"
            );
        }

        await this.repo.delete(articleId);

        logger.info("Article deleted successfully", { articleId, userId });
    }

    // GET ARTICLE FOR EDIT
    async getArticleForEdit(
        articleId: string,
        userId: string,
        userRole?: string
    ) {
        const article = (await this.repo.findById(
            articleId,
            EDIT_SELECT as any
        )) as any;

        if (!article) {
            throw new NotFoundError("Article not found", "ARTICLE_NOT_FOUND");
        }

        if (
            article.authorId !== userId &&
            !["ADMIN", "SUPERADMIN"].includes(userRole || "")
        ) {
            throw new AuthorizationError(
                "Not authorized to edit this article",
                "NOT_AUTHORIZED"
            );
        }

        return this.mapArticleDbToDto(article as EditArticleDb);
    }

    // GET USER'S ARTICLES
    async getMyArticles(userId: string, query: GetMyArticlesQuery) {
        const { page, limit, skip } = normalizePageParams(
            query.page,
            query.pageSize
        );

        const where: any = { authorId: userId };
        if (query.status) where.status = query.status;

        const [total, articlesRaw] = await Promise.all([
            this.repo.count(where),
            this.repo.findMany({
                where,
                skip,
                take: limit,
                select: EDIT_SELECT as any,
                orderBy: { updatedAt: "desc" },
            }),
        ]);

        const articles = (articlesRaw as any[]).map((a) =>
            this.mapArticleDbToDto(a as EditArticleDb)
        );

        return {
            articles,
            pagination: buildPaginationMeta(page, limit, total),
        };
    }

    // TOGGLE ARTICLE STATUS
    async toggleArticleStatus(
        articleId: string,
        status: string,
        userId: string,
        userRole?: string
    ) {
        const article = (await this.repo.findById(articleId)) as any;

        if (!article) {
            throw new NotFoundError("Article not found", "ARTICLE_NOT_FOUND");
        }

        if (
            article.authorId !== userId &&
            !["ADMIN", "SUPERADMIN"].includes(userRole || "")
        ) {
            throw new AuthorizationError(
                "Not authorized to change article status",
                "NOT_AUTHORIZED"
            );
        }

        const allowedStatuses = [
            "DRAFT",
            "PUBLISHED",
            "ARCHIVED",
            "PENDING_REVIEW",
        ];
        if (!allowedStatuses.includes(status)) {
            throw new ValidationError("Invalid status", "INVALID_STATUS");
        }

        const updatedArticle = await this.repo.update(
            articleId,
            { status: status as any } as any,
            EDIT_SELECT as any
        );

        logger.info("Article status updated", {
            articleId,
            oldStatus: article.status,
            newStatus: status,
            userId,
        });

        return this.mapArticleDbToDto(updatedArticle as EditArticleDb);
    }

    async uploadImage(file?: Express.Multer.File): Promise<string> {
        if (!file) {
            throw new ValidationError("No file provided", "NO_FILE");
        }

        // Convert Buffer to Base64 (ImageKit requires this or a stream)
        const base64File = file.buffer.toString("base64");

        try {
            const result = await imagekit.upload({
                file: base64File,
                fileName: file.originalname,
                folder: "/news-articles", // Aapka specific folder
            });

            logger.info("ImageKit upload successful", { url: result.url });

            return result.url; // ImageKit se mila public URL return karein
        } catch (error) {
            logger.error("ImageKit upload failed", { error });
            throw new Error("Failed to upload image to cloud storage");
        }
    }

    // GET ARTICLES (public)
    async getArticles(query: GetArticlesQuery) {
        const { page, limit, skip } = normalizePageParams(
            query.page,
            query.pageSize
        );

        const where: any = { status: "PUBLISHED" };
        if (query.category) {
            const normalized = categoryKey(query.category);
            where.articleCategories = {
                some: { category: { key: normalized } },
            };
        }

        const [total, articlesRaw] = await Promise.all([
            this.repo.countPublished(where),
            this.repo.findPublished({
                where,
                skip,
                take: limit,
                select: DEFAULT_SELECT as any,
            }),
        ]);

        const articles = (articlesRaw as any[]).map((a) =>
            this.mapArticleDbToDto(a as ArticleDb)
        );

        return {
            articles,
            pagination: buildPaginationMeta(page, limit, total),
        };
    }

    async getCategories() {
        const categories = await this.repo.findCategories();
        return categories.map((c: any) => ({
            key: c.key,
            label: c.label,
            count: c.count,
        }));
    }

    async getArticlesByCategory(
        categoryName: string,
        pageInput?: any,
        limitInput?: any
    ) {
        const { page, limit, skip } = normalizePageParams(
            pageInput,
            limitInput
        );

        const normalized = categoryKey(categoryName);
        if (!normalized)
            return {
                articles: [],
                pagination: buildPaginationMeta(page, limit, 0),
            };

        const where = {
            status: "PUBLISHED" as const,
            articleCategories: { some: { category: { key: normalized } } },
        };

        const [total, articlesRaw] = await Promise.all([
            this.repo.countPublished(where),
            this.repo.findPublished({
                where,
                skip,
                take: limit,
                select: DEFAULT_SELECT as any,
            }),
        ]);

        console.log("📊 Database results:", {
            total,
            found: articlesRaw.length,
        });

        const articles = (articlesRaw as any[]).map((a) =>
            this.mapArticleDbToDto(a as ArticleDb)
        );

        return {
            articles,
            pagination: buildPaginationMeta(page, limit, total),
        };
    }

    async getArticleBySlug(slug: string) {
        console.log("🔍 DEBUG: Received slug:", JSON.stringify(slug));
        console.log("🔍 DEBUG: Slug type:", typeof slug);
        console.log("🔍 DEBUG: Slug length:", slug?.length);

        if (!slug) throw new NotFoundError("Invalid slug", "INVALID_SLUG");

        const articleRaw = (await this.repo.findBySlug(
            slug,
            DEFAULT_SELECT as any
        )) as any;

        console.log("📄 DEBUG: Database result:", {
            found: !!articleRaw,
            id: articleRaw?.id,
            title: articleRaw?.title,
            slug: articleRaw?.slug,
            status: articleRaw?.status,
            rawArticle: articleRaw ? "Object found" : "NULL",
        });

        if (!articleRaw || articleRaw.status !== "PUBLISHED") {
            throw new NotFoundError("Article not found", "ARTICLE_NOT_FOUND");
        }

        // Fire-and-forget increment view count
        this.repo
            .incrementViewCount(articleRaw.id)
            .catch((err) => logger.error("inc view failed", { err }));

        return this.mapArticleDbToDto(articleRaw as ArticleDb);
    }

    async bulkUpdateStatus(articleIds: string[], status: string) {
        // Assuming ArticleRepository has a method to handle bulk update
        // We update the status and the updatedAt timestamp
        const result = await this.repo.bulkUpdateStatus(articleIds, status);

        // Agar aap ArticleRepository ko modify nahi kar sakte,
        // toh service mein direct db access se updateMany use karein.
        /*
        const result = await db.article.updateMany({
            where: { id: { in: articleIds } },
            data: { status: status as any, updatedAt: new Date() }
        });
        */

        logger.info("Bulk article status updated", {
            count: result.count,
            newStatus: status,
        });

        return result.count;
    }
}
