#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Add your Neon pooled connection string in Render."
  exit 1
fi

if [ -z "${DIRECT_DATABASE_URL:-}" ]; then
  echo "DIRECT_DATABASE_URL is not set. Add your Neon direct (non-pooler) connection string in Render."
  exit 1
fi

case "$DATABASE_URL" in
  *localhost*|*placeholder*|*build:build*)
    echo "DATABASE_URL still looks like a placeholder. Configure it in Render environment variables."
    exit 1
    ;;
esac

case "$DIRECT_DATABASE_URL" in
  *localhost*|*placeholder*|*build:build*)
    echo "DIRECT_DATABASE_URL still looks like a placeholder. Use Neon's direct connection URL (host without -pooler)."
    exit 1
    ;;
esac

echo "Running database migrations..."
bun run db:deploy

echo "Starting API server..."
exec bun src/index.ts
