#!/bin/sh
# Sichert die SQLite-Datenbank und den Upload-Ordner (Docker-Volume
# "musikradio_data") in ein datiertes .tar.gz-Archiv.
#
# Aufruf (auf dem VPS, im Projektverzeichnis):
#   ./scripts/backup.sh [Zielverzeichnis]
#
# Standard-Zielverzeichnis ist ./backups. Für automatische, taegliche
# Backups z.B. per Cronjob eintragen (crontab -e):
#   0 3 * * * cd /pfad/zum/projekt && ./scripts/backup.sh >> backups/backup.log 2>&1
#
# Wiederherstellen (Beispiel):
#   docker compose down
#   docker run --rm -v musikradio_data:/data -v "$(pwd)/backups":/backup \
#     alpine sh -c "rm -rf /data/* && tar xzf /backup/musikradio-backup-<Datum>.tar.gz -C /data"
#   docker compose up -d

set -e

VOLUME_NAME="musikradio_data"
DEST_DIR="${1:-./backups}"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
ARCHIVE_NAME="musikradio-backup-${TIMESTAMP}.tar.gz"

mkdir -p "$DEST_DIR"
DEST_DIR_ABS="$(cd "$DEST_DIR" && pwd)"

if ! docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  echo "Fehler: Docker-Volume '$VOLUME_NAME' nicht gefunden. Läuft die Anwendung bereits (docker compose up)?" >&2
  exit 1
fi

echo "Sichere Volume '$VOLUME_NAME' nach ${DEST_DIR_ABS}/${ARCHIVE_NAME} ..."

docker run --rm \
  -v "${VOLUME_NAME}:/data:ro" \
  -v "${DEST_DIR_ABS}:/backup" \
  alpine \
  tar czf "/backup/${ARCHIVE_NAME}" -C / data

echo "Fertig: ${DEST_DIR_ABS}/${ARCHIVE_NAME}"
