"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, ok, fail, ActionError, type ActionResult } from "./shared";

const nameSchema = z.string().trim().min(1, "Name darf nicht leer sein.").max(100);

export async function createGenre(name: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
    const parsed = nameSchema.parse(name);
    const existing = await prisma.genre.findUnique({ where: { name: parsed } });
    if (existing) {
      throw new ActionError(`Genre "${parsed}" existiert bereits.`);
    }
    const genre = await prisma.genre.create({ data: { name: parsed } });
    revalidatePath("/admin/genres");
    return ok({ id: genre.id });
  } catch (err) {
    return fail(err);
  }
}

export async function renameGenre(id: string, name: string): Promise<ActionResult> {
  try {
    await requireAuth();
    const parsed = nameSchema.parse(name);
    const existing = await prisma.genre.findUnique({ where: { name: parsed } });
    if (existing && existing.id !== id) {
      throw new ActionError(`Genre "${parsed}" existiert bereits.`);
    }
    await prisma.genre.update({ where: { id }, data: { name: parsed } });
    revalidatePath("/admin/genres");
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

export async function deleteGenre(id: string): Promise<ActionResult> {
  try {
    await requireAuth();
    const tracksUsingGenre = await prisma.track.count({ where: { genreId: id } });
    if (tracksUsingGenre > 0) {
      throw new ActionError(
        `Genre kann nicht gelöscht werden: ${tracksUsingGenre} Track(s) sind noch zugeordnet. Bitte zuerst Tracks umverteilen.`
      );
    }
    const blocksUsingGenre = await prisma.scheduleBlock.count({ where: { genreId: id } });
    if (blocksUsingGenre > 0) {
      throw new ActionError(
        "Genre kann nicht gelöscht werden: es ist noch im (auch historischen) Sendeplan referenziert."
      );
    }
    await prisma.genre.delete({ where: { id } });
    revalidatePath("/admin/genres");
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}
