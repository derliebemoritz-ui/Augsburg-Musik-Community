import { NextResponse } from "next/server";
import { getScheduleItemById } from "@/lib/scheduling/query";
import { serializeCurrentItem } from "@/lib/scheduling/publicView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liefert die vollen Anzeige-/Wiedergabedaten eines einzelnen Sendeplan-
// Eintrags - genutzt vom lokalen Skip im Player, um zum nächsten Track in
// der eigenen Warteschlange zu wechseln.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const item = await getScheduleItemById(id);
  return NextResponse.json({ item: item ? serializeCurrentItem(item) : null });
}
