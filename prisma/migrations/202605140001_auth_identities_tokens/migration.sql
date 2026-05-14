-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('PASSWORD', 'GOOGLE');

-- CreateEnum
CREATE TYPE "AuthTokenPurpose" AS ENUM ('EMAIL_VERIFY', 'OAUTH_LOGIN_CODE', 'SET_PASSWORD');

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerEmail" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- Backfill password identities.
INSERT INTO "auth_identities" ("id", "userId", "provider", "providerAccountId", "providerEmail", "created_at", "updated_at")
SELECT 'password_' || "id", "id", 'PASSWORD', "email", "email", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "hashedPass" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill Google identities.
INSERT INTO "auth_identities" ("id", "userId", "provider", "providerAccountId", "providerEmail", "created_at", "updated_at")
SELECT 'google_' || "id", "id", 'GOOGLE', "googleId", "email", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "googleId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_providerAccountId_key" ON "auth_identities"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "auth_identities_userId_idx" ON "auth_identities"("userId");

-- CreateIndex
CREATE INDEX "auth_identities_providerEmail_idx" ON "auth_identities"("providerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_tokenHash_key" ON "auth_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_tokens_userId_purpose_idx" ON "auth_tokens"("userId", "purpose");

-- CreateIndex
CREATE INDEX "auth_tokens_expiresAt_idx" ON "auth_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
