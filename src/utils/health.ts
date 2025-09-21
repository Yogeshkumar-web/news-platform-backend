import db from "../config/database";
import { env } from "../config/environment";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    redis?: "connected" | "disconnected";
  };
  environment: string;
  version?: string;
}

export class HealthChecker {
  static async checkHealth(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    const services: HealthStatus["services"] = {
      database: "disconnected",
    };

    // Check database connection
    try {
      await db.$queryRaw`SELECT 1`;
      services.database = "connected";
    } catch (error) {
      services.database = "disconnected";
      status = "unhealthy";
    }

    return {
      status,
      timestamp,
      services,
      environment: env.NODE_ENV,
      version: process.env.npm_package_version,
    };
  }
}
