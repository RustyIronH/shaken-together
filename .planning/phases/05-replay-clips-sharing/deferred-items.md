# Phase 5 Deferred Items

## Pre-existing Test Failure

- **File:** `src/input/__tests__/drag.test.ts`
- **Test:** "Multi-Touch Drag > screenToWorld > converts screen coordinates to canvas world coordinates"
- **Issue:** Expected 400, received 200 -- test expects DPR scaling that implementation no longer applies
- **Discovered during:** Plan 05-01 full suite verification
- **Impact:** None on Phase 5 work. Unrelated to capture/replay modules.
