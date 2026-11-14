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
# Compose migrates at startup; Render runs migration in pre-deploy.
# RUN_MIGRATIONS_ON_STARTUP=false requires a separately configured pre-deploy migration.
CMD ["sh", "-c", "if [ \"${RUN_MIGRATIONS_ON_STARTUP:-true}\" = \"true\" ]; then npm run db:migrate; fi; exec npm run start:prod -w apps/api"]
