import { prisma } from "@/lib/db";
import { getServiceDate } from "./time";
import { ensureScheduleForDate } from "./generateSchedule";
import { EmptyLibraryError } from "./errors";

const trackInclude = {
  track: { include: { artist: true, album: true, genre: true } },
  block: { include: { genre: true } },
} as const;

export type CurrentScheduleItem = NonNullable<
  Awaited<ReturnType<typeof prisma.scheduleItem.findFirst<{ include: typeof trackInclude }>>>
>;

/**
 * Ermittelt den aktuell laufenden Sendeplan-Eintrag. Generiert bei Bedarf
 * (Lazy-Generierung) den Sendeplan für den heutigen Sendetag. Gibt `null`
 * zurück, wenn (noch) kein Programm verfügbar ist (z.B. komplett leere
 * Mediathek) - der Aufrufer muss das UI-seitig sauber abfangen.
 */
export async function getCurrentScheduleItem(
  now: Date = new Date()
): Promise<CurrentScheduleItem | null> {
  const findCurrent = () =>
    prisma.scheduleItem.findFirst({
      where: { scheduledStart: { lte: now }, scheduledEnd: { gt: now } },
      include: trackInclude,
      orderBy: { scheduledStart: "desc" },
    });

  /** Sucht den nächsten abspielbaren Eintrag ab `from` (trackId not null). */
  const findNextPlayable = (from: Date) =>
    prisma.scheduleItem.findFirst({
      where: { scheduledStart: { gte: from }, trackId: { not: null } },
      include: trackInclude,
      orderBy: { scheduledStart: "asc" },
    });

  let item = await findCurrent();

  if (!item) {
    try {
      await ensureScheduleForDate(getServiceDate(now));
    } catch (err) {
      if (err instanceof EmptyLibraryError) {
        return null;
      }
      throw err;
    }
    item = await findCurrent();
  }

  // Der Slot, der genau jetzt laufen sollte, hat keinen Track mehr (z.B.
  // gelöscht) - statt "kein Programm" anzuzeigen, direkt zum nächsten
  // abspielbaren Track vorspulen (der dann sofort ab Anfang läuft), damit
  // gelöschte Tracks nie eine Sendelücke verursachen.
  if (!item || !item.trackId) {
    item = await findNextPlayable(item ? item.scheduledEnd : now);
  }

  if (item && !item.actualStart) {
    // Erste Beobachtung dieses Slots als "live" - Historie-Markierung.
    await prisma.scheduleItem.update({
      where: { id: item.id },
      data: { actualStart: item.scheduledStart },
    });
  }

  return item;
}

/** Nächste Einträge nach dem aktuellen Slot (für eine "Als nächstes"-Anzeige).
 *  Slots mit inzwischen gelöschtem Track werden übersprungen (nicht abspielbar). */
export async function getUpcomingItems(now: Date = new Date(), limit = 5) {
  return prisma.scheduleItem.findMany({
    where: { scheduledStart: { gt: now }, trackId: { not: null } },
    include: trackInclude,
    orderBy: { scheduledStart: "asc" },
    take: limit,
  });
}

/** Öffentliche Play-Historie: zuletzt gespielte Songs, neueste zuerst. */
export async function getHistoryItems(now: Date = new Date(), limit = 30, offset = 0) {
  return prisma.scheduleItem.findMany({
    where: { scheduledEnd: { lte: now } },
    include: trackInclude,
    orderBy: { scheduledStart: "desc" },
    take: limit,
    skip: offset,
  });
}

/** Lädt einen einzelnen Sendeplan-Eintrag (z.B. für den lokalen Skip im Player). */
export async function getScheduleItemById(id: string): Promise<CurrentScheduleItem | null> {
  return prisma.scheduleItem.findUnique({ where: { id }, include: trackInclude });
}

/** Alle Einträge des aktuell laufenden Blocks (für die Block-Anzeige "Jetzt: Genre - bis HH:MM"). */
export async function getBlockForItem(blockId: string) {
  return prisma.scheduleBlock.findUnique({
    where: { id: blockId },
    include: { genre: true },
  });
}
