import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.scheduleItem.findMany({
    where: { scheduledEnd: { lte: new Date() } },
    include: { track: { include: { artist: true } } },
    orderBy: { scheduledStart: "desc" },
  });

  const rows = items.map((item) => [
    item.scheduledStart.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }),
    item.scheduledStart.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    }),
    item.track.artist.name,
    item.track.title,
  ]);

  const csv = toCsv(["Datum", "Uhrzeit", "Künstler:in", "Titel"], rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="play-historie.csv"`,
    },
  });
}
