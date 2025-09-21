import { PrismaClient } from "@prisma/client";
import { env } from "./environment";

// Augment globalThis to include our Prisma client
declare global {
  // Allow global `var` to persist across module reloads in dev
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });

// Reuse the client if it already exists (important for dev/hot reload)
const db = globalThis.__prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  // Persist in globalThis for next hot reload
  globalThis.__prisma = db;
}

export default db;
