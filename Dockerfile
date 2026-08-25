# syntax=docker/dockerfile:1

# --------------------------------------------------
# Base
# --------------------------------------------------

FROM node:22-alpine AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1


# --------------------------------------------------
# Dependencies
# --------------------------------------------------

FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci


# --------------------------------------------------
# Build
# --------------------------------------------------

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules

COPY . .

ENV NODE_ENV=production

RUN npm run build


# --------------------------------------------------
# Production runtime
# --------------------------------------------------

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# Copy other runtime files if your server imports them directly
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
COPY --from=builder /app/hooks ./hooks
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/models ./models

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]