"use client";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="max-w-md border border-line bg-surface p-8 text-center">
        <h1 className="mb-2 text-lg font-bold text-ink">Fehler</h1>
        <p className="mb-4 text-sm text-ink-muted">
          Das Radio ist gerade nicht erreichbar. Bitte versuche es in ein paar Minuten noch
          einmal.
        </p>
        <button
          onClick={reset}
          className="border-2 border-ink bg-ink px-4 py-2 text-sm font-bold uppercase tracking-wide text-page hover:bg-surface-alt hover:text-ink"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
