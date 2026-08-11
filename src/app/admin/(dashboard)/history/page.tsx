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
        <h1 className="text-2xl font-semibold text-neutral-900">Play-Historie</h1>
        <a
          href="/api/admin/history/csv"
          className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:border-cyan-600"
        >
          Als CSV exportieren
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-300 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Datum &amp; Uhrzeit</th>
              <th className="px-4 py-3">Künstler:in</th>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Genre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-neutral-500">{formatDateTime(item.scheduledStart)}</td>
                <td className="px-4 py-3">{item.track.artist.name}</td>
                <td className="px-4 py-3">{item.track.title}</td>
                <td className="px-4 py-3 text-neutral-500">{item.block.genre.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="p-8 text-center text-sm text-neutral-500">Noch keine Wiedergaben.</p>
        )}
      </div>

      <div className="mt-4 flex justify-between text-sm">
        {page > 1 ? (
          <Link href={`/admin/history?page=${page - 1}`} className="text-cyan-700 hover:underline">
            ← Neuer
          </Link>
        ) : (
          <span />
        )}
        {items.length === PAGE_SIZE && (
          <Link href={`/admin/history?page=${page + 1}`} className="text-cyan-700 hover:underline">
            Älter →
          </Link>
        )}
      </div>
    </div>
  );
}
