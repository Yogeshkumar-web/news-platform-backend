import { Request, Response } from "express";
import { ArticleService } from "../services/ArticleService";
import { ResponseHandler } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../types";

const articleService = new ArticleService();

export class ArticleController {
    getArticles = asyncHandler(async (req: Request, res: Response) => {
        const result = await articleService.getArticles({
            page: req.query.page,
            pageSize: req.query.pageSize,
            category: req.query.category as string,
        });
        return ResponseHandler.success(
            res,
            result.articles,
            "Articles retrieved successfully",
            result.pagination
        );
    });

    getArticlesByCategory = asyncHandler(
        async (req: Request, res: Response) => {
            const categoryName = req.params.categoryName;
            const result = await articleService.getArticlesByCategory(
                categoryName,
                req.query.page,
                req.query.limit
            );
            return ResponseHandler.success(
                res,
                result.articles,
                `Articles for category ${categoryName}`,
                result.pagination
            );
        }
    );

    getArticleBySlug = asyncHandler(async (req: Request, res: Response) => {
        const slug = req.params.slug;
        const article = await articleService.getArticleBySlug(slug);
        return ResponseHandler.success(
            res,
            article,
            "Article retrieved successfully"
        );
    });

    createArticle = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const userId = req.user?.id;
            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "User not authenticated",
                    401,
                    "NOT_AUTHENTICATED"
                );
            }

            const articleData = {
                ...req.body,
                authorId: userId,
            };

            const article = await articleService.createArticle(articleData);
            return ResponseHandler.created(
                res,
                article,
                "Article created successfully"
            );
        }
    );

    updateArticle = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;
            const userRole = req.user?.role;

            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "User not authenticated",
                    401,
                    "NOT_AUTHENTICATED"
                );
            }

            const article = await articleService.updateArticle(
                id,
                req.body,
                userId,
                userRole
            );
            return ResponseHandler.success(
                res,
                article,
                "Article updated successfully"
            );
        }
    );

    deleteArticle = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;
            const userRole = req.user?.role;

            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "User not authenticated",
                    401,
                    "NOT_AUTHENTICATED"
                );
            }

            await articleService.deleteArticle(id, userId, userRole);
            return ResponseHandler.success(
                res,
                null,
                "Article deleted successfully"
            );
        }
    );

    // Get article for editing (includes draft content)
    getArticleForEdit = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;
            const userRole = req.user?.role;

            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "User not authenticated",
                    401,
                    "NOT_AUTHENTICATED"
                );
            }

            const article = await articleService.getArticleForEdit(
                id,
                userId,
                userRole
            );
            return ResponseHandler.success(
                res,
                article,
                "Article retrieved for editing"
            );
        }
    );

    // Get user's articles (for dashboard)
    getMyArticles = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const userId = req.user?.id;
            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "User not authenticated",
                    401,
                    "NOT_AUTHENTICATED"
                );
            }

            const result = await articleService.getMyArticles(userId, {
                page: req.query.page,
                pageSize: req.query.pageSize,
                status: req.query.status as string,
            });

            return ResponseHandler.success(
                res,
                result.articles,
                "User articles retrieved successfully",
                result.pagination
            );
        }
    );

    // Toggle article status (draft/published)
    toggleArticleStatus = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const { id } = req.params;
            const { status } = req.body;
            const userId = req.user?.id;
            const userRole = req.user?.role;

            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "User not authenticated",
                    401,
                    "NOT_AUTHENTICATED"
                );
            }

            const article = await articleService.toggleArticleStatus(
                id,
                status,
                userId,
                userRole
            );
            return ResponseHandler.success(
                res,
                article,
                "Article status updated successfully"
            );
        }
    );

    // Upload image for article (for rich text editor)
    uploadImage = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            // This will be implemented based on your file upload preference
            // Could be AWS S3, Cloudinary, or local storage
            const imageUrl = await articleService.uploadImage(req.file);
            return ResponseHandler.success(
                res,
                { url: imageUrl },
                "Image uploaded successfully"
            );
        }
    );
}
