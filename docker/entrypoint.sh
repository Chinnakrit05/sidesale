#!/bin/sh
set -e

echo "[sidesale] Waiting for database..."
# shellcheck disable=SC2154
until node -e "require('net').createConnection({host: process.env.DB_HOST || 'db', port: Number(process.env.DB_PORT || 5432)}).on('connect', () => process.exit(0)).on('error', () => process.exit(1));" 2>/dev/null; do
  echo "  db not ready yet, retrying in 2s..."
  sleep 2
done

echo "[sidesale] Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "[sidesale] Seeding database (idempotent)..."
node prisma/seed.js || true

echo "[sidesale] Starting app..."
exec "$@"
