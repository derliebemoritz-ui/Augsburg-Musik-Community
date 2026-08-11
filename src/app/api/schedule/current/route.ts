import { NextResponse } from "next/server";
import { getCurrentScheduleItem, getUpcomingItems } from "@/lib/scheduling/query";
import { serializeCurrentItem, serializeUpcomingItem } from "@/lib/scheduling/publicView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();

  try {
    const current = await getCurrentScheduleItem(now);
    const upcoming = current ? await getUpcomingItems(now, 5) : [];

    return NextResponse.json({
      serverTime: now.toISOString(),
      current: current ? serializeCurrentItem(current) : null,
      upcoming: upcoming.map(serializeUpcomingItem),
    });
  } catch (err) {
    console.error("Fehler beim Laden des Sendeplans:", err);
    return NextResponse.json(
      {
        serverTime: now.toISOString(),
        current: null,
        upcoming: [],
        error: "Der Sendeplan konnte nicht geladen werden.",
      },
      { status: 200 }
    );
  }
}
