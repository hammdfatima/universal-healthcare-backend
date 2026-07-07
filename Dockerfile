FROM oven/bun:1.2-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY prisma ./prisma
COPY tsconfig.json zod.config.json ./

# Build-time only: Prisma needs these env vars to parse the schema (no DB connection).
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" \
    DIRECT_DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" \
    bun run db:generate

COPY src ./src

FROM oven/bun:1.2-slim AS production
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/zod.config.json ./
COPY scripts/docker-start.sh ./scripts/docker-start.sh

RUN chmod +x ./scripts/docker-start.sh

EXPOSE 8080

CMD ["./scripts/docker-start.sh"]
