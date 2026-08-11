import { getCurrentScheduleItem, getUpcomingItems, getHistoryItems } from "@/lib/scheduling/query";
import { serializeCurrentItem, serializeUpcomingItem, serializeHistoryItem } from "@/lib/scheduling/publicView";
import { playerConfig } from "@/lib/config";
import PlayerClient from "@/components/player/PlayerClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  let current = null;
  let upcoming: Awaited<ReturnType<typeof getUpcomingItems>> = [];
  let history: Awaited<ReturnType<typeof getHistoryItems>> = [];

  try {
    current = await getCurrentScheduleItem(now);
    if (current) {
      [upcoming, history] = await Promise.all([
        getUpcomingItems(now, 5),
        getHistoryItems(now, playerConfig.historyPageSize),
      ]);
    }
  } catch (err) {
    console.error("Fehler beim Laden des Sendeplans:", err);
  }

  return (
    <div className="flex-1 px-4 py-10">
      <header className="mx-auto mb-10 max-w-4xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Stadtradio Augsburg
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Kuratierte Musik lokaler Künstler:innen, rund um die Uhr.
        </p>
        <div className="mx-auto mt-4 flex h-[3px] w-24 overflow-hidden rounded-full">
          <span className="flex-1 bg-[#00aeef]" />
          <span className="flex-1 bg-[#e6007e]" />
          <span className="flex-1 bg-[#fff200]" />
          <span className="flex-1 bg-neutral-900" />
        </div>
      </header>

      <div className="mx-auto max-w-5xl">
        <PlayerClient
          initialCurrent={current ? serializeCurrentItem(current) : null}
          initialUpcoming={upcoming.map(serializeUpcomingItem)}
          initialHistory={history.map(serializeHistoryItem)}
          serverTimeAtLoad={now.toISOString()}
          donationUrl={playerConfig.donationUrl}
        />
      </div>

      <footer className="mx-auto mt-16 max-w-4xl text-center text-xs text-neutral-400">
        <a href="/admin" className="hover:underline">
          Admin
        </a>
      </footer>
    </div>
  );
}
