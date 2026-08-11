"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth, ActionError, ok, fail } from "./shared";
import { saveImageUpload, deleteStoredFile } from "./uploads";

const albumSchema = z.object({
  title: z.string().trim().min(1, "Titel ist erforderlich.").max(200),
  artistId: z.string().trim().min(1, "Künstler:in ist erforderlich."),
});

export async function createAlbum(formData: FormData) {
  await requireAuth();
  const parsed = albumSchema.parse({
    title: formData.get("title"),
    artistId: formData.get("artistId"),
  });

  const artwork = formData.get("artwork");
  let artworkPath: string | null = null;
  if (artwork instanceof File && artwork.size > 0) {
    artworkPath = await saveImageUpload(artwork, "images/albums");
  }

  const album = await prisma.album.create({ data: { ...parsed, artworkPath } });

  revalidatePath("/admin/albums");
  redirect(`/admin/albums/${album.id}`);
}

export async function updateAlbum(id: string, formData: FormData) {
  await requireAuth();
  const parsed = albumSchema.parse({
    title: formData.get("title"),
    artistId: formData.get("artistId"),
  });

  const existing = await prisma.album.findUniqueOrThrow({ where: { id } });

  const artwork = formData.get("artwork");
  let artworkPath = existing.artworkPath;
  if (artwork instanceof File && artwork.size > 0) {
    artworkPath = await saveImageUpload(artwork, "images/albums");
    await deleteStoredFile(existing.artworkPath);
  }

  await prisma.album.update({ where: { id }, data: { ...parsed, artworkPath } });

  revalidatePath("/admin/albums");
  revalidatePath(`/admin/albums/${id}`);
  redirect(`/admin/albums/${id}`);
}

export async function deleteAlbum(id: string) {
  await requireAuth();
  try {
    const trackCount = await prisma.track.count({ where: { albumId: id } });
    if (trackCount > 0) {
      throw new ActionError(
        `Album kann nicht gelöscht werden: ${trackCount} Track(s) sind noch zugeordnet.`
      );
    }
    const album = await prisma.album.delete({ where: { id } });
    await deleteStoredFile(album.artworkPath);
    revalidatePath("/admin/albums");
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}
