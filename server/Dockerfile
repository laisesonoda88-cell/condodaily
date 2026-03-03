# ─── Stage 1: Build ───────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files (monorepo)
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY packages/shared/package.json ./packages/shared/
# Mobile package.json needed so npm ci can resolve the full lock file
COPY apps/mobile/package.json ./apps/mobile/

# Install ALL deps (need devDeps for tsc)
RUN npm ci --workspace=server --workspace=packages/shared --legacy-peer-deps

# Copy source
COPY packages/shared/ ./packages/shared/
COPY server/ ./server/

# Build shared (TS → JS) so runtime can resolve imports
RUN cd packages/shared && npx tsc

# Fix ESM import extensions in shared dist (Node ESM requires .js, tsc doesn't add them)
RUN cd packages/shared/dist && \
    find . -name '*.js' -exec sed -i "s|from '\./\([^']*\)'|from './\1.js'|g" {} + && \
    find . -name '*.js' -exec sed -i "s|from '\.js\.js'|from '.js'|g" {} +

# Build server
RUN cd server && npx tsc

# Create a production-ready package.json for shared that points to dist/
RUN echo '{"name":"@condodaily/shared","version":"0.1.0","private":true,"type":"module","main":"dist/index.js","types":"dist/index.d.ts","exports":{".":"./dist/index.js","./constants":"./dist/constants/index.js","./types":"./dist/types/index.js"}}' > /app/packages/shared/package.prod.json

# ─── Stage 2: Production runtime ─────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Security: non-root user
RUN addgroup -S condodaily && adduser -S condodaily -G condodaily

# Copy root package files
COPY package.json package-lock.json ./
COPY server/package.json ./server/
# Use production package.json for shared (points to dist/)
COPY --from=builder /app/packages/shared/package.prod.json ./packages/shared/package.json
# Mobile package.json needed so npm ci can resolve the full lock file
COPY apps/mobile/package.json ./apps/mobile/

# Install production deps only
RUN npm ci --workspace=server --workspace=packages/shared --legacy-peer-deps --omit=dev

# Copy built artifacts
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy static files (deep links: .well-known/apple-app-site-association, assetlinks.json)
COPY --from=builder /app/server/src/public ./server/dist/public

# Create uploads directory
RUN mkdir -p /app/server/uploads && chown -R condodaily:condodaily /app

USER condodaily

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "dist/app.js"]
