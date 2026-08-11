import { prisma } from "@/lib/db";
import { weightingConfig } from "@/lib/config";
import { computeRankingSets, computeTrackWeight, type PlayStats } from "./weighting";
import type { Track } from "@/generated/prisma/client";

/** Aggregiert Gesamt-, Skip- und Completion-Zahlen pro Track aus den
 *  anonymen PlayEvents. Wird sowohl bei der Sendeplan-Generierung als auch
 *  in der Admin-Statistik-Ansicht verwendet. */
export async function computePlayStatsMap(): Promise<Map<string, PlayStats>> {
  // trackId ist null bei PlayEvents zu inzwischen gelöschten Tracks - die
  // fließen naturgemäß nicht mehr in die Gewichtung/Statistik noch
  // existierender Tracks ein.
  const trackIdNotNull = { trackId: { not: null } } as const;
  const [totals, skips, completions] = await Promise.all([
    prisma.playEvent.groupBy({ by: ["trackId"], where: trackIdNotNull, _count: { _all: true } }),
    prisma.playEvent.groupBy({
      by: ["trackId"],
      where: { ...trackIdNotNull, skipped: true },
      _count: { _all: true },
    }),
    prisma.playEvent.groupBy({
      by: ["trackId"],
      where: { ...trackIdNotNull, completed: true },
      _count: { _all: true },
    }),
  ]);

  const stats = new Map<string, PlayStats>();
  for (const row of totals) {
    if (!row.trackId) continue;
    stats.set(row.trackId, { totalPlays: row._count._all, skips: 0, completions: 0 });
  }
  for (const row of skips) {
    if (!row.trackId) continue;
    const entry = stats.get(row.trackId);
    if (entry) entry.skips = row._count._all;
  }
  for (const row of completions) {
    if (!row.trackId) continue;
    const entry = stats.get(row.trackId);
    if (entry) entry.completions = row._count._all;
  }
  return stats;
}

export type TrackStatsView = {
  trackId: string;
  totalPlays: number;
  skipRate: number | null;
  completionRate: number | null;
  isRanked: boolean;
  isTopSkipRate: boolean;
  isTopCompletionRate: boolean;
  effectiveWeight: number;
};

/** Baut die Statistik-/Gewichtungs-Ansicht für die Admin-Track-Übersicht:
 *  Plays gesamt, Skip-/Completion-Quote, aktuell wirksames Gesamtgewicht. */
export async function getTrackStatsViews(
  tracks: Pick<Track, "id" | "uploadedAt" | "sanctionMultiplier">[]
): Promise<Map<string, TrackStatsView>> {
  const statsByTrackId = await computePlayStatsMap();
  const rankingSets = computeRankingSets(statsByTrackId);

  const views = new Map<string, TrackStatsView>();
  for (const track of tracks) {
    const stats = statsByTrackId.get(track.id);
    const totalPlays = stats?.totalPlays ?? 0;
    views.set(track.id, {
      trackId: track.id,
      totalPlays,
      skipRate: stats && totalPlays > 0 ? stats.skips / totalPlays : null,
      completionRate: stats && totalPlays > 0 ? stats.completions / totalPlays : null,
      isRanked: totalPlays >= weightingConfig.minPlaysForRanking,
      isTopSkipRate: rankingSets.topSkipRateTrackIds.has(track.id),
      isTopCompletionRate: rankingSets.topCompletionRateTrackIds.has(track.id),
      effectiveWeight: computeTrackWeight(track, stats, rankingSets),
    });
  }
  return views;
}
