# Archive Report: Duck Undulations and the Lagoon Sector Backdrop

**Change ID**: `duck-undulations-and-sector-backdrop`  
**Archived**: 2026-09-13  
**Artifact Store**: openspec  
**Final Status**: COMPLETE ✓

---

## Executive Summary

The duck undulations and lagoon sector backdrop change has been fully planned, implemented, verified (PASS), and archived. All 44 implementation tasks are complete. Five delta specs have been merged into main specs under `openspec/specs/`. The change introduces four duck trail levels with wave-based path generators forming an undulation progression, a sector backdrop layer in the trace canvas with luma-governed paint selection, detective-mode ground scatter retirement keyed to backdrop presence, and narrative entry/exit screen infrastructure for the duck adventures.

---

## Final State per Orchestrator Launch Prompt

### Commits and Code

- **Branch**: `sdd/patos-ondulaciones`
- **Final commit**: `a5235a2`
- **Total commits**: 8
- **Work completed after `apply-progress.md`**:
  - Commit `022afdb`: Fixed layout defect in narrative entry's stage square (sized on width alone, overflowed landscape viewport, clipped octopus's lower tentacles at 1000×600). Clamped with `84dvh`; recaptured at 1000×600 and 768×1024.
  - Commit `2934e2f`: Phase 4 evidence section appended to `tasks.md`.
  - Commit `a5235a2`: `gentle-ai.verify-result/v1` envelope prepended to `verify-report.md` (required for router admission).

### Tests and Build

- **Test Files**: 63 (baseline before change: 60)
- **Total Tests**: 1223 green (baseline: 1162)
- **Build**: `npm run build` — exit code 0
- **Verification**: PASS (0 CRITICAL, 0 WARNING, 2 SUGGESTION)

### Tasks

- **Total Implementation Tasks**: 44/44 complete (100%)
- **No unchecked tasks** remain in persisted `tasks.md`

### Known Spec Drift (Pre-existing, Not Fixed per Archive Scope)

1. **Trace Canvas Spec Drift**: `openspec/specs/trace-canvas/spec.md` describes "perfect-freehand ink" in Purpose and "Requirement: Ink Rendering", but `canvas/ink.ts` is a centre-line polyline (not perfect-freehand). Pre-existing since `trace-canvas` was first specced; `ink.ts:5-9` documents the trade-off. **Status**: Recorded, out of scope for this change.

2. **Demo Flag Contradiction**: All four duck levels (`duck-trail1..4`) carry `demo: true`, but `docs/13` §5 item 2 specifies demonstration only when movement is new. The duck's repeating undulations are not a new shape (rows C-H will use shaped movements elsewhere). **Status**: Deliberately out of scope for row B per directive. The design doc acknowledges this as a future reconciliation.

---

## Specs Merged into Main Specs

The following five domain specs had delta specs successfully merged into main specs under `openspec/specs/`:

### 1. Level Engine (`openspec/specs/level-engine/spec.md`)

**Modified Requirement**:
- `Duck Trail Set Precedes trail1` — updated with final generator calls, corridor widths 100/90/80/70, taper rules for step 4, and revised continuity rules for step 3.

**Added Requirements** (4 new):
- `waveVaried Per-Cycle Amplitude Generator` — per-cycle `{width, amplitude}` variant of `wave()`, emitting only M/C commands, byte-identical for uniform cycles.
- `Duck Undulation Progression Invariant` — peak slope increases monotonically across four steps (≈1.66 → 3.32 → 4.69 → 4.98); step 3 varies amplitude per cycle; step 4 tapers to narrower than step 3 everywhere.
- `Corridor Tolerance Band Stays Inside the Channel on Wave Crests` — ideal band folded boundary points stay within stroked channel at tightest crest despite small radius of curvature.
- `Docs/13 §6 Checklist Coverage for Duck Trails` — all four duck `LevelConfig`s populate engine-owned checklist items; narrative transition satisfied by `main-screen` and `zoo-map` requirements, not `LevelConfig`.

### 2. Trace Canvas (`openspec/specs/trace-canvas/spec.md`)

**Added Requirements** (3 new):
- `Sector Backdrop Layer Beneath the Maze Block` — optional `backdrop` prop renders as `<image href>` with `slice` set on image element, no `url(#)` references allowed.
- `Wall Rect Yields to the Backdrop` — maze block's solid fill rect omitted when backdrop present; channel still strokes above.
- `Channel Paint Follows the Backdrop Luma Law` — corridor channel uses `SHEET_PAPER` (#fdfcf7) over backdrop to maintain ≥55 luma separation from lagoon sample (#b4c5d0, luma 194.2); test asserts both values and proves `CORRIDOR_EARTH` fails the law.

### 3. Detective Mode (`openspec/specs/detective-mode/spec.md`)

**Modified Requirement**:
- `World Behaviours Gate on inDetectiveWorld, Not on the Clue` — ground scatter now retires specifically when `inDetectiveWorld(level) && backdropFor(level.id)` resolves an entry (duck trails), continuing to render for medusa levels sharing the sector. Gate is per-adventure (via `backdropFor` → `adventureFor`), not sector-wide, preserving medusa ground in `docs/13` §4 "Hecha — Nada" ruling.

### 4. Main Screen (`openspec/specs/main-screen/spec.md`)

**Added Requirements** (3 new):
- `resolveEnterAction Chooses Between Play and the Narrative Entry` — pure function exported from screen module, returns `'intro'` GameView for `duck-trail1` unconditionally, `{type:'play', levelId}` for all others.
- `Narrative Entry GameView Variant and App Wiring` — `GameView` gains `'intro'` variant; `App.tsx`'s `ZooMap.onEnter` routes through `resolveEnterAction`; `nextView` reducer unaffected (intro reachable only via `onEnter`, not `GameAction`).
- `Narrative Entry Screen Content` — renders octopus-with-backpack, speech bubble, duck, and closing phrase via `CaptionedArt`; all assets from `detective/assets.ts` registry; tap advances to `duck-trail1` play view.

### 5. Zoo Map (`openspec/specs/zoo-map/spec.md`)

**Added Requirement** (1 new):
- `Octopus Phrase Reads as a Closing Once the Sector's Animal Is Recovered` — phrase selector (pure function over `records`) returns existing onward-pointing phrase before duck recovered, switches to closing line once `duck-trail4` filed; phrase still rendered via `CaptionedArt`.

---

## Archive Contents Verified

✓ All artifacts present in archived folder:
  - `proposal.md`
  - `spec.md` (in each of 5 domain spec subdirs)
  - `design.md`
  - `tasks.md` (44/44 tasks checked ✓)
  - `verify-report.md` (PASS verdict, envelope valid)
  - `apply-progress.md`
  - `explore.md`

✓ No unchecked implementation tasks in archived `tasks.md`

✓ Main specs successfully updated (`openspec/specs/{level-engine,trace-canvas,detective-mode,main-screen,zoo-map}/spec.md`)

✓ Change folder moved from `openspec/changes/duck-undulations-and-sector-backdrop` to `openspec/changes/archive/2026-09-13-duck-undulations-and-sector-backdrop`

✓ Pre-move snapshot diff: empty (byte-identical)

---

## Delivery Summary

**Delivery Strategy**: `single-pr` (cached)  
**Review Budget**: 400 lines (authored code)  
**Actual Code Changes**: ~1312 changed code lines  
**Acceptance**: Explicit `size:exception` approval by user before apply  
**Verification Gate**: PASS (0 CRITICAL, 0 WARNING, 2 SUGGESTION)  
**Review Gate**: Not discovered for this candidate (no review was started)

---

## SDD Cycle Complete

The change has been fully planned (**proposal**, **spec**, **design**, **tasks**), implemented on `sdd/patos-ondulaciones` across 8 commits with 63 test files (1223 tests green) and `npm run build` passing, verified by `gentle-ai sdd-verify` returning PASS, and now archived with all delta specs merged into main source-of-truth specs.

Ready for the next change.

