/**
 * Zentrale Konfigurationswerte für die Sendeplan- und Gewichtungslogik.
 *
 * Alle "magischen Zahlen" aus der Anforderung leben hier gebündelt, damit sie
 * an einer Stelle angepasst werden können (siehe README.md, Abschnitt
 * "Gewichtungs-Konstanten ändern").
 */

export const scheduleConfig = {
  /** Dauer eines Sendeblocks (ein Genre pro Block) in Minuten. */
  blockDurationMinutes: 120,
  /** Zeitzone, in der Tagesgrenzen und Blockzeiten berechnet werden. */
  timezone: process.env.SCHEDULE_TIMEZONE || "Europe/Berlin",
} as const;

export const weightingConfig = {
  /** Basisgewicht, von dem aus alle Faktoren multiplikativ verrechnet werden. */
  baseWeight: 1.0,

  /** Ein Track gilt als "neu", wenn der Upload nicht länger als das hier zurückliegt. */
  newTrackMonths: 3,
  /** Gewichtungsfaktor für neue Tracks. */
  newTrackFactor: 1.3,

  /** Nur Tracks mit mindestens dieser Anzahl gezählter Plays fließen in die
   *  Skip-/Completion-Quoten-Rankings ein. Darunter gilt Faktor 1.0 (neutral). */
  minPlaysForRanking: 15,
  /** Perzentil-Schwelle für "Top 30 %" bei Skip- und Completion-Quote. */
  rankingTopPercentile: 0.3,

  /** Faktor für Tracks in den Top 30 % nach Skip-Quote (Skips ÷ Gesamt-Plays). */
  highSkipRateFactor: 0.5,
  /** Faktor für Tracks in den Top 30 % nach Completion-Quote
   *  (komplett gehörte Plays ÷ Gesamt-Plays). */
  highCompletionRateFactor: 1.1,

  /** Default-Wert für den manuellen Sanktions-Multiplikator eines Tracks. */
  defaultSanctionMultiplier: 1.0,
} as const;

export const playerConfig = {
  /** Ziel-URL für den Button "Spenden für die Musiker*innen". */
  donationUrl: process.env.DONATION_URL || "",
  /** Anzahl der zuletzt gespielten Songs in der öffentlichen Historie-Ansicht. */
  historyPageSize: 30,
};

export const uploadConfig = {
  maxAudioFileSizeBytes: 50 * 1024 * 1024, // 50 MB
  allowedAudioMimeTypes: [
    "audio/mpeg", // mp3
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/ogg",
    "audio/vorbis",
  ] as const,
  allowedAudioExtensions: [".mp3", ".wav", ".ogg"] as const,

  maxImageFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  allowedImageMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ] as const,
  allowedImageExtensions: [".jpg", ".jpeg", ".png", ".webp"] as const,
};
