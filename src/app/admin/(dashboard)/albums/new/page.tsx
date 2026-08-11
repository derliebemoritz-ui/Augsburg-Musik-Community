import { prisma } from "@/lib/db";
import { createAlbum } from "@/lib/actions/albums";
import AlbumForm from "../AlbumForm";

export default async function NewAlbumPage({
  searchParams,
}: {
  searchParams: Promise<{ artistId?: string }>;
}) {
  const { artistId } = await searchParams;
  const artists = await prisma.artist.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Neues Album anlegen</h1>
      {artists.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Bitte zuerst eine Künstler:in anlegen.
        </p>
      ) : (
        <AlbumForm
          action={createAlbum}
          artists={artists}
          defaultValues={artistId ? { title: "", artistId } : undefined}
          submitLabel="Anlegen"
        />
      )}
    </div>
  );
}
