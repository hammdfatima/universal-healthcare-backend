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

# Migrations need a session-scoped direct connection. Neon pooler / pgbouncer=true
# breaks pg_advisory_lock and surfaces as Prisma P1002.
DIRECT_DATABASE_URL="$(printf '%s' "$DIRECT_DATABASE_URL" | sed -E 's/-pooler\././g; s/[?&]pgbouncer=true//g')"
export DIRECT_DATABASE_URL

echo "Warming database connection..."
bunx prisma db execute --schema prisma/schema.prisma --stdin <<'SQL' || true
SELECT 1;
SQL

echo "Clearing any stale Prisma migrate advisory lock..."
bunx prisma db execute --schema prisma/schema.prisma --file scripts/unlock-prisma-migrate.sql || true

echo "Running database migrations..."
attempt=1
max_attempts=3
until bun run db:deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Migrations failed after ${max_attempts} attempts."
    exit 1
  fi
  attempt=$((attempt + 1))
  echo "Migration attempt failed (P1002 lock contention is common on Neon). Retrying (${attempt}/${max_attempts})..."
  bunx prisma db execute --schema prisma/schema.prisma --file scripts/unlock-prisma-migrate.sql || true
  sleep 5
done

echo "Starting API server..."
exec bun src/index.ts
