---
phase: 1
slug: physics-simulation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (fast, Vite-native, TypeScript) |
| **Config file** | none — Wave 0 installs |
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
| 01-01-01 | 01 | 0 | — | setup | `npx vitest run` | No — Wave 0 | ⬜ pending |
| 01-XX-XX | XX | X | PHYS-01 | unit | `npx vitest run src/physics/__tests__/ragdoll.test.ts -t "creates ragdoll"` | No — Wave 0 | ⬜ pending |
| 01-XX-XX | XX | X | PHYS-01 | integration | `npx vitest run src/physics/__tests__/world.test.ts -t "gravity and collision"` | No — Wave 0 | ⬜ pending |
| 01-XX-XX | XX | X | PHYS-02 | unit | `npx vitest run src/physics/__tests__/world.test.ts -t "doll count"` | No — Wave 0 | ⬜ pending |
| 01-XX-XX | XX | X | PHYS-03 | unit | `npx vitest run src/physics/__tests__/mode.test.ts -t "mode switch"` | No — Wave 0 | ⬜ pending |
| 01-XX-XX | XX | X | PHYS-04 | unit | `npx vitest run src/physics/__tests__/performance.test.ts -t "time budget"` | No — Wave 0 | ⬜ pending |
| 01-XX-XX | XX | X | PHYS-05 | unit | `npx vitest run src/physics/__tests__/world.test.ts -t "reset"` | No — Wave 0 | ⬜ pending |
| 01-XX-XX | XX | X | PHYS-06 | unit | `npx vitest run src/input/__tests__/drag.test.ts -t "hit testing"` | No — Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration for the project
- [ ] `npm install -D vitest` — framework install
- [ ] `src/physics/__tests__/ragdoll.test.ts` — stubs for PHYS-01
- [ ] `src/physics/__tests__/world.test.ts` — stubs for PHYS-01, PHYS-02, PHYS-05
- [ ] `src/physics/__tests__/mode.test.ts` — stubs for PHYS-03
- [ ] `src/physics/__tests__/performance.test.ts` — stubs for PHYS-04
- [ ] `src/input/__tests__/drag.test.ts` — stubs for PHYS-06

*Framework install and test stubs must be created in Wave 0 before any implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 60fps visual smoothness | PHYS-04 | Perceived smoothness requires human eye + real device | Open in Chrome DevTools mobile emulator, enable FPS overlay, shake scene for 10 seconds |
| Goofy vs Realistic "obvious difference" | PHYS-03 | Subjective perception of physics personality | Toggle modes while dolls are active, verify bounce/flop/float feels distinctly different |
| Touch/drag feels natural on mobile | PHYS-06 | Touch responsiveness is subjective | Test on actual phone: grab limbs, fling dolls, multi-touch two dolls simultaneously |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
