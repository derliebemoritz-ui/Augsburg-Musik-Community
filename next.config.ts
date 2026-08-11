import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "music-metadata"],
  experimental: {
    serverActions: {
      // Muss zur maximalen Audiodatei-Größe passen (siehe
      // uploadConfig.maxAudioFileSizeBytes in src/lib/config.ts, aktuell
      // 50 MB) plus etwas Spielraum für multipart/form-data-Overhead.
      bodySizeLimit: "55mb",
    },
  },
};

export default nextConfig;
