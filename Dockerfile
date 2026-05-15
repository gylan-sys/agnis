# --- BUILD STAGE ---
FROM node:20-slim AS builder

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- PRODUCTION STAGE ---
FROM node:20-slim AS runner

WORKDIR /app

# We still need build tools to install production native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Install production dependencies only
RUN npm install --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist

# Create persistent data directory
RUN mkdir -p /app/data && chown -R node:node /app/data

# Environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV PORT=3000

EXPOSE 3000

# Cleanup build tools in production to save space
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y

USER node

# Use node directly for the start command (the build script compiled server.ts to dist/server.cjs)
CMD ["node", "dist/server.cjs"]
