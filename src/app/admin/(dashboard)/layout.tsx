import Link from "next/link";
import LogoutButton from "./LogoutButton";

// Der gesamte Admin-Bereich liest bei jedem Aufruf live aus der Datenbank
// und ist außerdem passwortgeschützt - statisches Prerendering zur Build-
// Zeit würde eingefrorene (und öffentlich unauthentifizierte) Daten liefern.
export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/admin", label: "Übersicht" },
  { href: "/admin/artists", label: "Künstler:innen" },
  { href: "/admin/albums", label: "Alben" },
  { href: "/admin/tracks", label: "Tracks" },
  { href: "/admin/genres", label: "Genres" },
  { href: "/admin/schedule", label: "Sendeplan" },
  { href: "/admin/history", label: "Historie" },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-ink">Radio-Verwaltung</span>
            <nav className="flex flex-wrap gap-4 text-sm">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-ink-muted hover:text-cyan hover:underline"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-ink-muted hover:underline">
              Zur Radio-Seite
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
