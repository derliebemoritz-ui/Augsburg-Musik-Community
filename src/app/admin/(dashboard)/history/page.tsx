import Link from "next/link";
import { getHistoryItems } from "@/lib/scheduling/query";

const PAGE_SIZE = 50;

function formatDateTime(date: Date): string {
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const items = await getHistoryItems(new Date(), PAGE_SIZE, (page - 1) * PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Play-Historie</h1>
        <a
          href="/api/admin/history/csv"
          className="border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-cyan"
        >
          Als CSV exportieren
        </a>
      </div>

      <div className="overflow-hidden border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Datum &amp; Uhrzeit</th>
              <th className="px-4 py-3">Künstler:in</th>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Genre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-ink-muted">{formatDateTime(item.scheduledStart)}</td>
                <td className="px-4 py-3">{item.track.artist.name}</td>
                <td className="px-4 py-3">{item.track.title}</td>
                <td className="px-4 py-3 text-ink-muted">{item.block.genre.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-muted">Noch keine Wiedergaben.</p>
        )}
      </div>

      <div className="mt-4 flex justify-between text-sm">
        {page > 1 ? (
          <Link href={`/admin/history?page=${page - 1}`} className="text-cyan hover:underline">
            ← Neuer
          </Link>
        ) : (
          <span />
        )}
        {items.length === PAGE_SIZE && (
          <Link href={`/admin/history?page=${page + 1}`} className="text-cyan hover:underline">
            Älter →
          </Link>
        )}
      </div>
    </div>
  );
}
