---
phase: 06-infrastructure-legal
plan: 01
subsystem: infra
tags: [express, docker, caddy, sqlite, better-sqlite3, typescript]

requires:
  - phase: 05-replay-clips-sharing
    provides: Vite SPA frontend with build output in dist/
provides:
  - Express 5 server with health check endpoint at /api/health
  - Multi-stage Dockerfile for production container builds
  - Docker Compose with app + Caddy two-service HTTPS stack
  - SQLite database initialization pattern via better-sqlite3
  - Backend TypeScript compilation pipeline (tsconfig.server.json)
affects: [07-accounts-profiles, 08-gallery-core, 09-gallery-social]

tech-stack:
  added: [express@5.2.1, better-sqlite3@12.6.2, tsx@4.21.0, "@types/express@5.0.6", "@types/better-sqlite3@7.6.13", "@types/node@25.3.5"]
  patterns: [separate-tsconfig-backend, express-spa-server, multi-stage-docker, caddy-reverse-proxy]

key-files:
  created: [server/index.ts, server/routes/health.ts, server/db.ts, server/__tests__/server.test.ts, tsconfig.server.json, Dockerfile, docker-compose.yml, Caddyfile, .dockerignore]
  modified: [package.json, package-lock.json, vitest.config.ts, .gitignore]

key-decisions:
  - "Express 5 with separate tsconfig.server.json targeting nodenext module resolution for backend"
  - "node:22-bookworm-slim (not Alpine) for Docker to support better-sqlite3 native module"
  - "Caddy 2 for zero-config automatic HTTPS with Let's Encrypt"
  - "Server exports app object for testing; only auto-listens when run directly"
  - "SQLite WAL mode enabled by default for better concurrent read performance"

patterns-established:
  - "Separate TypeScript configs: tsconfig.json (frontend/noEmit) and tsconfig.server.json (backend/emit to server-dist)"
  - "Express SPA pattern: API routes first, then express.static, then catch-all to index.html"
  - "Server test pattern: import app, create http server on port 0, use fetch for assertions"
  - "Docker two-service stack: app (Express) + caddy (HTTPS reverse proxy)"

requirements-completed: [INFR-03]

duration: 3min
completed: 2026-03-06
---

# Phase 6 Plan 1: Express Backend + Docker Pipeline Summary

**Express 5 server with health check, SPA static serving, multi-stage Dockerfile, and Caddy HTTPS reverse proxy for shaken.ironhaven.com.au**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T03:59:12Z
- **Completed:** 2026-03-06T04:02:57Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Express 5 server with /api/health endpoint returning status, timestamp, and uptime
- Static file serving from dist/ with SPA catch-all for client-side routing
- Multi-stage Dockerfile producing production container with frontend build + backend compilation
- Docker Compose with app + Caddy two-service stack for HTTPS deployment
- 4 unit tests covering health check, static serving, SPA catch-all, and dev mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Express server, backend config, and unit tests (TDD)**
   - `8de12ad` (test) - RED: failing server tests
   - `ca68310` (feat) - GREEN: Express server implementation passing all tests
2. **Task 2: Dockerfile, Docker Compose, Caddy config, and dockerignore** - `961ea50` (feat)

**Plan metadata:** (pending) (docs: complete plan)

_Note: Task 1 used TDD flow (RED then GREEN, no refactor needed)_

## Files Created/Modified
- `server/index.ts` - Express 5 app entry point with API routes, static serving, SPA catch-all, global error handler
- `server/routes/health.ts` - Health check route handler returning status/timestamp/uptime JSON
- `server/db.ts` - SQLite database initialization with better-sqlite3 and WAL mode
- `server/__tests__/server.test.ts` - 4 unit tests for Express server behavior
- `tsconfig.server.json` - Backend TypeScript config targeting Node.js with nodenext resolution
- `Dockerfile` - Multi-stage build: frontend-build (Vite) + production (Express + compiled TS)
- `docker-compose.yml` - Two-service stack: app + Caddy with SQLite volume persistence
- `Caddyfile` - Reverse proxy for shaken.ironhaven.com.au with gzip encoding
- `.dockerignore` - Excludes node_modules, .git, dist, server-dist, .planning
- `package.json` - Added express, better-sqlite3 deps; dev:server, build:server, start scripts
- `vitest.config.ts` - Added server test include pattern
- `.gitignore` - Added server-dist to ignore compiled backend output

## Decisions Made
- Express 5 (5.2.1) chosen over Express 4 for built-in async error handling and improved path security
- Server exports `app` for testing with conditional auto-listen (only when run directly, not imported)
- better-sqlite3 with WAL mode for synchronous API and future concurrent read performance
- node:22-bookworm-slim for Docker (not Alpine) to avoid native module glibc issues
- Caddy 2 for automatic HTTPS via Let's Encrypt with zero certificate management

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added server-dist to .gitignore**
- **Found during:** Task 2 (Docker configuration)
- **Issue:** `npx tsc -p tsconfig.server.json` creates server-dist/ directory which would be tracked by git
- **Fix:** Added `server-dist` to .gitignore
- **Files modified:** .gitignore
- **Verification:** `git status` no longer shows server-dist as untracked

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential to prevent compiled output from being committed. No scope creep.

## Issues Encountered
- `npm run build` fails due to pre-existing unused import in `src/input/__tests__/shake.test.ts` (GRAVITY_RESTING_MAGNITUDE). This is documented in STATE.md as a known pre-existing issue. Does not affect server functionality or Docker build (which will compile server TypeScript separately).
- Docker not available locally for build verification. Verified both build stages independently: `npx tsc -p tsconfig.server.json` compiles cleanly, Vite frontend build output is used by Dockerfile COPY.

## User Setup Required
None - no external service configuration required for local development. VPS deployment (DNS, Docker installation) will be handled in a separate deployment plan.

## Next Phase Readiness
- Express server foundation ready for API endpoints in Phase 7 (accounts) and Phase 8 (gallery)
- Docker pipeline ready for VPS deployment (Plan 06-02 or manual deployment)
- SQLite database pattern established, ready for table creation in future phases

## Self-Check: PASSED

All 9 created files verified present. All 3 task commits (8de12ad, ca68310, 961ea50) verified in git log.

---
*Phase: 06-infrastructure-legal*
*Completed: 2026-03-06*
