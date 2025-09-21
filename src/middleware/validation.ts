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
    const validationErrors: ValidationError[] = errors.array().map((error) => ({
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
  ],
  getBySlug: [
    param("slug")
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Slug is required and must be less than 255 characters")
      .matches(/^[a-z0-9-]+$/)
      .withMessage(
        "Slug can only contain lowercase letters, numbers, and hyphens"
      ),
  ],
};
