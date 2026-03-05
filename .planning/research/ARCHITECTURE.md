# Architecture Research

**Domain:** Physics ragdoll toy PWA with social sharing backend
**Researched:** 2026-03-05
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
CLIENT (PWA - runs entirely in browser)
============================================================
  Presentation Layer
  +-----------+  +-----------+  +-------------+  +--------+
  | UI Shell  |  | Gallery   |  | Auth Views  |  | Share  |
  | (React)   |  | Views     |  | (Login/Reg) |  | Flow   |
  +-----+-----+  +-----+-----+  +------+------+  +---+----+
        |              |               |              |
  ------+--------------+---------------+--------------+------
  Simulation Layer
  +-------------------+    +-------------------+
  | Physics Engine    |    | Rendering Engine  |
  | (Matter.js)       |--->| (PixiJS)          |
  | Bodies, Joints,   |    | Sprites, Textures |
  | Constraints       |    | Animation         |
  +--------+----------+    +--------+----------+
           |                        |
  +--------+----------+    +--------+----------+
  | Device Motion     |    | Media Capture     |
  | (Shake Input)     |    | (Screenshot/Clip) |
  +-------------------+    +-------------------+

============================================================
BACKEND (Supabase - managed services)
  +-------------+  +-------------+  +-------------+
  | Auth        |  | Database    |  | Storage     |
  | (GoTrue)    |  | (PostgreSQL)|  | (S3-compat) |
  | JWT tokens  |  | Gallery,    |  | Images,     |
  | OAuth flows |  | Ratings,    |  | Clips       |
  +-------------+  | Users       |  +-------------+
                    +-------------+
                          |
                    +-------------+
                    | Edge Funcs  |
                    | (Optional)  |
                    | Thumbnails, |
                    | Aggregation |
                    +-------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Physics Engine** | Simulate ragdoll bodies with joints, apply forces from device motion, detect collisions, manage two physics modes | Matter.js with composite bodies, revolute constraints for limbs, configurable world parameters |
| **Rendering Engine** | Draw ragdoll sprites on canvas at 60fps, sync sprite positions to physics body positions, handle texture atlases | PixiJS with sprite sheets, animation ticker synced to Matter.js body positions/rotations |
| **Device Motion Controller** | Read accelerometer/gyroscope data, detect shake gestures, translate device movement into physics forces | DeviceMotionEvent API with permission flow, low-pass filter for shake detection, force multiplier |
| **Media Capture** | Screenshot current canvas state, record short replay clips as video/GIF | canvas.toBlob() for screenshots, canvas.captureStream() + MediaRecorder for video, gif.js for GIF fallback |
| **UI Shell** | App chrome, mode selection, doll count picker, navigation between toy and gallery | React SPA with minimal state, responsive layout |
| **Gallery Views** | Browse submissions, view details, rate content, filter/sort | React components consuming Supabase real-time queries |
| **Auth Module** | User registration, login, session management | Supabase Auth (email/password), JWT stored client-side |
| **Share Flow** | Orchestrate capture -> upload -> create gallery entry pipeline | Multi-step flow: capture media, upload to storage, write metadata to DB |
| **Backend Auth** | User identity, session tokens, account management | Supabase GoTrue (email auth, optional OAuth) |
| **Backend Database** | Store gallery entries, ratings, user profiles | Supabase PostgreSQL with RLS policies |
| **Backend Storage** | Host uploaded screenshots and video clips | Supabase Storage (S3-compatible) with public bucket for gallery media |
| **Edge Functions** | Optional server-side processing (thumbnail generation, rating aggregation) | Supabase Edge Functions (Deno-based) |

## Recommended Project Structure

```
src/
  app/                     # App shell and routing
    App.tsx                # Root component, router
    routes.tsx             # Route definitions
  physics/                 # Physics simulation (isolated, no UI dependencies)
    engine.ts              # Matter.js world setup, step loop
    ragdoll.ts             # Ragdoll body factory (composite bodies + constraints)
    modes.ts               # Physics mode configs (realistic vs goofy)
    forces.ts              # Force application from device input
  rendering/               # PixiJS rendering (reads from physics, writes to canvas)
    renderer.ts            # PixiJS app setup, ticker
    sprites.ts             # Sprite creation, texture loading
    sync.ts                # Sync sprite positions to physics body positions
  input/                   # Device motion and user input
    device-motion.ts       # DeviceMotion API wrapper with permission handling
    shake-detector.ts      # Shake gesture detection algorithm
    touch.ts               # Touch/drag for manual posing
  capture/                 # Media capture pipeline
    screenshot.ts          # canvas.toBlob() screenshot capture
    recorder.ts            # MediaRecorder-based video clip capture
    gif-encoder.ts         # gif.js fallback for GIF generation
    share.ts               # Web Share API integration + download fallback
  gallery/                 # Gallery feature
    components/            # Gallery UI components
    hooks/                 # Data fetching hooks (useGalleryFeed, useRatings)
    types.ts               # Gallery data types
  auth/                    # Authentication
    components/            # Login/Register forms
    hooks/                 # useAuth, useSession
    guard.tsx              # Route protection component
  lib/                     # Shared utilities
    supabase.ts            # Supabase client singleton
    storage.ts             # Upload helpers
    constants.ts           # App-wide constants
  assets/                  # Static assets
    spritesheets/          # Character sprite atlases
    textures/              # Background textures
public/
  manifest.json            # PWA manifest
  sw.js                    # Service worker (Workbox-generated)
  icons/                   # PWA icons
```

### Structure Rationale

- **physics/:** Completely isolated from rendering. Physics engine produces body positions; rendering consumes them. This separation means physics logic is testable without a canvas and could be moved to a Web Worker later.
- **rendering/:** Owns the PixiJS application and canvas. The only module that touches the DOM canvas element. Reads physics state each frame but never writes to it.
- **input/:** Abstracts all input sources (accelerometer, touch). Produces normalized force vectors that the physics module consumes. Isolating input handling keeps the permission flow (especially iOS DeviceMotion) contained.
- **capture/:** Owns the entire screenshot/clip pipeline. Reads from the rendering canvas, produces blobs. Separate from rendering because capture is an episodic operation, not a per-frame concern.
- **gallery/ and auth/:** Standard feature modules. Keep backend interaction here, not scattered through physics/rendering code.

## Architectural Patterns

### Pattern 1: Separated Physics and Rendering

**What:** Physics simulation and visual rendering are independent systems connected by a one-way data flow. Physics produces body state (position, rotation); rendering reads that state to position sprites. Rendering never writes back to physics.
**When to use:** Always, for this type of project. This is the standard pattern for 2D games using Matter.js + PixiJS.
**Trade-offs:** Slight complexity in syncing two systems vs. a single integrated engine, but massive gains in testability, performance isolation, and the ability to swap either system independently.

**Example:**
```typescript
// physics/engine.ts - produces state
const engine = Matter.Engine.create();
const runner = Matter.Runner.create({ delta: 1000 / 60 }); // Fixed timestep
Matter.Runner.run(runner, engine);

// rendering/sync.ts - consumes state
pixiApp.ticker.add(() => {
  for (const [bodyId, sprite] of bodyToSpriteMap) {
    const body = bodies.get(bodyId);
    sprite.position.set(body.position.x, body.position.y);
    sprite.rotation = body.angle;
  }
});
```

### Pattern 2: Permission-Gated Input Pipeline

**What:** Device motion access requires explicit user permission (especially iOS 13+). The input module wraps this in a state machine: idle -> requesting -> granted/denied. The physics module never knows about permissions; it just receives force vectors when they arrive.
**When to use:** Any time you use DeviceMotion API. iOS Safari requires a user-gesture-triggered permission request over HTTPS.
**Trade-offs:** Adds a permission UI step before the fun starts, but there is no alternative on iOS.

**Example:**
```typescript
// input/device-motion.ts
export async function requestMotionPermission(): Promise<boolean> {
  if (typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function') {
    // iOS path - must be called from user gesture handler
    const permission = await (DeviceMotionEvent as any).requestPermission();
    return permission === 'granted';
  }
  // Android/desktop - permission granted by default
  return true;
}
```

### Pattern 3: Episodic Capture Pipeline

**What:** Media capture (screenshot/clip) is an event-driven pipeline triggered by user action, not a continuous per-frame process. The pipeline reads the canvas at the moment of capture, produces a Blob, and hands it to the upload/share flow.
**When to use:** Screenshot and clip capture. Do not continuously record -- it wastes resources.
**Trade-offs:** Screenshots are instant (toBlob). Video clips require a rolling buffer approach where you always keep the last N seconds recorded and discard older data, or you start/stop recording around the shake action.

**Example:**
```typescript
// capture/screenshot.ts
export async function captureScreenshot(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Screenshot capture failed'));
    }, 'image/png');
  });
}

// capture/recorder.ts - rolling buffer for "last N seconds"
export class ReplayRecorder {
  private mediaRecorder: MediaRecorder;
  private chunks: Blob[] = [];
  private maxDurationMs = 5000;

  start(canvas: HTMLCanvasElement) {
    const stream = canvas.captureStream(30);
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    this.mediaRecorder.ondataavailable = (e) => this.chunks.push(e.data);
    this.mediaRecorder.start(1000); // Chunk every second
  }

  async capture(): Promise<Blob> {
    // Stop, collect chunks, trim to last N seconds
    this.mediaRecorder.stop();
    return new Blob(this.chunks.slice(-this.maxDurationMs / 1000),
                    { type: 'video/webm' });
  }
}
```

## Data Flow

### Core Game Loop Flow

```
DeviceMotion Event (accelerometer)
    |
    v
Shake Detector (filter noise, detect gesture)
    |
    v
Force Vector {x, y, magnitude}
    |
    v
Physics Engine (Matter.js)
  - Apply forces to ragdoll bodies
  - Step simulation (fixed timestep)
  - Resolve collisions, constraints
    |
    v
Body State Map {id -> {x, y, angle}}
    |
    v
Rendering Engine (PixiJS)
  - Read body positions
  - Update sprite transforms
  - Draw frame to canvas
    |
    v
Canvas (visible to user)
```

### Media Capture Flow

```
User taps "Capture"
    |
    +---> Screenshot path:
    |       canvas.toBlob() -> PNG Blob -> Upload or Share
    |
    +---> Clip path:
            ReplayRecorder.capture() -> WebM Blob -> Upload or Share
```

### Gallery Submission Flow

```
Capture Blob (PNG or WebM)
    |
    v
Upload to Supabase Storage
    |  (returns public URL)
    v
Insert gallery_submissions row
    {user_id, media_url, media_type, created_at}
    |
    v
Gallery Feed query picks it up
    (sorted by created_at or avg_rating)
```

### Rating Flow

```
User views gallery item -> taps star rating
    |
    v
Upsert ratings row
    {user_id, submission_id, score}
    |
    v
Database trigger or Edge Function
    recalculates avg_rating on submission
    |
    v
Gallery feed reflects updated score
```

### Key Data Flows

1. **Device -> Physics -> Render:** The hot path. Runs every frame (60fps). Must be fast. No async operations, no network calls, no allocations in the loop.
2. **Capture -> Upload -> Gallery:** The cold path. Runs on user action. Can be async, show loading states, handle errors gracefully.
3. **Gallery -> Rate -> Update:** Standard CRUD. Supabase handles via RLS-protected inserts and real-time subscriptions for live updates.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Supabase free/pro tier handles everything. Single PostgreSQL instance. Storage with direct public URLs. No CDN needed. |
| 1k-10k users | Add Supabase CDN for media assets. Implement pagination on gallery queries. Add database indexes on avg_rating and created_at. Consider thumbnail generation via Edge Function on upload. |
| 10k-100k users | Gallery queries become the bottleneck. Add materialized views for leaderboards/trending. Implement client-side caching of gallery pages. Consider moving to Supabase Pro with dedicated database resources. |
| 100k+ users | Unlikely for this product scope, but: CDN for all media, read replicas for gallery queries, rate limiting on submissions, and consider moving storage to Cloudflare R2 for cost. |

### Scaling Priorities

1. **First bottleneck:** Gallery image loading. Many users browsing = many image requests. Fix with CDN, lazy loading, thumbnail generation, and aggressive browser caching.
2. **Second bottleneck:** Gallery query performance. Sorting by rating with many rows. Fix with database indexes and materialized views for "top rated" and "recent" feeds.

## Anti-Patterns

### Anti-Pattern 1: Physics in the Render Loop

**What people do:** Call `Matter.Engine.update()` inside the PixiJS ticker callback with variable delta time.
**Why it's wrong:** Physics simulations need fixed timesteps for deterministic behavior. Variable delta causes jittery, inconsistent physics -- ragdolls will behave differently at different frame rates.
**Do this instead:** Use `Matter.Runner` with a fixed delta (1000/60), or implement a fixed-timestep accumulator. Let PixiJS render at whatever rate the browser provides, interpolating body positions between physics steps.

### Anti-Pattern 2: Continuous Recording

**What people do:** Start MediaRecorder when the app opens and keep recording everything, trimming to the last N seconds on capture.
**Why it's wrong:** Continuous video encoding burns CPU and battery. On mid-range phones this will tank physics/rendering performance.
**Do this instead:** Use a circular buffer approach: start recording when the user begins shaking (detected by the shake detector), stop a few seconds after shaking ends. Only encode when there is actual content worth capturing.

### Anti-Pattern 3: Uploading Full-Resolution Media

**What people do:** Upload the raw canvas screenshot (which could be 1080p+ on modern phones) and the uncompressed video clip directly.
**Why it's wrong:** Wastes storage, slows gallery loading, burns user bandwidth.
**Do this instead:** Resize screenshots client-side before upload (800px max width is plenty for a gallery card). Compress video clips. Generate a small thumbnail client-side for gallery grid view.

### Anti-Pattern 4: Coupling Physics to UI Framework

**What people do:** Put physics setup, body creation, and force application inside React components with useEffect.
**Why it's wrong:** Physics must run independently of React's render cycle. React re-renders cause physics state resets or duplication. The game loop must not be interrupted by UI state changes.
**Do this instead:** Initialize physics outside React. Expose a thin API (start, stop, applyForce, getState). React components interact via this API, not by owning physics objects.

### Anti-Pattern 5: Blocking the Main Thread with GIF Encoding

**What people do:** Encode GIFs synchronously on the main thread using gif.js or similar.
**Why it's wrong:** GIF encoding is CPU-intensive and will freeze the UI for several seconds on mobile devices.
**Do this instead:** gif.js supports Web Worker-based encoding out of the box. Always use the worker mode. Better yet, prefer WebM video via MediaRecorder (hardware-accelerated) and only fall back to GIF when WebM is not supported.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `@supabase/supabase-js` client, JWT in memory | Email/password auth. No OAuth needed for v1. Session auto-refresh handled by SDK. |
| Supabase Database | Same JS client, real-time subscriptions for gallery | RLS policies enforce user-scoped writes. Public reads for gallery. |
| Supabase Storage | Same JS client, upload via `storage.from('media').upload()` | Public bucket for gallery media. Set max file size policy server-side. |
| DeviceMotion API | Browser API, permission gated on iOS | Must be triggered by user gesture. HTTPS required. Fallback needed for desktop (mouse drag). |
| Web Share API | `navigator.share()` with File objects | Supported on mobile Chrome/Safari. Fallback to download link on desktop/unsupported browsers. |
| MediaRecorder API | Browser API, `canvas.captureStream()` | WebM on Chrome, MP4 on Safari. Check `MediaRecorder.isTypeSupported()` before use. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Input -> Physics | Function call: `applyForce(vector)` | Synchronous, every frame. Input module calls physics API directly. |
| Physics -> Rendering | Read-only state: `getBodies() -> Map<id, {x,y,angle}>` | Rendering reads physics state each frame. Never writes back. |
| Rendering -> Capture | Canvas element reference: `getCanvas() -> HTMLCanvasElement` | Capture module accesses canvas directly for toBlob/captureStream. |
| Capture -> Backend | Async upload: `uploadMedia(blob) -> Promise<url>` | Crosses network boundary. Must handle errors, retries, loading states. |
| UI Shell -> Physics | Lifecycle API: `start(), stop(), setMode(), setDollCount()` | React controls physics configuration but does not own physics state. |
| UI Shell -> Gallery | React hooks: `useGalleryFeed(), useSubmission()` | Standard React data fetching patterns. Supabase real-time for live updates. |

## Build Order (Dependencies)

Components must be built in this order due to hard dependencies:

```
Phase 1: Physics Simulation (standalone)
  ragdoll.ts -> engine.ts -> modes.ts -> forces.ts
  Can be tested headless with Matter.js alone.
  No dependencies on rendering, input, or backend.

Phase 2: Rendering Layer
  Depends on: Phase 1 (needs physics bodies to position sprites)
  renderer.ts -> sprites.ts -> sync.ts
  First visible output. Connect PixiJS to Matter.js body state.

Phase 3: Device Input
  Depends on: Phase 1 (needs physics API to apply forces)
  device-motion.ts -> shake-detector.ts -> touch.ts
  Makes the toy interactive. Permission flow for iOS.

Phase 4: Media Capture
  Depends on: Phase 2 (needs canvas element to capture)
  screenshot.ts -> recorder.ts -> gif-encoder.ts -> share.ts
  Enables sharing. Web Share API + download fallback.

Phase 5: Backend & Auth
  Independent of Phases 1-4 (can be built in parallel)
  Supabase project setup, schema, RLS policies, storage buckets.
  Auth flow (registration, login, session).

Phase 6: Gallery & Social
  Depends on: Phase 4 (needs capture pipeline) + Phase 5 (needs backend)
  Gallery views, submission flow, rating system.
  Connects capture output to backend storage and database.

Phase 7: PWA Shell
  Depends on: All above (wraps everything)
  Service worker, manifest, offline caching, install prompt.
  Android APK is a WebView wrapper around the PWA URL.
```

## Database Schema (Supabase PostgreSQL)

```sql
-- Users managed by Supabase Auth (auth.users table)

create table public.profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  created_at timestamptz default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video', 'gif')),
  thumbnail_url text,
  avg_rating numeric(3,2) default 0,
  rating_count int default 0,
  created_at timestamptz default now()
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  submission_id uuid references public.submissions(id) not null,
  score int not null check (score between 1 and 5),
  created_at timestamptz default now(),
  unique (user_id, submission_id)  -- one rating per user per submission
);

-- Indexes for gallery queries
create index idx_submissions_created on public.submissions(created_at desc);
create index idx_submissions_rating on public.submissions(avg_rating desc);
create index idx_ratings_submission on public.ratings(submission_id);
```

## Sources

- [Matter.js official site and docs](https://brm.io/matter-js/)
- [Matter.js constraint/joint documentation](https://brm.io/matter-js/docs/classes/Constraint.html)
- [PixiJS official site and performance tips](https://pixijs.com/8.x/guides/concepts/performance-tips)
- [Rapier.js joint constraints documentation](https://rapier.rs/docs/user_guides/javascript/joints/)
- [DeviceMotionEvent MDN documentation](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent)
- [MediaStream Recording API MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)
- [HTMLCanvasElement.toBlob() MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [HTMLCanvasElement.captureStream() MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)
- [Web Share API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- [Supabase Auth architecture](https://supabase.com/docs/guides/auth/architecture)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Running JS physics in a web worker (proof of concept)](https://dev.to/jerzakm/running-js-physics-in-a-webworker-part-1-proof-of-concept-ibj)
- [Matter.js + PixiJS integration patterns](https://github.com/celsowhite/matter-pixi)
- [canvas-capture library for recording](https://github.com/amandaghassaei/canvas-capture)
- [gif.js client-side GIF encoder](https://jnordberg.github.io/gif.js/)
- [Game loop patterns (MDN)](https://developer.mozilla.org/en-US/docs/Games/Anatomy)
- [PWA caching strategies (web.dev)](https://web.dev/learn/pwa/caching)

---
*Architecture research for: Physics ragdoll toy PWA with social sharing*
*Researched: 2026-03-05*
