# Phase 6: Infrastructure + Legal - Research

**Researched:** 2026-03-06
**Domain:** Full-stack Docker deployment (Node.js/Express + Vite SPA + SQLite) with HTTPS reverse proxy
**Confidence:** HIGH

## Summary

Phase 6 creates the deployment infrastructure for Shaken Together: a single Docker container running Node.js/Express that serves both the Vite-built SPA frontend and backend API routes, deployed on a VPS at shaken.ironhaven.com.au with HTTPS via Caddy reverse proxy. The backend is minimal in this phase -- just enough to prove the deployment pipeline. Full API endpoints arrive in Phases 7 (accounts) and 8 (gallery).

The architecture is straightforward: multi-stage Dockerfile (Stage 1 builds the Vite frontend, Stage 2 runs Express and serves the built static files). Caddy runs as a separate container via Docker Compose, handling automatic HTTPS certificate provisioning through Let's Encrypt. SQLite via better-sqlite3 is included in the container to establish the database pattern, though no tables are needed yet.

**Primary recommendation:** Use Express 5 with TypeScript (compiled via tsc), node:22-bookworm-slim for the runtime Docker image, Docker Compose with a two-service stack (app + caddy), and Caddy for zero-config HTTPS.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full-stack single Docker container pattern (proven in user's modelHub project)
- Multi-stage Dockerfile: Stage 1 (node) builds Vite frontend, Stage 2 (node) runs Express backend + serves static frontend
- Express serves API routes AND static frontend from same origin -- no CORS issues
- Non-API routes fall through to index.html (SPA catch-all)
- Frontend only mounts when dist/ exists in container (local dev uses separate npm run dev)
- Dockerfile uses ${PORT:-3000} for platform-agnostic deployment
- Same-origin relative URLs for API calls (no VITE_API_URL needed)
- Node.js + Express (stay in TypeScript for full stack, shared types)
- SQLite for database (single-file, no separate service, right scale for this project)
- Backend is minimal in Phase 6 -- just enough to serve frontend and prove the Docker pipeline works
- Full API endpoints come in Phase 7 (accounts) and Phase 8 (gallery)
- Domain: shaken.ironhaven.com.au
- Registrar: Namecheap
- DNS: A record or CNAME pointing subdomain to VPS IP
- User will need help configuring Namecheap DNS settings
- User has a VPS (setup details TBD during execution)
- Docker container deployed to VPS
- HTTPS via reverse proxy (nginx/Caddy) or Let's Encrypt

### Claude's Discretion
- Exact Express server setup and middleware
- Docker image base and optimization
- HTTPS/TLS configuration approach (Caddy vs nginx + certbot)
- Health check endpoint design
- CI/CD pipeline (if any -- may be manual docker pull for v1)

### Deferred Ideas (OUT OF SCOPE)
- INFR-01: Age gate -- user decided not needed for v1
- INFR-02: Terms of Service page -- user decided to skip for now
- SHAR-02: OG meta previews -- deferred to Phase 8 (requires gallery)
- CI/CD pipeline -- manual deployment acceptable for v1

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-03 | App hosted on content-friendly infrastructure (no mainstream provider ToS violations) | VPS deployment with own Docker container avoids cloud provider content policies entirely; Caddy handles HTTPS; user controls the full stack |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^5.1 | HTTP server, static file serving, API routing | Current stable release (5.0.0 released Oct 2024, now at 5.2.x). Express 5 has better async error handling, improved path matching security, drops legacy patterns. TypeScript types now at @types/express@5.x |
| better-sqlite3 | ^11.x | SQLite database driver | Synchronous API (simpler than callback/promise-based sqlite3), fastest SQLite binding for Node.js, widely used in production. Native module requires build tools in Docker |
| typescript | ^5.9 | Backend TypeScript compilation | Already in project devDependencies at this version |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/express | ^5.0 | TypeScript types for Express 5 | Must match Express major version (5.x types for Express 5.x) |
| @types/better-sqlite3 | ^7.x | TypeScript types for better-sqlite3 | Install alongside better-sqlite3 |
| @types/node | ^22.x | Node.js type definitions | Target Node 22 LTS |
| caddy (Docker image) | 2-alpine | HTTPS reverse proxy with automatic Let's Encrypt | Separate container in Docker Compose; handles TLS termination |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Caddy | nginx + certbot | nginx requires manual cert renewal config, certbot cron jobs, more Dockerfile complexity. Caddy does automatic HTTPS with zero config. **Recommendation: Use Caddy.** |
| Express 5 | Express 4 | Express 4 is battle-tested but Express 5 is now stable (5.2.x) with better async error handling. Since this is a new backend, start on 5. |
| better-sqlite3 | node:sqlite (built-in) | Node.js 22 has experimental built-in SQLite module, but it is still experimental/unstable. Use better-sqlite3 for production reliability. |
| tsc (compile) | tsx (runtime) | tsx is great for dev but strips types without checking. For production Docker image, compile with tsc for type safety. Use tsx for local development only. |

**Installation (new server/ package):**
```bash
npm install express better-sqlite3
npm install -D typescript @types/express @types/better-sqlite3 @types/node tsx
```

## Architecture Patterns

### Recommended Project Structure

```
shaken-together/
├── src/                     # Existing frontend source (unchanged)
├── server/                  # NEW: Backend source
│   ├── index.ts             # Express app entry point
│   ├── routes/              # API route handlers
│   │   └── health.ts        # Health check endpoint
│   └── db.ts                # SQLite database initialization
├── dist/                    # Vite build output (frontend)
├── server-dist/             # tsc build output (backend)
├── Dockerfile               # Multi-stage build
├── docker-compose.yml       # App + Caddy services
├── Caddyfile                # Caddy reverse proxy config
├── .dockerignore            # Exclude node_modules, .git, etc.
├── tsconfig.server.json     # Backend TypeScript config (separate from frontend)
├── package.json             # Updated with server scripts
├── vite.config.ts           # Existing (unchanged)
└── tsconfig.json            # Existing frontend config (unchanged)
```

### Pattern 1: Separate TypeScript Configs for Frontend and Backend

**What:** The frontend tsconfig.json targets DOM/browser APIs with bundler mode (noEmit). The backend needs a separate tsconfig.server.json targeting Node.js with actual emit to server-dist/.

**When to use:** Always, when frontend and backend share a monorepo but have different compilation targets.

**Example:**
```jsonc
// tsconfig.server.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "outDir": "server-dist",
    "rootDir": "server",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false
  },
  "include": ["server"]
}
```

### Pattern 2: Express SPA Server with API Routes

**What:** Express serves API routes first, then static files, with a catch-all fallback to index.html for client-side routing.

**When to use:** Single-origin full-stack app where the same server handles both API and frontend.

**Example:**
```typescript
// server/index.ts
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// API routes first
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend (only if dist/ exists in container)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA catch-all: non-API routes fall through to index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Pattern 3: Multi-Stage Dockerfile

**What:** Stage 1 builds the Vite frontend. Stage 2 compiles the backend TypeScript and runs the Express server with the built frontend.

**When to use:** Production Docker builds to minimize image size.

**Example:**
```dockerfile
# Stage 1: Build frontend
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build backend and run
FROM node:22-bookworm-slim AS production
WORKDIR /app
COPY package*.json ./
COPY tsconfig.server.json ./
COPY server/ ./server/
RUN npm ci --omit=dev && npx tsc -p tsconfig.server.json
COPY --from=frontend-build /app/dist ./dist
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server-dist/index.js"]
```

### Pattern 4: Docker Compose with Caddy

**What:** Two-container stack -- app container (Express) and Caddy container (HTTPS reverse proxy). Caddy auto-provisions Let's Encrypt certificates.

**When to use:** VPS deployment with a real domain requiring HTTPS.

**Example:**
```yaml
# docker-compose.yml
services:
  app:
    build: .
    restart: unless-stopped
    expose:
      - "3000"
    volumes:
      - sqlite-data:/app/data
    environment:
      - PORT=3000

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config

volumes:
  sqlite-data:
  caddy-data:
  caddy-config:
```

```
# Caddyfile
shaken.ironhaven.com.au {
    reverse_proxy app:3000
}
```

### Anti-Patterns to Avoid

- **Exposing Express port 3000 to the public:** Always proxy through Caddy. Never expose the Node.js port directly -- Caddy handles TLS, HTTP/2, and security headers.
- **Using Alpine for the Node.js runtime image:** better-sqlite3 has native C++ bindings that require glibc. Alpine uses musl libc, causing build failures or runtime errors. Use bookworm-slim instead.
- **Mixing @types/express versions:** @types/express@5 for Express 5, @types/express@4 for Express 4. Mismatched versions cause overload resolution TypeScript errors.
- **Putting database file inside the container filesystem:** SQLite data must live in a Docker volume for persistence across container rebuilds. Mount a volume at /app/data/.
- **Running npm install in production image:** Use `npm ci --omit=dev` for deterministic, smaller production installs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTPS certificates | Manual certificate generation, openssl commands | Caddy automatic HTTPS | Caddy auto-provisions and auto-renews Let's Encrypt certs with zero configuration. Just provide a domain name. |
| Static file serving | Custom file-reading middleware | `express.static()` | Built-in, handles content types, caching headers, range requests, and security |
| Process management in Docker | PM2, forever, custom restart logic | Docker `restart: unless-stopped` | Docker handles process restarts; Node.js should crash on unrecoverable errors and let Docker restart |
| SPA fallback routing | Custom path-checking middleware | Catch-all `app.get('*', ...)` after static middleware | Express ordering handles this naturally -- static files served first, everything else gets index.html |

**Key insight:** The entire deployment stack (HTTPS, process management, static serving, reverse proxy) is solved by Docker Compose + Caddy + Express.static. No custom infrastructure code is needed.

## Common Pitfalls

### Pitfall 1: better-sqlite3 Native Module on Alpine
**What goes wrong:** `Error relocating better_sqlite3.node: fcntl64: symbol not found` or `Exec format error` when running in Alpine containers.
**Why it happens:** better-sqlite3 compiles a native C++ addon that links against glibc. Alpine uses musl libc, which is incompatible.
**How to avoid:** Use `node:22-bookworm-slim` (Debian-based) instead of `node:22-alpine` for both build and runtime stages. The image is ~40MB larger but avoids all native module issues.
**Warning signs:** Any "symbol not found" or "Exec format error" during container startup.

### Pitfall 2: Caddy Certificate Rate Limits
**What goes wrong:** Let's Encrypt rate-limits certificate issuance if Caddy restarts frequently without persistent storage.
**Why it happens:** Without mounted volumes for /data and /config, Caddy loses its certificate cache and re-requests certificates on every restart.
**How to avoid:** Always mount `caddy-data:/data` and `caddy-config:/config` volumes in Docker Compose.
**Warning signs:** HTTPS errors after multiple container restarts; Let's Encrypt rate limit emails.

### Pitfall 3: SPA Route Catch-All Catching API Routes
**What goes wrong:** API requests return index.html instead of JSON responses.
**Why it happens:** The catch-all `app.get('*', ...)` is mounted before API routes.
**How to avoid:** Always define API routes BEFORE the static middleware and catch-all. Express evaluates middleware in registration order.
**Warning signs:** API endpoints returning HTML content-type.

### Pitfall 4: Docker Build Context Too Large
**What goes wrong:** Docker build takes minutes, uploads hundreds of MB.
**Why it happens:** No .dockerignore file, so node_modules/, .git/, and dist/ are sent to the Docker daemon.
**How to avoid:** Create a `.dockerignore` with: node_modules, .git, dist, server-dist, .planning, *.local.
**Warning signs:** "Sending build context to Docker daemon" shows large size.

### Pitfall 5: SQLite Database File Lost on Container Rebuild
**What goes wrong:** All data disappears when the container is rebuilt or updated.
**Why it happens:** The SQLite .db file is inside the container's writable layer, which is destroyed on rebuild.
**How to avoid:** Store the database in a Docker volume mounted at a known path (e.g., /app/data/shaken.db). Reference the path via environment variable.
**Warning signs:** Data missing after `docker compose up --build`.

### Pitfall 6: Express 5 Async Error Handling Changes
**What goes wrong:** Unhandled promise rejections crash the server in Express 4 patterns.
**Why it happens:** Express 5 automatically catches promise rejections in route handlers (unlike Express 4 which requires explicit try/catch or next(err)). But middleware errors still need proper error handlers.
**How to avoid:** Add a global error handler middleware as the last middleware: `app.use((err, req, res, next) => { ... })`. Express 5 routes can be async without wrapping.
**Warning signs:** Uncaught promise rejection warnings in logs.

### Pitfall 7: Port Mismatch Between Docker and Caddy
**What goes wrong:** Caddy returns 502 Bad Gateway.
**Why it happens:** The Caddyfile references `app:3000` but the app container listens on a different port, or the service name doesn't match.
**How to avoid:** Ensure the Docker Compose service name (e.g., `app`) matches the Caddyfile hostname, and the port matches the Express listen port and the `expose` directive.
**Warning signs:** Caddy logs showing connection refused to upstream.

## Code Examples

### Express 5 Server with Health Check and SPA Serving

```typescript
// server/index.ts
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// JSON body parsing for future API routes
app.use(express.json());

// --- API Routes ---
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- Static Frontend ---
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA catch-all (must be after API routes and static middleware)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('No dist/ directory found -- frontend not served (dev mode)');
}

// --- Error Handler ---
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Shaken Together server running on port ${PORT}`);
});
```

### Complete Dockerfile (Multi-Stage)

```dockerfile
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
EXPOSE ${PORT:-3000}

CMD ["node", "server-dist/index.js"]
```

### Docker Compose for VPS Deployment

```yaml
# docker-compose.yml
services:
  app:
    build: .
    restart: unless-stopped
    expose:
      - "3000"
    volumes:
      - sqlite-data:/app/data
    environment:
      - PORT=3000
      - DATABASE_PATH=/app/data/shaken.db

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3 (QUIC)
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      - app

volumes:
  sqlite-data:
  caddy-data:
  caddy-config:
```

### Caddyfile

```
shaken.ironhaven.com.au {
    reverse_proxy app:3000
    encode gzip
}
```

### .dockerignore

```
node_modules
dist
server-dist
.git
.planning
*.local
.env*
```

### Backend TypeScript Config

```jsonc
// tsconfig.server.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "outDir": "server-dist",
    "rootDir": "server",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "sourceMap": false
  },
  "include": ["server"]
}
```

### Package.json Script Additions

```jsonc
{
  "scripts": {
    "dev": "vite",
    "dev:server": "tsx watch server/index.ts",
    "build": "tsc && vite build",
    "build:server": "tsc -p tsconfig.server.json",
    "start": "node server-dist/index.js",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express 4 | Express 5 (5.2.x stable) | Oct 2024 | Async error handling built-in, improved path security, drop Node <18 |
| ts-node for dev | tsx for dev, tsc for production | 2024 | tsx is faster startup, zero config; tsc for type-safe production builds |
| nginx + certbot | Caddy | Caddy 2.0 (2020), now mainstream | Zero-config automatic HTTPS, simpler config, built-in HTTP/3 |
| node:alpine for small images | node:bookworm-slim | Ongoing | Avoids musl/glibc native module issues; ~40MB larger but reliable |
| node-sqlite3 (async) | better-sqlite3 (sync) | 2018+ | 2-5x faster, simpler synchronous API, better memory management |

**Deprecated/outdated:**
- Express 4.x: Still maintained but Express 5 is now the recommended choice for new projects
- ts-node: Increasingly replaced by tsx for development; both superseded by tsc for production
- Manual Let's Encrypt with certbot: Caddy automates this entirely

## Open Questions

1. **VPS Docker installation status**
   - What we know: User has a VPS
   - What's unclear: Whether Docker and Docker Compose are already installed, the VPS OS, available resources (RAM/disk)
   - Recommendation: Include Docker/Compose installation instructions in the plan as a prerequisite task. Assume a modern Linux VPS (Ubuntu 22.04+ or Debian 12+)

2. **Namecheap DNS for subdomain**
   - What we know: Domain is on Namecheap, need to point shaken.ironhaven.com.au to VPS IP
   - What's unclear: Whether ironhaven.com.au is an Australian .com.au domain with specific registrar constraints
   - Recommendation: Provide step-by-step Namecheap DNS configuration instructions. An A record pointing the subdomain to the VPS IP is the simplest approach.

3. **Backend package management strategy**
   - What we know: The project has a single package.json with frontend dependencies
   - What's unclear: Whether to use a monorepo tool or just add server deps to the existing package.json
   - Recommendation: Add server dependencies to the existing package.json. The project is small enough that a single package.json works fine. better-sqlite3 and express are runtime deps; their types are devDependencies. The Dockerfile `npm ci --omit=dev` will exclude type packages from production.

4. **Port 80/443 availability on VPS**
   - What we know: Caddy needs ports 80 and 443 for HTTPS auto-provisioning
   - What's unclear: Whether another service (nginx, Apache) is already running on those ports
   - Recommendation: Check for existing services during deployment; stop/remove them if present. Caddy MUST have port 80 for ACME HTTP-01 challenge.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.x |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFR-03 | Express server starts and responds to health check | unit | `npx vitest run server/__tests__/server.test.ts` | No -- Wave 0 |
| INFR-03 | Static files served from dist/ when present | unit | `npx vitest run server/__tests__/server.test.ts` | No -- Wave 0 |
| INFR-03 | SPA catch-all returns index.html for non-API routes | unit | `npx vitest run server/__tests__/server.test.ts` | No -- Wave 0 |
| INFR-03 | Docker build completes successfully | smoke | `docker build -t shaken-together .` | N/A (manual) |
| INFR-03 | Docker Compose starts both services | smoke | `docker compose up -d && curl -f http://localhost:3000/api/health` | N/A (manual) |
| INFR-03 | HTTPS works on shaken.ironhaven.com.au | manual-only | Browser test after deployment | N/A -- requires VPS + DNS |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual smoke test of Docker build + HTTPS endpoint accessible

### Wave 0 Gaps

- [ ] `server/__tests__/server.test.ts` -- Express server unit tests (health check, static serving, SPA fallback)
- [ ] vitest.config.ts update -- include `server/**/__tests__/**/*.test.ts` pattern (currently only includes `src/`)
- [ ] `express` and `better-sqlite3` installed as dependencies
- [ ] `@types/express`, `@types/better-sqlite3`, `@types/node`, `tsx` installed as devDependencies

Note: Docker build and HTTPS deployment are smoke-tested manually. The automated tests cover the Express server logic in isolation.

## Sources

### Primary (HIGH confidence)

- Express.js official release announcement (Oct 2024): Express 5.0 is stable, now at 5.2.x
- Caddy official docs (caddyserver.com/docs/automatic-https): Zero-config automatic HTTPS with domain name
- Caddy reverse proxy quick-start (caddyserver.com/docs/quick-starts/reverse-proxy): Caddyfile syntax verified
- Node.js Docker Hub official images (hub.docker.com/_/node): node:22-bookworm-slim is current LTS slim
- better-sqlite3 GitHub (github.com/WiseLibs/better-sqlite3): Synchronous API, fastest SQLite for Node.js
- @tsconfig/node22 npm package: Recommended TypeScript settings for Node 22

### Secondary (MEDIUM confidence)

- Express 5 TypeScript compatibility verified via @types/express@5.x npm page and GitHub issue #5987 (version matching)
- better-sqlite3 Docker Alpine issues confirmed via GitHub Discussion #1270 and Issue #387 (use bookworm-slim)
- Multi-stage Docker Node.js build patterns from Docker official guides and multiple community sources

### Tertiary (LOW confidence)

- VPS-specific deployment steps (depend on user's actual VPS OS and configuration)
- Namecheap DNS for .com.au subdomain (may have registrar-specific constraints)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Express 5, better-sqlite3, Caddy, Node 22 LTS are all well-documented stable choices
- Architecture: HIGH -- Multi-stage Docker + Caddy reverse proxy is a widely proven pattern; user has prior experience with this pattern (modelHub project)
- Pitfalls: HIGH -- Native module issues with Alpine, Caddy volume persistence, SPA routing order are all well-documented community knowledge
- Deployment specifics: MEDIUM -- VPS details and DNS configuration depend on user's infrastructure

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- all components are stable LTS)
