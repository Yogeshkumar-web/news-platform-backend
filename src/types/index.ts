import { Request } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
  pagination?: PaginationMeta;
  timestamp: string;
  traceId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuthTokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
  traceId?: string;
}

// Custom Error Classes
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = "VALIDATION_ERROR") {
    super(message, 400, code);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = "Authentication required",
    code: string = "AUTH_REQUIRED"
  ) {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = "Insufficient permissions",
    code: string = "INSUFFICIENT_PERMISSIONS"
  ) {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string = "Resource not found",
    code: string = "NOT_FOUND"
  ) {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: string = "CONFLICT") {
    super(message, 409, code);
  }
}
