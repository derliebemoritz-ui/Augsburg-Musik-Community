#!/bin/sh
set -e

echo "Wende Datenbank-Migrationen an..."
npx prisma migrate deploy

echo "Starte Anwendung..."
exec "$@"
