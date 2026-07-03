FROM oven/bun:1.2-slim AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY prisma ./prisma
RUN bun run db:generate

COPY src ./src
COPY tsconfig.json zod.config.json ./

FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/bun.lock ./
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/src ./src
COPY --from=base /app/tsconfig.json ./
COPY --from=base /app/zod.config.json ./

EXPOSE 8080

CMD ["sh", "-c", "bun run db:deploy && bun src/index.ts"]
