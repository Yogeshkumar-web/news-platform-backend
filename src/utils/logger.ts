import winston from "winston";
import path from "path";
import { env } from "../config/environment";

// Ensure a sane default log level
const LOG_LEVEL = env.LOG_LEVEL ?? "info";

// Build file paths safely
const logDir = path.resolve(process.cwd(), "logs");

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: "news-platform-api",
    environment: env.NODE_ENV,
  },
  transports: [
    // Console logs (colorized, human-readable)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack }) => {
          // prettier console output
          return `${timestamp} [${level}]: ${stack || message}`;
        })
      ),
    }),
    // File logs (structured)
    ...(env.NODE_ENV !== "production"
      ? []
      : [
          new winston.transports.File({
            filename: path.join(logDir, "error.log"),
            level: "error",
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: path.join(logDir, "combined.log"),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
          }),
        ]),
  ],
});

// Handle unhandled rejections and exceptions automatically
logger.exceptions.handle(
  new winston.transports.File({ filename: path.join(logDir, "exceptions.log") })
);
logger.rejections.handle(
  new winston.transports.File({ filename: path.join(logDir, "rejections.log") })
);

export default logger;
