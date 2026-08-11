"use server";

import { revalidatePath } from "next/cache";
import { regenerateSchedule, regenerateRemainingToday } from "@/lib/scheduling/generateSchedule";
import { addServiceDays, getServiceDate } from "@/lib/scheduling/time";
import { requireAuth, ok, fail, type ActionResult } from "./shared";

/** Generiert den Sendeplan für den kommenden Tag neu (Admin-Funktion). */
export async function regenerateNextDaySchedule(): Promise<ActionResult<{ blocksCreated: number }>> {
  try {
    await requireAuth();
    const tomorrow = addServiceDays(getServiceDate(), 1);
    const result = await regenerateSchedule(tomorrow);
    revalidatePath("/admin/schedule");
    return ok({ blocksCreated: result.blocksCreated });
  } catch (err) {
    return fail(err);
  }
}

/**
 * Füllt fehlende/zukünftige Blöcke des HEUTIGEN Sendetags neu auf
 * (Admin-Funktion, z.B. um Lücken durch gelöschte Tracks zu schließen).
 * Bereits gelaufene oder gerade laufende Blöcke bleiben unangetastet.
 */
export async function regenerateTodaySchedule(): Promise<ActionResult<{ blocksCreated: number }>> {
  try {
    await requireAuth();
    const result = await regenerateRemainingToday();
    revalidatePath("/admin/schedule");
    return ok({ blocksCreated: result.blocksCreated });
  } catch (err) {
    return fail(err);
  }
}
