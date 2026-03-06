# Requirements: Shaken Together

**Defined:** 2026-03-05
**Core Value:** Shaking the phone must feel satisfying and the ragdolls must land in funny, sharable positions

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Physics

- [x] **PHYS-01**: User sees 2-5 cartoon ragdoll characters on screen with realistic joint constraints, gravity, and collision
- [x] **PHYS-02**: User can select how many dolls (2-5) appear on screen
- [x] **PHYS-03**: User can switch between Realistic mode (proper joints, mass, damping) and Goofy mode (bouncy, stretchy, over-the-top)
- [x] **PHYS-04**: Physics simulation runs at consistent 60fps on mid-range mobile devices
- [x] **PHYS-05**: User can reset the scene to start fresh with new doll positions
- [x] **PHYS-06**: User can touch/drag individual ragdolls to manually position them

### Input

- [x] **INPT-01**: User shakes phone and ragdolls respond to the motion naturally (DeviceMotion API)
- [x] **INPT-02**: iOS users see a pre-permission explainer before DeviceMotion permission request
- [x] **INPT-03**: Users who deny motion permission can still play via touch/drag fallback

### Rendering

- [x] **RNDR-01**: Ragdolls render as cartoon character sprites (3-4 pre-made characters)
- [x] **RNDR-02**: User can choose which cartoon characters to use before shaking
- [x] **RNDR-03**: Canvas renders at 60fps with WebGL acceleration on mobile browsers

### Capture

- [x] **CAPT-01**: User can take a screenshot of the current ragdoll positions (no UI chrome)
- [x] **CAPT-02**: User can capture a replay clip (last 3-5 seconds) as an animated GIF
- [x] **CAPT-03**: User chooses screenshot or clip when sharing
- [x] **CAPT-04**: Capture preview shows the result before sharing/uploading

### Sharing

- [x] **SHAR-01**: User can share creation via native share sheet (Web Share API) or copy link
- [ ] **SHAR-02**: Shared gallery links show OG meta preview images when pasted in chat/social

### Accounts

- [ ] **ACCT-01**: User can create an account with email and password
- [ ] **ACCT-02**: User can log in and session persists across browser refresh
- [ ] **ACCT-03**: User can log out from any screen

### Gallery

- [ ] **GLRY-01**: User can submit their screenshot or clip to the public gallery
- [ ] **GLRY-02**: User can browse the public gallery as a grid of thumbnails
- [ ] **GLRY-03**: User can tap a gallery item to view it full-size
- [ ] **GLRY-04**: User can rate gallery items 1-5 stars (one rating per user per item)
- [ ] **GLRY-05**: Gallery shows average star rating on each item
- [ ] **GLRY-06**: Gallery can be sorted by newest, top rated, and trending

### Platform

- [ ] **PLAT-01**: App works as a PWA installable from mobile browser
- [ ] **PLAT-02**: App is available as a side-loaded Android APK
- [x] **PLAT-03**: Mobile-first responsive layout (portrait primary)

### Legal/Infra

- [ ] **INFR-03**: App hosted on content-friendly infrastructure (no mainstream provider ToS violations)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Polish

- **PLSH-01**: Sound effects on ragdoll collisions (bonks, thuds, squelches)
- **PLSH-02**: Haptic feedback on collisions (Android via Vibration API)
- **PLSH-03**: Slow-motion toggle during replay and live shaking
- **PLSH-04**: Expanded character roster (8-12 pre-made characters)
- **PLSH-05**: Themed backgrounds/environments for the shaking scene

### Social

- **SOCL-01**: User profiles with creation history
- **SOCL-02**: Remix feature (shake someone else's starting position)
- **SOCL-03**: Weekly challenges/prompts for the community
- **SOCL-04**: Embed widget for sharing creations on external sites

### Admin

- **ADMN-01**: Content report button on gallery items
- **ADMN-02**: Admin moderation dashboard for reported content

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom avatar/character creation | Massive art pipeline complexity, delays launch by weeks |
| Real-time multiplayer shaking | Physics desync over network makes this impractical |
| In-app comments/chat | Moderation burden with explicit content, legal liability |
| AI content moderation | No training data for this domain, false positives kill the vibe |
| Leaderboards/gamification (XP, levels) | Changes incentive from "make funny thing" to "farm points" |
| Monetization (ads, IAP) | Validate concept first; ad networks won't serve on explicit content |
| Native iOS app | Apple will reject explicit content immediately |
| Desktop creation mode | Mouse-dragging ragdolls is a different product (People Playground exists) |
| OAuth/social login | Email/password sufficient for v1, reduces third-party dependencies |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PHYS-01 | Phase 1: Physics Simulation | Complete |
| PHYS-02 | Phase 1: Physics Simulation | Complete |
| PHYS-03 | Phase 1: Physics Simulation | Complete |
| PHYS-04 | Phase 1: Physics Simulation | Complete |
| PHYS-05 | Phase 1: Physics Simulation | Complete |
| PHYS-06 | Phase 1: Physics Simulation | Complete |
| RNDR-01 | Phase 2: Rendering Engine | Complete |
| RNDR-02 | Phase 2: Rendering Engine | Complete |
| RNDR-03 | Phase 2: Rendering Engine | Complete |
| PLAT-03 | Phase 2: Rendering Engine | Complete |
| INPT-01 | Phase 3: Device Input | Complete |
| INPT-02 | Phase 3: Device Input | Complete |
| INPT-03 | Phase 3: Device Input | Complete |
| CAPT-01 | Phase 4: Screenshot Capture | Complete |
| CAPT-04 | Phase 4: Screenshot Capture | Complete |
| CAPT-02 | Phase 5: Replay Clips + Sharing | Complete |
| CAPT-03 | Phase 5: Replay Clips + Sharing | Complete |
| SHAR-01 | Phase 5: Replay Clips + Sharing | Complete |
| SHAR-02 | Phase 8: Gallery Core | Pending |
| INFR-03 | Phase 6: Infrastructure + Legal | Pending |
| ACCT-01 | Phase 7: User Accounts | Pending |
| ACCT-02 | Phase 7: User Accounts | Pending |
| ACCT-03 | Phase 7: User Accounts | Pending |
| GLRY-01 | Phase 8: Gallery Core | Pending |
| GLRY-02 | Phase 8: Gallery Core | Pending |
| GLRY-03 | Phase 8: Gallery Core | Pending |
| GLRY-04 | Phase 9: Gallery Social | Pending |
| GLRY-05 | Phase 9: Gallery Social | Pending |
| GLRY-06 | Phase 9: Gallery Social | Pending |
| PLAT-01 | Phase 10: PWA + Android APK | Pending |
| PLAT-02 | Phase 10: PWA + Android APK | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 33
- Unmapped: 0

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-05 after roadmap creation*
