-- Minimal and safe: add workerName for DB visibility without triggers.
-- Run this directly in Supabase SQL Editor.

ALTER TABLE "WorkerPortfolio"
ADD COLUMN IF NOT EXISTS "workerName" TEXT;

-- Backfill existing rows from User.fullName via WorkerProfile.
UPDATE "WorkerPortfolio" wp
SET "workerName" = u."fullName"
FROM "WorkerProfile" w
JOIN "User" u ON u.id = w."userId"
WHERE wp."workerId" = w.id
  AND (wp."workerName" IS NULL OR wp."workerName" = '');

CREATE INDEX IF NOT EXISTS "WorkerPortfolio_workerName_idx"
ON "WorkerPortfolio" ("workerName");

-- Optional manual resync query (run later if names change):
-- UPDATE "WorkerPortfolio" wp
-- SET "workerName" = u."fullName"
-- FROM "WorkerProfile" w
-- JOIN "User" u ON u.id = w."userId"
-- WHERE wp."workerId" = w.id;

-- Quick verification:
-- SELECT id, "workerId", "workerName", "imageUrl" FROM "WorkerPortfolio" ORDER BY id DESC;
