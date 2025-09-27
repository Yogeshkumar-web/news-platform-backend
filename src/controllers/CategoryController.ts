import { Request, Response } from "express";
import { CategoryService } from "../services/CategoryService";
import { ResponseHandler } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";

const categoryService = new CategoryService();

export class CategoryController {
    getCategories = asyncHandler(async (req: Request, res: Response) => {
        const categories = await categoryService.getCategories();
        return ResponseHandler.success(
            res,
            categories,
            "Categories retrieved successfully"
        );
    });
}
