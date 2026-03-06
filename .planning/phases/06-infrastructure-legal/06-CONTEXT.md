# Phase 6: Infrastructure + Legal - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up full-stack hosting infrastructure for the app. Single Docker container serving both the Vite frontend and Node.js/Express backend on a VPS. Domain configuration for shaken.ironhaven.com.au. Age gate and Terms of Service are deferred — not needed for v1.

</domain>

<decisions>
## Implementation Decisions

### Hosting Architecture
- Full-stack single Docker container pattern (proven in user's modelHub project)
- Multi-stage Dockerfile: Stage 1 (node) builds Vite frontend, Stage 2 (node) runs Express backend + serves static frontend
- Express serves API routes AND static frontend from same origin — no CORS issues
- Non-API routes fall through to index.html (SPA catch-all)
- Frontend only mounts when dist/ exists in container (local dev uses separate npm run dev)
- Dockerfile uses ${PORT:-3000} for platform-agnostic deployment
- Same-origin relative URLs for API calls (no VITE_API_URL needed)

### Backend Stack
- Node.js + Express (stay in TypeScript for full stack, shared types)
- SQLite for database (single-file, no separate service, right scale for this project)
- Backend is minimal in Phase 6 — just enough to serve frontend and prove the Docker pipeline works
- Full API endpoints come in Phase 7 (accounts) and Phase 8 (gallery)

### Domain + DNS
- Domain: shaken.ironhaven.com.au
- Registrar: Namecheap
- DNS: A record or CNAME pointing subdomain to VPS IP
- User will need help configuring Namecheap DNS settings

### VPS Deployment
- User has a VPS (setup details TBD during execution)
- Docker container deployed to VPS
- Need to determine if Docker is already installed or needs setup
- HTTPS via reverse proxy (nginx/Caddy) or Let's Encrypt

### Claude's Discretion
- Exact Express server setup and middleware
- Docker image base and optimization
- HTTPS/TLS configuration approach (Caddy vs nginx + certbot)
- Health check endpoint design
- CI/CD pipeline (if any — may be manual docker pull for v1)

</decisions>

<specifics>
## Specific Ideas

- Follow the modelHub pattern: single multi-stage Dockerfile, one container, one URL
- Backend is Node.js/Express (not Python/FastAPI like modelHub) to stay in TypeScript
- SQLite over PostgreSQL — simpler for single-VPS, right scale for the app
- Phase 6 is about proving the deployment pipeline works, not building the full API

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Vite build config already exists (vite.config.ts) — produces static output in dist/
- TypeScript config exists — backend can share tsconfig base
- Package.json has build scripts ready

### Established Patterns
- Vite dev server on port 5173 with --host for LAN access
- All UI is client-side JavaScript (no SSR)
- No existing backend code — this phase creates it from scratch

### Integration Points
- Vite build output (dist/) is what the Docker container serves
- Express backend will eventually serve API routes for Phase 7-8
- SQLite database file will live in a Docker volume for persistence

</code_context>

<deferred>
## Deferred Ideas

- INFR-01: Age gate — user decided not needed for v1
- INFR-02: Terms of Service page — user decided to skip for now
- SHAR-02: OG meta previews — deferred to Phase 8 (requires gallery)
- CI/CD pipeline — manual deployment acceptable for v1

</deferred>

---

*Phase: 06-infrastructure-legal*
*Context gathered: 2026-03-06*
