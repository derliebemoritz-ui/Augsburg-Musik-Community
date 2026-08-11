/*
  Fuegt trackTitle/artistName/albumTitle als Snapshot-Textfelder zu
  ScheduleItem und PlayEvent hinzu (Historie bleibt lesbar, auch wenn ein
  Track spaeter geloescht wird) und macht trackId nullable
  (onDelete: SetNull statt Restrict/Cascade).

  Bestehende Zeilen werden anhand der noch vorhandenen Track/Artist/Album-
  Verknuepfung befuellt (zu diesem Zeitpunkt ist noch kein Track geloescht).
*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlayEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackId" TEXT,
    "trackTitle" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "albumTitle" TEXT NOT NULL,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listenedSeconds" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "skipped" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayEvent_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PlayEvent" ("id", "trackId", "trackTitle", "artistName", "albumTitle", "playedAt", "listenedSeconds", "completed", "skipped", "createdAt")
SELECT pe."id", pe."trackId", t."title", a."name", al."title", pe."playedAt", pe."listenedSeconds", pe."completed", pe."skipped", pe."createdAt"
FROM "PlayEvent" pe
JOIN "Track" t ON t."id" = pe."trackId"
JOIN "Artist" a ON a."id" = t."artistId"
JOIN "Album" al ON al."id" = t."albumId";
DROP TABLE "PlayEvent";
ALTER TABLE "new_PlayEvent" RENAME TO "PlayEvent";
CREATE INDEX "PlayEvent_trackId_idx" ON "PlayEvent"("trackId");
CREATE INDEX "PlayEvent_playedAt_idx" ON "PlayEvent"("playedAt");
CREATE TABLE "new_ScheduleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockId" TEXT NOT NULL,
    "trackId" TEXT,
    "trackTitle" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "albumTitle" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "scheduledStart" DATETIME NOT NULL,
    "scheduledEnd" DATETIME NOT NULL,
    "actualStart" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduleItem_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ScheduleBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScheduleItem" ("id", "blockId", "trackId", "trackTitle", "artistName", "albumTitle", "position", "scheduledStart", "scheduledEnd", "actualStart", "createdAt")
SELECT si."id", si."blockId", si."trackId", t."title", a."name", al."title", si."position", si."scheduledStart", si."scheduledEnd", si."actualStart", si."createdAt"
FROM "ScheduleItem" si
JOIN "Track" t ON t."id" = si."trackId"
JOIN "Artist" a ON a."id" = t."artistId"
JOIN "Album" al ON al."id" = t."albumId";
DROP TABLE "ScheduleItem";
ALTER TABLE "new_ScheduleItem" RENAME TO "ScheduleItem";
CREATE INDEX "ScheduleItem_trackId_idx" ON "ScheduleItem"("trackId");
CREATE INDEX "ScheduleItem_scheduledStart_idx" ON "ScheduleItem"("scheduledStart");
CREATE UNIQUE INDEX "ScheduleItem_blockId_position_key" ON "ScheduleItem"("blockId", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
