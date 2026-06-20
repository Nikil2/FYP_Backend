-- =====================================================================
--  AI Integration — Database Migration (Supabase / PostgreSQL)
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--  Safe to run once. All statements use IF NOT EXISTS / IF EXISTS guards.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. WorkerProfile.city  (REQUIRED)
--    Needed so the AI search/recommend tools can filter workers by city.
-- ---------------------------------------------------------------------
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "city" TEXT;
CREATE INDEX IF NOT EXISTS "WorkerProfile_city_idx" ON "WorkerProfile" ("city");

-- Optional one-time backfill: derive city from the existing homeAddress.
-- Adjust/extend the city list to match your data. Run only if useful.
-- UPDATE "WorkerProfile" SET "city" = 'Lahore'  WHERE "city" IS NULL AND "homeAddress" ILIKE '%lahore%';
-- UPDATE "WorkerProfile" SET "city" = 'Karachi' WHERE "city" IS NULL AND "homeAddress" ILIKE '%karachi%';
-- UPDATE "WorkerProfile" SET "city" = 'Islamabad' WHERE "city" IS NULL AND "homeAddress" ILIKE '%islamabad%';
-- UPDATE "WorkerProfile" SET "city" = 'Rawalpindi' WHERE "city" IS NULL AND "homeAddress" ILIKE '%rawalpindi%';

-- ---------------------------------------------------------------------
-- 2. WorkerProfile AI suspicious-flagging  (OPTIONAL — admin AI panel)
-- ---------------------------------------------------------------------
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "aiFlagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "aiFlagReason" TEXT;

-- ---------------------------------------------------------------------
-- 3. Complaint AI auto-classification fields  (REQUIRED for admin classifier)
-- ---------------------------------------------------------------------
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "aiCategory" TEXT;
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "aiConfidence" DOUBLE PRECISION;
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "aiClassifiedAt" TIMESTAMP(3);

-- ---------------------------------------------------------------------
-- 4. AiMessageRole enum  (REQUIRED for conversation persistence)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiMessageRole') THEN
    CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 5. AiConversation  (RECOMMENDED — persists chatbot/agent history)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AiConversation" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "kind"      TEXT NOT NULL DEFAULT 'CUSTOMER',
  "title"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiConversation_userId_idx" ON "AiConversation" ("userId");

-- FK → User (set null if the user is deleted)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AiConversation_userId_fkey'
  ) THEN
    ALTER TABLE "AiConversation"
      ADD CONSTRAINT "AiConversation_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 6. AiChatMessage  (RECOMMENDED — one row per conversation turn)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AiChatMessage" (
  "id"             TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role"           "AiMessageRole" NOT NULL,
  "content"        TEXT NOT NULL,
  "toolUsed"       TEXT,
  "metadata"       JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiChatMessage_conversationId_idx" ON "AiChatMessage" ("conversationId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AiChatMessage_conversationId_fkey'
  ) THEN
    ALTER TABLE "AiChatMessage"
      ADD CONSTRAINT "AiChatMessage_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 7. AiRecommendationLog  (OPTIONAL — analytics / FYP evaluation)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AiRecommendationLog" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT,
  "query"         TEXT NOT NULL,
  "parsedService" TEXT,
  "parsedCity"    TEXT,
  "parsedBudget"  DECIMAL(10,2),
  "workerIds"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "toolUsed"      TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiRecommendationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiRecommendationLog_userId_idx" ON "AiRecommendationLog" ("userId");

-- =====================================================================
--  After running this SQL in Supabase, sync Prisma Client locally:
--    npx prisma db pull        (optional: confirm schema matches)
--    npx prisma generate       (REQUIRED: regenerate the client)
--  Do NOT run `prisma migrate` against Supabase if you applied SQL by hand.
-- =====================================================================
