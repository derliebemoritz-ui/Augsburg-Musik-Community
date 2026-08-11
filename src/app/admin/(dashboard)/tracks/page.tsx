import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTrackStatsViews } from "@/lib/scheduling/stats";
import TrackRow from "./TrackRow";

export default async function AdminTracksPage() {
  const tracks = await prisma.track.findMany({
    orderBy: { uploadedAt: "desc" },
    include: { artist: true, album: true, genre: true },
  });
  const statsViews = await getTrackStatsViews(tracks);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Tracks</h1>
        <Link
          href="/admin/tracks/new"
          className="bg-ink px-4 py-2 text-sm font-medium text-page hover:bg-surface-alt hover:text-ink"
        >
          + Track hochladen
        </Link>
      </div>

      <div className="overflow-x-auto border border-line bg-surface">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Künstler:in</th>
              <th className="px-4 py-3">Genre</th>
              <th className="px-4 py-3">Plays</th>
              <th className="px-4 py-3">Skip-Quote</th>
              <th className="px-4 py-3">Completion-Quote</th>
              <th className="px-4 py-3">Sanktion</th>
              <th className="px-4 py-3">Gewicht</th>
              <th className="px-4 py-3">Aktiv</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={{
                  id: track.id,
                  title: track.title,
                  artistName: track.artist.name,
                  genreName: track.genre.name,
                  active: track.active,
                  sanctionMultiplier: track.sanctionMultiplier,
                }}
                stats={statsViews.get(track.id)!}
              />
            ))}
          </tbody>
        </table>
        {tracks.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-muted">Noch keine Tracks hochgeladen.</p>
        )}
      </div>
    </div>
  );
}
