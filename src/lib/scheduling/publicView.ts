import { getStorage } from "@/lib/storage";
import type { CurrentScheduleItem } from "./query";

export type PublicCurrentItem = {
  scheduleItemId: string;
  trackId: string;
  title: string;
  artistName: string;
  artistPhotoUrl: string | null;
  artistBio: string;
  artistMusicLink: string;
  albumTitle: string;
  albumArtworkUrl: string | null;
  genreName: string;
  scheduledStart: string;
  scheduledEnd: string;
  blockEndsAt: string;
  audioUrl: string;
  durationSeconds: number;
};

/**
 * Baut die Live-Wiedergabedaten. Setzt voraus, dass der zugehörige Track
 * noch existiert (Aufrufer müssen vorher nach `trackId: { not: null } `
 * filtern, siehe `getCurrentScheduleItem`/`getUpcomingItems`) - ohne Track
 * gibt es keine Audiodatei, Künstlerfoto etc. zum Abspielen.
 */
export function serializeCurrentItem(item: CurrentScheduleItem): PublicCurrentItem {
  const storage = getStorage();
  const track = item.track;
  if (!track) {
    throw new Error(
      `ScheduleItem ${item.id} hat keinen Track mehr - serializeCurrentItem darf hier nicht aufgerufen werden.`
    );
  }
  return {
    scheduleItemId: item.id,
    trackId: track.id,
    // Titel/Künstler:in/Album kommen bewusst vom Snapshot (item.*Title/Name),
    // nicht von der Live-Track-Relation - konsistent mit Historie/Statistik,
    // auch falls der Track nachträglich umbenannt wurde.
    title: item.trackTitle,
    artistName: item.artistName,
    artistPhotoUrl: track.artist.photoPath ? storage.getPublicUrl(track.artist.photoPath) : null,
    artistBio: track.artist.bio,
    artistMusicLink: track.artist.musicLink,
    albumTitle: item.albumTitle,
    albumArtworkUrl: track.album.artworkPath ? storage.getPublicUrl(track.album.artworkPath) : null,
    genreName: item.block.genre.name,
    scheduledStart: item.scheduledStart.toISOString(),
    scheduledEnd: item.scheduledEnd.toISOString(),
    blockEndsAt: item.block.endTime.toISOString(),
    audioUrl: storage.getPublicUrl(track.audioPath),
    durationSeconds: track.durationSeconds,
  };
}

export type PublicUpcomingItem = {
  scheduleItemId: string;
  title: string;
  artistName: string;
  scheduledStart: string;
};

export function serializeUpcomingItem(item: {
  id: string;
  trackTitle: string;
  artistName: string;
  scheduledStart: Date;
}): PublicUpcomingItem {
  return {
    scheduleItemId: item.id,
    title: item.trackTitle,
    artistName: item.artistName,
    scheduledStart: item.scheduledStart.toISOString(),
  };
}

export type PublicHistoryItem = {
  scheduleItemId: string;
  title: string;
  artistName: string;
  scheduledStart: string;
};

/** Historie zeigt immer den Snapshot-Namen - bleibt korrekt, auch wenn der
 *  Track inzwischen gelöscht wurde. */
export function serializeHistoryItem(item: {
  id: string;
  trackTitle: string;
  artistName: string;
  scheduledStart: Date;
}): PublicHistoryItem {
  return {
    scheduleItemId: item.id,
    title: item.trackTitle,
    artistName: item.artistName,
    scheduledStart: item.scheduledStart.toISOString(),
  };
}
