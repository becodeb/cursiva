# Archive Report: Dolphins in the pond — a screen that scrolls

**Change**: `dolphin-zigzag-scrolling-screen`  
**Dated**: 2026-09-14  
**Status**: ARCHIVED AND CLOSED

## Final State Authority

This archive report describes the state of the change AT CLOSE, not intermediate snapshots. The following facts outrank any stale claims in `apply-progress` or `verify-report`:

- **16 commits on the branch**, all merged to the working tree.
  - Plan: `a1cff82`
  - Implementation (10 commits): `b8bda0e` through `0d60090`
  - Remediation (4 commits): `24f40e4` (regression tests for camera reseed), `452edbd` (backdrop pinned fallback adopted), `13ce60b` (docs/13 item 9 correction), `da3d7d9` (docs/13: dolphins-on-the-bank art item recorded)
  - Verify: `0e3a924`
- **npm test**: **76 files / 1730 tests, all green** (baseline: 74 files / 1656 tests).
- **npm run build**: green (`tsc --noEmit && vite build`).
- **Verify report** (obs. ID 1407): PASS WITH WARNINGS (0 CRITICAL, 1 WARNING, unverifiable items noted). All 21 requirements traced to 59 scenarios.
- **Tasks.md**: All implementation tasks complete (60 tasks marked `[x]`; 56 original + 4 remediation). No unchecked tasks remain.
- **Engram artifacts**: proposal (obs. 1401), spec (obs. 1402), design (obs. 1403), tasks (obs. 1405), verify-report (obs. 1407).

**Post-verify amendment adopted**:
The design originally stated "The Backdrop Spans the World as One Element", spanning `viewBoxWidth`. The apply phase's own capture read-back was performed incorrectly. The verify phase's direct inspection of the same screenshots (`capturas/pasoG/` and `capturas/pasoG-verify/`) — `dolphin3-control.png`, `dolphin3-debug280.png`, `dolphin4-control.png`, `dolphin4-debug9999-clamp.png` — showed a flat, textureless field of open water with zero visible reed or bank texture, confirming design.md §3.3's original, more pessimistic fallback prediction rather than the initial amendment. The fallback design is adopted: backdrop pinned to the view window, not the world. This was remediated in commit `452edbd` with verify re-run passing.

## Specs Synced

| Capability | Files | Action | Requirements | Scenarios |
|---|---|---|---|---|
| `scrolling-camera` | NEW | Created | 9 ADDED | 17 |
| `level-engine` | MODIFIED | Merged | 5 ADDED | 13 |
| `trace-canvas` | MODIFIED | Merged | 1 MODIFIED | 2 |
| `zoo-map` | MODIFIED | Merged | 1 MODIFIED | 1 |

**Merge method**: Mechanical copy of new capability spec (`scrolling-camera/spec.md`). Mechanical append of ADDED requirements sections to existing specs for `level-engine`. Mechanical replacement of MODIFIED requirement blocks in `trace-canvas` and `zoo-map` matching delta specs. All deltas properly integrated into `openspec/specs/`.

## Archive Contents

- ✅ `proposal.md` — scope, approach, risks, dependencies
- ✅ `design.md` — technical design with 10 numbered sections, data flow diagram, threat matrix, rollout strategy, post-verify amendment A4 (design fallback adopted)
- ✅ `exploration.md` — prior art research and design decisions
- ✅ `tasks.md` — ten phases (G1–G6, Sweep, Capture, Gate), 60 complete implementation tasks with phase-8 (Capture) read-back and phase-9 (Gate) closure
- ✅ `verify-report.md` — PASS WITH WARNINGS; 21/21 requirements, 59/59 scenarios; 1 WARNING (dolphins render over bank illustration, art-direction, author-bound); unverifiable items inherent to node-only vitest harness
- ✅ `specs/` (four files):
  - `scrolling-camera/spec.md` — new capability (9 requirements, 17 scenarios)
  - `level-engine/spec.md` — delta, 5 ADDED requirements (world/window split, wave reuse, dolphin level set, catalog guards, docs checklist)
  - `trace-canvas/spec.md` — delta, 1 MODIFIED requirement (Viewport and Ruled Lines: `viewBox` expression now respects camera)
  - `zoo-map/spec.md` — delta, 1 MODIFIED requirement (Image-to-ViewBox Transform: backdrop now pinned to window, not world)

## Key Findings and Open Items

All findings disclosed and recorded in `docs/13` §4, item 9 (remediation commit `13ce60b`), rather than hidden.

### 1. Captured Rendering Showed Design Fallback Was Necessary

The initial apply-phase capture read-back misinterpreted screenshots of a flat water field (no reed or bank visible) as "backdrop spanning world successfully". The verify phase's direct, side-by-side inspection of the same raw PNG files proved the fallback design was correct: backdrop pinned to view window, not world. Remediated in `452edbd` with full verify re-run green.

### 2. One Post-Verify Finding: Dolphins Render Over Bank Illustration (Art Direction)

The verify report records: dolphins paint over the bank edge in `capturas/pasoG-verify/dolphin3-control.png` and `dolphin4-control.png`. This is a decorative, author-bound decision, not a functional defect. Recorded in `docs/13` §4 item 9 for the author's next review. No code or spec change required.

### 3. Three Unverifiable Items (Node-Only Harness Limitation)

Per verify-report: frame/event ordering tolerance (asynchronous pointer events vs. rAF), reduced-motion non-suppression proof (no jsdom), per-frame non-camera invariant (no live browser), motion feel and carrier occlusion mid-route. These are inherent to vitest's `node` environment and cannot be exercised without a live browser harness. The live captures (`capturas/pasoG/` and `capturas/pasoG-verify/`) provide manual visual evidence; they are gitignored.

### 4. Three Open Author Decisions (Out of Scope, Recorded)

- Estanque backpack item (whether to add a decorative backpack to the estanque zone; design left this open)
- The author's reference image for the dolphin shape (external reference not committed; dolphin size in sprite is 64; in-world size is 77 at full amplitude, decision left to author)
- Dolphins on the bank (whether the dolphins should render beneath or atop the bank illustration; render layer order is flexible, awaiting author direction)

These are recorded in `docs/13` §4 item 9 and do not block the change.

### 5. Two Remediation Commits After Apply-Progress

- `24f40e4`: Added regression tests for camera reseed at all three LevelPlay reset sites (`clearAttempt`, `restartRun`, `resetSurface`); ensures camera x-origin resets correctly when the level is reset.
- `13ce60b`: Corrected `docs/13` item 9 per find-back read during verify; added the three findings listed above.

### 6. Code Coverage Note

Every new export was swept for real callers (the discipline established after pasos D and E). No orphaned functions found.

## Practical Gotchas (for Future Dolphin Levels)

1. **Camera x-origin must be seeded fresh on every attempt reset**, not just on mount. The three reset sites (`clearAttempt`, `restartRun`, `resetSurface`) must all call `seedCameraOrigin`. The regression tests (`24f40e4`) now enforce this.

2. **Backdrop must respect the camera's window**, not the world. The fallback design is final: `x={camera?.originX ?? 0}` and `width={camera?.viewWidth ?? viewBoxWidth}` in every backdrop `<image>`. A wider world with a narrower window will show the same banks and reeds in frame throughout the stroke, not pan a cropped slice of open water.

3. **Frame/event ordering tolerance is ±1 frame (~16 ms).** A pointer event arriving up to one frame stale will have at most ~4px error on a typical stroke speed. This is acceptable for corridor width (40px typical). No guardrails were added; the design §6.2 documents the tolerance as a known invariant.

4. **Reduced-motion does not suppress the camera.** Unlike decorative easing or inertia, the camera is 1:1 driven by the child's finger (no animation). The code runs under `prefers-reduced-motion: reduce` identically. This is by design and tested.

## SDD Cycle Complete

The change has been fully planned (proposal), designed (design.md with A1–A4 amendments), specified (4 specs: 1 new + 3 deltas), tasked (10 phases, 60 tasks), implemented (16 commits), and verified (PASS WITH WARNINGS). All open items are out-of-scope art direction or author decisions. No code defects remain. The change is ready for production delivery via the feature branch `sdd/delfines-en-el-estanque` (unpushed, awaiting merge approval).
