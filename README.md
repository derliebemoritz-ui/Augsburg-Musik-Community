# Stadtradio Augsburg – lokales Musik-Webradio

Ein kuratiertes Online-Radio für Musik lokaler Künstler:innen. Es gibt genau
eine Admin-Person (dich), die alle Inhalte pflegt. Hörer:innen brauchen
keinen Account.

## Tech-Stack

- **Next.js** (App Router, TypeScript) – Frontend und Backend in einem Projekt
- **SQLite** als Datenbank (eine Datei), **Prisma** als ORM (mit einem
  SQLite-Treiber-Adapter, siehe `src/lib/db.ts`)
- Lokaler Dateispeicher für Audio/Bilder, gekapselt in `src/lib/storage.ts`
  (siehe Abschnitt "Speicher-Abstraktion" unten)
- **Docker + docker-compose** fürs Deployment, **Caddy** als Reverse-Proxy
  mit automatischem HTTPS
- Admin-Bereich unter `/admin` mit einfachem, passwortgeschütztem
  Session-Login (kein OAuth, kein Nutzer-System)

## Inhalt

1. [Ersteinrichtung (lokal)](#ersteinrichtung-lokal)
2. [Wie du neue Musik einpflegst](#wie-du-neue-musik-einpflegst)
3. [Die Sendeplan-Logik](#die-sendeplan-logik)
4. [Gewichtungs-Konstanten ändern](#gewichtungs-konstanten-ändern)
5. [Deployment auf dem VPS](#deployment-auf-dem-vps)
6. [Backups](#backups)
7. [Projektstruktur](#projektstruktur)
8. [Fehlerbehandlung / bekannte Grenzen](#fehlerbehandlung--bekannte-grenzen)

---

## Ersteinrichtung (lokal)

Voraussetzung: Node.js 22+.

```bash
npm install
cp .env.example .env
# .env öffnen und ADMIN_PASSWORD / SESSION_SECRET setzen
# SESSION_SECRET erzeugen mit: openssl rand -hex 32

npx prisma migrate dev   # legt prisma/dev.db an und wendet Migrationen an
npm run db:seed          # Beispiel-Künstler:innen, Alben, Tracks, Genres

npm run dev              # http://localhost:3000
```

Admin-Bereich: `http://localhost:3000/admin` (Passwort aus `.env`).

Das Seed-Skript (`prisma/seed.ts`) erzeugt seine eigenen
Platzhalter-Audiodateien (kurze Sinustöne) und -Bilder (einfarbige PNGs)
direkt im Code (`scripts/placeholders.ts`) – es werden keine externen
Assets benötigt, alles funktioniert offline.

## Wie du neue Musik einpflegst

Alles läuft über den Admin-Bereich (`/admin`), keine direkten
Datenbank-Eingriffe nötig:

1. **Künstler:in anlegen** (`/admin/artists/new`): Name, Foto, Bio-Text,
   Musik-Link (Spotify/Bandcamp/eigene Website).
2. **Album/Projekt anlegen** (`/admin/albums/new`): Titel, Artwork,
   Zuordnung zur Künstler:in. Auch ein Album mit nur einem Track (Single)
   ist ein normales Album.
3. **Track hochladen** (`/admin/tracks/new`): Titel, Audiodatei
   (MP3/WAV/OGG, max. 50 MB), Zuordnung zu Künstler:in/Album/Genre,
   **Rechte-Einverständnis** (Pflicht-Checkbox + Datum – ohne das lässt
   sich der Track nicht speichern). Die Dauer wird automatisch aus der
   Datei ausgelesen.
4. Neue **Genres** verwaltest du unter `/admin/genres` (anlegen, umbenennen,
   löschen – Löschen geht nur, wenn kein Track mehr dieses Genre nutzt).
5. Tracks lassen sich jederzeit **aktiv/inaktiv** schalten (z.B. um sie
   vorübergehend aus der Rotation zu nehmen, ohne sie zu löschen) und
   bekommen unter `/admin/tracks` einen **Sanktions-Multiplikator**
   (Default 1.0 – kleiner als 1 heißt "seltener spielen").

Bereits gestartete/gespielte Sendeplan-Einträge verhindern das Löschen von
Künstler:innen/Alben/Genres/Tracks, die darin vorkommen (Datenintegrität der
Historie). Stattdessen: Track auf "inaktiv" setzen.

## Die Sendeplan-Logik

- Das Programm läuft 24/7 in 2-Stunden-Blöcken, ein Genre pro Block.
- Jede Nacht wird der Plan für den kommenden Tag generiert: Die
  Reihenfolge der Genre-Blöcke wird gemischt, innerhalb jedes Blocks
  werden Tracks aus dem Genre-Pool gewichtet zufällig gezogen, bis die
  2 Stunden gefüllt sind.
- Generiert wird **lazy** (automatisch beim ersten Seitenaufruf des neuen
  Tages) **und** vorsorglich **stündlich** durch den `scheduler`-Container
  aus der `docker-compose.yml` (idempotent – tut nichts, wenn der Plan für
  den Tag schon existiert). Ein Ausfall des Cronjobs ist also unkritisch.
- Der generierte Plan wird persistiert (`ScheduleBlock` +
  `ScheduleItem`-Tabellen), damit alle Hörer:innen exakt dasselbe hören und
  die Historie stimmt.
- Ist der Pool eines ausgelosten Genres leer, springt ein anderes Genre mit
  verfügbaren Tracks ein (im Admin-Sendeplan als "Fallback" markiert). Ist
  der Pool eines Genres zu klein, um 2 Stunden zu füllen, werden Tracks
  wiederholt, statt die Sendung zu unterbrechen.
- Der **Skip-Button** im Player wirkt nur lokal für die eigene
  Hörer:innen-Session – der gemeinsame Sendeplan und die öffentliche
  Historie bleiben davon unberührt (echtes Live-Radio-Prinzip: beim Öffnen
  der Seite steigt man immer beim tatsächlich laufenden Song ein).

## Gewichtungs-Konstanten ändern

Alle einstellbaren Werte der Gewichtungsformel liegen zentral in
**`src/lib/config.ts`** (`weightingConfig`), nicht verstreut im Code:

| Konstante | Bedeutung | Default |
|---|---|---|
| `newTrackMonths` / `newTrackFactor` | Track gilt als "neu", wenn Upload jünger als X Monate; Faktor dafür | 3 Monate / ×1.3 |
| `minPlaysForRanking` | Ab wie vielen Plays ein Track in die Skip-/Completion-Rankings einfließt | 15 |
| `rankingTopPercentile` | "Top X %"-Schwelle für die Rankings | 30 % |
| `highSkipRateFactor` | Faktor für Tracks in den Top X % nach Skip-Quote | ×0.5 |
| `highCompletionRateFactor` | Faktor für Tracks in den Top X % nach Completion-Quote | ×1.1 |

Die Rankings basieren auf **Quoten** (Skips ÷ Gesamt-Plays), nicht auf
absoluten Zahlen, damit ältere Tracks nicht systematisch benachteiligt
oder bevorzugt werden. Der manuelle Sanktions-Multiplikator wird pro Track
im Admin-Bereich gesetzt und zusätzlich multiplikativ verrechnet.

Block-Dauer und Zeitzone stehen in derselben Datei unter `scheduleConfig`.
Änderungen wirken sich ab der nächsten Sendeplan-Generierung aus (der
laufende Tag wird nicht rückwirkend verändert).

## Deployment auf dem VPS

Voraussetzung: Docker + Docker Compose auf dem Server, eine Domain, die auf
den Server zeigt (für automatisches HTTPS über Caddy/Let's Encrypt).

```bash
git clone <dein-repo-url> stadtradio && cd stadtradio

cp .env.production.example .env.production
# ADMIN_PASSWORD und SESSION_SECRET setzen (openssl rand -hex 32),
# DONATION_URL anpassen

# Domain in der Caddyfile eintragen (Zeile mit "radio.beispiel-domain.de")
$EDITOR Caddyfile

docker compose up -d --build
```

Das war's: `docker compose up` baut das Image, wendet beim Start automatisch
die Datenbank-Migrationen an (`docker/entrypoint.sh`), startet die
Next.js-Anwendung, den stündlichen Sendeplan-Scheduler und Caddy mit
automatischem HTTPS.

Datenbank und Uploads liegen im benannten Docker-Volume `musikradio_data`
(nicht im Container selbst) – ein `docker compose down` löscht sie also
nicht.

**Musik einpflegen** funktioniert danach genauso wie lokal, einfach über
`https://deine-domain.de/admin`.

**Logs ansehen:** `docker compose logs -f app`
**Update einspielen:** `git pull && docker compose up -d --build`

## Backups

```bash
./scripts/backup.sh                 # sichert nach ./backups/
./scripts/backup.sh /pfad/anderswo  # optionales Zielverzeichnis
```

Das Skript sichert das komplette Docker-Volume (SQLite-Datenbank **und**
Upload-Ordner) in ein datiertes `.tar.gz`-Archiv. Für automatische, tägliche
Backups z.B. per Cronjob auf dem VPS eintragen (`crontab -e`):

```
0 3 * * * cd /pfad/zum/projekt && ./scripts/backup.sh >> backups/backup.log 2>&1
```

Wiederherstellen (siehe auch Kommentar im Skript):

```bash
docker compose down
docker run --rm -v musikradio_data:/data -v "$(pwd)/backups":/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/musikradio-backup-<Datum>.tar.gz -C /data"
docker compose up -d
```

## Projektstruktur

```
prisma/schema.prisma       Datenmodell (Artist, Album, Genre, Track, ScheduleBlock/Item, PlayEvent)
prisma/seed.ts              Beispiel-Datensätze für lokale Entwicklung
src/lib/config.ts           Zentrale Konfiguration (Gewichtung, Uploads, Zeitzone, Spendenlink)
src/lib/db.ts                Prisma-Client (SQLite-Treiber-Adapter)
src/lib/storage.ts           Speicher-Abstraktion für Audio/Bilder (lokal, S3-fähig vorbereitet)
src/lib/auth.ts              Admin-Session (signiertes Cookie, Passwort aus ADMIN_PASSWORD)
src/lib/scheduling/          Sendeplan-Generierung, Gewichtungsformel, Zeit-/Statistik-Helfer
src/lib/actions/             Server Actions für den Admin-Bereich (Create/Update/Delete)
src/app/                     Next.js App Router: öffentliche Player-Seite + /admin + API-Routen
src/proxy.ts                 Schützt /admin und /api/admin (Next.js "Proxy", vormals Middleware)
scripts/generate-schedule.ts Cronjob-Skript: generiert den Plan für den kommenden Tag
scripts/backup.sh            Backup-Skript
```

### Speicher-Abstraktion (für spätere Cloud-Migration)

Audio- und Bilddateien werden nie direkt über Dateipfade angesprochen,
sondern ausschließlich über `src/lib/storage.ts` (`StorageBackend`-
Interface: `save`, `read`, `delete`, `exists`, `getPublicUrl`). Aktuell gibt
es nur `LocalStorage` (Dateisystem, Pfad über `STORAGE_DIR`). Ein Umzug auf
S3-kompatiblen Speicher (z.B. für mehr Redundanz) bedeutet: eine neue Klasse
mit demselben Interface schreiben und in `getStorage()` einsetzen – der
Rest der Anwendung (Upload-Formulare, Player, Admin-UI) muss nicht
angefasst werden.

## Fehlerbehandlung / bekannte Grenzen

- **Leerer Genre-Pool** bei der Sendeplan-Generierung: Ein anderes Genre
  mit verfügbaren Tracks springt ein (im Sendeplan als "Fallback"
  markiert). Ist die gesamte Mediathek leer, wird kein Sendeplan erzeugt –
  die Startseite zeigt dann einen freundlichen Hinweis statt abzustürzen.
- **Fehlende/kaputte Audiodatei** beim Abspielen: Der Player versucht
  einmalig, zum nächsten Track zu wechseln; scheitert das erneut, wird die
  Wiedergabe angehalten und ein Hinweistext angezeigt statt eines
  hängenden Players.
- **Historie/Sendeplan-Anzeige:** Datenbankfehler beim Laden des aktuellen
  Sendeplans werden abgefangen (Player zeigt "kein Programm verfügbar"),
  statt die ganze Seite zum Absturz zu bringen.
- Die im Player getroffene Skip-Entscheidung ist bewusst **nur lokal** für
  die eigene Session wirksam – siehe Abschnitt "Sendeplan-Logik".
