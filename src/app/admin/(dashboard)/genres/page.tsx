import { prisma } from "@/lib/db";
import GenreManager from "./GenreManager";

export default async function AdminGenresPage() {
  const genres = await prisma.genre.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tracks: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-neutral-900">Genres</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Ein Genre pro 2-Stunden-Sendeblock. Umbenennen wirkt sich sofort überall aus; Löschen
        ist nur möglich, wenn keine Tracks mehr zugeordnet sind.
      </p>
      <GenreManager
        initialGenres={genres.map((g) => ({ id: g.id, name: g.name, trackCount: g._count.tracks }))}
      />
    </div>
  );
}
