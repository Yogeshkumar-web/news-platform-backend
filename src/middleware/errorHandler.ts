import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../types";
import { ResponseHandler } from "../utils/response";
import logger from "../utils/logger";
import { env } from "../config/environment";

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Prefer res.locals.traceId over casting req
  const traceId = res.locals.traceId;

  // Central logging (sanitize sensitive info in prod)
  logger.error("Global Error Handler", {
    message: err.message,
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    traceId,
  });

  // 1️⃣ AppError (operational)
  if (err instanceof AppError) {
    return ResponseHandler.error(
      res,
      err.message,
      err.statusCode,
      err.code,
      //   err.errors,
      traceId
    );
  }

  // 2️⃣ Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const field = (err.meta as any)?.target?.[0] || "field";
        return ResponseHandler.error(
          res,
          `${field} already exists`,
          409,
          "DUPLICATE_RESOURCE",
          undefined,
          traceId
        );
      }
      case "P2025":
        return ResponseHandler.error(
          res,
          "Resource not found",
          404,
          "NOT_FOUND",
          undefined,
          traceId
        );
      default:
        return ResponseHandler.error(
          res,
          "Database operation failed",
          500,
          "DATABASE_ERROR",
          undefined,
          traceId
        );
    }
  }

  // 3️⃣ Validation errors (example for generic shape)
  if (err.name === "ValidationError" || (err as any).isJoi) {
    return ResponseHandler.error(
      res,
      "Validation failed",
      400,
      "VALIDATION_ERROR",
      (err as any).details ?? undefined,
      traceId
    );
  }

  // 4️⃣ JWT errors
  if (err.name === "JsonWebTokenError") {
    return ResponseHandler.error(
      res,
      "Invalid token",
      401,
      "INVALID_TOKEN",
      undefined,
      traceId
    );
  }
  if (err.name === "TokenExpiredError") {
    return ResponseHandler.error(
      res,
      "Token expired",
      401,
      "TOKEN_EXPIRED",
      undefined,
      traceId
    );
  }

  // 5️⃣ Default error
  const message =
    env.NODE_ENV === "production" ? "Something went wrong!" : err.message;

  return ResponseHandler.error(
    res,
    message,
    500,
    "INTERNAL_SERVER_ERROR",
    env.NODE_ENV === "development" ? [{ stack: err.stack }] : undefined,
    traceId
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  const traceId = res.locals.traceId;
  return ResponseHandler.error(
    res,
    `Route ${req.originalUrl} not found`,
    404,
    "ROUTE_NOT_FOUND",
    undefined,
    traceId
  );
};
