---
phase: 02
slug: rendering-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
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
| 02-01-01 | 01 | 1 | RNDR-01 | unit | `npx vitest run src/renderer/__tests__/character-registry.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | RNDR-01 | unit | `npx vitest run src/renderer/__tests__/ragdoll-sprite.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | RNDR-02 | unit | `npx vitest run src/renderer/__tests__/character-assignment.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | RNDR-02 | unit | `npx vitest run src/renderer/__tests__/character-swap.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | RNDR-03 | unit | `npx vitest run src/renderer/__tests__/pixi-renderer.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | RNDR-03 | unit | `npx vitest run src/renderer/__tests__/sprite-sync.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | PLAT-03 | unit | `npx vitest run src/renderer/__tests__/pixi-renderer.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | RNDR-01 | unit | `npx vitest run src/renderer/__tests__/faces.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 3 | RNDR-01 | unit | `npx vitest run src/renderer/__tests__/effects.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/renderer/__tests__/character-registry.test.ts` — stubs for RNDR-01 (character definitions)
- [ ] `src/renderer/__tests__/ragdoll-sprite.test.ts` — stubs for RNDR-01 (sprite creation)
- [ ] `src/renderer/__tests__/character-assignment.test.ts` — stubs for RNDR-02 (assignment logic)
- [ ] `src/renderer/__tests__/character-swap.test.ts` — stubs for RNDR-02 (in-place swap)
- [ ] `src/renderer/__tests__/pixi-renderer.test.ts` — stubs for RNDR-03, PLAT-03 (init and DPR)
- [ ] `src/renderer/__tests__/sprite-sync.test.ts` — stubs for RNDR-03 (physics sync)
- [ ] `src/renderer/__tests__/faces.test.ts` — stubs for RNDR-01 (expressions)
- [ ] `src/renderer/__tests__/effects.test.ts` — stubs for RNDR-01 (visual effects)

*Note: PixiJS tests need mock/stub for Application and Graphics classes since vitest runs in Node (no WebGL). Use `vi.mock('pixi.js')` to mock PixiJS classes. Test logic/data flow, not actual rendering.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Characters visually recognizable at phone scale | RNDR-01 | Subjective visual quality | Open on phone, verify characters are distinct and readable |
| 60fps on mid-range mobile | RNDR-03 | Requires real device | Open DevTools performance tab, verify stable 60fps with 5 dolls |
| Responsive portrait layout | PLAT-03 | Visual layout check | Test on 3 phone sizes (small, medium, large) in portrait |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
