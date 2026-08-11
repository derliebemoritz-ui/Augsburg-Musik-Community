"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth, ActionError, ok, fail } from "./shared";
import { saveImageUpload, deleteStoredFile } from "./uploads";

const artistSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich.").max(200),
  bio: z.string().trim().max(5000).default(""),
  musicLink: z.url("Bitte eine gültige URL angeben."),
});

export async function createArtist(formData: FormData) {
  await requireAuth();
  const parsed = artistSchema.parse({
    name: formData.get("name"),
    bio: formData.get("bio") ?? "",
    musicLink: formData.get("musicLink"),
  });

  const photo = formData.get("photo");
  let photoPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    photoPath = await saveImageUpload(photo, "images/artists");
  }

  const artist = await prisma.artist.create({
    data: { ...parsed, photoPath },
  });

  revalidatePath("/admin/artists");
  redirect(`/admin/artists/${artist.id}`);
}

export async function updateArtist(id: string, formData: FormData) {
  await requireAuth();
  const parsed = artistSchema.parse({
    name: formData.get("name"),
    bio: formData.get("bio") ?? "",
    musicLink: formData.get("musicLink"),
  });

  const existing = await prisma.artist.findUniqueOrThrow({ where: { id } });

  const photo = formData.get("photo");
  let photoPath = existing.photoPath;
  if (photo instanceof File && photo.size > 0) {
    photoPath = await saveImageUpload(photo, "images/artists");
    await deleteStoredFile(existing.photoPath);
  }

  await prisma.artist.update({ where: { id }, data: { ...parsed, photoPath } });

  revalidatePath("/admin/artists");
  revalidatePath(`/admin/artists/${id}`);
  redirect(`/admin/artists/${id}`);
}

export async function deleteArtist(id: string) {
  await requireAuth();
  try {
    const trackCount = await prisma.track.count({ where: { artistId: id } });
    const albumCount = await prisma.album.count({ where: { artistId: id } });
    if (trackCount > 0 || albumCount > 0) {
      throw new ActionError(
        `Künstler:in kann nicht gelöscht werden: ${albumCount} Album/Alben und ${trackCount} Track(s) sind noch zugeordnet.`
      );
    }
    const artist = await prisma.artist.delete({ where: { id } });
    await deleteStoredFile(artist.photoPath);
    revalidatePath("/admin/artists");
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}
