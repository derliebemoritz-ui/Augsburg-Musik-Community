import { prisma } from "@/lib/db";
import { scheduleConfig } from "@/lib/config";
import { computeRankingSets, computeTrackWeight } from "./weighting";
import { computePlayStatsMap } from "./stats";
import { shuffle, weightedShuffle } from "./random";
import { EmptyLibraryError, AlreadyAiredError } from "./errors";
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

/**
 * Generiert den Sendeplan für einen Sendetag (siehe `getServiceDate`).
 * Setzt fort, wo der zuletzt geplante Track endet (kein Overlap/keine
 * Lücke), falls für einen früheren Tag bereits über Mitternacht hinaus
 * geplant wurde.
 */
export async function generateDaySchedule(serviceDate: Date): Promise<GenerateResult> {
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

  const genreSequence = buildGenreSequence(genres, BLOCKS_PER_DAY);

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

  for (let blockIndex = 0; blockIndex < BLOCKS_PER_DAY; blockIndex++) {
    const intendedGenre = genreSequence[blockIndex];
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
    blocksSkipped: BLOCKS_PER_DAY - blocksToCreate.length,
  };
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
