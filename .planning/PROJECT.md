# Shaken Together

## What This Is

A physics ragdoll toy meets social game. Users shake their phone to bounce cartoon characters around the screen, arrange them into funny (often sexually explicit) positions, then capture and share creations for friends and the public to rate. Deliberately irreverent — built for laughs, not app store approval.

## Core Value

Shaking the phone must feel satisfying and the ragdolls must land in funny, sharable positions. If the physics aren't fun, nothing else matters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Physics ragdoll simulation with cartoon characters (2-5 dolls, user-chosen count)
- [ ] Two physics modes: realistic ragdoll (proper joints, gravity) and exaggerated/goofy (bouncy, stretchy, over-the-top)
- [ ] Device motion shake detection that moves dolls based on phone movement
- [ ] Screenshot capture of current ragdoll positions
- [ ] Short replay clip capture (last few seconds of shaking as GIF/video)
- [ ] User chooses screenshot or clip when sharing
- [ ] Required user accounts (signup/login)
- [ ] Share creations to public gallery
- [ ] Public gallery browsable by all users
- [ ] 1-5 star rating system on gallery submissions
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

---
*Last updated: 2026-03-05 after initialization*
