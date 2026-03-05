# Pitfalls Research

**Domain:** Physics ragdoll toy + social sharing web app (explicit UGC)
**Researched:** 2026-03-05
**Confidence:** HIGH (verified across official docs, browser bug trackers, community post-mortems)

## Critical Pitfalls

### Pitfall 1: iOS Safari DeviceMotion Permission is a One-Shot Gate

**What goes wrong:**
On iOS 13+, `DeviceMotionEvent.requestPermission()` must be called from a user gesture (click/tap). If the user denies the permission, Safari caches that decision permanently for the origin. There is no API to detect a prior denial, no way to re-prompt, and no programmatic workaround. The user must force-quit Safari and reopen it, or clear website data in Settings. For an app whose entire value proposition is "shake your phone," a denied permission is a dead product.

**Why it happens:**
Developers call `requestPermission()` too early (before explaining what it does), on page load (which silently fails), or bury it in a flow where users reflexively tap "Don't Allow." Once denied, the app is permanently broken for that user on that device with no recovery path the developer controls.

**How to avoid:**
1. Show a pre-permission explainer screen ("We need motion access so you can shake the ragdolls!") with a big, clear call-to-action button before calling `requestPermission()`.
2. Never call `requestPermission()` speculatively or on load -- only after the user has explicitly tapped a button understanding what they are agreeing to.
3. Feature-detect `DeviceMotionEvent.requestPermission` existing (it only exists on iOS Safari 13+). On Android Chrome, motion events fire without permission.
4. If permission is denied, show clear recovery instructions: "Go to Settings > Safari > Advanced > Website Data > [your domain] > Remove" with screenshots.
5. Provide a touch-based fallback (drag/swipe to shake) so the app is still usable even without motion access.

**Warning signs:**
- Analytics showing iOS users never trigger shake events after onboarding
- High bounce rate on iOS specifically
- Support tickets about "shaking doesn't work"

**Phase to address:**
Phase 1 (Core Physics/Interaction) -- this is the first thing users encounter and gates the entire experience.

---

### Pitfall 2: Canvas captureStream() Does Not Work on iOS Safari

**What goes wrong:**
`HTMLCanvasElement.captureStream()` is not reliably supported on iOS Safari. The video track obtained from `captureStream()` does not contain valid frame data on iOS, making the standard `canvas.captureStream() -> MediaRecorder` pipeline completely non-functional for the largest mobile demographic. Additionally, Safari does not support WebM encoding (Apple only supports H.264/HEVC), so even where MediaRecorder works, the output format is incompatible with common sharing flows.

**Why it happens:**
Developers prototype on Chrome (desktop or Android) where `captureStream()` + `MediaRecorder` producing WebM works perfectly, then discover at integration time that the entire recording pipeline is broken on iOS Safari. This is a WebKit bug/limitation that has persisted for years.

**How to avoid:**
1. Do NOT rely on `canvas.captureStream()` + `MediaRecorder` as your primary recording strategy.
2. Use a frame-by-frame capture approach: capture canvas frames via `canvas.toBlob()` or `canvas.toDataURL()` at a target rate (e.g., 10-15 fps), then encode client-side.
3. For short replay clips (2-5 seconds), animated GIF via gif.js (uses Web Workers for background encoding) is the most cross-browser-compatible approach, though file sizes are large.
4. For higher quality, use the WebCodecs API (supported in Chrome/Edge, partial Safari support) for H.264/MP4 encoding, with a GIF fallback for Safari.
5. Consider server-side encoding: upload raw frames to the server and use FFmpeg to produce MP4/GIF, which sidesteps all browser codec issues.
6. Keep replay duration short (3-5 seconds max) to keep GIF file sizes manageable (under 5MB).

**Warning signs:**
- Recording feature works perfectly on desktop Chrome but produces empty/black output on iPhone
- Test matrix that only includes Chrome/Android
- No iOS Safari entries in your browser testing checklist

**Phase to address:**
Phase 2 (Capture/Sharing) -- must be architected from the start with iOS compatibility as the primary constraint, not an afterthought.

---

### Pitfall 3: Physics Tied to Frame Rate Instead of Fixed Timestep

**What goes wrong:**
Physics simulation speed varies with device frame rate. On a 120Hz iPad Pro, ragdolls move twice as fast as on a 60Hz budget Android phone. On a throttled background tab, physics nearly stops. The simulation becomes non-deterministic and the "feel" of shaking differs wildly across devices, destroying the core experience.

**Why it happens:**
Using `requestAnimationFrame` callback delta directly as the physics timestep. This couples simulation speed to render speed, which varies from 30fps (struggling phone) to 120fps (ProMotion iPad) to 1fps (background tab).

**How to avoid:**
1. Implement a fixed-timestep accumulator pattern (the "Gaffer on Games" approach): accumulate real elapsed time, then consume it in fixed chunks (e.g., 1/60th second) for physics steps.
2. Interpolate between previous and current physics state for rendering, using the leftover accumulator time as the interpolation alpha. This adds one frame of display latency but eliminates visual stutter.
3. Cap the accumulator to prevent "spiral of death" -- if too much time accumulates (e.g., tab was backgrounded), clamp it rather than running hundreds of physics steps to catch up.
4. Both Matter.js and Rapier support fixed-timestep stepping; use their `Engine.update(engine, fixedDelta)` or `world.step(fixedDelta)` instead of passing real delta.

**Warning signs:**
- Ragdolls behave differently on different devices
- Physics "explodes" when switching back to a backgrounded tab
- Testers report wildly different shake responsiveness

**Phase to address:**
Phase 1 (Core Physics) -- foundational architecture that is extremely painful to retrofit.

---

### Pitfall 4: iOS Safari Canvas Memory Limits Crash the App

**What goes wrong:**
iOS Safari enforces a hard canvas pixel limit of 16,777,216 pixels per canvas and a total canvas memory budget of ~384MB across all canvases (device-dependent, can be lower on older devices). On high-DPI iPhones (3x density), a "reasonable" 400x800 CSS-pixel canvas actually consumes 1200x2400 = 2,880,000 physical pixels. Multiple canvases (physics render canvas + capture buffer + offscreen compositing) quickly exhaust the budget. When exceeded, Safari silently produces blank canvases or crashes the tab entirely.

**Why it happens:**
Developers set canvas dimensions in CSS pixels without accounting for `devicePixelRatio` scaling. They create multiple canvases for different purposes (rendering, capture, thumbnails) without disposing them. Safari also hoards canvas memory even after DOM removal -- setting `canvas.width = 0; canvas.height = 0` is required to release it.

**How to avoid:**
1. Cap your canvas resolution. Do not blindly multiply by `devicePixelRatio` -- use `Math.min(devicePixelRatio, 2)` to cap at 2x, which is visually sufficient for cartoon ragdolls.
2. Reuse a single canvas for both rendering and capture. Capture frames from the same canvas rather than creating offscreen copies.
3. When done with any temporary canvas (GIF encoding buffers, etc.), explicitly set its width and height to 0 before dereferencing to force Safari to release memory.
4. Use `canvas.toBlob()` instead of `canvas.toDataURL()` for screenshots -- toDataURL creates a massive base64 string in memory, while toBlob streams to a binary blob efficiently.
5. Monitor total canvas count and resolution at runtime; log warnings when approaching known limits.

**Warning signs:**
- Blank white canvas on iPhone but works fine on Android/desktop
- "Total canvas memory use exceeds the maximum limit" errors in Safari console
- App tab crashes/reloads on older iPhones during GIF encoding

**Phase to address:**
Phase 1 (Canvas setup) and Phase 2 (Capture) -- resolution capping in Phase 1, memory-safe capture in Phase 2.

---

### Pitfall 5: Hosting Provider Terminates Service Over Content

**What goes wrong:**
Major cloud providers (Hetzner, DigitalOcean, AWS in some interpretations, Google Cloud) have content policies that prohibit or restrict "pornographic" or "obscene" content. Even cartoon ragdolls in sexual positions can trigger these policies. Your VPS gets terminated, your S3 bucket gets locked, your CDN drops you -- potentially with little warning and no data recovery period. The project description explicitly notes content will be "sexually explicit."

**Why it happens:**
Developers choose hosting providers based on price/performance without reading acceptable use policies. They assume "it's just cartoons" or "it's user-generated, not ours" provides protection. It does not -- most ToS apply to content hosted on the infrastructure regardless of who created it.

**How to avoid:**
1. Use hosting providers that explicitly allow adult content: OVH (French, permissive), Leaseweb, BuyVM, or dedicated adult hosting providers. Verify current ToS before committing.
2. Cloudflare CDN/DNS is usable -- they explicitly do not prohibit legal adult content. However, the free plan restricts heavy image/video serving; budget for a paid plan or use their Images/Stream products.
3. For object storage, use a provider like Wasabi, Backblaze B2, or a self-hosted MinIO instance on an adult-friendly VPS rather than AWS S3 or Google Cloud Storage.
4. Keep backups on infrastructure you control. Never have a single point of failure where a ToS enforcement action could destroy all user data.
5. Register your domain with a registrar that does not police content (Namecheap, Njalla). Some registrars will suspend domains over content complaints.

**Warning signs:**
- Receiving a ToS warning email from your hosting provider
- Using a provider whose AUP you have not read end-to-end
- Storing all user data on a single provider with no backup strategy

**Phase to address:**
Phase 0 (Infrastructure Setup) -- must be resolved before any code is deployed. Changing hosting after launch with user data is extremely disruptive.

---

### Pitfall 6: GIF Encoding Freezes the UI or Produces Unshareably Large Files

**What goes wrong:**
Client-side GIF encoding of canvas frames is CPU-intensive. A 3-second clip at 15fps at 400x800 resolution can take 5-15 seconds to encode on a mid-range phone, during which the UI freezes if encoding runs on the main thread. The resulting GIF can be 5-15MB -- too large for most messaging apps (iMessage limits to 5MB inline, WhatsApp to ~16MB) and slow to upload on mobile data.

**Why it happens:**
gif.js uses Web Workers for encoding (which helps), but the frame capture itself (toBlob/toDataURL) and the final assembly still involve significant main-thread work. Developers also underestimate GIF's terrible compression efficiency -- 256 colors per frame, no inter-frame compression beyond simple disposal, and no modern codec benefits.

**How to avoid:**
1. Reduce capture resolution aggressively for clips -- 320x640 or even 240x480 is fine for a social share preview. Users will not scrutinize pixel quality on a funny ragdoll GIF.
2. Reduce frame rate to 10fps for GIFs. The difference between 10fps and 15fps is barely noticeable for ragdoll comedy but saves 33% in file size and encoding time.
3. Use gif.js with Web Workers enabled (its default). Show a progress indicator during encoding -- never let the UI appear frozen.
4. Consider animated WebP as the primary format (50-70% smaller than GIF, supported in Chrome/Firefox/Safari 14+) with GIF as fallback for older browsers.
5. Set hard limits: max 3 seconds, max 10fps, max 320px wide. Target under 3MB for the output file.
6. For v2+, evaluate server-side encoding: upload frames, encode to MP4 on the server with FFmpeg, return a video URL. This removes all client-side performance concerns.

**Warning signs:**
- "Generating..." spinner lasting more than 5 seconds on a real phone
- Output file sizes exceeding 5MB
- UI jank during encoding (dropped frames in the physics simulation)

**Phase to address:**
Phase 2 (Capture/Sharing) -- must be prototyped on actual mid-range phones, not desktop browsers.

---

### Pitfall 7: No Age Verification or Legal Shields for Explicit Content

**What goes wrong:**
Hosting a platform with explicitly sexual content (even cartoon-based) without age verification or legal disclaimers exposes the platform to legal liability in multiple jurisdictions. COPPA (US) prohibits collecting data from users under 13. Many states and countries have enacted age verification laws for adult content platforms. Operating without any verification mechanism is not just legally risky -- payment processors, domain registrars, and hosting providers may use it as grounds for service termination.

**Why it happens:**
Developers treat the legal layer as "we'll figure it out later" or assume Section 230 safe harbor covers everything. Section 230 provides immunity for hosting user-generated content but does NOT exempt platforms from federal criminal law, including obscenity laws and child protection statutes.

**How to avoid:**
1. Implement a clear age gate at first visit (date of birth entry or "I am 18+" confirmation). This is not bulletproof verification but establishes good-faith effort.
2. Include Terms of Service that explicitly state the platform contains explicit content, require users to be 18+, and disclaim liability for user-created content.
3. Implement DMCA takedown procedures (required for Section 230 safe harbor protection).
4. Add a report mechanism for content, even before building automated moderation. This demonstrates good faith.
5. Consult with a lawyer before launch -- seriously. The cost of a legal review ($500-2000) is trivial compared to the cost of a legal action.

**Warning signs:**
- No age gate exists in the current UI
- No Terms of Service page
- No mechanism for users to report content
- Payment processors (Stripe, PayPal) rejecting your application

**Phase to address:**
Phase 3 (Gallery/Social) -- must be in place before the gallery goes public. Can be simple in v1 (self-certification) but must exist.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `toDataURL()` instead of `toBlob()` for screenshots | Simpler API, returns a string directly | Memory bloat on mobile, potential crashes on iOS, blocks main thread | Never -- toBlob is async and equally simple |
| Skipping fixed timestep (using raw rAF delta for physics) | Faster initial prototype | Physics speed varies by device, impossible to retrofit cleanly | Never -- implement fixed timestep from day one |
| Storing full-resolution uploads without resizing | Simpler upload pipeline | Storage costs explode, page load times degrade, CDN bandwidth waste | MVP only if gallery is limited to < 100 items |
| Client-side only GIF encoding with no resolution cap | Avoids server infrastructure | OOM crashes on low-end phones, 10MB+ GIFs nobody can share | MVP only with strict resolution/duration caps |
| Single-origin deployment (app + API + media on same server) | Simple deployment, no CORS issues | Cannot scale media serving independently, single point of failure | MVP with < 1000 users |
| No image optimization pipeline (serve originals) | Faster time to ship | 3-5x bandwidth costs, slow gallery loading on mobile data | MVP only, replace in first performance pass |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Cloudflare CDN (free plan) | Serving large volumes of images/video through the free-tier CDN proxy, which violates the ToS for non-HTML content at scale | Use Cloudflare Images or R2 for media storage/delivery, or budget for a Pro plan. Use the free tier only for HTML/CSS/JS assets |
| DeviceMotion API | Calling `requestPermission()` on page load or without user gesture, which silently fails on iOS | Always trigger from a user-initiated click handler, after showing an explainer |
| Web Share API | Assuming `navigator.share()` accepts any file type and size | Check `navigator.canShare({files: [file]})` before attempting to share. Many platforms reject files over 5MB or non-standard MIME types |
| WebView (Android APK wrapper) | Assuming all PWA APIs work identically in a WebView | WebView has different permission models than Chrome. DeviceMotion may need explicit Android manifest permissions (`BODY_SENSORS`). Test the APK on real devices, not just Chrome |
| Object Storage (S3-compatible) | Setting buckets to public read without understanding CORS | Configure CORS headers on the storage bucket to allow your domain. Without this, canvas will be "tainted" if you load user images cross-origin and try to composite/export them |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all gallery images at once | Page takes 10+ seconds to load, mobile data users bounce | Implement lazy loading with intersection observer, serve thumbnails (200px wide) in gallery grid, load full-size only on detail view | > 50 gallery items |
| Storing screenshots as PNG (lossless) | Storage costs 3-5x higher than necessary | Convert to JPEG (quality 85) or WebP on upload. Screenshots of cartoon ragdolls do not need lossless quality | > 500 uploads |
| No rate limiting on uploads/ratings | Bot spam fills gallery with garbage, vote manipulation | Rate limit: max 10 uploads/hour, max 50 ratings/hour per user. Use signed upload URLs with expiry | Immediately upon public launch |
| Physics engine on main thread with no budget monitoring | Starts smooth, degrades as scene complexity increases (more ragdolls, more joints) | Profile frame times from day one. Set a hard budget of 8ms for physics + 4ms for rendering = 12ms total (leaving 4ms headroom for 60fps). If physics exceeds budget, reduce simulation quality (fewer solver iterations) | > 3 ragdolls with complex joint chains |
| Uncompressed animation frame buffers in memory | Works for 2-second clips, crashes for 5-second clips on phones with 3GB RAM | Compress frames to JPEG blobs immediately on capture. Store blobs in an array, not raw ImageData objects. A 320x640 JPEG is ~30KB vs ~800KB for raw RGBA ImageData | > 3 seconds of capture at 10fps |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No server-side validation of uploaded image dimensions/format | Users upload 100MP images or disguised executables, causing storage abuse or security exploits | Validate file type (magic bytes, not just extension), enforce max dimensions (2000x2000), max file size (5MB), re-encode on the server to strip EXIF/metadata |
| Serving user-uploaded images from the same origin as the app | XSS via SVG uploads, cookie theft via crafted images with embedded scripts | Serve user media from a separate domain (e.g., media.example.com) with no cookies, or use a CDN origin. Never serve user-uploaded SVGs |
| Rating endpoints without authentication or with client-side-only validation | Vote manipulation, rating inflation/deflation by bots | Require authenticated requests for ratings. Enforce one rating per user per submission (server-side). Rate-limit rating changes |
| Storing user passwords in plaintext or with weak hashing | Full credential compromise on any database breach | Use bcrypt/scrypt/argon2 with appropriate cost factors. Use an auth provider (Auth0, Supabase Auth, Firebase Auth) to avoid handling passwords at all |
| No CSRF protection on state-changing endpoints | Attackers can submit ratings, upload content, or delete accounts via cross-site requests | Use SameSite cookie attributes, CSRF tokens, or token-based auth (JWT in Authorization header) |
| Accepting user-provided URLs for avatars or content without validation | Server-Side Request Forgery (SSRF) -- attacker makes your server fetch internal resources | Never fetch arbitrary URLs server-side. Only accept file uploads. If URLs are needed, validate against an allowlist of domains |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| DeviceMotion permission prompt appears with no explanation | Users deny reflexively, permanently breaking the core feature on iOS | Show a custom explainer screen first ("Allow motion access to shake the ragdolls!") with a visual demo, then trigger the system prompt only when the user taps "Enable Shaking" |
| No feedback during shake (visual/haptic) | Users shake the phone and see delayed or no response, assume it is broken | Add screen shake effect, haptic feedback (Vibration API), and ensure ragdoll response begins within 1 frame of motion data arriving |
| Capture/encoding blocks the UI with no progress indicator | Users think the app crashed during GIF generation, force-close it | Show a progress bar or animated spinner during encoding. Disable interaction but keep the last physics frame visible so the app looks alive |
| Gallery loads full-size images on mobile data | 50MB+ data usage browsing 20 items, users on metered connections will leave | Serve compressed thumbnails (JPEG, 200px wide, ~10-20KB each) in the grid. Only load full-size on tap. Show image dimensions/file size before full download |
| No confirmation before sharing explicit content externally | User accidentally shares explicit ragdoll arrangement to a work chat | Add a "Share to..." confirmation dialog showing a preview of what will be shared, with the explicit content visible so the user knows what they are sending |
| Rating system shows raw average (susceptible to outliers) | A single 1-star troll vote tanks a popular creation's rating | Use Wilson score interval or Bayesian average for ranking. Show number of ratings alongside the score so users can gauge credibility |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **DeviceMotion integration:** Often missing iOS permission flow -- verify by testing on a real iPhone that has never visited the site before (not just Chrome DevTools device simulation)
- [ ] **Screenshot capture:** Often missing high-DPI handling -- verify that screenshots look sharp on 3x screens by comparing captured image resolution to display resolution
- [ ] **GIF/clip export:** Often missing iOS Safari support -- verify by recording and downloading on an actual iPhone in Safari, not just Chrome on Android
- [ ] **Gallery image loading:** Often missing lazy loading and thumbnail generation -- verify by opening gallery on a throttled 3G connection in DevTools and measuring total transfer size
- [ ] **Rating system:** Often missing duplicate vote prevention server-side -- verify by attempting to rate the same item twice from the same account via direct API calls (not just the UI)
- [ ] **User accounts:** Often missing email verification or spam prevention -- verify by signing up with a disposable email service and checking if the account is fully functional immediately
- [ ] **Share flow:** Often missing format compatibility checks -- verify by sharing a captured GIF/image to iMessage, WhatsApp, Twitter, and Discord and confirming it renders inline (not as a download link)
- [ ] **Android APK:** Often missing sensor permissions in AndroidManifest.xml -- verify DeviceMotion works in the WebView APK on a real Android device, not just Chrome mobile
- [ ] **Canvas rendering:** Often missing devicePixelRatio capping -- verify on an iPhone 15 Pro (3x) that canvas memory limits are not hit when 3+ ragdolls are active

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| DeviceMotion permanently denied on iOS | LOW | Add touch/drag fallback for shaking. Show recovery instructions in settings. Cannot fix programmatically -- user must clear site data |
| Canvas memory crash on iOS | MEDIUM | Reduce canvas resolution, eliminate duplicate canvases, add memory monitoring. May require architectural changes if multiple canvases are deeply integrated |
| Hosting provider terminates service | HIGH | Restore from backups to new provider. Requires DNS migration, possible downtime. If no backups exist, data may be permanently lost. Recovery time: 4-24 hours minimum |
| GIF encoding crashes low-end devices | LOW | Reduce resolution/fps/duration caps. Add device capability detection (RAM, CPU cores) and adjust quality targets dynamically |
| Vote manipulation detected in gallery | MEDIUM | Implement retroactive vote cleanup (remove outlier votes from suspicious accounts). Add rate limiting and behavioral analysis. May need to reset ratings if manipulation was widespread |
| Physics feels wrong due to variable timestep | HIGH | Retrofitting fixed timestep requires rewriting the game loop and potentially retuning all physics parameters (gravity, joint stiffness, bounce). Prevention is 10x cheaper than cure |
| Legal action over content | HIGH | Lawyer engagement, potential platform shutdown while resolving. Having age gates, ToS, and DMCA procedures in place before this happens dramatically reduces exposure |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| iOS DeviceMotion permission denial | Phase 1: Core Physics | Test on fresh iPhone -- permission flow works, denial shows fallback |
| Canvas memory limits on iOS | Phase 1: Canvas Setup | Test with 5 ragdolls on iPhone SE -- no blank canvas or crashes |
| Variable timestep physics | Phase 1: Game Loop | Physics behaves identically on 60Hz and 120Hz devices |
| captureStream() broken on iOS Safari | Phase 2: Capture | Recording produces valid output on iOS Safari, Chrome Android, and desktop Chrome |
| GIF encoding performance/size | Phase 2: Capture | 3-second clip encodes in < 5 seconds on a Pixel 4a equivalent, output < 3MB |
| Hosting provider content policy | Phase 0: Infrastructure | Hosting provider's AUP explicitly reviewed, adult content confirmed acceptable |
| Age verification / legal shields | Phase 3: Gallery Launch | Age gate, ToS, and report mechanism exist before gallery is publicly accessible |
| Gallery image optimization | Phase 3: Gallery | Gallery page loads < 2MB total on initial view with 20+ items |
| Rating manipulation | Phase 3: Gallery | Duplicate votes rejected server-side, rate limiting enforced |
| Share format compatibility | Phase 2: Sharing | Shared content renders inline on iMessage, WhatsApp, Twitter, Discord |
| Cross-origin canvas tainting | Phase 2: Capture (if compositing user images) | No SecurityError when calling toBlob on canvas with loaded user images |
| Android APK sensor permissions | Phase 4: APK Build | DeviceMotion works in WebView APK on real Android device |

## Sources

- [DeviceMotionEvent - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent)
- [DeviceMotion requestPermission iOS 13+ - DEV Community](https://dev.to/li/how-to-requestpermission-for-devicemotion-and-deviceorientation-events-in-ios-13-46g2)
- [Safari DeviceMotion Permission Caching - Apple Discussions](https://discussions.apple.com/thread/255598032)
- [Canvas Area Exceeds Maximum Limit - PQINA](https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit)
- [Total Canvas Memory Limit - PQINA](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit)
- [Konva Canvas Limits in Safari iOS](https://longviewcoder.com/2024/02/09/konva-canvas-limits-in-safari-ios-explainer/)
- [toDataURL Memory Exceeded on Safari - fabric.js Issue](https://github.com/fabricjs/fabric.js/issues/7924)
- [MediaRecorder Canvas Fails on Large Canvas Android - Chrome Bug](https://paul.kinlan.me/chrome-bug-897727mediarecorder-using-canvas-capturestreamfails-for-large-canvas-elements-on-android/)
- [Fix Your Timestep - Gaffer on Games](https://gafferongames.com/post/fix_your_timestep/)
- [Canvas captureStream Safari Compat - MDN PR](https://github.com/mdn/browser-compat-data/pull/4440)
- [How to Save Canvas as MP4 with WebCodecs](https://devtails.xyz/adam/how-to-save-html-canvas-to-mp4-using-web-codecs-api)
- [WebCodecs API - Can I Use](https://caniuse.com/webcodecs)
- [MediaRecorder API - Can I Use](https://caniuse.com/mediarecorder)
- [gif.js - JavaScript GIF Encoder](https://jnordberg.github.io/gif.js/)
- [Animated Images 2025: WebP vs APNG vs GIF](https://webp-to-png.tools/blog/animated-images-in-2025-webp-vs-apng-vs-gif-real-world-use-cases/)
- [Hetzner System Policies](https://www.hetzner.com/legal/system-policies)
- [Cloudflare Adult Content - Community Forum](https://community.cloudflare.com/t/using-cloudflare-for-adult-website/471480)
- [Adult VPS Hosting - LowEndTalk](https://lowendtalk.com/discussion/146096/adult-vps-hosting)
- [Section 230 Overview - Congress.gov](https://www.congress.gov/crs-product/R46751)
- [Optimizing Canvas - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [Rapier 2025 Review - Dimforge](https://dimforge.com/blog/2026/01/09/the-year-2025-in-dimforge/)
- [Votebots: How to Make and Stop Them - FraudBlocker](https://fraudblocker.com/articles/bots/votebots-how-to-make-em-and-how-to-stop-em)
- [CORS-Enabled Images - MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)

---
*Pitfalls research for: Physics ragdoll toy + social sharing web app (explicit UGC)*
*Researched: 2026-03-05*
