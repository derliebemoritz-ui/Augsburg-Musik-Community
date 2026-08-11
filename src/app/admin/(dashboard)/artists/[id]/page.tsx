import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { updateArtist, deleteArtist } from "@/lib/actions/artists";
import ArtistForm from "../ArtistForm";
import DeleteEntityButton from "../../DeleteEntityButton";

export default async function EditArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await prisma.artist.findUnique({
    where: { id },
    include: { albums: true, _count: { select: { tracks: true } } },
  });
  if (!artist) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{artist.name} bearbeiten</h1>
        <DeleteEntityButton
          onDelete={deleteArtist.bind(null, id)}
          confirmText={`"${artist.name}" wirklich löschen?`}
          redirectTo="/admin/artists"
        />
      </div>

      <ArtistForm
        action={updateArtist.bind(null, id)}
        defaultValues={{ name: artist.name, bio: artist.bio, musicLink: artist.musicLink }}
        photoPath={artist.photoPath}
        submitLabel="Speichern"
      />

      <div className="mt-10 max-w-xl border-t border-line pt-6">
        <h2 className="mb-2 text-sm font-semibold text-ink-muted">Alben</h2>
        {artist.albums.length === 0 ? (
          <p className="text-sm text-ink-muted">Noch keine Alben.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {artist.albums.map((album) => (
              <li key={album.id}>
                <Link href={`/admin/albums/${album.id}`} className="text-cyan hover:underline">
                  {album.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/admin/albums/new?artistId=${artist.id}`}
          className="mt-2 inline-block text-sm text-cyan hover:underline"
        >
          + Album anlegen
        </Link>
      </div>
    </div>
  );
}
