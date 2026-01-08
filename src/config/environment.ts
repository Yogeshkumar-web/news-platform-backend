import { z } from "zod";
import { config } from "dotenv";

// Use dotenv.config() to load .env variables
config();

// Define the schema for environment variables using Zod
// This provides type safety and validation for your application's configuration
const envSchema = z.object({
    // General
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: z.string().default("5000").transform(Number),

    // Database & Cache
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    IMAGEKIT_PUBLIC_KEY: z.string().min(1, "Public key is required"),
    IMAGEKIT_PRIVATE_KEY: z.string().min(1, "Private key is required"),
    IMAGEKIT_URL_ENDPOINT: z.string().min(1, "Url endpoint is required"),
    REDIS_URL: z.string().optional(),

    // NEW: OAuth Credentials
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // // NEW: Email Service Credentials
    EMAIL_HOST: z.string().min(1, "EMAIL_HOST is required for SMTP."),
    EMAIL_PORT: z.string().default("2525").transform(Number),
    EMAIL_USER: z.string().min(1, "EMAIL_USER is required for SMTP auth."),
    EMAIL_PASS: z.string().min(1, "EMAIL_PASS is required for SMTP auth."),
    EMAIL_FROM: z
        .string()
        .email("EMAIL_FROM must be a valid email.")
        .default("no-reply@newssite.com"),

    // NEW: RESEND API Credentials (Nodemailer fields removed)
    // RESEND_API_KEY: z
    //     .string()
    //     .min(1, "RESEND_API_KEY is required for email sending."),
    // RESEND_FROM_EMAIL: z
    //     .string()
    //     .email("RESEND_FROM_EMAIL must be a valid email address.")
    //     .min(1),

    // Security
    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET must be at least 32 characters long"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    VERIFICATION_TOKEN_EXPIRES_IN: z.string().default("1h"),
    BCRYPT_SALT_ROUNDS: z.string().default("12").transform(Number),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform(Number),
    RATE_LIMIT_MAX_REQUESTS: z.string().default("100").transform(Number),

    // Logging & CORS
    LOG_LEVEL: z
        .enum(["error", "warn", "info", "debug", "silent"])
        .default("info"),
    CORS_ORIGINS: z
        .string()
        .default("http://localhost:3000,http://localhost:5000")
        .transform((val) => val.split(",").map((url) => url.trim())),
    
    // Client URL for redirects
    CLIENT_URL: z.string().default("http://localhost:3000"),
});

/**
 * Parses and validates environment variables.
 * Exits the process if validation fails to prevent the application from running with an invalid config.
 */
const parseEnv = () => {
    try {
        const env = envSchema.parse(process.env);
        console.log(
            "✅ Environment variables loaded and validated successfully."
        );
        return env;
    } catch (error) {
        console.error("❌ Invalid environment variables:", error);
        // Use the Zod error message for a clear reason
        if (error instanceof z.ZodError) {
            console.error(error.issues);
        }
        // Exit with a non-zero code to indicate failure
        process.exit(1);
    }
};

export const env = parseEnv();
