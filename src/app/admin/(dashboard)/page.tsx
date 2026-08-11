import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminDashboardPage() {
  const [artistCount, albumCount, trackCount, activeTrackCount, genreCount] = await Promise.all([
    prisma.artist.count(),
    prisma.album.count(),
    prisma.track.count(),
    prisma.track.count({ where: { active: true } }),
    prisma.genre.count(),
  ]);

  const cards = [
    { label: "Künstler:innen", value: artistCount, href: "/admin/artists" },
    { label: "Alben", value: albumCount, href: "/admin/albums" },
    { label: "Tracks (aktiv/gesamt)", value: `${activeTrackCount}/${trackCount}`, href: "/admin/tracks" },
    { label: "Genres", value: genreCount, href: "/admin/genres" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Übersicht</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-neutral-300 bg-white p-5 transition hover:border-cyan-600"
          >
            <div className="text-3xl font-semibold text-neutral-900">{card.value}</div>
            <div className="mt-1 text-sm text-neutral-500">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/tracks/new"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + Neuen Track hochladen
        </Link>
        <Link
          href="/admin/artists/new"
          className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:border-cyan-600"
        >
          + Neue Künstler:in anlegen
        </Link>
        <Link
          href="/admin/schedule"
          className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:border-cyan-600"
        >
          Sendeplan ansehen
        </Link>
      </div>
    </div>
  );
}
