import helmet from "helmet";
import hpp from "hpp";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
  hpp(), // HTTP Parameter Pollution protection
];

export const traceIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  (req as any).traceId = uuidv4();
  res.setHeader("X-Trace-Id", (req as any).traceId);
  next();
};
