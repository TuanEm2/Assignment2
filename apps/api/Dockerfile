FROM node:26-bookworm-slim
WORKDIR /workspace

# Prisma's query engine needs OpenSSL on Debian slim.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY . .
RUN npm run db:generate && npm run build:api

ENV NODE_ENV=production
EXPOSE 4000

# Migrate only after PostgreSQL is healthy; exit on migration failure.
CMD ["sh", "-c", "npm run db:migrate && npm run start:prod -w apps/api"]
