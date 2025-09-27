import express, { Application } from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { env } from "./config/environment";
import path from "path";

// middleware
import { globalErrorHandler, notFoundHandler } from "./middleware/errorHandler";
import { globalRateLimit } from "./middleware/rateLimiter";
import { securityMiddleware, traceIdMiddleware } from "./middleware/security";

// utils
import { HealthChecker } from "./utils/health";
import { ResponseHandler } from "./utils/response";
import logger from "./utils/logger";
import { asyncHandler } from "./utils/asyncHandler";

// routes
import articleRoutes from "./routes/articlesRoute";
import categoryRoutes from "./routes/categoryRoute";
import authRoutes from "./routes/authRoute";
import commentRoutes from "./routes/commentsRoute";

class App {
    public app: Application;

    constructor() {
        this.app = express();
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    private initializeMiddleware(): void {
        // Security middleware
        this.app.use(securityMiddleware);

        // Request tracking
        this.app.use(traceIdMiddleware);

        // Compression
        this.app.use(compression());

        // CORS configuration
        const corsOptions: CorsOptions = {
            origin: (origin: string | undefined, callback: Function) => {
                const allowedOrigins = env.CORS_ORIGINS;

                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    logger.warn("CORS violation attempt", {
                        origin,
                        allowedOrigins,
                    });
                    callback(
                        new Error(
                            `CORS policy violation: Origin '${origin}' not allowed`
                        )
                    );
                }
            },
            methods: [
                "GET",
                "HEAD",
                "PUT",
                "PATCH",
                "POST",
                "DELETE",
                "OPTIONS",
            ],
            credentials: true,
            optionsSuccessStatus: 204,
        };

        this.app.use(cors(corsOptions));

        // Body parsing
        this.app.use(express.json({ limit: "10mb" }));
        this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
        this.app.use(cookieParser());

        // Rate limiting
        this.app.use(globalRateLimit);

        // Request logging
        this.app.use((req, res, next) => {
            logger.info("Incoming request", {
                method: req.method,
                url: req.url,
                ip: req.ip,
                userAgent: req.get("User-Agent"),
                traceId: (req as any).traceId,
            });
            next();
        });

        // Serve static files
        this.app.use(
            "api/uploads",
            express.static(path.join(process.cwd(), "uploads"))
        );
    }

    private initializeRoutes(): void {
        // Health check endpoint
        this.app.get(
            "/health",
            asyncHandler(async (req, res) => {
                const healthStatus = await HealthChecker.checkHealth();
                const statusCode =
                    healthStatus.status === "healthy" ? 200 : 503;
                return res.status(statusCode).json(healthStatus);
            })
        );

        // API routes
        this.app.use("/api/auth", authRoutes);
        this.app.use("/api/articles", articleRoutes);
        this.app.use("/api/categories", categoryRoutes);
        this.app.use("/api/comments", commentRoutes);

        // API info endpoint
        this.app.get("/api", (req, res) => {
            return ResponseHandler.success(
                res,
                {
                    name: "News Platform API",
                    version: "1.0.0",
                    environment: env.NODE_ENV,
                    timestamp: new Date().toISOString(),
                    features: [
                        "Authentication & Authorization",
                        "Article Management",
                        "Category System",
                        "Comments System", // NEW feature
                        "Rate Limiting",
                        "Security Middleware",
                        "Error Handling",
                        "Request Logging",
                    ],
                    endpoints: {
                        auth: "/api/auth",
                        articles: "/api/articles",
                        categories: "/api/categories",
                        comments: "/api/comments", // NEW endpoint
                        health: "/health",
                    },
                },
                "API is running successfully"
            );
        });
    }

    private initializeErrorHandling(): void {
        // 404 handler
        this.app.use(notFoundHandler);

        // Global error handler
        this.app.use(globalErrorHandler);
    }

    public listen(): void {
        this.app.listen(env.PORT, () => {
            logger.info(
                `🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`
            );
            logger.info(
                `📊 Health check available at http://localhost:${env.PORT}/health`
            );
            logger.info(
                `📚 API documentation available at http://localhost:${env.PORT}/api`
            );
        });
    }
}

export default App;
