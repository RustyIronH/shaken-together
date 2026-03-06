---
phase: 5
slug: replay-clips-sharing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/capture/__tests__/ src/ui/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/capture/__tests__/ src/ui/__tests__/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | CAPT-02 | unit | `npx vitest run src/capture/__tests__/replay-buffer.test.ts -x` | Wave 0 | pending |
| 05-01-02 | 01 | 1 | CAPT-02 | unit | `npx vitest run src/capture/__tests__/gif-encoder.test.ts -x` | Wave 0 | pending |
| 05-02-01 | 02 | 2 | CAPT-03 | unit | `npx vitest run src/ui/__tests__/capture-overlay.test.ts -x` | Wave 0 | pending |
| 05-02-02 | 02 | 2 | SHAR-01 | unit | `npx vitest run src/capture/__tests__/share.test.ts -x` | Wave 0 | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `src/capture/__tests__/replay-buffer.test.ts` — circular buffer push/get/capacity tests for CAPT-02
- [ ] `src/capture/__tests__/gif-encoder.test.ts` — GIF encoding produces Blob with correct MIME type for CAPT-02
- [ ] `src/capture/__tests__/share.test.ts` — share fallback chain (Web Share -> clipboard -> download) for SHAR-01
- [ ] `src/ui/__tests__/capture-overlay.test.ts` — tab switching, effects toggle visibility per tab for CAPT-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GIF animation plays back correctly in preview | CAPT-02 | Visual rendering quality requires human judgment | Capture a clip, switch to Clip tab, verify animation plays smoothly |
| Web Share sheet opens with correct file | SHAR-01 | Requires real browser + OS share sheet | Tap Share, verify native sheet appears with correct file type |
| Toast notification appearance and auto-dismiss | SHAR-01 | CSS transition timing + visual styling | On desktop browser, tap Share, verify toast appears and fades after ~2s |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
