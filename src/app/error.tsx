"use client";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="max-w-md rounded-lg border border-neutral-300 bg-white p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold text-neutral-900">
          Puh, da ist etwas schiefgelaufen
        </h1>
        <p className="mb-4 text-sm text-neutral-600">
          Das Radio ist gerade nicht erreichbar. Bitte versuche es in ein paar Minuten noch
          einmal.
        </p>
        <button
          onClick={reset}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
