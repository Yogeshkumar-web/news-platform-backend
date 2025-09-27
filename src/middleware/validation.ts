import { Request, Response, NextFunction } from "express";
import { body, query, param, validationResult } from "express-validator";
import { ResponseHandler } from "../utils/response";
import { ValidationError } from "../types";
import xss from "xss";

export const handleValidationErrors = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const validationErrors: ValidationError[] = errors
            .array()
            .map((error) => ({
                field: error.type === "field" ? (error as any).path : "unknown",
                message: error.msg,
                code: "VALIDATION_ERROR",
                statusCode: 400,
                isOperational: true,
                name: "ValidationError",
            }));

        return ResponseHandler.error(
            res,
            "Validation failed",
            400,
            "VALIDATION_ERROR",
            validationErrors,
            (req as any).traceId
        );
    }
    next();
};

// Sanitization middleware
export const sanitizeInput = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const sanitizeValue = (value: any): any => {
        if (typeof value === "string") {
            return xss(value);
        }
        if (Array.isArray(value)) {
            return value.map(sanitizeValue);
        }
        if (typeof value === "object" && value !== null) {
            const sanitized: any = {};
            for (const key in value) {
                sanitized[key] = sanitizeValue(value[key]);
            }
            return sanitized;
        }
        return value;
    };

    req.body = sanitizeValue(req.body);
    req.query = sanitizeValue(req.query);
    next();
};

// Common validation rules
export const authValidation = {
    register: [
        body("name")
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage("Name must be between 2 and 100 characters")
            .matches(/^[a-zA-Z\s]+$/)
            .withMessage("Name can only contain letters and spaces"),
        body("email")
            .isEmail()
            .withMessage("Please provide a valid email")
            .normalizeEmail()
            .isLength({ max: 255 })
            .withMessage("Email must be less than 255 characters"),
        body("password")
            .isLength({ min: 8, max: 128 })
            .withMessage("Password must be between 8 and 128 characters")
            .matches(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
            )
            .withMessage(
                "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
            ),
    ],
    login: [
        body("email")
            .isEmail()
            .withMessage("Please provide a valid email")
            .normalizeEmail(),
        body("password")
            .isLength({ min: 8 })
            .withMessage("Password must be at least 8 characters"),
    ],
};

export const articleValidation = {
    createArticle: [
        body("title")
            .trim()
            .isLength({ min: 5, max: 255 })
            .withMessage("Title must be between 5 and 255 characters")
            .matches(/^[a-zA-Z0-9\s\-.,!?()]+$/)
            .withMessage("Title contains invalid characters"),

        body("content")
            .trim()
            .isLength({ min: 50 })
            .withMessage("Content must be at least 50 characters long"),

        body("excerpt")
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage("Excerpt cannot exceed 500 characters"),

        body("thumbnail")
            .optional()
            .isURL()
            .withMessage("Thumbnail must be a valid URL"),

        body("status")
            .optional()
            .isIn(["DRAFT", "PUBLISHED", "ARCHIVED", "PENDING_REVIEW"])
            .withMessage("Invalid status"),

        body("featured")
            .optional()
            .isBoolean()
            .withMessage("Featured must be a boolean"),

        body("isPremium")
            .optional()
            .isBoolean()
            .withMessage("isPremium must be a boolean"),

        body("categories")
            .optional()
            .isArray({ min: 0, max: 5 })
            .withMessage("Categories must be an array with maximum 5 items"),

        body("categories.*")
            .optional()
            .isString()
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage("Each category must be between 2 and 50 characters"),
    ],

    updateArticle: [
        body("title")
            .optional()
            .trim()
            .isLength({ min: 5, max: 255 })
            .withMessage("Title must be between 5 and 255 characters"),

        body("content")
            .optional()
            .trim()
            .isLength({ min: 50 })
            .withMessage("Content must be at least 50 characters long"),

        body("excerpt")
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage("Excerpt cannot exceed 500 characters"),

        body("thumbnail")
            .optional()
            .isURL()
            .withMessage("Thumbnail must be a valid URL"),

        body("status")
            .optional()
            .isIn(["DRAFT", "PUBLISHED", "ARCHIVED", "PENDING_REVIEW"])
            .withMessage("Invalid status"),

        body("featured")
            .optional()
            .isBoolean()
            .withMessage("Featured must be a boolean"),

        body("isPremium")
            .optional()
            .isBoolean()
            .withMessage("isPremium must be a boolean"),

        body("categories")
            .optional()
            .isArray({ min: 0, max: 5 })
            .withMessage("Categories must be an array with maximum 5 items"),
    ],

    toggleStatus: [
        body("status")
            .isIn(["DRAFT", "PUBLISHED", "ARCHIVED", "PENDING_REVIEW"])
            .withMessage("Invalid status"),
    ],

    getArticles: [
        query("page")
            .optional()
            .isInt({ min: 1 })
            .withMessage("Page must be a positive integer"),

        query("pageSize")
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage("Page size must be between 1 and 50"),

        query("category")
            .optional()
            .isString()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage("Category must be between 1 and 50 characters"),

        query("status")
            .optional()
            .isIn(["DRAFT", "PUBLISHED", "ARCHIVED", "PENDING_REVIEW"])
            .withMessage("Invalid status filter"),
    ],

    getBySlug: [
        param("slug")
            .isString()
            .trim()
            .isLength({ min: 1, max: 255 })
            .withMessage(
                "Slug is required and must be less than 255 characters"
            )
            .matches(/^[a-z0-9-]+$/)
            .withMessage(
                "Slug can only contain lowercase letters, numbers, and hyphens"
            ),
    ],

    getById: [
        param("id")
            .isString()
            .trim()
            .isLength({ min: 1 })
            .withMessage("Article ID is required"),
    ],
};

export const commentValidation = {
    // Get comments by article ID
    getByArticle: [
        param("articleId")
            .isString()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage("Valid article ID is required")
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage("Article ID contains invalid characters"),

        query("page")
            .optional()
            .isInt({ min: 1 })
            .withMessage("Page must be a positive integer"),

        query("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("Limit must be between 1 and 100"),

        query("includeSpam")
            .optional()
            .isBoolean()
            .withMessage("includeSpam must be a boolean"),

        query("includeUnapproved")
            .optional()
            .isBoolean()
            .withMessage("includeUnapproved must be a boolean"),
    ],

    // Create comment
    create: [
        body("content")
            .trim()
            .isLength({ min: 3, max: 1000 })
            .withMessage("Comment must be between 3 and 1000 characters")
            .notEmpty()
            .withMessage("Comment content is required")
            .custom((value) => {
                // Check for excessive repeated characters
                if (/(.)\1{4,}/.test(value)) {
                    throw new Error(
                        "Comment contains too many repeated characters"
                    );
                }

                // Check for excessive caps
                const capsCount = (value.match(/[A-Z]/g) || []).length;
                if (capsCount > value.length * 0.7 && value.length > 10) {
                    throw new Error(
                        "Comment contains too many capital letters"
                    );
                }

                return true;
            }),

        body("articleId")
            .isString()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage("Valid article ID is required")
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage("Article ID contains invalid characters"),
    ],

    // Update comment
    update: [
        param("id")
            .isString()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage("Valid comment ID is required")
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage("Comment ID contains invalid characters"),

        body("content")
            .trim()
            .isLength({ min: 3, max: 1000 })
            .withMessage("Comment must be between 3 and 1000 characters")
            .notEmpty()
            .withMessage("Comment content is required")
            .custom((value) => {
                // Same validation as create
                if (/(.)\1{4,}/.test(value)) {
                    throw new Error(
                        "Comment contains too many repeated characters"
                    );
                }

                const capsCount = (value.match(/[A-Z]/g) || []).length;
                if (capsCount > value.length * 0.7 && value.length > 10) {
                    throw new Error(
                        "Comment contains too many capital letters"
                    );
                }

                return true;
            }),
    ],

    // Delete comment
    delete: [
        param("id")
            .isString()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage("Valid comment ID is required")
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage("Comment ID contains invalid characters"),
    ],

    // Get user comments
    getUserComments: [
        param("userId")
            .optional()
            .isString()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage("Valid user ID is required")
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage("User ID contains invalid characters"),

        query("page")
            .optional()
            .isInt({ min: 1 })
            .withMessage("Page must be a positive integer"),

        query("limit")
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage("Limit must be between 1 and 50"),
    ],

    // Moderate comment (spam/approve)
    moderate: [
        param("id")
            .isString()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage("Valid comment ID is required")
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage("Comment ID contains invalid characters"),
    ],
};

// Enhanced sanitization for comments
export const sanitizeCommentInput = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.body.content) {
        // More aggressive sanitization for comments
        req.body.content = xss(req.body.content, {
            whiteList: {}, // No HTML tags allowed
            stripIgnoreTag: true,
            stripIgnoreTagBody: ["script"],
        });

        // Remove extra whitespace and normalize
        req.body.content = req.body.content
            .replace(/\s+/g, " ") // Replace multiple spaces with single space
            .trim();
    }

    next();
};
