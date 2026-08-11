import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export default async function AdminAlbumsPage() {
  const albums = await prisma.album.findMany({
    orderBy: { title: "asc" },
    include: { artist: true, _count: { select: { tracks: true } } },
  });
  const storage = getStorage();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Alben</h1>
        <Link
          href="/admin/albums/new"
          className="bg-ink px-4 py-2 text-sm font-medium text-page hover:bg-surface-alt hover:text-ink"
        >
          + Neu anlegen
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => (
          <li key={album.id}>
            <Link
              href={`/admin/albums/${album.id}`}
              className="flex items-center gap-3 border border-line bg-surface p-3 hover:border-cyan"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-surface-alt">
                {album.artworkPath && (
                  <Image
                    src={storage.getPublicUrl(album.artworkPath)}
                    alt=""
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{album.title}</div>
                <div className="truncate text-xs text-ink-muted">
                  {album.artist.name} · {album._count.tracks} Track(s)
                </div>
              </div>
            </Link>
          </li>
        ))}
        {albums.length === 0 && (
          <li className="col-span-full border border-dashed border-line p-8 text-center text-sm text-ink-muted">
            Noch keine Alben angelegt.
          </li>
        )}
      </ul>
    </div>
  );
}
