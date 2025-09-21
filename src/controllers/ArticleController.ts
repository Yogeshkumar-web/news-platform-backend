import { Request, Response } from "express";
import { ArticleService } from "../services/ArticleService";
import { ResponseHandler } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";

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

  getArticlesByCategory = asyncHandler(async (req: Request, res: Response) => {
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
  });

  getArticleBySlug = asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const article = await articleService.getArticleBySlug(slug);
    return ResponseHandler.success(
      res,
      article,
      "Article retrieved successfully"
    );
  });
}
