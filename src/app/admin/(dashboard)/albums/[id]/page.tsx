import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { updateAlbum, deleteAlbum } from "@/lib/actions/albums";
import AlbumForm from "../AlbumForm";
import DeleteEntityButton from "../../DeleteEntityButton";

export default async function EditAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [album, artists] = await Promise.all([
    prisma.album.findUnique({ where: { id }, include: { tracks: true } }),
    prisma.artist.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!album) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">{album.title} bearbeiten</h1>
        <DeleteEntityButton
          onDelete={deleteAlbum.bind(null, id)}
          confirmText={`"${album.title}" wirklich löschen?`}
          redirectTo="/admin/albums"
        />
      </div>

      <AlbumForm
        action={updateAlbum.bind(null, id)}
        artists={artists}
        defaultValues={{ title: album.title, artistId: album.artistId }}
        artworkPath={album.artworkPath}
        submitLabel="Speichern"
      />

      <div className="mt-10 max-w-xl border-t border-neutral-200 pt-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Tracks</h2>
        {album.tracks.length === 0 ? (
          <p className="text-sm text-neutral-500">Noch keine Tracks.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {album.tracks.map((track) => (
              <li key={track.id}>
                <Link href={`/admin/tracks/${track.id}`} className="text-cyan-700 hover:underline">
                  {track.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
