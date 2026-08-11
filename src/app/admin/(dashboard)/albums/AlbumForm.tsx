import Image from "next/image";
import { getStorage } from "@/lib/storage";

export default function AlbumForm({
  action,
  artists,
  defaultValues,
  artworkPath,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  artists: { id: string; name: string }[];
  defaultValues?: { title: string; artistId: string };
  artworkPath?: string | null;
  submitLabel: string;
}) {
  const storage = getStorage();

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
          defaultValue={defaultValues?.artistId}
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
        <label className="mb-1 block text-sm font-medium text-ink-muted" htmlFor="artwork">
          Artwork
        </label>
        {artworkPath && (
          <div className="relative mb-2 h-24 w-24 overflow-hidden bg-surface-alt">
            <Image src={storage.getPublicUrl(artworkPath)} alt="" fill className="object-cover" />
          </div>
        )}
        <input
          id="artwork"
          name="artwork"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm"
        />
      </div>

      <button
        type="submit"
        className="bg-ink px-4 py-2 text-sm font-medium text-page hover:bg-surface-alt hover:text-ink"
      >
        {submitLabel}
      </button>
    </form>
  );
}
