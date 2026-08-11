/**
 * Seed-Skript mit Beispiel-Datensätzen für die lokale Entwicklung.
 *
 * Erzeugt die fünf Start-Genres, ein paar fiktive Künstler:innen mit Alben
 * und Tracks (inkl. selbst erzeugter Platzhalter-Audiodateien und -Bilder,
 * ganz ohne externe Assets), sowie ein paar Beispiel-PlayEvents, damit die
 * Gewichtungs-/Statistik-Logik direkt sichtbar wird.
 *
 * Aufruf: npm run db:seed
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { createSolidPng, createSineWav } from "../scripts/placeholders";

const START_GENRES = [
  "Hip Hop",
  "Indie Rock",
  "Hard Rock/Punk",
  "Pop/Hyperpop",
  "Elektronische Musik",
] as const;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function seedGenres() {
  const genres: Record<string, string> = {};
  for (const name of START_GENRES) {
    const genre = await prisma.genre.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    genres[name] = genre.id;
  }
  console.log(`Genres angelegt: ${START_GENRES.join(", ")}`);
  return genres;
}

type ArtistSeed = {
  name: string;
  bio: string;
  musicLink: string;
  color: [number, number, number];
  albumTitle: string;
  genre: (typeof START_GENRES)[number];
  tracks: { title: string; frequencyHz: number; durationSeconds: number; uploadedDaysAgo: number; sanctionMultiplier?: number }[];
};

const ARTISTS: ArtistSeed[] = [
  {
    name: "Fuggerei Beats",
    bio: "Hip-Hop-Trio aus der Augsburger Innenstadt. Textet auf Deutsch über das Leben zwischen Fuggerei und Bahnhofsviertel, produziert alle Beats selbst im Proberaum-Keller.",
    musicLink: "https://example.com/fuggerei-beats",
    color: [214, 88, 62],
    albumTitle: "Zwischen den Gassen",
    genre: "Hip Hop",
    tracks: [
      { title: "Gassenhauer", frequencyHz: 220, durationSeconds: 165, uploadedDaysAgo: 20 },
      { title: "Nachtschicht Augsburg", frequencyHz: 196, durationSeconds: 188, uploadedDaysAgo: 400 },
    ],
  },
  {
    name: "Lech Ufer",
    bio: "Vierköpfige Indie-Rock-Band, benannt nach dem Fluss, an dem sie ihre ersten Songs geschrieben haben. Verträumte Gitarren, treibende Rhythmen.",
    musicLink: "https://example.com/lech-ufer",
    color: [70, 130, 150],
    albumTitle: "Uferlos",
    genre: "Indie Rock",
    tracks: [
      { title: "Novemberlicht", frequencyHz: 261, durationSeconds: 210, uploadedDaysAgo: 45 },
      { title: "Stromabwärts", frequencyHz: 293, durationSeconds: 197, uploadedDaysAgo: 500 },
    ],
  },
  {
    name: "Rote Tor Rebellion",
    bio: "Drei Freund:innen, drei Akkorde, sehr viel Lautstärke. Seit 2019 auf jeder kleinen Bühne der Stadt zu finden.",
    musicLink: "https://example.com/rote-tor-rebellion",
    color: [180, 40, 40],
    albumTitle: "Lärm für Alle",
    genre: "Hard Rock/Punk",
    tracks: [
      { title: "Kurz vor Toresschluss", frequencyHz: 110, durationSeconds: 142, uploadedDaysAgo: 10 },
      {
        title: "Sperrstunde",
        frequencyHz: 130,
        durationSeconds: 155,
        uploadedDaysAgo: 250,
        sanctionMultiplier: 0.7,
      },
    ],
  },
  {
    name: "Perlach Glow",
    bio: "Solo-Projekt zwischen Pop und Hyperpop, entstanden im Homestudio im Augsburger Osten. Bunte Synths, große Hooks.",
    musicLink: "https://example.com/perlach-glow",
    color: [230, 90, 200],
    albumTitle: "Glow Mode",
    genre: "Pop/Hyperpop",
    tracks: [
      { title: "Glow Mode An", frequencyHz: 349, durationSeconds: 150, uploadedDaysAgo: 5 },
      { title: "Zuckerwatte", frequencyHz: 392, durationSeconds: 168, uploadedDaysAgo: 320 },
    ],
  },
  {
    name: "Kongress Signal",
    bio: "Elektronische Klänge inspiriert vom Kongress am Park. Minimal, hypnotisch, gemacht für lange Nächte.",
    musicLink: "https://example.com/kongress-signal",
    color: [60, 190, 160],
    albumTitle: "Frequenzen",
    genre: "Elektronische Musik",
    tracks: [
      { title: "Signalrauschen", frequencyHz: 440, durationSeconds: 240, uploadedDaysAgo: 60 },
      { title: "Park bei Nacht", frequencyHz: 415, durationSeconds: 225, uploadedDaysAgo: 600 },
    ],
  },
];

async function seedArtists(genreIds: Record<string, string>) {
  const storage = getStorage();
  const createdTracks: { id: string; title: string }[] = [];

  for (const artistSeed of ARTISTS) {
    const artistPhotoKey = `images/artists/${crypto.randomUUID()}.png`;
    await storage.save(artistPhotoKey, createSolidPng(400, 400, artistSeed.color));

    const artist = await prisma.artist.create({
      data: {
        name: artistSeed.name,
        bio: artistSeed.bio,
        musicLink: artistSeed.musicLink,
        photoPath: artistPhotoKey,
      },
    });

    const albumArtworkKey = `images/albums/${crypto.randomUUID()}.png`;
    await storage.save(
      albumArtworkKey,
      createSolidPng(600, 600, artistSeed.color.map((c) => Math.min(255, c + 30)) as [number, number, number])
    );

    const album = await prisma.album.create({
      data: {
        title: artistSeed.albumTitle,
        artworkPath: albumArtworkKey,
        artistId: artist.id,
      },
    });

    for (const trackSeed of artistSeed.tracks) {
      const audioKey = `audio/${crypto.randomUUID()}.wav`;
      const wav = createSineWav(trackSeed.durationSeconds, trackSeed.frequencyHz);
      await storage.save(audioKey, wav);

      const track = await prisma.track.create({
        data: {
          title: trackSeed.title,
          audioPath: audioKey,
          durationSeconds: trackSeed.durationSeconds,
          artistId: artist.id,
          albumId: album.id,
          genreId: genreIds[artistSeed.genre],
          uploadedAt: daysAgo(trackSeed.uploadedDaysAgo),
          active: true,
          sanctionMultiplier: trackSeed.sanctionMultiplier ?? 1.0,
          consentGiven: true,
          consentDate: daysAgo(trackSeed.uploadedDaysAgo),
        },
      });
      createdTracks.push({ id: track.id, title: track.title });
    }

    console.log(`Artist "${artist.name}" mit Album "${album.title}" und ${artistSeed.tracks.length} Track(s) angelegt.`);
  }

  return createdTracks;
}

/** Erzeugt ein paar Beispiel-PlayEvents, damit Skip-/Completion-Quoten und
 *  die Top-30%-Rankings in der Admin-Statistik direkt etwas anzeigen. */
async function seedPlayEvents(tracks: { id: string; title: string }[]) {
  if (tracks.length < 2) return;

  const heavySkipTrack = tracks[0]; // wird viel geskippt -> Gewicht sollte sinken
  const heavyCompletionTrack = tracks[1]; // wird viel zu Ende gehört -> Gewicht sollte steigen

  const events: { trackId: string; listenedSeconds: number; completed: boolean; skipped: boolean; playedAt: Date }[] = [];

  for (let i = 0; i < 20; i++) {
    const skipped = i % 5 !== 0; // 80% Skip-Quote
    events.push({
      trackId: heavySkipTrack.id,
      listenedSeconds: skipped ? 15 : 150,
      completed: !skipped,
      skipped,
      playedAt: daysAgo(i),
    });
  }

  for (let i = 0; i < 20; i++) {
    const completed = i % 5 !== 0; // 80% Completion-Quote
    events.push({
      trackId: heavyCompletionTrack.id,
      listenedSeconds: completed ? 200 : 30,
      completed,
      skipped: !completed,
      playedAt: daysAgo(i),
    });
  }

  await prisma.playEvent.createMany({ data: events });
  console.log(
    `Beispiel-PlayEvents erzeugt für "${heavySkipTrack.title}" (hohe Skip-Quote) und "${heavyCompletionTrack.title}" (hohe Completion-Quote).`
  );
}

async function main() {
  const genreIds = await seedGenres();
  const tracks = await seedArtists(genreIds);
  await seedPlayEvents(tracks);
  console.log("Seed abgeschlossen.");
}

main()
  .catch((err) => {
    console.error("Fehler beim Seeding:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
