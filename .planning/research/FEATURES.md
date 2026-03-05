# Feature Research

**Domain:** Physics ragdoll toy + social sharing (irreverent UGC creation/gallery)
**Researched:** 2026-03-05
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Ragdoll physics simulation (gravity, joints, collisions) | Core loop -- if dolls don't flop convincingly, nothing else matters | HIGH | Must run at 60fps on mid-range phones. Skeleton + joint constraints, gravity, collision response. This IS the product. |
| Shake-to-move via device motion | The entire interaction model. Without it this is just a static doll poser | MEDIUM | DeviceMotion API on mobile browsers. iOS Safari requires user-gesture permission grant. Must map acceleration vector to forces on ragdolls. |
| Multiple ragdolls on screen (2-5) | Single doll is lonely and boring. Funny positions come from doll-on-doll interactions | MEDIUM | User-selectable count. Performance scales linearly -- 5 dolls at 60fps is the hard target. |
| Screenshot capture | Users need to save/share what they created. Every sandbox game has this | LOW | Canvas.toDataURL() or toBlob(). Straightforward. Must capture current frame cleanly without UI chrome. |
| User accounts (signup/login) | Gallery posting and rating require identity. Prevents vote-spam | MEDIUM | Email/password or OAuth. Keep friction low -- the signup wall is a bounce risk, but needed for gallery integrity. |
| Public gallery (browse submissions) | Without a gallery there is no social loop. Creation without audience kills motivation | MEDIUM | Grid of thumbnails, tap to view full. Sort by recent/top-rated. Pagination or infinite scroll. |
| Rating system on submissions | Users expect to judge and be judged. Core feedback loop for the social layer | LOW | 1-5 stars as spec'd. Simple, universally understood. Store average + count. |
| Responsive mobile-first layout | This is a phone-shaking app. Desktop is secondary at best | LOW | Standard responsive CSS. Primary viewport is portrait mobile. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but these are where the fun and virality live.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Two physics modes (realistic vs. exaggerated/goofy) | No ragdoll toy offers this toggle. Realistic for "artful" posing, goofy for pure chaos. Doubles replay value | MEDIUM | Realistic = proper joint limits, mass, damping. Goofy = bouncy colliders, stretchy joints, over-the-top gravity. Different parameter sets on same engine. |
| Replay clip capture (last N seconds as GIF/video) | Screenshots are static. A 3-5 second clip of dolls bouncing is 10x more shareable and funnier. This is the viral unlock | HIGH | Ring buffer of frames. MediaRecorder API for WebM, or frame-by-frame GIF encoding (gif.js/gifenc). Must handle performance -- recording while simulating. Browser compatibility varies (Safari WebM support weak, may need GIF fallback). |
| Choose screenshot OR clip when sharing | Flexibility. Some moments are best as a still, some need the motion | LOW | UI toggle after capture. Low complexity once both capture methods exist. |
| Haptic feedback on collisions/shaking | Phone buzzes when dolls slam into walls or each other. Makes shaking feel visceral and satisfying | LOW | Vibration API -- navigator.vibrate(). Short pulses (50-200ms) on collision events. Not supported on Safari/iOS, so progressive enhancement only. Android-exclusive delight. |
| Slow-motion replay | Every ragdoll game that goes viral has slow-mo. Seeing a ridiculous collision in slow motion is inherently funnier | LOW | Time-scale multiplier on physics step. 0.25x speed. Can be applied during replay playback or live. Near-zero engine cost. |
| Gallery sorting (top rated, newest, trending) | Lets good content surface. "Top this week" creates recurring engagement | LOW | Query sorting on backend. Trending = time-decayed rating score. |
| Direct share to external platforms (copy link, native share sheet) | People share memes on Discord, WhatsApp, Twitter -- not just in-app. External sharing = growth | LOW | Web Share API (navigator.share) for native share sheet. Fallback to copy-link. Share target should be a direct URL to the gallery item with OG meta tags for link previews. |
| Cartoon character selection | Picking which dolls to throw around adds personalization and variety | LOW | Pre-made sprite sheets/models. Character picker UI before shaking. Visual variety without custom avatar complexity. |
| Sound effects | Bonks, thuds, and squelches on collision. Audio feedback makes physics feel real and adds comedy | MEDIUM | Web Audio API. Collision callbacks trigger sound pool. Must handle overlapping sounds and not become cacophonous with 5 dolls. Volume falloff by collision force. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems, especially for v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Custom avatar/character creation | "I want to use my friend's face" | Massive complexity (editor UI, asset pipeline, moderation nightmare with user-uploaded faces). Delays launch by weeks/months. Content moderation becomes mandatory immediately | Pre-made cartoon characters with enough variety (8-12) to feel personal. Consider face-swap as a post-v1 novelty feature |
| Real-time multiplayer shaking | "Shake with my friend!" | WebSocket state sync of physics simulation is an engineering nightmare. Latency makes physics desynchronize. Marginal fun increase for exponential complexity | Asynchronous social: share results, not sessions. "Beat my score" or "rate my creation" is the social loop |
| In-app chat/comments on gallery | Social platforms have comments | Content moderation is now mandatory. Toxic comments on explicit content create legal/hosting liability. Comment systems are deceptively complex (threading, notifications, spam) | External sharing (Discord, group chats) handles discussion. Gallery ratings are sufficient social signal for v1 |
| AI-powered content moderation | "Filter the worst stuff automatically" | False positives kill the irreverent vibe. Training data for "funny explicit ragdoll positions" doesn't exist. Expensive to run. The whole point is that content is unfiltered | Manual report button + admin review queue if needed. Community self-policing via ratings (bad content gets low stars). Add moderation only if abuse becomes a real problem |
| Leaderboards / gamification (XP, levels, badges) | "Gamify it for retention" | Turns a creative toy into a competitive grind. Changes user motivation from "make funny thing" to "farm points." Leaderboards in creative tools often backfire -- they reward volume over quality | Top-rated gallery IS the leaderboard. Recognition comes from stars, not XP. Keep it a toy, not a game with progression |
| Monetization (ads, IAP, premium) | "How do we make money?" | v1 must validate that anyone cares before optimizing revenue. Ads on explicit content are brand-unsafe (no ad network will serve them). IAP adds payment infra complexity | Ship free. Validate the concept. If it catches on, consider: premium characters, tip jar, merch. But not in v1 |
| Native iOS app | "Reach iPhone users" | Apple will reject explicit content immediately. App Store review is a hard blocker. Development cost doubles | PWA works on Safari. iOS users access via mobile browser. DeviceMotion permission flow needs careful handling but is solvable |
| Desktop keyboard/mouse controls | "I don't have a phone nearby" | Undermines the core mechanic (shaking). Mouse-dragging ragdolls is a different product entirely (People Playground already exists and does it better) | Desktop can be view-only gallery browsing. Creation is mobile-first. If desktop creation is wanted later, mouse-drag is a separate interaction model |

## Feature Dependencies

```
[Physics Engine (ragdoll sim)]
    |
    +--requires--> [Renderer (canvas/WebGL)]
    |
    +--enables--> [Shake Detection (DeviceMotion)]
    |                 |
    |                 +--enables--> [Haptic Feedback]
    |
    +--enables--> [Screenshot Capture]
    |                 |
    |                 +--requires--> [Gallery Backend]
    |                                    |
    |                                    +--requires--> [User Accounts]
    |                                    |
    |                                    +--enables--> [Rating System]
    |                                    |
    |                                    +--enables--> [Gallery Sorting]
    |
    +--enables--> [Replay Clip Capture]
    |                 |
    |                 +--requires--> [Frame Ring Buffer]
    |                 |
    |                 +--requires--> [GIF/Video Encoder]
    |
    +--enables--> [Slow-Motion Mode]
    |
    +--enables--> [Sound Effects]
    |
    +--enables--> [Two Physics Modes]

[User Accounts]
    +--enables--> [Gallery Posting]
    +--enables--> [Rating System]

[Screenshot Capture] --OR-- [Replay Clip Capture]
    +--enables--> [Share to External Platforms]
    +--enables--> [Gallery Posting]

[Character Selection] --independent--> [Physics Engine]
```

### Dependency Notes

- **Physics Engine requires Renderer:** No simulation without a visual canvas. These are built together as the core.
- **Shake Detection requires Physics Engine:** Device motion events translate to forces applied to the simulation. Meaningless without running physics.
- **Gallery requires User Accounts:** Anonymous posting invites spam and makes rating meaningless. Accounts gate gallery access.
- **Replay Clip Capture requires Frame Ring Buffer + Encoder:** Most complex feature. Needs continuous frame capture in background while simulation runs, then encoding on demand. Two separate subsystems.
- **Rating System requires Gallery + Accounts:** Can't rate what doesn't exist, can't prevent vote-spam without identity.
- **Share to External requires Capture (screenshot or clip):** Must have content to share. Also needs OG meta tags and shareable URLs on gallery items.
- **Haptic Feedback enhances Shake Detection:** Progressive enhancement layer. Shake input works without vibration output, but haptics make it feel better.
- **Character Selection is independent:** Cosmetic layer. Can be added at any point without affecting physics or social systems.

## MVP Definition

### Launch With (v1)

Minimum viable product -- validate that shaking ragdolls and sharing results is fun.

- [ ] Physics ragdoll engine with realistic mode (2-5 cartoon dolls, gravity, joints, collision) -- this is the product
- [ ] Canvas renderer at 60fps on mid-range phones -- if it stutters, it's dead
- [ ] Shake detection via DeviceMotion API with iOS permission flow -- the core interaction
- [ ] Screenshot capture (canvas snapshot, no UI chrome) -- minimum shareable output
- [ ] User accounts (email/password, keep it simple) -- required for gallery integrity
- [ ] Public gallery (grid view, sort by newest) -- the social loop
- [ ] 1-5 star rating on gallery items -- the feedback mechanism
- [ ] 3-4 pre-made cartoon characters to choose from -- enough variety to feel like a choice
- [ ] Mobile-first responsive layout -- this is a phone app
- [ ] Direct share via Web Share API or copy-link -- let people send creations externally

### Add After Validation (v1.x)

Features to add once core is working and people are using it.

- [ ] Replay clip capture (GIF/short video) -- add once screenshot sharing proves the concept works. This is the viral accelerator
- [ ] Exaggerated/goofy physics mode -- second mode adds replay value after users exhaust realistic mode
- [ ] Slow-motion toggle (live and replay) -- low-effort, high-delight feature
- [ ] Haptic feedback on collisions (Android) -- progressive enhancement, makes shaking feel better
- [ ] Sound effects on collisions -- audio feedback adds satisfaction and comedy
- [ ] Gallery sorting (top rated, trending, newest) -- needed once gallery has enough content to browse
- [ ] More characters (expand to 8-12) -- content update, keeps things fresh
- [ ] Android APK (WebView wrapper) -- for power users who want home-screen access and push notifications

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Themed backgrounds/environments -- visual variety for the simulation area. Only matters if people are creating consistently
- [ ] "Remix" -- shake someone else's starting position. Social chain creation. Requires significant gallery + physics state serialization work
- [ ] Weekly challenges/prompts -- "Make the funniest pile-up." Community engagement, but requires active curation
- [ ] User profiles with creation history -- gallery of a user's own submissions. Only valuable once people have multiple creations
- [ ] Embed widget -- let users embed their creation on other sites. Growth hack, but only matters with traction
- [ ] Admin moderation tools -- report queue, content removal. Build only when abuse is a real problem, not speculatively

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Physics ragdoll engine | HIGH | HIGH | P1 |
| Canvas renderer (60fps) | HIGH | MEDIUM | P1 |
| Shake detection (DeviceMotion) | HIGH | MEDIUM | P1 |
| Screenshot capture | HIGH | LOW | P1 |
| User accounts | MEDIUM | MEDIUM | P1 |
| Public gallery | HIGH | MEDIUM | P1 |
| Rating system (1-5 stars) | MEDIUM | LOW | P1 |
| Character selection (3-4) | MEDIUM | LOW | P1 |
| Mobile-first layout | HIGH | LOW | P1 |
| Web Share API / copy-link | HIGH | LOW | P1 |
| Replay clip capture (GIF/video) | HIGH | HIGH | P2 |
| Goofy physics mode | MEDIUM | MEDIUM | P2 |
| Slow-motion toggle | MEDIUM | LOW | P2 |
| Haptic feedback | LOW | LOW | P2 |
| Sound effects | MEDIUM | MEDIUM | P2 |
| Gallery sorting (trending) | MEDIUM | LOW | P2 |
| More characters (8-12) | LOW | LOW | P2 |
| Android APK | LOW | LOW | P2 |
| Themed backgrounds | LOW | LOW | P3 |
| Remix feature | MEDIUM | HIGH | P3 |
| Weekly challenges | MEDIUM | MEDIUM | P3 |
| User profiles | LOW | MEDIUM | P3 |
| Embed widget | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- product is incomplete without these
- P2: Should have, add post-validation -- these make the product better but aren't required to test the hypothesis
- P3: Nice to have, future consideration -- only build if the product has traction

## Competitor Feature Analysis

| Feature | People Playground (Steam) | Ragdoll Playground (Web) | Physics! Fun (Mobile) | Shaken Together (Our Approach) |
|---------|--------------------------|--------------------------|----------------------|-------------------------------|
| Platform | Desktop (Steam) | Browser | iOS/Android app stores | PWA + Android APK (bypass app stores) |
| Input method | Mouse drag & drop | Mouse/touch | Touch | Phone shaking (unique) |
| Ragdoll count | Unlimited (PC perf) | Multiple | Multiple | 2-5 (mobile perf target) |
| Physics modes | One (realistic) | One (realistic) | One (realistic) | Two (realistic + goofy) |
| Content tone | Violent/dark humor | Casual | Casual | Explicitly irreverent/sexual |
| Social sharing | Steam screenshots | None built-in | None built-in | Built-in gallery + ratings (core feature) |
| Community | Steam Workshop | None | None | In-app public gallery |
| Replay/clip | No (screenshot only) | No | No | GIF/video replay capture (planned) |
| Sound | Yes | Minimal | Minimal | Collision-based audio (planned) |
| Slow-mo | No | No | Some have it | Yes (planned) |
| Monetization | Paid ($10) | Free | Free/freemium | Free (v1) |

### Competitive Positioning

The key gap in the market: **no existing ragdoll toy combines phone-shaking input with social sharing**. Desktop ragdoll sandboxes (People Playground) are mouse-driven creation tools. Mobile ragdoll apps are touch-based solo toys without community features. Shaken Together occupies a unique intersection:

1. **Shake input** -- physical, visceral, phone-native. No competitor does this.
2. **Social gallery with ratings** -- turns a solo toy into a community experience. No competitor has this built-in.
3. **Explicit/irreverent content** -- competitors are app-store-safe. PWA distribution sidesteps content gatekeepers.
4. **Replay clips** -- GIF/video capture of the shaking moment is inherently sharable in a way screenshots of static ragdolls are not.

## Sources

- [Ragdoll Physics Simulator (App Store)](https://apps.apple.com/us/app/ragdoll-physics-simulator/id1665534616) -- competitor feature reference
- [RMF's Ragdoll Physics Experiments (Steam)](https://store.steampowered.com/app/3337130) -- slow-motion, sandbox features
- [Ragdoll Playground](https://ragdollplayground.io/) -- web-based ragdoll toy, feature baseline
- [People Playground (Steam)](https://store.steampowered.com/app/1118200/People_Playground/) -- most feature-rich ragdoll sandbox
- [Physics! Fun (Google Play)](https://play.google.com/store/apps/details?id=com.foxtrio.physicsfun&hl=en_US) -- mobile ragdoll toy reference
- [Device Motion API - What PWA Can Do](https://whatpwacando.today/device-motion/) -- PWA shake capability verification
- [PWA on iOS Limitations (Brainhub)](https://brainhub.eu/library/pwa-on-ios) -- iOS DeviceMotion permission requirements
- [canvas-record (npm)](https://www.npmjs.com/package/canvas-record) -- canvas recording for GIF/video output
- [MediaStream Recording API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API) -- browser recording capabilities
- [Vibration API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) -- haptic feedback browser support
- [Haptic Feedback for Web Apps (OpenReplay)](https://blog.openreplay.com/haptic-feedback-for-web-apps-with-the-vibration-api/) -- implementation patterns
- [Social Media Trends 2026 (Slate)](https://slateteams.com/blog/social-media-trends-2026/) -- UGC sharing patterns
- [Viral Loops for Apps (Tapp)](https://www.tapp.so/blog/social-viral-loops-for-apps/) -- viral content loop design

---
*Feature research for: Physics ragdoll toy + social sharing (Shaken Together)*
*Researched: 2026-03-05*
