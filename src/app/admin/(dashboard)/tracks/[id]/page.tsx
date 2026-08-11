import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { getTrackStatsViews } from "@/lib/scheduling/stats";
import { updateTrack, deleteTrack } from "@/lib/actions/tracks";
import TrackForm from "../TrackForm";
import DeleteEntityButton from "../../DeleteEntityButton";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function EditTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [track, artists, genres, upcomingScheduleCount] = await Promise.all([
    prisma.track.findUnique({ where: { id } }),
    prisma.artist.findMany({
      orderBy: { name: "asc" },
      include: { albums: { orderBy: { title: "asc" } } },
    }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.scheduleItem.count({ where: { trackId: id, scheduledStart: { gt: new Date() } } }),
  ]);
  if (!track) notFound();

  const statsViews = await getTrackStatsViews([track]);
  const stats = statsViews.get(track.id)!;
  const storage = getStorage();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{track.title} bearbeiten</h1>
        <DeleteEntityButton
          onDelete={deleteTrack.bind(null, id)}
          confirmText={
            `"${track.title}" wirklich endgültig löschen?\n\n` +
            "Der Datenbank-Eintrag und die Audiodatei werden unwiderruflich entfernt. " +
            "In der Play-Historie und Statistik bleiben Titel, Künstler:in und Album als Text erhalten." +
            (upcomingScheduleCount > 0
              ? `\n\nAchtung: Der Track ist noch ${upcomingScheduleCount}× im kommenden Sendeplan eingeplant - diese Slots werden beim Abspielen automatisch übersprungen.`
              : "") +
            "\n\nZum vorübergehenden Entfernen aus der Rotation reicht stattdessen \"Inaktiv\" schalten."
          }
          redirectTo="/admin/tracks"
        />
      </div>

      <div className="mb-6 grid max-w-xl grid-cols-2 gap-4 border border-line bg-surface p-4 text-sm sm:grid-cols-4">
        <div>
          <div className="text-ink-muted">Plays gesamt</div>
          <div className="font-semibold text-ink">{stats.totalPlays}</div>
        </div>
        <div>
          <div className="text-ink-muted">Skip-Quote</div>
          <div className="font-semibold text-ink">
            {stats.skipRate === null ? "–" : `${Math.round(stats.skipRate * 100)}%`}
          </div>
        </div>
        <div>
          <div className="text-ink-muted">Completion-Quote</div>
          <div className="font-semibold text-ink">
            {stats.completionRate === null ? "–" : `${Math.round(stats.completionRate * 100)}%`}
          </div>
        </div>
        <div>
          <div className="text-ink-muted">Aktuelles Gewicht</div>
          <div className="font-semibold text-ink">{stats.effectiveWeight.toFixed(2)}</div>
        </div>
      </div>

      <TrackForm
        action={updateTrack.bind(null, id)}
        artists={artists}
        genres={genres}
        defaultValues={{
          title: track.title,
          artistId: track.artistId,
          albumId: track.albumId,
          genreId: track.genreId,
          sanctionMultiplier: track.sanctionMultiplier,
          consentGiven: track.consentGiven,
          consentDate: track.consentDate ? toDateInputValue(track.consentDate) : "",
        }}
        audioUrl={storage.getPublicUrl(track.audioPath)}
        submitLabel="Speichern"
      />
    </div>
  );
}
