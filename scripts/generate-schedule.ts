/**
 * Generiert den Sendeplan für den kommenden Sendetag.
 *
 * Gedacht zum nächtlichen Aufruf per Cronjob (siehe README.md,
 * "Deployment auf dem VPS" und docker-compose.yml). Falls der Cronjob
 * einmal ausfällt, generiert die Anwendung den Plan trotzdem automatisch
 * beim ersten Seitenaufruf des Tages (Lazy-Generierung).
 *
 * Aufruf: npm run db:generate-schedule
 */
import { prisma } from "@/lib/db";
import { ensureScheduleForDate } from "@/lib/scheduling/generateSchedule";
import { addServiceDays, getServiceDate } from "@/lib/scheduling/time";
import { EmptyLibraryError } from "@/lib/scheduling/errors";

async function main() {
  const tomorrow = addServiceDays(getServiceDate(), 1);
  try {
    const result = await ensureScheduleForDate(tomorrow);
    if (result.generated) {
      console.log(`Sendeplan für ${tomorrow.toISOString()} wurde generiert.`);
    } else {
      console.log(`Sendeplan für ${tomorrow.toISOString()} existierte bereits.`);
    }
  } catch (err) {
    if (err instanceof EmptyLibraryError) {
      console.warn(
        "Konnte keinen Sendeplan generieren: keine aktiven, freigegebenen Tracks vorhanden."
      );
      return;
    }
    throw err;
  }
}

main()
  .catch((err) => {
    console.error("Fehler bei der Sendeplan-Generierung:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
