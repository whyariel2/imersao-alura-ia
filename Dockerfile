# ==========================================
# Stage 1: Build Angular Frontend
# ==========================================
FROM node:26.13.0-alpine3.24 AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY frontend/ ./
RUN npm run build -- --configuration=production

# ==========================================
# Stage 2: Build Backend (TypeScript)
# ==========================================
FROM node:26.13.0-alpine3.24 AS backend-builder
WORKDIR /app/backend

# Install build dependencies for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

COPY backend/package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY backend/ ./
RUN npm run build

# ==========================================
# Stage 3: Production Runtime
# ==========================================
FROM node:26.13.0-alpine3.24 AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=127.0.0.1 \
    DATABASE_PATH=/app/data/studyflow.sqlite

# Install runtime dependencies for SQLite
RUN apk add --no-cache dumb-init

# Create data directory and assign permissions to non-root user 'node'
RUN mkdir -p /app/data /app/public && chown -R node:node /app

# Copy production dependencies for backend
COPY --chown=node:node backend/package*.json ./
RUN npm ci --omit=dev --prefer-offline --no-audit

# Copy built backend artifacts
COPY --chown=node:node --from=backend-builder /app/backend/dist ./dist
COPY --chown=node:node --from=backend-builder /app/backend/src/db/migrations ./dist/db/migrations

# Copy built frontend assets to public directory served by Fastify
COPY --chown=node:node --from=frontend-builder /app/frontend/dist/browser ./public

# Switch to non-root user
USER node

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
