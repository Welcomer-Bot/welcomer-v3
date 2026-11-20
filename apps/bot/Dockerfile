FROM node:26.13.1-slim AS base
RUN npm install -g corepack@0.36.0 && corepack enable
# Set working directory
WORKDIR /app

# ---
FROM base AS prepare
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
# Pin a release compatible with the turbo version in your repository.
ARG TURBO_VERSION=2.11.13
RUN set -eu; \
    case "$(uname -m)" in \
      x86_64) target=x86_64-unknown-linux-musl ;; \
      aarch64) target=aarch64-unknown-linux-musl ;; \
      *) echo 'Unsupported architecture' >&2; exit 1 ;; \
    esac; \
    archive="turbo-$TURBO_VERSION-$target.tar.gz"; \
    release="https://github.com/vercel/turborepo/releases/download/v$TURBO_VERSION"; \
    cd /tmp; \
    curl -fsSL "$release/SHA256SUMS" -o SHA256SUMS; \
    curl -fsSL "$release/$archive" -o "$archive"; \
    awk -v name="$archive" '$2 == name && NF == 2 { print }' SHA256SUMS > turbo-checksum; \
    [ "$(wc -l < turbo-checksum)" -eq 1 ]; \
    sha256sum -c turbo-checksum; \
    [ "$(tar -tzf "$archive")" = turbo ]; \
    tar -xzf "$archive" -C /usr/local/bin turbo; \
    chmod 755 /usr/local/bin/turbo; \
    rm SHA256SUMS turbo-checksum "$archive"
COPY . .
# Generate a partial monorepo with a pruned lockfile for a target workspace.
RUN turbo prune bot --docker

# ---
FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN yarn install --immutable
COPY --from=prepare /app/out/full/ .
RUN yarn turbo run db:generate --filter=@repo/database

# ---
FROM base AS runner
# Don't run production as root for security reasons
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bot
USER bot
COPY --from=builder --chown=bot:nodejs /app .

# Compose overrides the command for gateway, rest and register-commands.
CMD ["node", "apps/bot/src/bot/index.ts"]
