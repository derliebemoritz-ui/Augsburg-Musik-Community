import { prisma } from "@/lib/db";
import { scheduleConfig } from "@/lib/config";
import { computeRankingSets, computeTrackWeight } from "./weighting";
import { computePlayStatsMap } from "./stats";
import { shuffle, weightedShuffle } from "./random";
import { EmptyLibraryError, AlreadyAiredError } from "./errors";
import { getServiceDate } from "./time";
import type { Album, Artist, Genre, Track } from "@/generated/prisma/client";

export const BLOCKS_PER_DAY = Math.floor((24 * 60) / scheduleConfig.blockDurationMinutes);

/** Fallback-Dauer (Sekunden), falls ein Track keine (valide) Dauer hinterlegt hat. */
const FALLBACK_TRACK_DURATION_SECONDS = 180;
/** Sicherheitsnetz gegen Endlosschleifen bei kaputten Datensätzen. */
const MAX_ITEMS_PER_BLOCK = 120;

type PoolTrack = Track & { artist: Artist; album: Album; genre: Genre };

type FilledItem = {
  track: PoolTrack;
  scheduledStart: Date;
  scheduledEnd: Date;
};

export type GenerateResult = {
  blocksCreated: number;
  blocksSkipped: number;
};

/** Baut eine Genre-Reihenfolge für `blockCount` Blöcke aus wiederholt
 *  gemischten Runden, damit auch bei wenigen Genres Abwechslung entsteht. */
function buildGenreSequence(genres: Genre[], blockCount: number): Genre[] {
  const sequence: Genre[] = [];
  while (sequence.length < blockCount) {
    const lap = shuffle(genres);
    if (sequence.length > 0 && genres.length > 1) {
      const prev = sequence[sequence.length - 1];
      if (lap[0].id === prev.id) {
        [lap[0], lap[1]] = [lap[1], lap[0]];
      }
    }
    sequence.push(...lap);
  }
  return sequence.slice(0, blockCount);
}

/** Füllt einen Block gewichtet zufällig mit Tracks aus dem Pool, bis die
 *  Zielspieldauer erreicht ist. Kein Track doppelt, solange der Pool nicht
 *  erschöpft ist; danach wird der Pool erneut (frisch gewichtet) durchlaufen.
 *  Derselbe Artist wird - wo möglich - nicht direkt hintereinander gespielt. */
function fillBlock(
  pool: PoolTrack[],
  weights: Map<string, number>,
  blockStart: Date,
  targetDurationMs: number
): FilledItem[] {
  const items: FilledItem[] = [];
  let cursor = new Date(blockStart);
  let elapsedMs = 0;
  let lastTrackId: string | null = null;
  let lastArtistId: string | null = null;

  while (elapsedMs < targetDurationMs && items.length < MAX_ITEMS_PER_BLOCK) {
    const lap = weightedShuffle(pool, (t) => weights.get(t.id) ?? 1);

    let picked =
      lap.find((t) => t.id !== lastTrackId && t.artistId !== lastArtistId) ?? null;
    if (!picked) picked = lap.find((t) => t.id !== lastTrackId) ?? null;
    if (!picked) picked = lap[0] ?? null;
    if (!picked) break;

    const durationSeconds =
      picked.durationSeconds > 0 ? picked.durationSeconds : FALLBACK_TRACK_DURATION_SECONDS;
    const durationMs = durationSeconds * 1000;
    const scheduledStart = new Date(cursor);
    const scheduledEnd = new Date(cursor.getTime() + durationMs);

    items.push({ track: picked, scheduledStart, scheduledEnd });

    cursor = scheduledEnd;
    elapsedMs += durationMs;
    lastTrackId = picked.id;
    lastArtistId = picked.artistId;
  }

  return items;
}

type SchedulingContext = {
  genres: Genre[];
  tracksByGenre: Map<string, PoolTrack[]>;
  genresWithTracks: Genre[];
  weights: Map<string, number>;
};

/** Lädt Genres, aktive/freigegebene Tracks und deren aktuelle Gewichtung -
 *  gemeinsame Grundlage für alle Generierungs-/Auffüll-Funktionen. */
async function buildSchedulingContext(): Promise<SchedulingContext> {
  const genres = await prisma.genre.findMany();
  const tracks = (await prisma.track.findMany({
    where: { active: true, consentGiven: true },
    include: { artist: true, album: true, genre: true },
  })) as PoolTrack[];

  if (genres.length === 0 || tracks.length === 0) {
    throw new EmptyLibraryError();
  }

  const statsByTrackId = await computePlayStatsMap();
  const rankingSets = computeRankingSets(statsByTrackId);
  const weights = new Map(
    tracks.map((t) => [t.id, computeTrackWeight(t, statsByTrackId.get(t.id), rankingSets)])
  );

  const tracksByGenre = new Map<string, PoolTrack[]>();
  for (const genre of genres) tracksByGenre.set(genre.id, []);
  for (const track of tracks) {
    tracksByGenre.get(track.genreId)?.push(track);
  }
  const genresWithTracks = genres.filter((g) => (tracksByGenre.get(g.id)?.length ?? 0) > 0);
  if (genresWithTracks.length === 0) {
    throw new EmptyLibraryError();
  }

  return { genres, tracksByGenre, genresWithTracks, weights };
}

/**
 * Generiert `blockCount` Blöcke für einen Sendetag, beginnend bei
 * `startBlockIndex` (z.B. 0 für den ganzen Tag, oder ein späterer Index,
 * um nur das Ende eines bereits teilweise bestehenden Tages aufzufüllen).
 * Setzt fort, wo der zuletzt geplante Track endet (kein Overlap/keine
 * Lücke), falls bereits über Mitternacht hinaus geplant wurde.
 */
async function generateBlocks(
  serviceDate: Date,
  startBlockIndex: number,
  blockCount: number
): Promise<GenerateResult> {
  if (blockCount <= 0) {
    return { blocksCreated: 0, blocksSkipped: 0 };
  }

  const { genres, tracksByGenre, genresWithTracks, weights } = await buildSchedulingContext();

  const genreSequence = buildGenreSequence(genres, blockCount);

  const latestExisting = await prisma.scheduleItem.findFirst({
    orderBy: { scheduledEnd: "desc" },
  });
  let cursor = serviceDate;
  if (latestExisting && latestExisting.scheduledEnd > cursor) {
    cursor = latestExisting.scheduledEnd;
  }

  const blocksToCreate: {
    blockIndex: number;
    genreId: string;
    startTime: Date;
    endTime: Date;
    isFallbackGenre: boolean;
    items: FilledItem[];
  }[] = [];

  for (let i = 0; i < blockCount; i++) {
    const blockIndex = startBlockIndex + i;
    const intendedGenre = genreSequence[i];
    let genre = intendedGenre;
    let pool = tracksByGenre.get(intendedGenre.id) ?? [];
    let isFallbackGenre = false;

    if (pool.length === 0) {
      // Leerer Genre-Pool: auf ein anderes Genre mit verfügbaren Tracks
      // ausweichen, damit die Sendung nie unterbricht.
      const fallback = genresWithTracks[Math.floor(Math.random() * genresWithTracks.length)];
      genre = fallback;
      pool = tracksByGenre.get(fallback.id) ?? [];
      isFallbackGenre = true;
    }

    const blockStart = cursor;
    const items = fillBlock(pool, weights, blockStart, scheduleConfig.blockDurationMinutes * 60_000);
    if (items.length === 0) continue;

    const blockEnd = items[items.length - 1].scheduledEnd;
    blocksToCreate.push({
      blockIndex,
      genreId: genre.id,
      startTime: blockStart,
      endTime: blockEnd,
      isFallbackGenre,
      items,
    });
    cursor = blockEnd;
  }

  await prisma.$transaction(
    blocksToCreate.map((block) =>
      prisma.scheduleBlock.create({
        data: {
          date: serviceDate,
          blockIndex: block.blockIndex,
          genreId: block.genreId,
          startTime: block.startTime,
          endTime: block.endTime,
          isFallbackGenre: block.isFallbackGenre,
          items: {
            create: block.items.map((item, position) => ({
              trackId: item.track.id,
              trackTitle: item.track.title,
              artistName: item.track.artist.name,
              albumTitle: item.track.album.title,
              position,
              scheduledStart: item.scheduledStart,
              scheduledEnd: item.scheduledEnd,
            })),
          },
        },
      })
    )
  );

  return {
    blocksCreated: blocksToCreate.length,
    blocksSkipped: blockCount - blocksToCreate.length,
  };
}

/** Generiert den kompletten Sendeplan (alle Blöcke) für einen Sendetag. */
export async function generateDaySchedule(serviceDate: Date): Promise<GenerateResult> {
  return generateBlocks(serviceDate, 0, BLOCKS_PER_DAY);
}

/** Generiert den Sendeplan für `serviceDate` nur, falls noch keiner existiert. */
export async function ensureScheduleForDate(
  serviceDate: Date
): Promise<{ generated: boolean }> {
  const existing = await prisma.scheduleBlock.count({ where: { date: serviceDate } });
  if (existing > 0) return { generated: false };
  await generateDaySchedule(serviceDate);
  return { generated: true };
}

/**
 * Löscht und erzeugt den Sendeplan für `serviceDate` neu (Admin-Funktion
 * "Plan für den nächsten Tag neu generieren"). Verweigert die Neugenerierung,
 * falls für diesen Tag bereits Tracks tatsächlich gelaufen sind, um die
 * öffentliche Historie nicht zu verfälschen.
 */
export async function regenerateSchedule(serviceDate: Date): Promise<GenerateResult> {
  const alreadyAired = await prisma.scheduleItem.count({
    where: { block: { date: serviceDate }, scheduledStart: { lte: new Date() } },
  });
  if (alreadyAired > 0) {
    throw new AlreadyAiredError();
  }

  await prisma.scheduleBlock.deleteMany({ where: { date: serviceDate } });
  return generateDaySchedule(serviceDate);
}

/**
 * Füllt den gerade laufenden Block auf, falls seine noch nicht erreichten
 * (zukünftigen) Slots auf gelöschte Tracks verweisen: diese werden entfernt
 * und durch frisch gewürfelte Tracks desselben Genres ersetzt, bis der
 * Block wieder seine ursprüngliche Zielspieldauer erreicht. Bereits
 * gelaufene/gerade laufende Items bleiben unangetastet. Tut nichts, wenn
 * der laufende Block keine toten Zukunfts-Slots hat.
 */
async function refillCurrentBlockIfNeeded(today: Date, now: Date): Promise<void> {
  const currentBlock = await prisma.scheduleBlock.findFirst({
    where: { date: today, startTime: { lte: now } },
    orderBy: { startTime: "desc" },
  });
  if (!currentBlock) return;

  const deadFutureInBlock = await prisma.scheduleItem.count({
    where: { blockId: currentBlock.id, scheduledStart: { gt: now }, trackId: null },
  });
  if (deadFutureInBlock === 0) return;

  await prisma.scheduleItem.deleteMany({
    where: { blockId: currentBlock.id, scheduledStart: { gt: now } },
  });

  const lastRemaining = await prisma.scheduleItem.findFirst({
    where: { blockId: currentBlock.id },
    orderBy: { position: "desc" },
  });
  const cursor = lastRemaining ? lastRemaining.scheduledEnd : now;
  const elapsedMs = cursor.getTime() - currentBlock.startTime.getTime();
  const remainingMs = scheduleConfig.blockDurationMinutes * 60_000 - elapsedMs;
  if (remainingMs <= 0) return;

  let context: SchedulingContext;
  try {
    context = await buildSchedulingContext();
  } catch (err) {
    if (err instanceof EmptyLibraryError) return; // Lücke bleibt, Laufzeit-Fix übernimmt
    throw err;
  }

  let pool = context.tracksByGenre.get(currentBlock.genreId) ?? [];
  if (pool.length === 0) {
    // Genre des laufenden Blocks bewusst nicht ändern (Anzeige "Jetzt: X"
    // bliebe sonst inkonsistent zur bereits gelaufenen Hälfte) - stattdessen
    // mit einem anderen Genre auffüllen, dessen Pool noch Tracks hat.
    if (context.genresWithTracks.length === 0) return;
    const fallback =
      context.genresWithTracks[Math.floor(Math.random() * context.genresWithTracks.length)];
    pool = context.tracksByGenre.get(fallback.id) ?? [];
  }
  if (pool.length === 0) return;

  const items = fillBlock(pool, context.weights, cursor, remainingMs);
  if (items.length === 0) return;

  const startPosition = (lastRemaining?.position ?? -1) + 1;
  await prisma.scheduleItem.createMany({
    data: items.map((item, i) => ({
      blockId: currentBlock.id,
      trackId: item.track.id,
      trackTitle: item.track.title,
      artistName: item.track.artist.name,
      albumTitle: item.track.album.title,
      position: startPosition + i,
      scheduledStart: item.scheduledStart,
      scheduledEnd: item.scheduledEnd,
    })),
  });

  const newBlockEnd = items[items.length - 1].scheduledEnd;
  if (newBlockEnd > currentBlock.endTime) {
    await prisma.scheduleBlock.update({
      where: { id: currentBlock.id },
      data: { endTime: newBlockEnd },
    });
  }
}

/**
 * Erzeugt fehlende Blöcke für den REST des heutigen Sendetags neu
 * (Admin-Funktion "Sendeplan für heute reparieren/auffüllen"). Anders als
 * `regenerateSchedule` wird dabei nichts Bereits-Gelaufenes gelöscht:
 * Zunächst wird der gerade laufende Block aufgefüllt, falls er tote
 * Zukunfts-Slots enthält (siehe `refillCurrentBlockIfNeeded`), danach
 * werden alle noch nicht begonnenen Blöcke neu gewürfelt. Historie und
 * aktuelle Wiedergabe bleiben unangetastet. Nützlich z.B. wenn durch
 * gelöschte Tracks Lücken im weiteren Tagesverlauf entstanden sind.
 */
export async function regenerateRemainingToday(): Promise<GenerateResult> {
  const today = getServiceDate();
  const now = new Date();

  await refillCurrentBlockIfNeeded(today, now);

  await prisma.scheduleBlock.deleteMany({ where: { date: today, startTime: { gt: now } } });

  const lastPreserved = await prisma.scheduleBlock.findFirst({
    where: { date: today },
    orderBy: { blockIndex: "desc" },
  });
  const nextBlockIndex = lastPreserved ? lastPreserved.blockIndex + 1 : 0;

  return generateBlocks(today, nextBlockIndex, BLOCKS_PER_DAY - nextBlockIndex);
}
