"use server";

import { z } from "zod";
import { parseBuffer } from "music-metadata";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStorage, generateStorageKey } from "@/lib/storage";
import { uploadConfig } from "@/lib/config";
import { requireAuth, ActionError, ok, fail, type ActionResult } from "./shared";
import { deleteStoredFile } from "./uploads";

const trackMetaSchema = z.object({
  title: z.string().trim().min(1, "Titel ist erforderlich.").max(200),
  artistId: z.string().trim().min(1, "Künstler:in ist erforderlich."),
  albumId: z.string().trim().min(1, "Album ist erforderlich."),
  genreId: z.string().trim().min(1, "Genre ist erforderlich."),
  sanctionMultiplier: z.coerce.number().min(0, "Muss 0 oder größer sein.").max(5, "Maximal 5."),
  consentGiven: z.coerce.boolean(),
  consentDate: z.string().trim().min(1, "Datum des Einverständnisses ist erforderlich."),
});

async function saveAudioAndExtractDuration(file: File): Promise<{ audioPath: string; durationSeconds: number }> {
  const ext = ("." + (file.name.split(".").pop() || "")).toLowerCase();
  const mimeOk = (uploadConfig.allowedAudioMimeTypes as readonly string[]).includes(file.type);
  const extOk = (uploadConfig.allowedAudioExtensions as readonly string[]).includes(ext);
  if (!mimeOk && !extOk) {
    throw new ActionError(
      `Nicht unterstütztes Audioformat "${file.type || ext}". Erlaubt: ${uploadConfig.allowedAudioExtensions.join(", ")}.`
    );
  }
  if (file.size > uploadConfig.maxAudioFileSizeBytes) {
    throw new ActionError(
      `Audiodatei ist zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB, max. ${(
        uploadConfig.maxAudioFileSizeBytes /
        1024 /
        1024
      ).toFixed(0)} MB).`
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let durationSeconds = 0;
  try {
    const metadata = await parseBuffer(buffer, file.type || undefined);
    durationSeconds = Math.round(metadata.format.duration ?? 0);
  } catch {
    // Dauer konnte nicht ausgelesen werden (z.B. exotisches Encoding) -
    // Track wird trotzdem angelegt, Dauer kann später manuell nachgepflegt
    // werden. Die Sendeplan-Logik fängt durationSeconds = 0 defensiv ab.
    durationSeconds = 0;
  }

  const key = generateStorageKey("audio", file.name || "upload.mp3");
  await getStorage().save(key, buffer);

  return { audioPath: key, durationSeconds };
}

function parseConsentDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ActionError("Ungültiges Einverständnis-Datum.");
  }
  return date;
}

export async function createTrack(formData: FormData) {
  await requireAuth();
  const parsed = trackMetaSchema.parse({
    title: formData.get("title"),
    artistId: formData.get("artistId"),
    albumId: formData.get("albumId"),
    genreId: formData.get("genreId"),
    sanctionMultiplier: formData.get("sanctionMultiplier") || 1.0,
    consentGiven: formData.get("consentGiven") === "on",
    consentDate: formData.get("consentDate"),
  });

  if (!parsed.consentGiven) {
    throw new ActionError(
      "Ohne bestätigtes Rechte-Einverständnis kann kein Track angelegt werden."
    );
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    throw new ActionError("Audiodatei ist erforderlich.");
  }

  const { audioPath, durationSeconds } = await saveAudioAndExtractDuration(audio);

  const track = await prisma.track.create({
    data: {
      title: parsed.title,
      artistId: parsed.artistId,
      albumId: parsed.albumId,
      genreId: parsed.genreId,
      sanctionMultiplier: parsed.sanctionMultiplier,
      consentGiven: true,
      consentDate: parseConsentDate(parsed.consentDate),
      audioPath,
      durationSeconds,
      active: true,
    },
  });

  revalidatePath("/admin/tracks");
  redirect(`/admin/tracks/${track.id}`);
}

export async function updateTrack(id: string, formData: FormData) {
  await requireAuth();
  const parsed = trackMetaSchema.parse({
    title: formData.get("title"),
    artistId: formData.get("artistId"),
    albumId: formData.get("albumId"),
    genreId: formData.get("genreId"),
    sanctionMultiplier: formData.get("sanctionMultiplier") || 1.0,
    consentGiven: formData.get("consentGiven") === "on",
    consentDate: formData.get("consentDate"),
  });

  if (!parsed.consentGiven) {
    throw new ActionError(
      "Ohne bestätigtes Rechte-Einverständnis kann der Track nicht gespeichert werden."
    );
  }

  const existing = await prisma.track.findUniqueOrThrow({ where: { id } });

  const audio = formData.get("audio");
  let audioPath = existing.audioPath;
  let durationSeconds = existing.durationSeconds;
  if (audio instanceof File && audio.size > 0) {
    const saved = await saveAudioAndExtractDuration(audio);
    audioPath = saved.audioPath;
    durationSeconds = saved.durationSeconds;
    await deleteStoredFile(existing.audioPath);
  }

  await prisma.track.update({
    where: { id },
    data: {
      title: parsed.title,
      artistId: parsed.artistId,
      albumId: parsed.albumId,
      genreId: parsed.genreId,
      sanctionMultiplier: parsed.sanctionMultiplier,
      consentGiven: true,
      consentDate: parseConsentDate(parsed.consentDate),
      audioPath,
      durationSeconds,
    },
  });

  revalidatePath("/admin/tracks");
  revalidatePath(`/admin/tracks/${id}`);
  redirect(`/admin/tracks/${id}`);
}

export async function setTrackActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    await requireAuth();
    await prisma.track.update({ where: { id }, data: { active } });
    revalidatePath("/admin/tracks");
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

export async function setSanctionMultiplier(id: string, value: number): Promise<ActionResult> {
  try {
    await requireAuth();
    const parsed = z.coerce.number().min(0).max(5).parse(value);
    await prisma.track.update({ where: { id }, data: { sanctionMultiplier: parsed } });
    revalidatePath("/admin/tracks");
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

export async function deleteTrack(id: string): Promise<ActionResult> {
  try {
    await requireAuth();
    const scheduledCount = await prisma.scheduleItem.count({ where: { trackId: id } });
    if (scheduledCount > 0) {
      throw new ActionError(
        "Track kann nicht gelöscht werden: er ist bereits im Sendeplan (auch historisch) enthalten. Stattdessen auf inaktiv setzen."
      );
    }
    const track = await prisma.track.delete({ where: { id } });
    await deleteStoredFile(track.audioPath);
    revalidatePath("/admin/tracks");
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}
