# Build & chạy app Next.js trên VPS.
FROM node:20-bookworm-slim AS base
# Prisma cần openssl + ca-certificates.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Cài dependencies (tách layer để cache).
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Ảnh chạy cuối.
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
# Chạy migration (tạo/nâng cấp bảng) rồi khởi động server.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
