import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { CONTENT_TYPES } from "@/lib/storage";

export const runtime = "nodejs";

function resolveMediaPath(segments: string[]): string {
  const key = segments.join("/");
  if (key.includes("..") || key.includes("\0")) {
    throw new Error("Ungültiger Medienpfad");
  }
  const rootDir = path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage");
  return path.join(/* turbopackIgnore: true */ rootDir, key);
}

// Streamt Dateien aus dem lokalen Storage-Verzeichnis, inkl. HTTP-Range-
// Support (nötig, damit Audio-Elemente im Player seeken können). Diese Route
// ist die einzige Stelle, die direkt auf das Dateisystem zugreift – bei
// einem Umzug auf S3 würde `storage.getPublicUrl()` stattdessen direkt auf
// die Cloud-URL zeigen und diese Route entfiele.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;

  let filePath: string;
  try {
    filePath = resolveMediaPath(segments);
  } catch {
    return NextResponse.json({ error: "Ungültiger Medienpfad" }, { status: 400 });
  }

  let fileStat;
  try {
    fileStat = await stat(/* turbopackIgnore: true */ filePath);
  } catch {
    return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  const range = request.headers.get("range");

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : fileStat.size - 1;
      const chunkSize = end - start + 1;

      if (start >= fileStat.size || end >= fileStat.size || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileStat.size}` },
        });
      }

      const nodeStream = createReadStream(/* turbopackIgnore: true */ filePath, { start, end });
      return new NextResponse(Readable.toWeb(nodeStream) as ReadableStream, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  const nodeStream = createReadStream(/* turbopackIgnore: true */ filePath);
  return new NextResponse(Readable.toWeb(nodeStream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileStat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
