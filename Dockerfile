# Stage 1: Build frontend
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Build and run backend
FROM node:22-bookworm-slim AS production
WORKDIR /app

# Install production dependencies (includes native modules like better-sqlite3)
COPY package*.json ./
RUN npm ci --omit=dev

# Compile backend TypeScript
COPY tsconfig.server.json ./
COPY server/ ./server/
RUN npx tsc -p tsconfig.server.json

# Copy built frontend from Stage 1
COPY --from=frontend-build /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server-dist/index.js"]
