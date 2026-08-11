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
        <h1 className="text-2xl font-semibold text-neutral-900">Tracks</h1>
        <Link
          href="/admin/tracks/new"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + Track hochladen
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-300 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
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
          <tbody className="divide-y divide-neutral-100">
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
          <p className="p-8 text-center text-sm text-neutral-500">Noch keine Tracks hochgeladen.</p>
        )}
      </div>
    </div>
  );
}
