# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY turbo.json ./
COPY apps/api/package*.json ./apps/api/

RUN npm ci --workspace=@voidnull/api

COPY prisma ./prisma
COPY apps/api ./apps/api

RUN npx prisma generate
RUN cd apps/api && npm run build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 3001
CMD ["node", "apps/api/dist/main"]
