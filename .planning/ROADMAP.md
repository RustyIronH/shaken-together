# Roadmap: Shaken Together

## Overview

Shaken Together is a physics ragdoll toy meets social sharing game. The roadmap builds physics-first (the core value is "shaking must feel satisfying"), layers on rendering and input to make it playable, adds capture and sharing to make it shareable, then connects it to a backend gallery with accounts and ratings. Infrastructure and accounts are built in parallel with the client-side work since they have no dependency on the physics/rendering pipeline. The final phase wraps everything as a PWA and Android APK for distribution outside app stores.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

**Parallelization:**
- Phases 1-5 are sequential (each depends on prior)
- Phase 6 is parallel with Phases 1-5 (no client dependency)
- Phase 7 depends on Phase 6 only (parallel with Phases 1-5)
- Phase 8 depends on Phases 5 + 7 (capture pipeline + accounts ready)
- Phase 9 depends on Phase 8
- Phase 10 depends on Phase 9

- [x] **Phase 1: Physics Simulation** - Ragdoll bodies, joints, gravity, collision, fixed-timestep game loop, two physics modes
- [x] **Phase 2: Rendering Engine** - PixiJS sprite rendering synced to physics, character sprites, mobile-first responsive canvas
- [ ] **Phase 3: Device Input** - Shake detection via DeviceMotion, iOS permission flow, touch/drag fallback
- [ ] **Phase 4: Screenshot Capture** - Screenshot of ragdoll positions with capture preview
- [x] **Phase 5: Replay Clips + Sharing** - Animated GIF replay recording, screenshot-or-clip chooser, Web Share API, OG meta previews (completed 2026-03-06)
- [ ] **Phase 6: Infrastructure + Legal** - Content-friendly hosting, Docker deployment, HTTPS (parallel with Phases 1-5)
- [ ] **Phase 7: User Accounts** - Email/password signup, login, session persistence, logout (parallel with Phases 1-5)
- [ ] **Phase 8: Gallery Core** - Submit creations to public gallery, browse thumbnails, view full-size
- [ ] **Phase 9: Gallery Social** - Star ratings, average rating display, sort by newest/top/trending
- [ ] **Phase 10: PWA + Android APK** - PWA installability with service worker, Android APK via Capacitor WebView

## Phase Details

### Phase 1: Physics Simulation
**Goal**: Users have a working ragdoll physics sandbox -- cartoon characters with joints respond to forces, maintain stability at 60fps, and support two distinct physics personalities
**Depends on**: Nothing (first phase)
**Requirements**: PHYS-01, PHYS-02, PHYS-03, PHYS-04, PHYS-05, PHYS-06
**Success Criteria** (what must be TRUE):
  1. User sees 2-5 ragdoll characters on screen with visible joints, gravity pulling them down, and bodies colliding with each other and boundaries
  2. User can select how many dolls appear (2-5) and the scene updates accordingly
  3. User can switch between Realistic mode (natural weight, damping) and Goofy mode (bouncy, stretchy, exaggerated) and see an obvious difference in how ragdolls behave
  4. Physics runs at a stable 60fps on a mid-range mobile device without ragdolls exploding or passing through walls
  5. User can reset the scene to get fresh random positions, and can touch/drag individual ragdolls to reposition them
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md -- Scaffold Vite project, define types/constants, create test stubs
- [x] 01-02-PLAN.md -- Physics engine, ragdoll factory, angle constraints, world management
- [x] 01-03-PLAN.md -- Debug Canvas2D renderer and multi-touch drag/fling system
- [x] 01-04-PLAN.md -- UI control panel, main.ts integration, human verification

### Phase 2: Rendering Engine
**Goal**: The physics simulation is visually represented with cartoon character sprites on a responsive mobile canvas
**Depends on**: Phase 1
**Requirements**: RNDR-01, RNDR-02, RNDR-03, PLAT-03
**Success Criteria** (what must be TRUE):
  1. Ragdolls render as recognizable cartoon character sprites (3-4 pre-made characters) whose limbs follow the physics body positions
  2. User can choose which cartoon characters appear in the scene before shaking
  3. Canvas renders smoothly at 60fps with WebGL acceleration on mobile browsers (Chrome, Safari)
  4. Layout is mobile-first and responsive in portrait orientation, filling the screen appropriately on different phone sizes
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md -- PixiJS foundation, 4 character definitions, RagdollSprite class
- [x] 02-02-PLAN.md -- Renderer integration, physics-to-sprite sync, visual effects
- [x] 02-03-PLAN.md -- Character selection UI, assignment logic, responsive layout
- [x] 02-04-PLAN.md -- Human verification of rendering engine

### Phase 3: Device Input
**Goal**: Users can shake their phone to fling ragdolls around, with graceful permission handling and a fallback for users who deny motion access
**Depends on**: Phase 1 (needs physics force API), Phase 2 (needs visual feedback)
**Requirements**: INPT-01, INPT-02, INPT-03
**Success Criteria** (what must be TRUE):
  1. User shakes their phone and ragdolls fly around responding to the direction and intensity of the shake
  2. On iOS, user sees a clear explainer screen before the DeviceMotion permission prompt, explaining why motion access is needed
  3. Users who deny motion permission (or use unsupported browsers) can still play by touching and dragging ragdolls to fling them
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md -- Shake manager: DeviceMotion API, accelerometer smoothing, gravity mapping, Goofy amplification, gravity lerp, body wake-up
- [ ] 03-02-PLAN.md -- Hold-to-shake fallback button, onboarding hint, human verification

### Phase 4: Screenshot Capture
**Goal**: Users can freeze the current ragdoll positions and capture a clean screenshot for sharing
**Depends on**: Phase 2 (needs canvas to capture from)
**Requirements**: CAPT-01, CAPT-04
**Success Criteria** (what must be TRUE):
  1. User taps a capture button and gets a screenshot of the current ragdoll positions with no UI chrome (buttons, overlays) visible in the image
  2. User sees a preview of the captured screenshot before deciding to share or discard it
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md -- Screenshot capture module, capture button FAB, shake button repositioning
- [ ] 04-02-PLAN.md -- Capture preview overlay, main.ts wiring, human verification

### Phase 5: Replay Clips + Sharing
**Goal**: Users can capture animated replays of the last few seconds of shaking and share their creations (screenshots or clips) via native sharing or file download
**Depends on**: Phase 4 (extends capture system)
**Requirements**: CAPT-02, CAPT-03, SHAR-01
**Success Criteria** (what must be TRUE):
  1. User can capture a replay clip (last 3-5 seconds of shaking) as an animated GIF that plays back the ragdoll action
  2. When sharing, user can choose between their screenshot or their replay clip
  3. User can share their creation via the native share sheet (Web Share API) or download fallback
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md -- Replay buffer + GIF encoder with TDD (gifenc, circular frame buffer, encoding)
- [x] 05-02-PLAN.md -- Share utility with Web Share API fallback chain, toast notifications, capture overlay rewrite with Photo/Clip tabs
- [x] 05-03-PLAN.md -- Main.ts wiring (replay buffer in ticker, capture flow update), human verification

### Phase 6: Infrastructure + Legal
**Goal**: The app is deployed on content-friendly hosting with a full-stack Docker container (Node.js/Express + Vite frontend + SQLite) on a VPS at shaken.ironhaven.com.au
**Depends on**: Nothing (parallel with Phases 1-5)
**Requirements**: INFR-03
**Success Criteria** (what must be TRUE):
  1. App is deployed in a Docker container on a VPS and accessible at shaken.ironhaven.com.au
  2. Single container serves both the Vite frontend and Express backend API from the same origin
  3. HTTPS is configured with valid certificate
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md -- Express server, Docker build pipeline, Caddy config, server tests
- [ ] 06-02-PLAN.md -- VPS deployment, DNS configuration, HTTPS verification

### Phase 7: User Accounts
**Goal**: Users can create accounts, log in, and maintain sessions -- required for gallery submissions and rating integrity
**Depends on**: Phase 6 (needs backend infrastructure)
**Requirements**: ACCT-01, ACCT-02, ACCT-03
**Success Criteria** (what must be TRUE):
  1. User can create an account with email and password
  2. User can log in and their session persists across browser refreshes and revisits
  3. User can log out from any screen in the app
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Gallery Core
**Goal**: Users can submit their creations to a public gallery and browse what others have made
**Depends on**: Phase 5 (capture pipeline), Phase 7 (user accounts for submission identity)
**Requirements**: GLRY-01, GLRY-02, GLRY-03, SHAR-02
**Success Criteria** (what must be TRUE):
  1. Logged-in user can submit their screenshot or clip to the public gallery with one tap
  2. Any user can browse the public gallery as a grid of thumbnails
  3. User can tap any gallery thumbnail to view the creation full-size
  4. When a shared gallery link is pasted into a chat or social media, it shows an OG meta preview image of the creation
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

### Phase 9: Gallery Social
**Goal**: Users can rate gallery items and discover content through sorting -- completing the social feedback loop
**Depends on**: Phase 8
**Requirements**: GLRY-04, GLRY-05, GLRY-06
**Success Criteria** (what must be TRUE):
  1. Logged-in user can rate any gallery item 1-5 stars, limited to one rating per user per item
  2. Each gallery item displays its average star rating
  3. Gallery can be sorted by newest, top rated, and trending
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

### Phase 10: PWA + Android APK
**Goal**: The app is installable as a PWA from mobile browsers and available as a side-loaded Android APK
**Depends on**: Phase 9 (wraps the complete app)
**Requirements**: PLAT-01, PLAT-02
**Success Criteria** (what must be TRUE):
  1. User visiting the app in a mobile browser sees a PWA install prompt and can install the app to their home screen
  2. Android users can install a side-loaded APK that runs the full app in a WebView with proper sensor permissions
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

## Progress

**Execution Order:**
Phases 1-5 execute sequentially. Phases 6-7 execute in parallel with 1-5. Phase 8 starts when both Phase 5 and Phase 7 are complete. Phases 8-10 execute sequentially.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Physics Simulation | 4/4 | Complete | 2026-03-05 |
| 2. Rendering Engine | 4/4 | Complete | 2026-03-05 |
| 3. Device Input | 1/2 | In Progress|  |
| 4. Screenshot Capture | 0/2 | Not started | - |
| 5. Replay Clips + Sharing | 3/3 | Complete   | 2026-03-06 |
| 6. Infrastructure + Legal | 0/2 | Planning | - |
| 7. User Accounts | 0/0 | Not started | - |
| 8. Gallery Core | 0/0 | Not started | - |
| 9. Gallery Social | 0/0 | Not started | - |
| 10. PWA + Android APK | 0/0 | Not started | - |
