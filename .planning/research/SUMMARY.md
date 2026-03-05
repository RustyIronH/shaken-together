# Project Research Summary

**Project:** Shaken Together
**Domain:** Physics ragdoll toy / social sharing PWA (explicit UGC)
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

Shaken Together is a physics-based ragdoll toy where users shake their phone to bounce cartoon characters around, pose them in funny (and deliberately explicit) positions, then capture and share the results to a public gallery with star ratings. The product sits at the intersection of physics sandbox games (People Playground, Ragdoll Playground) and social UGC platforms (Imgur, Reddit). No existing product combines accelerometer-driven physics input with a social sharing gallery, which makes the core concept genuinely novel. The recommended build approach is a React SPA with PixiJS for rendering, a 2D physics engine (Matter.js or Rapier) for ragdoll simulation, Supabase for backend services, and PWA packaging for distribution -- bypassing app stores entirely since the explicit content will never pass review.

The technical challenge concentrates in three areas: (1) making the physics feel responsive and satisfying at 60fps on mid-range mobile devices, which demands a fixed-timestep game loop, careful joint constraint tuning, and tight physics-render synchronization; (2) cross-browser media capture, especially on iOS Safari where canvas.captureStream() is broken and DeviceMotion requires a carefully choreographed permission flow; and (3) content hosting, since the deliberately explicit nature of user submissions means mainstream hosting providers may terminate service. These risks are all manageable with upfront architecture decisions but catastrophic if ignored.

The product should be built physics-first: get the ragdoll simulation feeling right in isolation before adding rendering, input, capture, and social features in dependency order. The gallery and social layer is the second half of the product but depends entirely on the physics toy being fun. Ship the toy, validate that people enjoy shaking ragdolls, then grow the social loop. The explicit content angle means legal groundwork (age gate, ToS, content-friendly hosting) must be in place before the gallery goes public -- this is non-negotiable.

## Key Findings

### Recommended Stack

The stack is a standard modern web SPA optimized for real-time canvas rendering and physics simulation. No SSR framework is needed -- this is a client-heavy interactive toy, not a content site.

**Core technologies:**
- **React 19 + Vite 6:** UI framework and build tool. Component model fits the two-view structure (toy + gallery). Vite's fast HMR is critical for physics tuning iteration.
- **2D Physics Engine (Matter.js or Rapier):** Ragdoll simulation with joints, gravity, and collision. Matter.js is simpler and has better documentation/community examples. Rapier (WASM) has better performance for complex joint chains at 60fps. **Decision needed:** STACK.md recommends Rapier for performance; ARCHITECTURE.md uses Matter.js for simplicity. Recommendation: start with Matter.js for faster prototyping. If 5 ragdolls at 60fps on mid-range Android is not achievable, migrate to Rapier. The physics-render separation pattern makes this swap feasible.
- **PixiJS 8:** WebGL/WebGPU canvas renderer for smooth 60fps sprite rendering synced to physics body positions.
- **Supabase (Auth + PostgreSQL + Storage):** All-in-one backend. Avoids Firebase's content policy risk. Self-hostable if Supabase flags the content.
- **vite-plugin-pwa:** Service worker and manifest generation for PWA installability.
- **zustand + @tanstack/react-query:** Client state (physics mode, UI) and server state (gallery data, ratings) management.
- **Capacitor 6:** Android APK wrapper around the PWA when ready.

### Expected Features

**Must have (table stakes):**
- Physics ragdoll simulation with 2-5 cartoon characters, proper joints, gravity, and collision response
- Shake detection via DeviceMotion API with iOS permission flow handled correctly
- Touch/drag for manual ragdoll positioning
- Screenshot capture (canvas.toBlob()) for sharing
- User accounts (email/password via Supabase Auth) for gallery integrity
- Public gallery (grid of thumbnails, tap to expand, paginated)
- 1-5 star rating system on gallery submissions
- Mobile-first responsive layout
- PWA installability

**Should have (differentiators -- v1.x):**
- Replay clip capture (GIF via gif.js or WebM via MediaRecorder, with iOS-compatible fallback)
- Two physics modes (realistic vs. goofy/exaggerated) -- different parameter sets on same engine
- Haptic feedback on collisions (Android only via Vibration API)
- Slow-motion replay (time-scale multiplier on physics step)
- Gallery sorting/filtering (top rated, newest, trending)
- External sharing via Web Share API with OG meta preview images

**Defer (v2+):**
- Custom avatar/character builder (massive scope, delays launch)
- Real-time multiplayer (physics desync makes this impractical)
- In-app comments (moderation burden, legal risk with explicit content)
- Sound effects (nice polish, not essential)
- Gamification/leaderboards (changes incentive structure in harmful ways)

### Architecture Approach

The architecture cleanly separates into two layers: a client-side simulation layer (physics engine + renderer + input + capture, no network calls in the hot loop) and a server-side social layer (Supabase for auth, gallery data, and media storage). The simulation layer follows a one-way data flow: Device Input produces force vectors, Physics Engine consumes them and produces body state, Renderer reads body state and draws sprites. This separation means physics is testable without a canvas, rendering is swappable, and input can come from accelerometer or touch. The capture system is episodic (triggered by user action), reading from the canvas to produce blobs that feed into the upload pipeline.

**Major components:**
1. **Physics Engine** (physics/) -- Ragdoll body factory, world setup, fixed-timestep step loop, mode configs, force application. Completely isolated from rendering and UI.
2. **Rendering Engine** (rendering/) -- PixiJS application, sprite management, physics-to-sprite sync. Reads physics state, never writes to it.
3. **Device Input** (input/) -- DeviceMotion wrapper with iOS permission flow, shake detector with noise filtering, touch/drag handler. Produces normalized force vectors.
4. **Media Capture** (capture/) -- Screenshot via toBlob, replay recording (frame-by-frame GIF with gif.js worker, or MediaRecorder where supported), Web Share API integration.
5. **Gallery + Auth** (gallery/, auth/) -- Standard React feature modules consuming Supabase client. RLS-protected database operations.
6. **Supabase Backend** -- Auth (GoTrue), PostgreSQL (profiles, submissions, ratings tables), Storage (public bucket for gallery media), optional Edge Functions for thumbnails/aggregation.

### Critical Pitfalls

1. **iOS DeviceMotion permission is a one-shot gate.** If the user denies motion permission, it is permanently denied with no programmatic recovery. Must show a pre-permission explainer screen and wire the request directly to a user gesture handler. Provide touch/drag fallback for denied users. **Address in Phase 3 (Device Input).**

2. **canvas.captureStream() is broken on iOS Safari.** The standard MediaRecorder pipeline does not work on the largest mobile demographic. Must use frame-by-frame GIF encoding (gif.js with Web Workers) as the primary cross-browser recording approach, not WebM/captureStream. **Address in Phase 4 (Media Capture) -- architect for iOS from the start.**

3. **Variable timestep causes physics chaos.** Using requestAnimationFrame's delta directly as the physics step makes ragdolls behave differently on every device and explode when returning from a background tab. Must implement fixed-timestep accumulator from day one -- retrofitting is extremely painful. **Address in Phase 1 (Physics Simulation).**

4. **iOS Safari canvas memory limits.** Hard pixel limit of ~16.7M pixels per canvas and ~384MB total canvas memory. High-DPI phones (3x) hit this quickly. Must cap devicePixelRatio to 2x and reuse canvases instead of creating duplicates. **Address in Phase 1 and Phase 4.**

5. **Content hosting termination.** Mainstream hosting providers will flag or terminate accounts hosting explicit UGC. Must choose hosting providers that explicitly allow adult content (OVH, BuyVM), use Cloudflare for CDN (they do not police legal content), and have a migration runbook ready. Must also implement age gate and ToS before gallery goes public. **Address before any deployment (Phase 0/infrastructure).**

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Physics Simulation Core
**Rationale:** Everything depends on the physics feeling right. This is the product. It has zero external dependencies and can be built and tested in isolation.
**Delivers:** Ragdoll factory (composite bodies with joints), physics world with fixed-timestep game loop, realistic mode parameter set, force application API, stability safeguards (velocity clamping, joint limits, explosion detection).
**Addresses:** Physics simulation (P1), touch/drag positioning (P1).
**Avoids:** Variable timestep pitfall (Pitfall 3), ragdoll joint explosion (Pitfall 5 from STACK research).

### Phase 2: Rendering Layer
**Rationale:** Depends on Phase 1 (needs physics bodies to position sprites). First visual output -- transforms the simulation from abstract to tangible.
**Delivers:** PixiJS application setup, character sprite loading/management, physics-to-sprite sync loop, canvas setup with DPI capping for iOS safety.
**Addresses:** Canvas rendering at 60fps (P1), character selection (P1), mobile-responsive layout (P1).
**Avoids:** iOS canvas memory limits (Pitfall 4), physics coupled to UI framework anti-pattern.

### Phase 3: Device Input + Interaction
**Rationale:** Depends on Phase 1 (needs physics API to apply forces). Makes the toy interactive -- users can now shake and pose ragdolls.
**Delivers:** DeviceMotion wrapper with iOS permission flow, shake detection with noise filtering, touch/drag handler, haptic feedback (progressive enhancement), pre-permission explainer UI.
**Addresses:** Shake detection (P1), touch/drag (P1), haptic feedback (P2).
**Avoids:** iOS DeviceMotion permission denial loop (Pitfall 1).

### Phase 4: Media Capture + Sharing
**Rationale:** Depends on Phase 2 (needs canvas to capture). Enables the shareable output that makes the social loop possible.
**Delivers:** Screenshot capture (canvas.toBlob), replay clip recording (gif.js with Web Workers as primary, MediaRecorder as enhancement where supported), capture preview UI, Web Share API integration with download fallback.
**Addresses:** Screenshot capture (P1), replay clip capture (P2), choose screenshot or clip (P2), external sharing (P2).
**Avoids:** captureStream() iOS incompatibility (Pitfall 2), GIF encoding performance death spiral (Pitfall 6), blocking main thread with encoding (anti-pattern 5).

### Phase 5: Backend + Auth + Infrastructure
**Rationale:** Independent of Phases 1-4 (can be built in parallel). Must be complete before gallery goes live. Infrastructure hosting decisions must be made before any deployment.
**Delivers:** Supabase project (auth, database schema, storage buckets), user registration/login, age gate, Terms of Service page, content report mechanism, RLS policies, hosting infrastructure on content-friendly providers.
**Addresses:** User accounts (P1), infrastructure safety.
**Avoids:** Content hosting termination (Pitfall 5), legal exposure without age gate (Pitfall 7), Supabase RLS gotchas.

### Phase 6: Gallery + Social Loop
**Rationale:** Depends on Phase 4 (capture pipeline) + Phase 5 (backend). This is where creation meets audience. Completes the product.
**Delivers:** Gallery submission flow (capture -> upload -> metadata), gallery browsing (grid with thumbnails, tap to expand), 1-5 star rating with server-side duplicate prevention, gallery sorting (newest, top rated, trending), OG meta tags for link previews.
**Addresses:** Public gallery (P1), star ratings (P1), gallery sorting (P2), link sharing with previews (P2).
**Avoids:** Gallery loading full-size images (performance trap), rating manipulation (security mistake), no empty state (UX pitfall).

### Phase 7: PWA + Android APK
**Rationale:** Wraps everything. Service worker, manifest, offline support for the toy (gallery requires network). Android APK is a Capacitor WebView wrapper.
**Delivers:** PWA installability, service worker with appropriate cache strategies, offline physics toy mode, Android APK with correct manifest permissions.
**Addresses:** PWA setup (P1), Android APK (P2).
**Avoids:** PWA cache staleness (Pitfall 6 from STACK research), Android WebView sensor permission gotcha.

### Phase Ordering Rationale

- **Physics before rendering:** Physics is the foundation. It can be tested headless (log body positions). Rendering just visualizes physics state.
- **Rendering before input:** Need to see the ragdolls to know if input forces feel right. Visual feedback loop is essential for tuning.
- **Input before capture:** Capture is meaningless without interactive content to capture.
- **Backend parallel to client:** No dependency between Supabase setup and client-side physics/rendering. Can be built simultaneously by different work streams.
- **Gallery last (of core features):** Gallery connects capture output to backend. Both must be complete first.
- **PWA last:** Wraps the complete app. Service worker and manifest are finishing touches, not architecture.
- **Phases 1-4 are strictly sequential** (each depends on the prior). **Phase 5 is parallel** with 1-4. **Phase 6 depends on 4+5**. **Phase 7 depends on all**.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Physics Simulation):** Matter.js vs. Rapier decision needs benchmarking on target devices. Ragdoll joint configuration (body part proportions, joint limits, constraint stiffness) is domain-specific and requires iterative tuning. Research the "Gaffer on Games" fixed-timestep accumulator pattern in detail.
- **Phase 4 (Media Capture):** Cross-browser recording is a minefield. gif.js worker setup, WebCodecs API for H.264, animated WebP feasibility, and iOS Safari canvas limitations all need prototyping before committing to an approach. This phase has the highest technical uncertainty.
- **Phase 5 (Infrastructure):** Content-friendly hosting selection requires reading actual ToS documents. Supabase's acceptable use policy for explicit cartoon content needs explicit verification (ideally via support ticket). Legal requirements for age gate vary by jurisdiction.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Rendering):** PixiJS sprite rendering synced to physics bodies is well-documented with many examples (Matter.js + PixiJS integration patterns exist on GitHub).
- **Phase 3 (Device Input):** DeviceMotion API is well-documented on MDN. iOS permission flow is thoroughly documented in community posts.
- **Phase 6 (Gallery):** Standard CRUD + file upload + pagination. Supabase documentation covers all patterns needed.
- **Phase 7 (PWA):** vite-plugin-pwa handles the heavy lifting. Capacitor WebView wrapper is well-documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | React + Vite + PixiJS + Supabase is a well-proven combination. Physics engine choice (Matter.js vs Rapier) is the only open question -- both are viable. |
| Features | HIGH | Feature landscape is clear. Table stakes and differentiators are well-defined. Anti-features are correctly identified. Competitive analysis shows a genuine gap in the market. |
| Architecture | HIGH | Physics-render separation, episodic capture pipeline, and Supabase backend are established patterns with strong documentation. Build order is dictated by hard dependencies. |
| Pitfalls | HIGH | Research identified specific, verified pitfalls with browser bug tracker references and community post-mortems. iOS Safari limitations are the highest-risk area and are well-documented. |

**Overall confidence:** HIGH

### Gaps to Address

- **Matter.js vs. Rapier performance on mobile:** Needs actual benchmarking with 5 ragdolls on a mid-range Android device. Neither research file provides measured frame times. Start with Matter.js; switch if needed.
- **Supabase content policy for explicit cartoons:** Supabase's ToS is more permissive than Firebase, but explicit verification for adult cartoon content has not been done. Contact Supabase support or have a self-hosting migration plan ready.
- **GIF vs. WebM vs. animated WebP for clips:** The optimal recording format depends on browser support matrix at time of implementation and file size targets. Needs prototyping on target devices.
- **Legal requirements for age gate by jurisdiction:** The pitfalls research flags this as important but does not provide specific legal guidance. A legal review is recommended before gallery launch.
- **Character art assets:** No research covers art style, sprite sheet format, or character design. This is a creative/design task, not a technical research gap, but it needs to be addressed before Phase 2.

## Sources

### Primary (HIGH confidence)
- MDN Web Docs -- DeviceMotionEvent, MediaRecorder, Canvas API, Web Share API, Service Worker, PWA requirements
- Rapier official documentation (rapier.rs) -- physics engine capabilities, WASM setup, joint constraints
- Matter.js official docs (brm.io/matter-js) -- constraint/joint documentation, engine configuration
- PixiJS official docs (pixijs.com) -- v8 rendering pipeline, performance tips
- Supabase documentation -- Auth architecture, Storage access control, RLS policies
- Gaffer on Games -- "Fix Your Timestep" fixed-timestep accumulator pattern

### Secondary (MEDIUM confidence)
- PQINA blog -- iOS Safari canvas memory limits (verified against community reports)
- Cloudflare Community Forums -- adult content CDN policy (community-sourced, not official policy doc)
- Apple Developer Forums -- DeviceMotion permission caching behavior
- Chrome bug tracker -- MediaRecorder + canvas.captureStream() limitations
- Can I Use -- WebCodecs, MediaRecorder browser compatibility
- LowEndTalk community -- adult-friendly VPS hosting recommendations

### Tertiary (LOW confidence)
- Competitive app analysis (Ragdoll Playground, People Playground, Physics! Fun) -- feature comparison based on public descriptions, not hands-on testing
- Adult hosting provider recommendations -- community consensus, ToS should be re-verified at time of purchase
- Legal requirements for age gates -- general knowledge, not jurisdiction-specific legal advice

---
*Research completed: 2026-03-05*
*Ready for roadmap: yes*
