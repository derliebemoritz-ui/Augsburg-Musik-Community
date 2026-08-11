import { createArtist } from "@/lib/actions/artists";
import ArtistForm from "../ArtistForm";

export default function NewArtistPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Neue Künstler:in anlegen</h1>
      <ArtistForm action={createArtist} submitLabel="Anlegen" />
    </div>
  );
}
