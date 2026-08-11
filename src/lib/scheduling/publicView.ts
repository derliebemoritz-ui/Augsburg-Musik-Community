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

export function serializeCurrentItem(item: CurrentScheduleItem): PublicCurrentItem {
  const storage = getStorage();
  return {
    scheduleItemId: item.id,
    trackId: item.track.id,
    title: item.track.title,
    artistName: item.track.artist.name,
    artistPhotoUrl: item.track.artist.photoPath ? storage.getPublicUrl(item.track.artist.photoPath) : null,
    artistBio: item.track.artist.bio,
    artistMusicLink: item.track.artist.musicLink,
    albumTitle: item.track.album.title,
    albumArtworkUrl: item.track.album.artworkPath ? storage.getPublicUrl(item.track.album.artworkPath) : null,
    genreName: item.block.genre.name,
    scheduledStart: item.scheduledStart.toISOString(),
    scheduledEnd: item.scheduledEnd.toISOString(),
    blockEndsAt: item.block.endTime.toISOString(),
    audioUrl: storage.getPublicUrl(item.track.audioPath),
    durationSeconds: item.track.durationSeconds,
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
  scheduledStart: Date;
  track: { title: string; artist: { name: string } };
}): PublicUpcomingItem {
  return {
    scheduleItemId: item.id,
    title: item.track.title,
    artistName: item.track.artist.name,
    scheduledStart: item.scheduledStart.toISOString(),
  };
}

export type PublicHistoryItem = {
  scheduleItemId: string;
  title: string;
  artistName: string;
  scheduledStart: string;
};

export function serializeHistoryItem(item: {
  id: string;
  scheduledStart: Date;
  track: { title: string; artist: { name: string } };
}): PublicHistoryItem {
  return {
    scheduleItemId: item.id,
    title: item.track.title,
    artistName: item.track.artist.name,
    scheduledStart: item.scheduledStart.toISOString(),
  };
}
