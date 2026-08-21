-- bankroll 是「桌內籌碼池」,與既有 pot(單局 pot,Redis 重建路徑在用)語意分離;純加性,既有 Game 行 bankroll=0,不需重設資料
ALTER TABLE "Game" ADD COLUMN "bankroll" INTEGER NOT NULL DEFAULT 0;
