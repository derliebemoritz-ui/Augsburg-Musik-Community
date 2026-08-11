"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setTrackActive, setSanctionMultiplier } from "@/lib/actions/tracks";
import type { TrackStatsView } from "@/lib/scheduling/stats";

type TrackSummary = {
  id: string;
  title: string;
  artistName: string;
  genreName: string;
  active: boolean;
  sanctionMultiplier: number;
};

function formatPercent(value: number | null): string {
  if (value === null) return "–";
  return `${Math.round(value * 100)}%`;
}

export default function TrackRow({ track, stats }: { track: TrackSummary; stats: TrackStatsView }) {
  const [active, setActive] = useState(track.active);
  const [multiplier, setMultiplier] = useState(track.sanctionMultiplier);
  const [isPending, startTransition] = useTransition();

  function handleToggleActive() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      const result = await setTrackActive(track.id, next);
      if (!result.ok) {
        setActive(!next);
        alert(result.error);
      }
    });
  }

  function handleMultiplierBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = parseFloat(e.target.value);
    if (Number.isNaN(value) || value === track.sanctionMultiplier) return;
    startTransition(async () => {
      const result = await setSanctionMultiplier(track.id, value);
      if (!result.ok) {
        alert(result.error);
        setMultiplier(track.sanctionMultiplier);
      }
    });
  }

  return (
    <tr className={active ? "" : "bg-neutral-50 text-neutral-400"}>
      <td className="px-4 py-3">
        <Link href={`/admin/tracks/${track.id}`} className="font-medium text-neutral-900 hover:text-cyan-700 hover:underline">
          {track.title}
        </Link>
      </td>
      <td className="px-4 py-3">{track.artistName}</td>
      <td className="px-4 py-3">{track.genreName}</td>
      <td className="px-4 py-3">{stats.totalPlays}</td>
      <td className="px-4 py-3">
        {formatPercent(stats.skipRate)}
        {stats.isTopSkipRate && <span className="ml-1 text-xs text-fuchsia-600">▼0.5x</span>}
      </td>
      <td className="px-4 py-3">
        {formatPercent(stats.completionRate)}
        {stats.isTopCompletionRate && <span className="ml-1 text-xs text-cyan-600">▲1.1x</span>}
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          step="0.1"
          min="0"
          max="5"
          defaultValue={multiplier}
          onBlur={handleMultiplierBlur}
          className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-4 py-3 font-mono text-xs">{stats.effectiveWeight.toFixed(2)}</td>
      <td className="px-4 py-3">
        <button
          onClick={handleToggleActive}
          disabled={isPending}
          className={`rounded px-2 py-1 text-xs font-medium ${
            active ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
          }`}
        >
          {active ? "Aktiv" : "Inaktiv"}
        </button>
      </td>
    </tr>
  );
}
