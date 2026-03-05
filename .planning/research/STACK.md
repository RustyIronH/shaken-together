# Stack Research

**Domain:** Physics ragdoll toy PWA with social gallery features
**Researched:** 2026-03-05
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| SvelteKit | 2.x (Svelte 5.20+) | App framework, routing, SSR, API routes | Smallest bundles of any framework (15-30% smaller than React). Compiler-first means no virtual DOM overhead -- critical for 60fps physics on mid-range phones. Svelte 5 runes provide clean reactivity without React's re-render tax. SvelteKit gives file-based routing, SSR for gallery SEO, and built-in API routes for the Supabase proxy layer. |
| Vite | 7.x (7.3.1) | Build tool + dev server | Standard build tool for SvelteKit. Vite 7 is the current stable line. Lightning-fast HMR makes physics tuning iteration bearable. |
| PixiJS | 8.x (~8.16.0) | 2D WebGL/WebGPU rendering engine | 3x smaller than Phaser (450KB vs 1.2MB), 2x faster for pure rendering benchmarks. Not a game engine -- just a renderer, which is what we need since physics comes from a separate engine. WebGPU-first in v8 with WebGL2 fallback. Handles sprites, textures, and the visual layer at 60fps on mobile. |
| Matter.js | 0.20.0 | 2D physics engine (ragdoll simulation) | Purpose-built for 2D rigid body physics in the browser. Has a well-documented ragdoll example using Composites + Constraints that maps directly to our use case. Pure JS (no WASM loading delay, no async init). Constraints system (pin joints via length:0 + high stiffness) maps directly to ragdoll arm/leg joints. For 2-5 ragdolls (10-25 rigid bodies), performance is more than sufficient at 60fps. |
| Supabase (self-hosted) | supabase-js 2.98.x | Auth, database (PostgreSQL), file storage, realtime | PostgreSQL-backed BaaS with auth (GoTrue), S3-compatible file storage, Row Level Security, and realtime subscriptions. Self-hostable via Docker Compose -- critical because Supabase Cloud ToS may not tolerate the app's explicit content. One platform covers user accounts, gallery metadata, ratings, and image/video file storage. |
| vite-plugin-pwa | 0.17.x | PWA manifest + service worker generation | Zero-config PWA support via Google Workbox. Auto-generates web manifest, service worker with caching strategies, and handles installability. Direct Vite integration. |

### Database & Storage

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| PostgreSQL (via Supabase) | 15+ | Gallery metadata, user accounts, ratings | Relational model is a natural fit: users -> creations -> ratings. RLS policies handle auth-scoped queries without custom middleware. Supabase Studio provides an admin GUI for debugging. |
| Supabase Storage | (bundled with Supabase) | Image and video file storage | S3-compatible object storage with RLS policies for per-user upload scoping. Self-hosted version stores files locally on disk or connects to MinIO/Cloudflare R2. Includes image transformations via imgproxy for gallery thumbnails. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gifenc | latest | Fast GIF encoding from canvas frames | Recording the "last few seconds" replay as a shareable GIF. 2x faster than the legacy gif.js library. Supports web worker offloading for background encoding. Use when GIF shareability matters (messaging apps, forums). |
| canvas-record | latest | Multi-format canvas recording | If you need WebM/MP4 output instead of (or in addition to) GIF. Uses WebCodecs + WASM when available, falls back to MediaRecorder. Handles the complexity of canvas.captureStream() + MediaRecorder orchestration. |
| @supabase/supabase-js | 2.98.x | Supabase client SDK | All client-side Supabase interactions: auth (signup/login), database queries (gallery, ratings), storage uploads (screenshots, clips). |
| @supabase/ssr | latest | Server-side Supabase auth for SvelteKit | SvelteKit server hooks and load functions need this for SSR-safe auth session handling. Required for server-rendered gallery pages. |
| zod | 3.x | Runtime schema validation | Validate API inputs (rating values 1-5, upload metadata), form data (signup/login). Pairs well with SvelteKit form actions. |

### Capture & Sharing (Browser-Native APIs -- No Libraries Needed)

| Technology | Purpose | Notes |
|------------|---------|-------|
| HTMLCanvasElement.toBlob() | Screenshot capture | PixiJS renders to a `<canvas>` element. Call `canvas.toBlob('image/png')` directly. No library needed. |
| HTMLCanvasElement.captureStream(fps) | Video stream from canvas | Feeds into MediaRecorder for real-time WebM recording. Pass desired FPS (e.g., 30). |
| MediaRecorder API | Record canvas stream to WebM | Use `"video/webm; codecs=vp9"` for good quality/compression ratio. Well-supported in Chrome and Firefox. Safari support is newer but functional. |
| Web Share API | Native share dialog on mobile | `navigator.share({ files: [blob] })` opens the native share sheet (WhatsApp, Telegram, etc.). Falls back to download link on desktop. |

### Android APK Wrapper

| Technology | Purpose | Notes |
|------------|---------|-------|
| Bubblewrap (TWA) | PWA to sideloadable Android APK | Google Chrome Labs CLI tool. Generates a Trusted Web Activity APK from your PWA manifest. Uses the full Chrome rendering engine (not a degraded WebView). Zero extra app development -- just configure, build, and host the APK for download. Requires Digital Asset Links file on your server for full-screen mode. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript 5.x | Type safety | SvelteKit has first-class TS support. PixiJS v8 ships its own types. Matter.js uses community @types/matter-js. |
| ESLint + Prettier | Linting + formatting | `npx sv create` scaffolds these. Use eslint-plugin-svelte for Svelte-specific rules. |
| Vitest | Unit testing | Vite-native test runner. Test physics helpers, rating calculations, data transforms. |
| Playwright | E2E testing | Test gallery browse/rate flows, auth flows. Can mock DeviceMotion events for shake testing. |
| Docker Compose | Local Supabase stack | Runs full Supabase (Postgres, Auth, Storage, Studio) locally during development. Matches the production self-hosted setup exactly. |
| supabase CLI | DB migrations + type generation | Manage schema migrations, seed data, generate TypeScript types from your database schema for type-safe queries. |

## Installation

```bash
# Create SvelteKit project with Svelte 5
npx sv create shaken-together
# Select: SvelteKit minimal, TypeScript, ESLint, Prettier, Vitest, Playwright

cd shaken-together

# Core rendering + physics
npm install pixi.js matter-js

# Types for Matter.js (PixiJS v8 ships its own)
npm install -D @types/matter-js

# Supabase client
npm install @supabase/supabase-js @supabase/ssr

# PWA support
npm install -D vite-plugin-pwa

# Capture/recording
npm install gifenc canvas-record

# Validation
npm install zod

# E2E testing
npm install -D @playwright/test
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Matter.js | Rapier.js (@dimforge/rapier2d 0.19.3) | If you need 500+ simultaneous physics bodies or deterministic cross-platform simulation. Rapier is 2-5x faster via WASM, but adds async WASM loading, async initialization (`await RAPIER.init()`), and has no built-in ragdoll composite examples. For 2-5 ragdolls (10-25 bodies), Matter.js performance is more than sufficient and the simpler setup wins. |
| Matter.js | Planck.js | If you need Box2D-compatible physics or are porting from a Box2D project. More verbose API than Matter.js for ragdoll construction. Fewer community examples. |
| PixiJS | Phaser 3 | If you want a batteries-included game engine with built-in physics, scene management, audio, input handling. Overkill here -- Phaser bundles ~1.2MB of game engine features this app does not need. We want a renderer, not a game framework. |
| PixiJS | Raw Canvas 2D API | If bundle size is the absolute top priority and visuals are simple shapes only (no sprites/textures). Loses WebGL/WebGPU hardware acceleration, sprite batching, and texture management. |
| SvelteKit | Next.js 15 (React 19) | If the team knows React deeply and does not want to learn Svelte. Next.js works but React's virtual DOM adds overhead during 60fps physics rendering, and bundles are 15-30% larger. |
| SvelteKit | Vanilla Vite SPA (no framework) | If the app has zero server-side needs. We need SSR for gallery SEO (shareable gallery links should have meta tags) and API routes for Supabase auth proxy, so a framework saves significant effort. |
| Supabase (self-hosted) | Supabase Cloud | If all content is SFW. Cloud is dramatically easier to manage but has acceptable use policies that may flag explicit user-generated content. Self-hosting is the safe path. |
| Supabase (self-hosted) | PocketBase | If you want a single-binary Go backend with SQLite. Simpler to deploy but lacks Supabase's file storage with image transforms, realtime subscriptions, and RLS. Would need a separate file storage solution (e.g., MinIO). |
| Bubblewrap (TWA) | Capacitor | If you need native device APIs beyond browser capabilities (e.g., native push notifications, advanced haptics). Capacitor adds significant project complexity (native project scaffolding, plugin management) but gives access to native SDKs. For a sideloaded APK that just wraps the PWA with zero native features, Bubblewrap is trivially simple. |
| gifenc | canvas-record | If you need WebM or MP4 output rather than GIF. canvas-record handles the MediaRecorder orchestration and supports multiple output formats. Use both if you want to offer GIF + video options. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| gif.js | Unmaintained, 2x slower than gifenc, uses legacy NeuQuant algorithm | gifenc (faster, maintained, web worker support) |
| p2.js | Abandoned since ~2018. Has a ragdoll demo but zero active development or bug fixes. | Matter.js (actively maintained, similar API surface) |
| Phaser 3 | Bundles ~1.2MB of game engine (scenes, audio, tilemaps, input managers, cameras) when we only need rendering + physics. Locks you into Phaser's update loop and scene lifecycle. | PixiJS for rendering + Matter.js for physics, composed independently |
| html2canvas / dom-to-image | These capture DOM elements by cloning and rasterizing. PixiJS renders to a `<canvas>` element -- just call `canvas.toBlob()` directly. Adding a DOM-capture library is unnecessary complexity. | Native `canvas.toBlob()` API |
| Firebase | Proprietary Google services, no self-hosting option, vendor lock-in. Content policies would be a direct risk for explicit UGC. NoSQL document model is a worse fit for relational gallery/rating data than PostgreSQL. | Supabase (self-hosted) |
| Three.js | 3D engine. This is a 2D ragdoll toy. Three.js would add enormous unnecessary complexity, bundle size, and a 3D rendering pipeline we do not need. | PixiJS |
| Cordova | Legacy project, effectively replaced by Capacitor. Even Capacitor is overkill here -- Bubblewrap TWA is the right tool for wrapping a PWA into an APK with no native code. | Bubblewrap (TWA) |
| React + @pixi/react | React's reconciliation loop fights with PixiJS's own render loop, causing unnecessary re-renders and frame drops. Svelte's compiled reactivity does not have this conflict -- you update state and sync to PixiJS in a `requestAnimationFrame` callback without framework overhead. | Svelte + PixiJS directly (no wrapper) |
| Redux / Zustand / etc. | Svelte 5 runes ($state, $derived, $effect) handle all client-side reactivity natively. Adding a state management library is unnecessary abstraction for this app's complexity level. | Svelte 5 runes |

## Stack Patterns by Variant

**If ragdoll count grows beyond 10 (50+ simultaneous rigid bodies):**
- Swap Matter.js for Rapier.js (@dimforge/rapier2d)
- WASM performance becomes necessary at that scale
- Requires async initialization: `const RAPIER = await import('@dimforge/rapier2d'); await RAPIER.init()`
- API change: joints use `world.createImpulseJoint()` instead of Matter.js Constraints

**If GIF sharing is the primary format:**
- Use gifenc with a circular frame buffer storing the last N canvas snapshots
- Encode on-demand when user taps "capture replay"
- GIFs are universally shareable (messaging apps, forums, social media) but produce larger files

**If video sharing is the primary format:**
- Use `canvas.captureStream(30)` + MediaRecorder API for real-time WebM capture
- WebM is smaller than GIF but less universally playable outside browsers
- Consider server-side FFmpeg conversion to MP4 for broader device compatibility

**If iOS Safari shake detection is unreliable:**
- Implement fallback: virtual shake button or touch-drag interaction
- iOS 13+ requires `DeviceMotionEvent.requestPermission()` -- MUST be triggered by a user gesture (button tap), not on page load
- Test on real iOS devices early -- the iOS Simulator does not emulate DeviceMotion
- Threshold tuning: a magnitude spike over 15-20 in the acceleration vector indicates a shake

**If Supabase Cloud becomes acceptable (SFW version of the app):**
- Skip Docker self-hosting entirely
- Use Supabase free tier for development, Pro tier ($25/mo) for production
- Dramatically simpler deployment and zero infrastructure maintenance

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| SvelteKit 2.x | Svelte 5.20+ | SvelteKit 2 requires Svelte 5. Use `npx sv create` to scaffold correctly. |
| SvelteKit 2.x | Vite 6.x / 7.x | SvelteKit 2 works with Vite 6+ including current 7.x line. |
| PixiJS 8.16 | WebGL 2 / WebGPU | v8 is WebGPU-first with WebGL2 fallback. Does NOT fall back to WebGL1 or Canvas 2D (experimental canvas renderer added in 8.16 but not production-ready). All target mobile browsers (Chrome 80+, Safari 15+) support WebGL2. |
| @supabase/supabase-js 2.98 | Node.js 20+ | Dropped Node 18 support in v2.79.0. SvelteKit server-side requires Node 20+. |
| vite-plugin-pwa 0.17.x | Vite 5+ | From v0.17, requires Vite 5 or higher. Compatible with Vite 7.x. Uses Workbox under the hood. |
| Matter.js 0.20.0 | @types/matter-js | Community-maintained DefinitelyTyped package. Verify @types version matches the 0.20.x API surface at install time. |
| Bubblewrap TWA | Chrome 72+ on Android | TWA requires Chrome 72+. Not an issue in 2026 -- minimum Chrome on supported Android devices is well past this version. |

## Hosting Considerations

The project's deliberately irreverent/explicit content means standard cloud providers may enforce acceptable use policies. Hosting must be planned around this constraint.

| Component | Recommended Host | Why |
|-----------|-----------------|-----|
| Supabase stack (Postgres, Auth, Storage) | Self-hosted on VPS: Vultr, OVH, or similar permissive provider | Hetzner explicitly bans adult content (German law). Vultr and OVH are commonly used for permissive hosting. Budget ~$20-50/mo for a VPS with 4+ vCPU and 8+ GB RAM to run the full Supabase Docker stack. |
| SvelteKit frontend (SSR) | Same VPS, or Cloudflare Pages for the app shell | The frontend app shell itself is SFW -- user-generated content loads dynamically from Supabase Storage. Cloudflare Pages could serve the static/SSR frontend while UGC comes from the self-hosted backend. |
| CDN for static assets | Cloudflare (free tier) | CSS, JS bundles, fonts, and character sprites are all SFW. Cloudflare's free CDN tier handles static asset delivery well. |
| APK distribution | Direct download link on the site | No app store involvement. Host the APK file on your domain for power users to download and sideload. |

## Sources

- [Rapier 2025 review and 2026 goals -- Dimforge blog](https://dimforge.com/blog/2026/01/09/the-year-2025-in-dimforge/) -- Rapier performance data, version status (HIGH confidence)
- [PixiJS GitHub Releases](https://github.com/pixijs/pixijs/releases) -- Version verification: v8.16.0, Feb 4 2026 (HIGH confidence)
- [@dimforge/rapier2d on npm](https://www.npmjs.com/package/@dimforge/rapier2d) -- Rapier version: 0.19.3 (HIGH confidence)
- [matter-js on npm](https://www.npmjs.com/package/matter-js) -- Matter.js version: 0.20.0, last published ~2 years ago (HIGH confidence)
- [@supabase/supabase-js on npm](https://www.npmjs.com/package/@supabase/supabase-js) -- Supabase JS version: 2.98.0 (HIGH confidence)
- [Supabase Self-Hosting with Docker docs](https://supabase.com/docs/guides/self-hosting/docker) -- Self-hosting architecture (HIGH confidence)
- [Supabase Storage docs](https://supabase.com/docs/guides/storage) -- S3-compatible storage, imgproxy transforms (HIGH confidence)
- [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa) -- PWA plugin version, Vite compatibility (HIGH confidence)
- [Vite releases page](https://vite.dev/releases) -- Vite 7.3.1 is current (HIGH confidence)
- [Svelte 5 migration guide](https://svelte.dev/docs/svelte/v5-migration-guide) -- Svelte 5 runes, SvelteKit 2 (HIGH confidence)
- [Svelte blog: What's new March 2025](https://svelte.dev/blog/whats-new-in-svelte-march-2025) -- SvelteKit 2.17.0, Svelte 5.20.0 (HIGH confidence)
- [Matter.js ragdoll demo (CodePen)](https://codepen.io/liabru/pen/jwXqOd) -- Working ragdoll constraint example (HIGH confidence)
- [matter-pixi integration (GitHub)](https://github.com/celsowhite/matter-pixi) -- Matter.js + PixiJS rendering pattern (MEDIUM confidence -- community project)
- [Rapier.js + PixiJS demo (GitHub)](https://github.com/LeoSipowicz/rapier_2D_pixijs_demo) -- Rapier + PixiJS integration example (MEDIUM confidence -- community project)
- [Rapier joints documentation](https://rapier.rs/docs/user_guides/javascript/joints/) -- Joint types for ragdolls (HIGH confidence)
- [canvas-record on npm](https://www.npmjs.com/package/canvas-record) -- Multi-format canvas recording (MEDIUM confidence)
- [gifenc on GitHub](https://github.com/mattdesl/gifenc) -- Fast GIF encoding (HIGH confidence)
- [Bubblewrap on GitHub (Google Chrome Labs)](https://github.com/GoogleChromeLabs/bubblewrap) -- TWA APK generation (HIGH confidence)
- [MDN: DeviceMotionEvent](https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Detecting_device_orientation) -- DeviceMotion browser API, iOS permission requirements (HIGH confidence)
- [MDN: MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API) -- MediaRecorder browser API (HIGH confidence)
- [MDN: HTMLCanvasElement.captureStream()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream) -- Canvas capture API (HIGH confidence)
- [Hetzner system policies](https://www.hetzner.com/legal/system-policies) -- Bans adult content, German law (HIGH confidence)
- [WebGameDev.com physics page](https://www.webgamedev.com/physics) -- Physics engine comparison (MEDIUM confidence)
- [Supabase vs Firebase in 2026 (DEV Community)](https://dev.to/philip_mcclarence_2ef9475/supabase-vs-firebase-in-2026-which-backend-should-you-choose-4bfe) -- Backend comparison (MEDIUM confidence)
- [LowEndTalk: adult VPS hosting discussion](https://lowendtalk.com/discussion/146096/adult-vps-hosting) -- Hosting provider content policies (LOW confidence -- forum discussion)

---
*Stack research for: Physics ragdoll toy PWA with social gallery features*
*Researched: 2026-03-05*
