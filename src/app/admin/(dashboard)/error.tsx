"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl border border-red-300 bg-red-50 p-6">
      <h1 className="mb-2 text-lg font-semibold text-red-800">Etwas ist schiefgelaufen</h1>
      <p className="mb-4 text-sm text-red-700">{error.message || "Unbekannter Fehler."}</p>
      <button
        onClick={reset}
        className="border border-red-300 bg-surface px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
