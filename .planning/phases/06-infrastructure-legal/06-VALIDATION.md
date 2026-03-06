---
phase: 06
slug: infrastructure-legal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (existing) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run -x` |
| **Full suite command** | `npx tsc --noEmit && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run -x`
- **After every plan wave:** Run `npx tsc --noEmit && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | INFR-03 | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | INFR-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | INFR-03 | integration | `docker build . && docker run --rm -p 3000:3000 app` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | INFR-03 | manual | Deploy to VPS, curl https://shaken.ironhaven.com.au | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Express server tests — verify static file serving and API route mounting
- [ ] Docker build smoke test — verify multi-stage build completes

*Existing vitest infrastructure covers TypeScript compilation checks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HTTPS accessible at shaken.ironhaven.com.au | INFR-03 | Requires live VPS + DNS | 1. Deploy container 2. curl -I https://shaken.ironhaven.com.au 3. Verify 200 + valid cert |
| DNS resolution | INFR-03 | Requires Namecheap config | 1. Add A record 2. Verify dig shaken.ironhaven.com.au returns VPS IP |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
