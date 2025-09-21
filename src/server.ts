import App from "./";
import logger from "./utils/logger";
import db from "./config/database";

// Graceful shutdown handling
const gracefulShutdown = async () => {
  logger.info("🔄 Graceful shutdown initiated...");

  try {
    await db.$disconnect();
    logger.info("✅ Database disconnected successfully");

    process.exit(0);
  } catch (error) {
    logger.error("❌ Error during graceful shutdown:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  logger.error("🚨 Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  logger.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", gracefulShutdown);

// Handle SIGTERM
process.on("SIGTERM", gracefulShutdown);

// Start the server
const app = new App();
app.listen();
