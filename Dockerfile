# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# Install production build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

# Clean up build dependencies
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
