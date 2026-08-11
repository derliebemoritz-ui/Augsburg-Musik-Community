import { subMonths } from "date-fns";
import { weightingConfig } from "@/lib/config";
import type { Track } from "@/generated/prisma/client";

export type PlayStats = {
  totalPlays: number;
  skips: number;
  completions: number;
};

export type RankingSets = {
  /** Track-IDs in den Top 30 % nach Skip-Quote (nur Tracks mit genug Plays). */
  topSkipRateTrackIds: Set<string>;
  /** Track-IDs in den Top 30 % nach Completion-Quote (nur Tracks mit genug Plays). */
  topCompletionRateTrackIds: Set<string>;
};

/**
 * Ermittelt die Top-30%-Rankings nach Skip- bzw. Completion-QUOTE (nicht
 * absoluten Zahlen) über alle Tracks, die die Mindest-Play-Schwelle
 * erreicht haben. Wird einmal pro Sendeplan-Generierung berechnet und für
 * alle Blöcke wiederverwendet.
 */
export function computeRankingSets(
  statsByTrackId: Map<string, PlayStats>
): RankingSets {
  const eligible = [...statsByTrackId.entries()].filter(
    ([, stats]) => stats.totalPlays >= weightingConfig.minPlaysForRanking
  );

  const topCount = Math.ceil(eligible.length * weightingConfig.rankingTopPercentile);

  const bySkipRateDesc = [...eligible].sort(
    (a, b) => b[1].skips / b[1].totalPlays - a[1].skips / a[1].totalPlays
  );
  const byCompletionRateDesc = [...eligible].sort(
    (a, b) =>
      b[1].completions / b[1].totalPlays - a[1].completions / a[1].totalPlays
  );

  return {
    topSkipRateTrackIds: new Set(bySkipRateDesc.slice(0, topCount).map(([id]) => id)),
    topCompletionRateTrackIds: new Set(
      byCompletionRateDesc.slice(0, topCount).map(([id]) => id)
    ),
  };
}

/**
 * Berechnet das effektive Gewicht eines Tracks für die Sendeplan-Ziehung.
 * Alle Faktoren werden multiplikativ verrechnet (siehe README für Details
 * zur Formel und src/lib/config.ts für die einstellbaren Konstanten).
 */
export function computeTrackWeight(
  track: Pick<Track, "id" | "uploadedAt" | "sanctionMultiplier">,
  stats: PlayStats | undefined,
  rankingSets: RankingSets,
  now: Date = new Date()
): number {
  let weight: number = weightingConfig.baseWeight;

  const isNew = track.uploadedAt >= subMonths(now, weightingConfig.newTrackMonths);
  if (isNew) {
    weight *= weightingConfig.newTrackFactor;
  }

  const totalPlays = stats?.totalPlays ?? 0;
  if (totalPlays >= weightingConfig.minPlaysForRanking) {
    if (rankingSets.topSkipRateTrackIds.has(track.id)) {
      weight *= weightingConfig.highSkipRateFactor;
    }
    if (rankingSets.topCompletionRateTrackIds.has(track.id)) {
      weight *= weightingConfig.highCompletionRateFactor;
    }
  }

  weight *= track.sanctionMultiplier;

  // Gewicht darf nie <= 0 werden (z.B. bei Sanktions-Multiplikator 0), sonst
  // hat der Track in der gewichteten Ziehung keine Chance mehr, auch wenn er
  // eigentlich noch laufen soll. Ein sehr kleiner Restwert bleibt erlaubt.
  return Math.max(weight, 0.0001);
}
