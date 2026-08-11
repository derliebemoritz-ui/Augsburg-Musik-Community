import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const playEventSchema = z.object({
  trackId: z.string().min(1),
  listenedSeconds: z.coerce.number().min(0).max(24 * 60 * 60),
  completed: z.boolean(),
  skipped: z.boolean(),
});

// Loggt ein anonymes PlayEvent (keine personenbezogenen Daten, keine IP,
// keine Cookies). "skipped" bezieht sich nur auf die lokale Session der
// hörenden Person - der gemeinsame Sendeplan bleibt davon unberührt.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const parsed = playEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  const track = await prisma.track.findUnique({
    where: { id: parsed.data.trackId },
    include: { artist: true, album: true },
  });
  if (!track) {
    return NextResponse.json({ error: "Unbekannter Track." }, { status: 404 });
  }

  await prisma.playEvent.create({
    data: {
      trackId: track.id,
      trackTitle: track.title,
      artistName: track.artist.name,
      albumTitle: track.album.title,
      listenedSeconds: Math.round(parsed.data.listenedSeconds),
      completed: parsed.data.completed,
      skipped: parsed.data.skipped,
    },
  });

  return NextResponse.json({ ok: true });
}
