import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { addDays, startOfDay } from "date-fns";
import { scheduleConfig } from "@/lib/config";

/**
 * Liefert den "Sendetag" (Mitternacht in der konfigurierten Zeitzone, als
 * UTC-Instant) für einen gegebenen Zeitpunkt. Dient als stabiler Schlüssel
 * (ScheduleBlock.date), unabhängig davon, wie spät der letzte Track des
 * Vortages tatsächlich zu Ende geht.
 */
export function getServiceDate(instant: Date = new Date()): Date {
  const zoned = toZonedTime(instant, scheduleConfig.timezone);
  const localMidnight = startOfDay(zoned);
  return fromZonedTime(localMidnight, scheduleConfig.timezone);
}

/**
 * Verschiebt einen Sendetag um `days` Kalendertage in der konfigurierten
 * Zeitzone (DST-sicher, da auf der lokalen Wanduhrzeit gerechnet wird und
 * erst am Ende zurück in einen UTC-Instant konvertiert wird).
 */
export function addServiceDays(serviceDate: Date, days: number): Date {
  const zoned = toZonedTime(serviceDate, scheduleConfig.timezone);
  const shiftedLocal = startOfDay(addDays(zoned, days));
  return fromZonedTime(shiftedLocal, scheduleConfig.timezone);
}
