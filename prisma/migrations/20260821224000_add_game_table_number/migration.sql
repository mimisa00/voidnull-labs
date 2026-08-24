-- AlterTable
ALTER TABLE "Game" ADD COLUMN "tableNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Game_tableNumber_key" ON "Game"("tableNumber");

-- Remove duplicate (gameId, playerId) rows before creating the unique index.
-- Keeps the newest row per pair: largest createdAt, ties broken by largest id
-- (cuid is time-sortable, so this falls back to newest-inserted row).
-- Explicitly auditable: a row is deleted only when a strictly newer "keeper"
-- row exists for the same (gameId, playerId) pair.
-- Idempotent: no-op on clean or fresh databases.
DELETE FROM "PlayerGame" pg
USING "PlayerGame" keep
WHERE keep."gameId" = pg."gameId"
  AND keep."playerId" = pg."playerId"
  AND (keep."createdAt", keep."id") > (pg."createdAt", pg."id");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerGame_gameId_playerId_key" ON "PlayerGame"("gameId", "playerId");
