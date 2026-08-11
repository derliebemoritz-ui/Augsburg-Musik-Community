import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Abstraktion über den Dateispeicher für Audio- und Bilddateien.
 *
 * Aktuell gibt es nur eine lokale Implementierung (Dateisystem, siehe
 * `LocalStorage`). Für einen späteren Umzug auf S3-kompatiblen
 * Cloud-Speicher muss lediglich eine neue Klasse mit demselben Interface
 * geschrieben und in `getStorage()` eingesetzt werden – der Rest der
 * Anwendung (Upload-Handler, Media-Route, Admin-UI) bleibt unverändert,
 * solange `getPublicUrl()` weiterhin eine abrufbare URL liefert.
 */
export interface StorageBackend {
  /** Speichert Binärdaten unter dem angegebenen Key (z.B. "audio/abc.mp3"). */
  save(key: string, data: Buffer): Promise<void>;
  /** Liest die Datei unter dem angegebenen Key. Wirft, falls nicht vorhanden. */
  read(key: string): Promise<Buffer>;
  /** Löscht die Datei unter dem angegebenen Key, falls vorhanden. */
  delete(key: string): Promise<void>;
  /** Prüft, ob unter dem Key eine Datei existiert. */
  exists(key: string): Promise<boolean>;
  /** Liefert die öffentlich abrufbare URL für den Key. */
  getPublicUrl(key: string): string;
}

function assertSafeKey(key: string) {
  if (key.includes("..") || key.startsWith("/") || key.includes("\0")) {
    throw new Error(`Ungültiger Storage-Key: ${key}`);
  }
}

class LocalStorage implements StorageBackend {
  constructor(private readonly rootDir: string) {}

  private resolvePath(key: string): string {
    assertSafeKey(key);
    return path.join(this.rootDir, key);
  }

  async save(key: string, data: Buffer): Promise<void> {
    const filePath = this.resolvePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await rm(this.resolvePath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string): string {
    assertSafeKey(key);
    return `/api/media/${key}`;
  }
}

let storageInstance: StorageBackend | undefined;

export function getStorage(): StorageBackend {
  if (!storageInstance) {
    const rootDir = process.env.STORAGE_DIR || "./storage";
    storageInstance = new LocalStorage(path.resolve(/* turbopackIgnore: true */ rootDir));
  }
  return storageInstance;
}

/** Erzeugt einen eindeutigen, sicheren Dateinamen unter Beibehaltung der Endung. */
export function generateStorageKey(subdir: string, originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  return `${subdir}/${randomUUID()}${ext}`;
}

export const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
