import { prisma } from "@/lib/db";
import { getServiceDate, addServiceDays } from "@/lib/scheduling/time";
import RegenerateButton from "./RegenerateButton";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
}

async function loadBlocks(date: Date) {
  return prisma.scheduleBlock.findMany({
    where: { date },
    include: {
      genre: true,
      items: { include: { track: { include: { artist: true } } }, orderBy: { position: "asc" } },
    },
    orderBy: { blockIndex: "asc" },
  });
}

export default async function AdminSchedulePage() {
  const today = getServiceDate();
  const tomorrow = addServiceDays(today, 1);
  const [todayBlocks, tomorrowBlocks] = await Promise.all([loadBlocks(today), loadBlocks(tomorrow)]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Sendeplan</h1>
        <RegenerateButton hasTomorrowSchedule={tomorrowBlocks.length > 0} />
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium text-neutral-800">Heute</h2>
        <ScheduleBlockList blocks={todayBlocks} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-neutral-800">Morgen</h2>
        {tomorrowBlocks.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Noch nicht generiert. Wird spätestens beim ersten Seitenaufruf morgen automatisch
            erzeugt, oder jetzt manuell über den Button oben.
          </p>
        ) : (
          <ScheduleBlockList blocks={tomorrowBlocks} />
        )}
      </section>
    </div>
  );
}

type BlockWithItems = Awaited<ReturnType<typeof loadBlocks>>[number];

function ScheduleBlockList({ blocks }: { blocks: BlockWithItems[] }) {
  if (blocks.length === 0) {
    return (
      <p className="rounded border border-dashed border-neutral-300 p-6 text-sm text-neutral-500">
        Kein Sendeplan vorhanden (z.B. weil keine aktiven, freigegebenen Tracks existieren).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <details key={block.id} className="rounded-lg border border-neutral-300 bg-white p-4" open>
          <summary className="cursor-pointer text-sm font-medium text-neutral-800">
            {formatTime(block.startTime)}–{formatTime(block.endTime)} · {block.genre.name}
            {block.isFallbackGenre && (
              <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                Fallback (ursprüngliches Genre hatte keine Tracks)
              </span>
            )}
          </summary>
          <ul className="mt-3 space-y-1 text-sm text-neutral-600">
            {block.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span>
                  {item.track.title} — {item.track.artist.name}
                </span>
                <span className="shrink-0 text-neutral-400">{formatTime(item.scheduledStart)}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
