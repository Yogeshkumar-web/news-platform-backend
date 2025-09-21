import { Response } from "express";
import { ApiResponse, PaginationMeta } from "../types";
import { v4 as uuidv4 } from "uuid";

export class ResponseHandler {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  static success<T>(
    res: Response,
    data: T | null = null,
    message: string = "Success",
    pagination?: PaginationMeta,
    statusCode: number = 200,
    traceId?: string
  ): Response<ApiResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
      pagination,
      timestamp: this.getTimestamp(),
      traceId: traceId || res.locals.traceId || uuidv4(),
    });
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    code?: string,
    errors?: any[],
    traceId?: string
  ): Response<ApiResponse<null>> {
    return res.status(statusCode).json({
      success: false,
      data: null,
      message,
      code,
      errors,
      timestamp: this.getTimestamp(),
      traceId: traceId || res.locals.traceId || uuidv4(),
    });
  }

  static created<T>(
    res: Response,
    data: T,
    message: string = "Resource created successfully",
    traceId?: string
  ): Response<ApiResponse<T>> {
    return this.success(res, data, message, undefined, 201, traceId);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
