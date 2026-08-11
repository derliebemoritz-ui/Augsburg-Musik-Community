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
        <h1 className="text-2xl font-semibold text-neutral-900">Alben</h1>
        <Link
          href="/admin/albums/new"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + Neu anlegen
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => (
          <li key={album.id}>
            <Link
              href={`/admin/albums/${album.id}`}
              className="flex items-center gap-3 rounded-lg border border-neutral-300 bg-white p-3 hover:border-cyan-600"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-neutral-200">
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
                <div className="truncate font-medium text-neutral-900">{album.title}</div>
                <div className="truncate text-xs text-neutral-500">
                  {album.artist.name} · {album._count.tracks} Track(s)
                </div>
              </div>
            </Link>
          </li>
        ))}
        {albums.length === 0 && (
          <li className="col-span-full rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            Noch keine Alben angelegt.
          </li>
        )}
      </ul>
    </div>
  );
}
