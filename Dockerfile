# Stage 1: Build everything (frontend + server)
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=512
COPY package*.json ./
RUN npm ci
COPY tsconfig.json tsconfig.server.json vite.config.ts index.html ./
COPY src/ ./src/
COPY server/ ./server/
RUN npx vite build && npx tsc -p tsconfig.server.json

# Stage 2: Production runtime
FROM node:22-bookworm-slim AS production
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/server-dist ./server-dist

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server-dist/index.js"]
