# Shaken Together

## What This Is

A physics ragdoll toy meets social game. Users shake their phone to bounce cartoon characters around the screen, arrange them into funny (often sexually explicit) positions, then capture and share creations for friends and the public to rate. Deliberately irreverent — built for laughs, not app store approval.

## Core Value

Shaking the phone must feel satisfying and the ragdolls must land in funny, sharable positions. If the physics aren't fun, nothing else matters.

## Requirements

### Validated

- ✓ Physics ragdoll simulation with cartoon characters (2-5 dolls, user-chosen count) — Phase 1
- ✓ Two physics modes: realistic ragdoll (proper joints, gravity) and exaggerated/goofy (bouncy, stretchy, over-the-top) — Phase 1
- ✓ Cartoon character sprites with physics-synced rendering (4 pre-made characters) — Phase 2
- ✓ Mobile-first responsive canvas with WebGL acceleration at 60fps — Phase 2
- ✓ Device motion shake detection that moves dolls based on phone movement — Phase 3
- ✓ Screenshot capture of current ragdoll positions — Phase 4
- ✓ Short replay clip capture (last 3 seconds as animated GIF) — Phase 5
- ✓ User chooses screenshot or clip when sharing — Phase 5

### Active

- [ ] Required user accounts (signup/login)
- [ ] Share creations to public gallery
- [ ] Public gallery browsable by all users
- [ ] 1-5 star rating system on gallery submissions
- [ ] OG meta previews when shared gallery links are pasted in chat/social
- [ ] Web app (PWA) as primary platform with mobile browser shake support
- [ ] Side-loaded Android APK for power users

### Out of Scope

- Native iOS app — Apple will reject this immediately
- Google Play Store listing — content policy violation
- Real-time multiplayer shaking — complexity explosion for marginal fun
- In-app purchases / monetization — v1 is about the experience
- Content moderation AI — v1 ships raw, moderation later if needed
- Custom avatar creation — pre-made cartoon characters only for v1

## Context

- Device Motion API (accelerometer/gyroscope) required for shake detection in browsers
- PWA approach lets us bypass app store gatekeepers entirely
- Physics engines like Matter.js or Rapier handle 2D ragdoll simulation well
- The "explicit positioning" angle means traditional hosting/CDN providers may also have content policies to navigate
- Replay capture likely needs canvas recording (e.g., MediaRecorder API or frame-by-frame GIF encoding)
- Android APK can be a WebView wrapper around the PWA for near-zero extra development

## Constraints

- **Platform**: Must work in mobile browsers (Chrome, Safari) — shake detection depends on DeviceMotion API permissions
- **Content**: Self-hosted or permissive hosting required — mainstream platforms may reject content
- **Performance**: Physics simulation + rendering must run at 60fps on mid-range phones
- **iOS Safari**: DeviceMotion requires user gesture to enable — must handle permission flow gracefully

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA + APK over native apps | App stores will reject content; web gives widest reach | — Pending |
| Two physics modes | Covers both "artful posing" and "pure chaos" use cases | — Pending |
| Required accounts | Need identity for gallery ratings; prevents spam | — Pending |
| Public gallery over friends-only | More viral potential, more content to browse | — Pending |
| 1-5 star ratings | Simple, universally understood, sortable | — Pending |
| Matter.js for physics | Works well for 2D ragdolls; 60fps with 5 dolls achievable | Validated Phase 1 |
| 15-body ragdoll with 14 joints | Complete articulated figure; ankleR added for symmetry | Validated Phase 1 |
| Inline CSS for debug UI | Self-contained; easy to replace when PixiJS renderer arrives in Phase 2 | Validated Phase 1 |
| PixiJS v8 GraphicsContext for characters | Shared contexts per character type, cheap head swap for expressions | Validated Phase 2 |
| accelerationIncludingGravity for shake | Maximum device compatibility, works without gyroscope | Validated Phase 3 |
| gifenc for GIF encoding | 9KB pure JS, zero deps, per-frame palette quantization | Validated Phase 5 |
| GPU readback outside render ticker | extract.pixels() is synchronous; must use setInterval on mobile | Validated Phase 5 |
| Web Share API → clipboard → download | Three-tier sharing fallback chain for maximum device coverage | Validated Phase 5 |
| SHAR-02 (OG meta) deferred to Phase 8 | Requires gallery backend; no implementation path without it | Phase 5 |

---
*Last updated: 2026-03-06 after Phase 5*
