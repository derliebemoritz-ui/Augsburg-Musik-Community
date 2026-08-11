import { prisma } from "@/lib/db";
import { createTrack } from "@/lib/actions/tracks";
import TrackForm from "../TrackForm";

export default async function NewTrackPage() {
  const [artists, genres] = await Promise.all([
    prisma.artist.findMany({
      orderBy: { name: "asc" },
      include: { albums: { orderBy: { title: "asc" } } },
    }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Track hochladen</h1>
      {artists.length === 0 || genres.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Bitte zuerst mindestens eine Künstler:in (mit Album) und ein Genre anlegen.
        </p>
      ) : (
        <TrackForm action={createTrack} artists={artists} genres={genres} submitLabel="Hochladen" />
      )}
    </div>
  );
}
