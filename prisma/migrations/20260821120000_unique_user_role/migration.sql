-- Remove duplicate (userId, roleId) pairs before creating the unique index.
-- Keeps the smallest id per pair (cuid is time-sortable, so the oldest row wins).
-- Idempotent: no-op on clean or fresh databases.
DELETE FROM "UserRole" a
USING "UserRole" b
WHERE a."userId" = b."userId"
  AND a."roleId" = b."roleId"
  AND a."id" > b."id";

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");
