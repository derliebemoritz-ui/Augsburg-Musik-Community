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
      <h1 className="mb-6 text-2xl font-semibold text-ink">Übersicht</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border border-line bg-surface p-5 transition hover:border-cyan"
          >
            <div className="text-3xl font-semibold text-ink">{card.value}</div>
            <div className="mt-1 text-sm text-ink-muted">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/tracks/new"
          className="bg-ink px-4 py-2 text-sm font-medium text-page hover:bg-surface-alt hover:text-ink"
        >
          + Neuen Track hochladen
        </Link>
        <Link
          href="/admin/artists/new"
          className="border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-cyan"
        >
          + Neue Künstler:in anlegen
        </Link>
        <Link
          href="/admin/schedule"
          className="border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-cyan"
        >
          Sendeplan ansehen
        </Link>
      </div>
    </div>
  );
}
