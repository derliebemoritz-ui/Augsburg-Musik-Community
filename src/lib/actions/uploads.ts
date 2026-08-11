import path from "node:path";
import { getStorage, generateStorageKey } from "@/lib/storage";
import { uploadConfig } from "@/lib/config";
import { ActionError } from "./shared";

async function saveValidatedFile(
  file: File,
  subdir: string,
  opts: { maxSizeBytes: number; allowedMimeTypes: readonly string[]; allowedExtensions: readonly string[] }
): Promise<string> {
  const ext = path.extname(file.name).toLowerCase();
  const mimeOk = opts.allowedMimeTypes.includes(file.type);
  const extOk = opts.allowedExtensions.includes(ext);
  if (!mimeOk && !extOk) {
    throw new ActionError(
      `Nicht unterstütztes Dateiformat "${file.type || ext}". Erlaubt: ${opts.allowedExtensions.join(", ")}.`
    );
  }
  if (file.size > opts.maxSizeBytes) {
    throw new ActionError(
      `Datei ist zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximal erlaubt: ${(
        opts.maxSizeBytes /
        1024 /
        1024
      ).toFixed(0)} MB.`
    );
  }

  const key = generateStorageKey(subdir, file.name || `upload${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await getStorage().save(key, buffer);
  return key;
}

export async function saveImageUpload(file: File, subdir: string): Promise<string> {
  return saveValidatedFile(file, subdir, {
    maxSizeBytes: uploadConfig.maxImageFileSizeBytes,
    allowedMimeTypes: uploadConfig.allowedImageMimeTypes,
    allowedExtensions: uploadConfig.allowedImageExtensions,
  });
}

export async function saveAudioUpload(file: File, subdir: string): Promise<string> {
  return saveValidatedFile(file, subdir, {
    maxSizeBytes: uploadConfig.maxAudioFileSizeBytes,
    allowedMimeTypes: uploadConfig.allowedAudioMimeTypes,
    allowedExtensions: uploadConfig.allowedAudioExtensions,
  });
}

export async function deleteStoredFile(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    await getStorage().delete(key);
  } catch {
    // Best effort - fehlende Datei beim Aufräumen ist kein Fehlerfall.
  }
}
