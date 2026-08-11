import Image from "next/image";
import { getStorage } from "@/lib/storage";

export default function ArtistForm({
  action,
  defaultValues,
  photoPath,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: { name: string; bio: string; musicLink: string };
  photoPath?: string | null;
  submitLabel: string;
}) {
  const storage = getStorage();

  return (
    <form action={action} className="max-w-xl space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="bio">
          Bio-Text
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={5}
          defaultValue={defaultValues?.bio}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="musicLink">
          Musik-Link (&bdquo;Hier geht&apos;s zur Musik&ldquo; - Spotify, Bandcamp, Website, …)
        </label>
        <input
          id="musicLink"
          name="musicLink"
          type="url"
          required
          defaultValue={defaultValues?.musicLink}
          placeholder="https://…"
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="photo">
          Künstler:innenfoto
        </label>
        {photoPath && (
          <div className="relative mb-2 h-24 w-24 overflow-hidden rounded-full bg-neutral-200">
            <Image src={storage.getPublicUrl(photoPath)} alt="" fill className="object-cover" />
          </div>
        )}
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm"
        />
      </div>

      <button
        type="submit"
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}
