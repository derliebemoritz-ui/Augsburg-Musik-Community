"use client";

import { useState } from "react";

type Artist = { id: string; name: string; albums: { id: string; title: string }[] };
type Genre = { id: string; name: string };

export default function TrackForm({
  action,
  artists,
  genres,
  defaultValues,
  audioUrl,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  artists: Artist[];
  genres: Genre[];
  defaultValues?: {
    title: string;
    artistId: string;
    albumId: string;
    genreId: string;
    sanctionMultiplier: number;
    consentGiven: boolean;
    consentDate: string;
  };
  audioUrl?: string | null;
  submitLabel: string;
}) {
  const [artistId, setArtistId] = useState(defaultValues?.artistId ?? "");
  const selectedArtist = artists.find((a) => a.id === artistId);

  return (
    <form action={action} className="max-w-xl space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="title">
          Titel
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title}
          className="w-full border border-line px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="artistId">
          Künstler:in
        </label>
        <select
          id="artistId"
          name="artistId"
          required
          value={artistId}
          onChange={(e) => setArtistId(e.target.value)}
          className="w-full border border-line bg-surface px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        >
          <option value="" disabled>
            Bitte wählen…
          </option>
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="albumId">
          Album
        </label>
        <select
          id="albumId"
          name="albumId"
          required
          defaultValue={defaultValues?.albumId}
          disabled={!selectedArtist}
          className="w-full border border-line bg-surface px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan disabled:bg-surface-alt"
        >
          <option value="" disabled>
            {selectedArtist ? "Bitte wählen…" : "Erst Künstler:in wählen"}
          </option>
          {selectedArtist?.albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
            </option>
          ))}
        </select>
        {selectedArtist && selectedArtist.albums.length === 0 && (
          <p className="mt-1 text-xs text-ink-muted">
            Diese Künstler:in hat noch kein Album - bitte zuerst eines anlegen.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="genreId">
          Genre
        </label>
        <select
          id="genreId"
          name="genreId"
          required
          defaultValue={defaultValues?.genreId}
          className="w-full border border-line bg-surface px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        >
          <option value="" disabled>
            Bitte wählen…
          </option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="sanctionMultiplier">
          Sanktions-Multiplikator
        </label>
        <input
          id="sanctionMultiplier"
          name="sanctionMultiplier"
          type="number"
          step="0.1"
          min="0"
          max="5"
          defaultValue={defaultValues?.sanctionMultiplier ?? 1.0}
          className="w-24 border border-line px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        />
        <p className="mt-1 text-xs text-ink-muted">Default 1.0. Kleiner als 1 = seltener spielen.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="audio">
          Audiodatei {audioUrl ? "(ersetzen, optional)" : "(MP3, WAV oder OGG, max. 50 MB)"}
        </label>
        {audioUrl && <audio controls src={audioUrl} className="mb-2 w-full" />}
        <input
          id="audio"
          name="audio"
          type="file"
          accept="audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg"
          required={!audioUrl}
          className="w-full text-sm"
        />
      </div>

      <fieldset className="border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink-muted">Rechte-Einverständnis</legend>
        <label className="mb-3 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="consentGiven"
            required
            defaultChecked={defaultValues?.consentGiven}
            className="h-4 w-4"
          />
          Einverständnis der Künstler:in liegt vor
        </label>
        <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="consentDate">
          Datum des Einverständnisses
        </label>
        <input
          id="consentDate"
          name="consentDate"
          type="date"
          required
          defaultValue={defaultValues?.consentDate}
          className="border border-line px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        />
      </fieldset>

      <button
        type="submit"
        className="bg-ink px-4 py-2 text-sm font-medium text-page hover:bg-surface-alt hover:text-ink"
      >
        {submitLabel}
      </button>
    </form>
  );
}
