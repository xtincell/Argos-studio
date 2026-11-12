# syntax=docker/dockerfile:1.7
# Argos-studio — image of the public library for the owner's VPS (Coolify), arbitrage 5.8:
# SQLite on a persistent volume mounted at /data, one administration key.
#
# No secret is built into the image. ARGOS_ADMIN_KEY and DATABASE_URL are runtime variables;
# NEXT_PUBLIC_SITE_URL (public address, not a secret) is also read at build time by the pages
# rendered once, such as robots.txt.
#
#   docker build -t argos-studio --build-arg NEXT_PUBLIC_SITE_URL=https://argos.example.org .
#   docker run -v argos-data:/data -e ARGOS_ADMIN_KEY=… -p 3000:3000 argos-studio
#
# Private space (ADR-0010): private dossiers are purged 24 months after their last modification by
# a daily run inside the server (ARGOS_PRIVATE_PURGE=off disables it) and by
# `argos-purge-private --dry-run | --purge`.

ARG NODE_IMAGE=node:22-bookworm-slim

# ── deps: install from the lockfile (build tools, Prisma CLI and engines) ───────────────
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY app/package.json app/package-lock.json ./
COPY app/prisma/schema.prisma ./prisma/schema.prisma
# Optional: the certificate authority of a corporate proxy for the downloads of this stage
# (npm registry, Prisma engines), given as `--secret id=build_ca,src=…`. A secret mount is
# never written to a layer.
RUN --mount=type=secret,id=build_ca,required=false \
    if [ -s /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci --no-audit --no-fund

# ── build: Next.js standalone server, against an empty throw-away library ────────────────
FROM ${NODE_IMAGE} AS build
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1 ARGOS_STANDALONE=1 CHECKPOINT_DISABLE=1
COPY --from=deps /app/node_modules ./node_modules
COPY app/ ./
ARG NEXT_PUBLIC_SITE_URL
# Data routes read the library per request: no reference is frozen into the image.
RUN if [ -z "${NEXT_PUBLIC_SITE_URL:-}" ]; then unset NEXT_PUBLIC_SITE_URL; fi \
 && export DATABASE_URL=file:/tmp/argos-build.db \
 && npx prisma generate \
 && npx prisma migrate deploy \
 && npm run build \
 && rm -f /tmp/argos-build.db

# ── migrate: the Prisma CLI alone, at the exact versions of the lockfile ─────────────────
# The installed tree is pruned to the CLI and its dependencies; the generated client and the
# optional TypeScript peer are not used by `migrate deploy`.
FROM deps AS migrate
RUN node -e "const fs=require('node:fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.dependencies={prisma:p.devDependencies.prisma};p.devDependencies={};delete p.overrides;delete p.prisma;fs.writeFileSync('package.json',JSON.stringify(p))" \
 && npm prune --omit=dev --no-audit --no-fund \
 && rm -rf node_modules/.prisma node_modules/typescript \
 && node node_modules/prisma/build/index.js --version

# ── runner ────────────────────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/argos.db
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=migrate /app/package.json /opt/prisma-cli/package.json
COPY --from=migrate /app/node_modules /opt/prisma-cli/node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build /app/prisma/migrations ./prisma/migrations
COPY --chmod=0755 docker/entrypoint.sh /usr/local/bin/argos-entrypoint
COPY --chmod=0755 docker/backup.cjs /usr/local/bin/argos-backup
# Retention purge of the private space (ADR-0010): asks the running server, with the key.
COPY --chmod=0755 docker/purge-private.cjs /usr/local/bin/argos-purge-private
# The application stays owned by root and read-only for the server. Only /data (the library,
# a new named volume takes this ownership) and .next/cache (image optimisation) are writable.
RUN install -d -m 0700 -o node -g node /data \
 && install -d -m 0755 -o node -g node /app/.next/cache
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/v1').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
ENTRYPOINT ["/usr/local/bin/argos-entrypoint"]
