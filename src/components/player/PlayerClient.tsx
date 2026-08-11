"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PublicCurrentItem,
  PublicUpcomingItem,
  PublicHistoryItem,
} from "@/lib/scheduling/publicView";

type CurrentApiResponse = {
  serverTime: string;
  current: PublicCurrentItem | null;
  upcoming: PublicUpcomingItem[];
  error?: string;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

export default function PlayerClient({
  initialCurrent,
  initialUpcoming,
  initialHistory,
  serverTimeAtLoad,
  donationUrl,
}: {
  initialCurrent: PublicCurrentItem | null;
  initialUpcoming: PublicUpcomingItem[];
  initialHistory: PublicHistoryItem[];
  serverTimeAtLoad: string;
  donationUrl: string;
}) {
  const [current, setCurrent] = useState(initialCurrent);
  const [upcoming, setUpcoming] = useState(initialUpcoming);
  const [history, setHistory] = useState(initialHistory);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clockOffsetMsRef = useRef(0);
  const currentRef = useRef(current);
  const audioErrorRetriedRef = useRef(false);

  useEffect(() => {
    clockOffsetMsRef.current = Date.now() - new Date(serverTimeAtLoad).getTime();
  }, [serverTimeAtLoad]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const serverNow = useCallback(() => new Date(Date.now() - clockOffsetMsRef.current), []);

  const logPlayEvent = useCallback(
    (item: PublicCurrentItem, listenedSeconds: number, completed: boolean, skipped: boolean) => {
      const payload = JSON.stringify({
        trackId: item.trackId,
        listenedSeconds: Math.max(0, Math.round(listenedSeconds)),
        completed,
        skipped,
      });
      try {
        const blob = new Blob([payload], { type: "application/json" });
        if (!navigator.sendBeacon("/api/play-event", blob)) {
          fetch("/api/play-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
        }
      } catch {
        // Logging darf die Wiedergabe nie beeinträchtigen.
      }
    },
    []
  );

  const refreshCurrent = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule/current", { cache: "no-store" });
      const data: CurrentApiResponse = await res.json();
      clockOffsetMsRef.current = Date.now() - new Date(data.serverTime).getTime();
      setLoadError(data.error ?? null);
      return data;
    } catch {
      setLoadError("Verbindung zum Server fehlgeschlagen.");
      return null;
    }
  }, []);

  /** Startet Wiedergabe des aktuell live laufenden Songs an der korrekten
   *  Stelle - wie beim Einschalten eines echten Radios. */
  const playLive = useCallback(async () => {
    const data = await refreshCurrent();
    if (!data || !data.current) return;

    setCurrent(data.current);
    setUpcoming(data.upcoming);

    const audio = audioRef.current;
    if (!audio) return;

    const offsetSeconds = (serverNow().getTime() - new Date(data.current.scheduledStart).getTime()) / 1000;
    if (audio.src !== data.current.audioUrl) {
      audio.src = data.current.audioUrl;
    }
    audio.currentTime = Math.max(0, offsetSeconds);
    try {
      await audio.play();
      audioErrorRetriedRef.current = false;
      setLoadError(null);
      setIsPlaying(true);
      setHasStarted(true);
    } catch {
      setIsPlaying(false);
    }
  }, [refreshCurrent, serverNow]);

  function handlePlayPause() {
    const audio = audioRef.current;
    if (isPlaying && audio) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    // Wieder-Einsteigen folgt derselben Live-Radio-Logik wie der erste Start.
    playLive();
  }

  function handleSkip() {
    const item = currentRef.current;
    const audio = audioRef.current;
    if (!item || !audio) return;

    logPlayEvent(item, audio.currentTime, false, true);
    setHistory((prev) => [
      { scheduleItemId: item.scheduleItemId, title: item.title, artistName: item.artistName, scheduledStart: item.scheduledStart },
      ...prev,
    ]);

    const next = upcoming[0];
    if (!next) {
      // Lokale Warteschlange leer - live-Position neu abrufen.
      playLive();
      return;
    }

    setUpcoming((prev) => prev.slice(1));

    // Der übersprungene Track wird lokal sofort durch den nächsten ersetzt,
    // ab dessen Anfang - diese Session weicht damit bewusst vom Live-Zeitpunkt
    // ab (siehe Projektdokumentation zum Skip-Verhalten).
    fetch(`/api/schedule/item/${next.scheduleItemId}`)
      .then((res) => res.json())
      .then((data: { item: PublicCurrentItem | null }) => {
        if (!data.item) {
          playLive();
          return;
        }
        setCurrent(data.item);
        if (audioRef.current) {
          audioRef.current.src = data.item.audioUrl;
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      })
      .catch(() => playLive());
  }

  function handleEnded() {
    const item = currentRef.current;
    const audio = audioRef.current;
    if (!item) return;
    logPlayEvent(item, audio?.currentTime ?? item.durationSeconds, true, false);
    setHistory((prev) => [
      { scheduleItemId: item.scheduleItemId, title: item.title, artistName: item.artistName, scheduledStart: item.scheduledStart },
      ...prev,
    ]);
    audioErrorRetriedRef.current = false;
    playLive();
  }

  /** Fehlerbehandlung für kaputte/fehlende Audiodateien: statt dass der
   *  Player hängen bleibt, wird einmalig versucht, zum nächsten Track im
   *  Sendeplan zu springen. Tritt der Fehler direkt wieder auf, wird die
   *  Wiedergabe angehalten, damit keine Endlosschleife entsteht. */
  function handleAudioError() {
    const item = currentRef.current;
    const audio = audioRef.current;
    if (item) {
      logPlayEvent(item, audio?.currentTime ?? 0, false, false);
    }
    if (audioErrorRetriedRef.current) {
      setIsPlaying(false);
      setLoadError(
        "Die Audiodatei konnte nicht geladen werden. Bitte versuche es später erneut."
      );
      return;
    }
    audioErrorRetriedRef.current = true;
    playLive();
  }

  // Regelmäßiger, unaufdringlicher Sync (aktualisiert Block-Info/Warteschlange,
  // unterbricht aber nie eine laufende Wiedergabe).
  useEffect(() => {
    const interval = setInterval(() => {
      refreshCurrent().then((data) => {
        if (data?.current && data.upcoming.length > 0 && upcoming.length === 0) {
          setUpcoming(data.upcoming);
        }
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [refreshCurrent, upcoming.length]);

  useEffect(() => {
    function handleUnload() {
      const item = currentRef.current;
      const audio = audioRef.current;
      if (!item || !audio || audio.paused) return;
      logPlayEvent(item, audio.currentTime, false, false);
    }
    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, [logPlayEvent]);

  if (!current) {
    return (
      <div className="mx-auto max-w-xl border border-line bg-surface p-8 text-center">
        <p className="text-ink-muted">
          Gerade läuft kein Programm. Das kann daran liegen, dass noch keine Musik hochgeladen
          wurde. Bitte später noch einmal vorbeischauen.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2fr_1fr]">
      <aside className="order-2 lg:order-1">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">
          Zuletzt gespielt
        </h2>
        <ul className="space-y-2 border-l-2 border-cyan pl-4 text-sm">
          {history.slice(0, 15).map((entry, i) => (
            <li key={`${entry.scheduleItemId}-${i}`} className="text-ink-muted">
              <span className="font-mono text-ink">{formatTime(entry.scheduledStart)}</span>{" "}
              {entry.artistName} – {entry.title}
            </li>
          ))}
          {history.length === 0 && <li className="text-ink-muted">Noch keine Historie.</li>}
        </ul>
      </aside>

      <section className="order-1 lg:order-2">
        <p className="mb-3 flex justify-center">
          <span className="border border-yellow bg-surface px-3 py-1 text-sm text-ink-muted">
            Jetzt: <span className="font-bold text-ink">{current.genreName}</span> — bis{" "}
            <span className="font-mono text-ink">{formatTime(current.blockEndsAt)}</span> Uhr
          </span>
        </p>

        {current.albumArtworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.albumArtworkUrl}
            alt={`Artwork: ${current.albumTitle}`}
            className="mx-auto mb-4 aspect-square w-full max-w-md border border-line object-cover"
          />
        ) : (
          <div className="mx-auto mb-4 flex aspect-square w-full max-w-md items-center justify-center border border-line bg-surface-alt text-ink-muted">
            Kein Artwork
          </div>
        )}

        <div className="mx-auto max-w-md border border-line bg-surface p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden border border-line bg-surface-alt">
              {current.artistPhotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.artistPhotoUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-bold text-ink">{current.title}</div>
              <div className="truncate text-sm text-ink-muted">
                {current.artistName} · {current.albumTitle}
              </div>
            </div>
          </div>

          {loadError && <p className="mb-2 text-xs text-magenta">{loadError}</p>}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handlePlayPause}
              className="border-2 border-ink bg-ink px-5 py-2 text-sm font-bold uppercase tracking-wide text-page hover:bg-surface-alt hover:text-ink"
            >
              {isPlaying ? "Pause" : hasStarted ? "Weiter" : "Play"}
            </button>
            <button
              onClick={handleSkip}
              disabled={!isPlaying && !hasStarted}
              className="border-2 border-line px-5 py-2 text-sm font-bold uppercase tracking-wide text-ink-muted hover:border-cyan hover:text-ink disabled:opacity-40"
            >
              Skip
            </button>
          </div>

          <audio
            ref={audioRef}
            onEnded={handleEnded}
            onError={handleAudioError}
            preload="none"
            className="hidden"
          />
        </div>

        <div className="mx-auto mt-4 flex max-w-md flex-col gap-3">
          <a
            href={current.artistMusicLink}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-magenta bg-surface px-4 py-2 text-center text-sm font-bold uppercase tracking-wide text-ink hover:bg-surface-alt"
          >
            Hier geht&apos;s zur Musik
          </a>
          {donationUrl && (
            <a
              href={donationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-cyan bg-surface px-4 py-2 text-center hover:bg-surface-alt"
            >
              <span className="block text-sm font-bold uppercase tracking-wide text-ink">
                Spenden
              </span>
              <span className="block text-xs text-ink-muted">
                Künstler*innen und Projekt unterstützen
              </span>
            </a>
          )}
        </div>

        {current.artistBio && (
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ink-muted">
            {current.artistBio}
          </p>
        )}
      </section>

      <div className="order-3 hidden lg:block" aria-hidden />
    </div>
  );
}
