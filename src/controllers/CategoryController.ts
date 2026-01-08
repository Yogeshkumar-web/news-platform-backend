import { Request, Response } from "express";
import { CategoryService } from "../services/CategoryService";
import { ResponseHandler } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { ArticleService } from "../services/ArticleService";

const categoryService = new CategoryService();
const articleService = new ArticleService();

export class CategoryController {
    // Admin: Create new category (POST /categories)
    createCategory = asyncHandler(async (req: Request, res: Response) => {
        const category = await categoryService.createCategory(req.body);
        const response = ResponseHandler.created(
            res,
            category,
            "Category created successfully"
        );
        // console.log("[Backend Response]", response);
        return response;
    });

    // Admin: Get list of all categories (GET /categories/admin/all)
    getAllCategories = asyncHandler(async (req: Request, res: Response) => {
        const categories = await categoryService.getAllCategories();
        return ResponseHandler.success(
            res,
            categories,
            "Categories retrieved successfully"
        );
    });

    getCategories = asyncHandler(async (req: Request, res: Response) => {
        const categories = await articleService.getCategories();
        return ResponseHandler.success(
            res,
            categories,
            "Categories retrieved successfully"
        );
    });

    // Admin: Update category (PUT /categories/:id)
    updateCategory = asyncHandler(async (req: Request, res: Response) => {
        const id = req.params.id;
        const category = await categoryService.updateCategory(id, req.body);
        return ResponseHandler.success(
            res,
            category,
            "Category updated successfully"
        );
    });

    // Admin: Delete category (DELETE /categories/:id)
    deleteCategory = asyncHandler(async (req: Request, res: Response) => {
        const id = req.params.id;
        await categoryService.deleteCategory(id);
        return ResponseHandler.success(
            res,
            null,
            "Category deleted successfully"
        );
    });
}
