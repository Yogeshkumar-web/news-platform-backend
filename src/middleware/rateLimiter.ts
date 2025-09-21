import rateLimit from "express-rate-limit";
import { env } from "../config/environment";
import { Request, Response } from "express";

// Ensure numeric env values
const RATE_LIMIT_WINDOW_MS = Number(env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
const RATE_LIMIT_MAX_REQUESTS = Number(env.RATE_LIMIT_MAX_REQUESTS ?? 100);

/**
 * A helper to create a JSON response for rate limit exceeded.
 */
function rateLimitHandler(req: Request, res: Response /*, next*/) {
  const traceId = res.locals.traceId; // if you set it in middleware
  res.status(429).json({
    success: false,
    message: "Too many requests, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
    timestamp: new Date().toISOString(),
    traceId,
  });
}

/**
 * Global rate limit — all routes
 */
export const globalRateLimit = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth-specific rate limit
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  handler(req, res) {
    const traceId = res.locals.traceId;
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts, please try again later",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      timestamp: new Date().toISOString(),
      traceId,
    });
  },
  skipSuccessfulRequests: true, // only count failed requests
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Comment-specific rate limit
 */
export const commentRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  handler(req, res) {
    const traceId = res.locals.traceId;
    res.status(429).json({
      success: false,
      message: "Too many comments, please try again later",
      code: "COMMENT_RATE_LIMIT_EXCEEDED",
      timestamp: new Date().toISOString(),
      traceId,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});
