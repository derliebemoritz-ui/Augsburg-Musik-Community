import { isAuthenticated } from "@/lib/auth";

export class ActionError extends Error {}

/** Verteidigung in der Tiefe: der Proxy (src/proxy.ts) blockt bereits alle
 *  nicht angemeldeten Zugriffe auf /admin/**, diese Prüfung schützt
 *  zusätzlich direkt in den Server Actions selbst. */
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new ActionError("Nicht angemeldet.");
  }
}

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: unknown): ActionResult<never> {
  if (error instanceof ActionError || error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Unbekannter Fehler." };
}
