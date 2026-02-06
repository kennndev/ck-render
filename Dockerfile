# ──── Stage 1: install deps ─────────────────────────────────────────
FROM node:18-bullseye-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma/ ./prisma/
# postinstall runs "prisma generate" — needs prisma/ to be present
RUN npm ci

# ──── Stage 2: build ────────────────────────────────────────────────
FROM node:18-bullseye-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ──── Stage 3: production runtime ───────────────────────────────────
FROM node:18-bullseye-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system nodejs && useradd --system --gid nodejs --create-home nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static

# Prisma schema + CLI for runtime db push
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nodejs

# Railway injects PORT automatically; Next.js standalone respects it
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Sync database schema then start server
CMD node node_modules/prisma/build/index.js db push --skip-generate && node server.js
