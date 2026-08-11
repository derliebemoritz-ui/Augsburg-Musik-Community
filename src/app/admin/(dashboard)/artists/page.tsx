import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export default async function AdminArtistsPage() {
  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tracks: true, albums: true } } },
  });
  const storage = getStorage();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Künstler:innen</h1>
        <Link
          href="/admin/artists/new"
          className="bg-ink px-4 py-2 text-sm font-medium text-page hover:bg-surface-alt hover:text-ink"
        >
          + Neu anlegen
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => (
          <li key={artist.id}>
            <Link
              href={`/admin/artists/${artist.id}`}
              className="flex items-center gap-3 border border-line bg-surface p-3 hover:border-cyan"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-surface-alt">
                {artist.photoPath && (
                  <Image
                    src={storage.getPublicUrl(artist.photoPath)}
                    alt=""
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{artist.name}</div>
                <div className="text-xs text-ink-muted">
                  {artist._count.albums} Album/Alben · {artist._count.tracks} Track(s)
                </div>
              </div>
            </Link>
          </li>
        ))}
        {artists.length === 0 && (
          <li className="col-span-full border border-dashed border-line p-8 text-center text-sm text-ink-muted">
            Noch keine Künstler:innen angelegt.
          </li>
        )}
      </ul>
    </div>
  );
}
