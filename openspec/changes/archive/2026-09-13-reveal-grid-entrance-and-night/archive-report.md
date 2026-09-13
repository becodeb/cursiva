# Archive Report: reveal-grid-entrance-and-night

**Date**: 2026-09-13  
**Change**: `reveal-grid-entrance-and-night`  
**Branch**: `sdd/entrada-y-linterna`  
**Status**: ARCHIVED AND CLOSED  

## Change Summary

Paso D of `docs/13` §8: the reveal grid mechanic (two modes: erase and light), the entrance sector (two adventures: glass and sand with fogged-glass and sand tile paints), the narrative opening and transformation into detective mode, and the night sector (one adventure: night with a flashlight mechanic). Twelve new levels (glass1..4, sand1..4, night1..4) with their own reveal grid configurations, two new backpack items (lupa and linterna), narrative entry and closing screens, a migration to preserve returning children's unlocks, and new debug flags for render-state seeding.

## Final State (at close)

The change is complete and fully implemented. All 60 tasks are marked complete in `openspec/changes/archive/2026-09-13-reveal-grid-entrance-and-night/tasks.md`. Per the orchestrator's final-state facts:

- **Test count**: 69 test files / 1,436 tests green (`npm test`)  
- **Build**: Green (`npm run build`)  
- **Branch**: 17 commits on `sdd/entrada-y-linterna`, tree clean  
- **Task 7.7**: Now marked `[x]`. Both defects identified during capture pass 4 reached determinate outcomes:
  - **Defect 1 (tile-seam hairlines)**: Fixed with a regression test in `RevealLayer.tsx`
  - **Defect 2 (flashlight reads as a plus)**: Proved structurally incompatible with the ratified frame-budget test R5 — reported as a carry-forward follow-up, not a shipped bug
- **Phase 8**: Completed (final gate and docs/13 §4 decision 6 recorded)
- **Design amendments**: A1–A4 (§0 of design.md) ratified and superseded the proposal on four points:
  - A1: LEVELS[0] is glass1, not f1-libre
  - A2: No cross-adventure radius ordering (erase and light radii are not comparable)
  - A3: nightfall() takes a luma floor, not a cap  
  - A4: migrateEntrance seeds 2 records, not 12; question 4 retired

## Artifacts

### Source of Truth: Main Specs Updated

Six delta specs merged into main specs under `openspec/specs/`:

| Spec | Action | Details |
|------|--------|---------|
| reveal-grid | Created | New full spec (213 lines, 7 requirements defining the two-mode tile-grid mechanic, persistence, rendering contract, debug flags) |
| level-engine | Modified + Added | 8 new requirements: optional reveal field, free-level semantics, 12-level catalog positioning, pedagogical progression per adventure, demo/debug flag seeding, catalog tests updated, migrateEntrance copy-forward logic |
| free-trace-mode | Added | 2 new requirements: coverageScore generalization to reveal-grid grids with backward-compatible defaults, half-cell interpolation parity |
| main-screen | Modified + Added | Modified: resolveEnterAction now includes glass1/sand1/night1 (animal-less adventures). Added: close GameView variant and resolveCloseAction, AdventureClosing screen component |
| trace-canvas | Added | 2 new requirements: reveal layer rendering (plain rects, no `url(#)` references), tile-paint luma law for all three reveal backdrops (measured values: glass 109, sand 109, night 22; gaps: 103, 100, 74) |
| zoo-map | Modified + Added | Modified: sector-to-adventure mapping (entrada opens with glass/sand, nocturna unlocks with llama-peak4), backpack registry (3 items: andean-hat, lupa, linterna). Added: recentlyDiscovered preference (untouched sector first, fallback to existing rule), animal-less adventure phrase handling, backdrop resolution through adventure-keyed registry |

**Note**: `progress-store/spec.md` was deliberately NOT merged (per final-state facts: the delta was deleted mid-flight; `progress-store.Purpose` is per-letter progress percentages, while reveal-grid touches only `LevelProgressStore` in level-engine).

### Change Artifacts Archived

Folder moved to: `openspec/changes/archive/2026-09-13-reveal-grid-entrance-and-night/`

Contents:
- ✅ `proposal.md` — Initial scope, ten decisions, six open product questions
- ✅ `specs/` (6 delta specs, now merged into main specs)
  - reveal-grid/spec.md (new)
  - level-engine/spec.md (modified, 8 added requirements)
  - free-trace-mode/spec.md (modified, 2 added requirements)
  - main-screen/spec.md (modified, 3 changes)
  - trace-canvas/spec.md (modified, 2 added requirements)
  - zoo-map/spec.md (modified, 5 changes)
- ✅ `design.md` — 880 lines, 19 decisions, §0 ratified amendments A1–A4, all measurements in, two flagged items closed in-phase, estanque fog rule reconciled
- ✅ `tasks.md` — 8 phases, 60 tasks, all complete (Phases 1–6 shipped, Phase 7 capture pass 4 complete, Phase 8 final gate complete)
- ✅ `verify-report.md` — 69 test files / 1,432 tests green (now stale: two tests added post-verify via capture pass and closing-screen route), build green, 30/30 requirements, 89/89 scenarios, pass_with_warnings (2 warnings, both recorded below)

### Observation IDs (Engram traceability)

- #1351: sdd/reveal-grid-entrance-and-night/proposal
- #1352: sdd/reveal-grid-entrance-and-night/design
- #1356: sdd/reveal-grid-entrance-and-night/tasks
- #1360: sdd/reveal-grid-entrance-and-night/verify-report

(Note: Delta specs stored as filesystem artifacts in openspec/changes/, not Engram, per openspec-convention.md)

## Three Carry-Forward Follow-ups

These are structurally unresolved within this change's own ratified constraints and remain live after closure:

### 1. Flashlight Quantization vs. Frame Budget (paso H)

The reveal grid's light mechanic reads as a stepped plus (five opacity levels per tile row and column), not a smooth pool. This is NOT a bug — it is an algebraic incompatibility between two ratified constraints:

- **R5 frame-budget test**: `((2R/w_t)+2) × ((2R/h_t)+2) ≤ 64` (squared tiles, 5:3 ratio)
- **Anti-plus floor**: `ρ = radius/tileW ≥ 4` (measured requirement from design.md)

These reduce to: `ρ ≤ 3.0` (mutually exclusive with the anti-plus constraint for every level and radius).

**Three real exits** — all requiring human decision:
1. Measure the frame-budget test on real tablet hardware and re-derive it (the harness is node with no jsdom; it was never measured on hardware)
2. Replace the night-sector mechanic (e.g., continuous falloff with its own tradeoffs)
3. Accept the stepped plus as the delivered mechanic

Belongs to paso H, which returns to the night sector.

### 2. Tile Paint Color Direction (design carry-forward)

Two tiles render with colors chosen for constraint satisfaction, not art direction:

- `GLASS_GRIME` (#64726b, luma 109): Reads as a desaturated green-gray over blue water. The 55-luma law (`docs/09:158`) forces a dark paint; measured, the light branch is provably empty (white misses by 40 on the aquarium).
- `SAND_DRIFT` (#7a6a58, luma 109): Reads as dark mud over tan sand. The law forces dark; measured, the light branch is provably empty (white misses by 43 on the sand).

Both were deliberately left untouched. The law is measured constraint, not taste — but which dark is the project author's call.

### 3. Night Backdrop Derived From Source (build maintenance)

The night backdrop is built by `nightfall()` from `fondo bosque.png` (design.md §3.2):

- **Derivation**: `NIGHT_PEAK=96`, `NIGHT_SHADOW=0.22`, `NIGHT_TINT=(0.858,1.000,1.370)`, desaturate toward luma by `NIGHT_SAT=0.45`, tint, then rescale so each opaque pixel's luma hits `target = 96×(0.22 + 0.78×L/245)`.
- **At close**: Night backdrop built and in use; derivation works.
- **Author's next step**: Send an authored `fondo nocturno.png`.
- **Swap procedure**: One `PASSTHROUGHS` row (replace the sixth element with the source PNG name) plus deleting the `nightfall` call (the docblock at that site says so).

The derivation is temporary and built to be replaced. No code change needed; it is a data swap in `build_art.py`.

## Ratified Amendments (supersede proposal)

From `design.md` §0:

1. **A1 — LEVELS[0] = glass1, not f1-libre**: Proposal decision 1 (reveal grid as optional on free) and decision 9 (insertion ahead of f1-libre) contradicted each other. Design.md §5.1 rectifies: the insertion is load-bearing on LEVELS[0] becoming glass1; `isUnlocked`'s `index === 0` branch depends on it.

2. **A2 — No cross-adventure radius ordering**: Proposal held night1 ≤ sand4 radius. But erase radius accumulates cleared area across an attempt while light radius persists nothing — they are not comparable quantities. Design.md §5.4 drops the cross-adventure rule.

3. **A3 — nightfall() luma is a FLOOR, not a cap**: Proposal said "cap max luma". A cap alone is satisfied by a black rectangle, which fails the 55-luma law outright. Design.md §3.2: the derived `brightest` MUST be ≥ luma(NIGHT_VEIL) + 55 = 77. Measured: 96 (margin 19).

4. **A4 — migrateEntrance seeds 2 records, not 12**: Proposal estimated 12 new migrations and framed "keep every unlock" versus "see the opening" as a forced choice. Neither holds. `isUnlocked` is positional over the whole catalog, so inserting ahead only demotes that id's own successor chain. The twelve new ids were never unlocked before (no demotion). Only f1-libre and f2-guirnalda chains needed protecting (2 records: sand4, night4). Design.md §8.1, decision A4, retires question 4.

## Unratified Assumptions (remain open)

From `apply-progress.md` Phase 8, five product-level questions remain unratified by the author:

1. Should the entrance's narrative-entry screen play any audio (theme music, footstep ambience)?
2. Should completing the entrance (sand4) trigger a camera pan or screen transition before the closing screen?
3. Should the flashlight mechanic include haptic feedback when an object is discovered (light latch)?
4. Should the night sector's `recentlyDiscovered` preference include a "breadcrumb trail" hint to guide discovery?
5. What color palette should the closing screen use — a continuation of the entrance's glass/sand aesthetic, or a transition toward the next sector?

These are deferred to the author's review of paso D and will inform later phases.

## Summary of Merge Operations

**Mechanical copy**: 1 new spec created (reveal-grid)  
**Requirements merged**:
- ADDED: 15 new requirements across 5 specs (free-trace-mode 2, level-engine 8, main-screen 2, trace-canvas 2, zoo-map 3)
- MODIFIED: 4 requirements across 2 specs (main-screen 2, zoo-map 2)

**Archive readback**: `diff -r` returned empty (byte-identical copy verified)

## Next Step

The change is complete and archived. Ready for paso E (sheep and llama closing phrase customization) and paso F (forest sector introduction).

---

*Archive written at SDD phase close, 2026-09-13. This is the terminal record of the reveal-grid-entrance-and-night change.*
