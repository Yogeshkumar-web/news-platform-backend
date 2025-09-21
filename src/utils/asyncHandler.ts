import { Request, Response, NextFunction, RequestHandler } from "express";

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown> | void;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return async function wrappedHandler(req, res, next) {
    try {
      await fn(req, res, next);
    } catch (err) {
      if (err && typeof err === "object" && "traceId" in res.locals) {
        (err as any).traceId = res.locals.traceId;
      }
      next(err);
    }
  };
}
