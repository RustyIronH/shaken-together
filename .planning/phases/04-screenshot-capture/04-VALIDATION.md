---
phase: 4
slug: screenshot-capture
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | CAPT-01 | unit | `npx vitest run src/capture/__tests__/screenshot.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | CAPT-01 | unit | `npx vitest run src/capture/__tests__/screenshot.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | CAPT-01 | unit | `npx vitest run src/capture/__tests__/screenshot.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 2 | CAPT-04 | manual-only | Manual: tap capture, verify overlay appears | N/A | ⬜ pending |
| 04-01-05 | 01 | 2 | CAPT-04 | manual-only | Manual: toggle effects, verify swap | N/A | ⬜ pending |
| 04-01-06 | 01 | 2 | CAPT-04 | manual-only | Manual: tap Save, verify PNG downloads | N/A | ⬜ pending |
| 04-01-07 | 01 | 2 | CAPT-04 | unit | `npx vitest run src/capture/__tests__/screenshot.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/capture/__tests__/screenshot.test.ts` — stubs for CAPT-01 (capture logic, two-pass, visibility restore)
- [ ] Mock strategy for PixiJS extract API (renderer.extract.canvas returns mock canvas)
- [ ] Mock strategy for Matter.js Runner (stop/run calls verified)

*Wave 0 creates test stubs and mock infrastructure before implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Preview overlay appears with captured image | CAPT-04 | DOM visual rendering, overlay styling | 1. Tap capture button 2. Verify full-screen overlay appears 3. Verify captured image displayed |
| Effects toggle swaps images | CAPT-04 | Visual comparison of clean vs effects images | 1. In preview, toggle Effects ON/OFF 2. Verify image changes between passes |
| Save triggers PNG download | CAPT-04 | Browser download behavior | 1. In preview, tap Save 2. Verify PNG file downloads to device |
| No UI chrome in captured image | CAPT-01 | Visual inspection of screenshot content | 1. Capture screenshot 2. Open saved PNG 3. Verify no buttons/overlays visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
