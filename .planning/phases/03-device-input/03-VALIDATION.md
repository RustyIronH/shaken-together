---
phase: 3
slug: device-input
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/input/__tests__/shake.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/input/__tests__/shake.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | INPT-01 | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "gravity mapping"` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | INPT-01 | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "smoothing"` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | INPT-01 | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "goofy"` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | INPT-01 | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "lerp"` | ❌ W0 | ⬜ pending |
| 3-01-05 | 01 | 1 | INPT-01 | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "wake"` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | INPT-02 | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "permission"` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | INPT-03 | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "fallback"` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 1 | INPT-03 | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "button"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/input/__tests__/shake.test.ts` — stubs for INPT-01, INPT-02, INPT-03
- [ ] Mock for DeviceMotionEvent in Vitest node environment (no real accelerometer in CI)

*Existing Vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end shake causes ragdoll movement | INPT-01 | Requires physical phone with real accelerometer | Shake physical phone and observe ragdoll response to direction/intensity |
| Onboarding hint displays and fades | INPT-01 | Visual UX timing | Load app on mobile, verify "Shake your phone!" text appears and fades |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
