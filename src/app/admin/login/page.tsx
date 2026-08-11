"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Anmeldung fehlgeschlagen.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Verbindung zum Server fehlgeschlagen.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-line bg-surface p-8"
      >
        <h1 className="mb-1 text-xl font-semibold text-ink">Admin-Login</h1>
        <p className="mb-6 text-sm text-ink-muted">
          Zugang zum Verwaltungsbereich des Webradios.
        </p>
        <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="password">
          Passwort
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full border border-line px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        />
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="w-full bg-ink px-4 py-2 text-sm font-medium text-page transition hover:bg-surface-alt hover:text-ink disabled:opacity-50"
        >
          {loading ? "Anmelden…" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
