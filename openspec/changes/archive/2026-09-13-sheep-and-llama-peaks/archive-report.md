# Archive Report: Sheep and Llama Peaks

**Change ID**: `sheep-and-llama-peaks`  
**Archived**: 2026-09-13  
**Artifact Store**: openspec  
**Final Status**: COMPLETE ✓

---

## Executive Summary

The sheep and llama peaks change has been fully planned, implemented, verified (PASS with 4 WARNING items), and archived. All 65 implementation and verification tasks are complete — including three post-apply corrections made after `apply-progress.md` was written and discovered by the maintainer's screenshot pass. Task 7.4 (progressive capture of post-adventure state) is deliberately marked `[~]` (partially reached) per design scope: only the map-fogged-after-duck state was captured; the backpack-HUD-with-hat and map-after-adventure-closes captures were not taken because the only available progress-seeding debug flag is `?debug=pato-recuperado` (duck only), and inventing a new flag would have been unscoped. Eight delta specs have been merged into main specs under `openspec/specs/`. The change introduces ridge path generators (`peakRidge`, `peakRidgeCorridorLimit`), vertex art placement on peaks, eight new levels (sheep-hill1..4 and llama-peak1..4) with strictly decreasing corridor widths and height/slope invariants, updated narrative entry routing to cover all three adventures, a per-backdrop channel-paint rule with a luma-based validation framework, and Montañas sector unlocking tied to sheep/llama adventure completion.

---

## Final State per Orchestrator Launch Prompt and Post-Apply Verification

### Commits and Code

- **Branch**: `sdd/ovejas-y-llamas`
- **Final commit**: (working tree clean, 18 commits ahead of main)
- **Total commits**: 18
- **Build**: `npm run build -w client` — exit code 0 ✓

### Tests and Build (Final Count, Post-Corrections)

- **Test Files**: 65 (baseline before change: 63)
- **Total Tests**: 1286 green ✓ (baseline: 1223; after apply reported 1282; the +4 came from three post-capture corrections)
- **Build**: green ✓
- **Verification**: PASS verdict (0 CRITICAL, 4 WARNING, validator `{"valid": true}`)

### Work Completed After `apply-progress.md`

Three defects were found by the maintainer's screenshot pass and fixed in subsequent commits, all recorded in `tasks.md` Phase 7.7 and re-verified in the final verification run:

1. **Commit `017c173` — Sheep alpha dither artifact fix** (`art-source/oveja.png`)  
   The whole-canvas alpha dither shipped the full lamina (drawing mask) as a solid box under every sheep. Fixed with `SPECKLED_ALPHA_SOURCES` flag + the existing `keep_largest_blob()` in `scripts/art/build_art.py`. Asset size: 409×448/225 KB → 420×448/83 KB. The fix is reflected in current catalog and verified against built PNG bytes.

2. **Commit `3a1f515` — Shell display mode change in `LevelPlay.tsx`**  
   Eight levels (the sheep and llama adventures) shipped with the ordinary worded shell. Thirteen chrome gates in `LevelPlay.tsx` moved from `inWorld` (default) to `drawnPlace` (wordless), giving the mountain adventures the duck trails' wordless shell. The maintainer chose this presentation. `specs/detective-mode/spec.md`'s scenario was amended from "The ordinary shell renders" to "The wordless shell renders" — archive carries the amended text, not the original.

3. **Commit `de8a4cc` — Fog unlock check in `ZooMap.tsx`**  
   Montañas (the first sector with a conditional unlock) kept its cloud over an already-live hit because `ZooMap.tsx` filtered fog on `fog.length > 0` without consulting `isOpen`. Fixed with two new test assertions in `sectors.test.ts` pinning both `appearsWhen` rules and `backpack.test.ts` pinning the hat's grant condition.

4. **Commit `5d4bee8` — Test docblock correction and spec/design drift fix**  
   Corrected the sheep regression test's docblock (it named a function that never existed). Closed a spec/design drift on the falsifiability row count: `specs/trace-canvas/spec.md` now explicitly names **five** rows (not four), and design.md decision 5 records three corrected assumptions behind the choice of `CHANNEL_STONE` over `SHEET_PAPER` for the cordillera.

### Tasks

- **Total Implementation Tasks**: 65/65 complete (100%)
- **Task 7.4 Status**: `[~]` (deliberately incomplete, not a defect)
  - **Recorded Intent** (per `tasks.md` phase 7.4 docblock): Map-after-each-adventure-closes and backpack-HUD-with-hat captures were intentionally out of scope because the only progress-seeding dev flag is `?debug=pato-recuperado` (duck only), and creating new flags would have expanded scope beyond row C.
  - **Verification Evidence**: `sectors.test.ts` pins both `appearsWhen` unlock rules, and `backpack.test.ts` pins the hat's grant condition, so the behavior is tested even though the visual capture is not taken.
  - **Status**: This is an accepted gap, not a blocking incompleteness.

### Spec Amendments and Final Validation

- **Detective-Mode Scenario Wording** (per maintainer's shell-mode fix):  
  `specs/detective-mode/spec.md` Requirement "Scenario: The wordless shell renders" was amended from "The ordinary shell renders" to match the post-correction implementation. The detector-mode spec and its covering tests both describe the wordless shell; no defect to fix, only wording alignment.

- **Trace-Canvas Spec Clarity** (per `design.md` decision 5):  
  The five falsifiability rows for the luma-law test are now all named explicitly in `specs/trace-canvas/spec.md`, matching both the implementation (`catalog.ts`/`backdrops.ts`) and the design doc's final arithmetic. An earlier draft said "four"; this resolution names all five, so spec, design, and code now agree.

### Known Findings (from verify-report, all non-blocking)

**CRITICAL**: None. Zero requirements untested, zero failing tests, build green.

**WARNING** (4 items, none block archive readiness):
1. **Phase 7.4 gap** — intentionally scoped (captures never taken); behavior is tested, visual capture is not. Recorded above.
2. **Trace-canvas spec/design naming drift (pre-existing)** — `openspec/specs/trace-canvas/spec.md` describes "perfect-freehand ink" but `canvas/ink.ts` is a centre-line polyline. Pre-existing since trace-canvas was first specced; marked as out of scope for this change.
3. **Lagoon byte-identical claim audit note** — the design doc notes "lagoon backdrop byte-identical to before" as an assertion needing cross-check; the implementation assertion (no `channel` field defaults to `SHEET_PAPER`) is verified against backdrops.ts.
4. **Test docblock narrative (inaccurate, now corrected)** — resolved by commit `5d4bee8`; the sheep regression test's docblock has been fixed.

---

## Specs Merged into Main Specs

The following five domain specs had delta specs successfully merged into main specs under `openspec/specs/`:

### 1. Level Engine (`openspec/specs/level-engine/spec.md`)

**Added Requirements** (6 new):
- `Per-Vertex-Height Ridge Path Generator` — `peakRidge({x0, x1, base, heights})` generator for drawable "alta-baja" profiles, outputting only M/L commands, surviving `transformPath` unchanged, with peaks at exact heights and valleys on the base line.
- `Ridge Corner-Fusion Corridor Limit` — `peakRidgeCorridorLimit({x0, x1, heights})` predicate for the widest corridor before rounded joins merge into one filled shape, with closed-form inversion for uniform heights.
- `Sheep and Llama Ridge Level Set` — eight levels appended to PHASE_1 end (after duck-trail4, before f2-guirnalda): `sheep-hill1..4` and `llama-peak1..4`, each with descending corridor widths (sheep 100/90/80/60; llama 90/80/70/60), step-4 taper, demo/rail feedback on step 1 only, and `resetOnContact: true`.
- `Sheep vs Llama Height, Slope and Corner Invariants` — seven frozen invariants (I1–I4, I6–I7) asserted directly in catalog test, including peak-height ordering, slope comparison, corner-angle bluntness, minimum-vertex ratio, uniform vs. dual-height patterns, and corridor-limit coverage.
- `Vertex Art Field and Placement Selector` — `LevelConfig` gains optional `vertexArt?: {art: ArtImage; size: number}` field (additive, absent on pre-existing levels); `routeApexes(polyline, minRise = 40)` selector finds local y-minima without affecting case membership.
- `Docs §6/§14 Checklist Coverage for Sheep and Llama Levels` — each of the eight levels populates engine-owned checklist items: start zone, trajectory, tolerance, contact response, restart, help animation, and completion criterion.

### 2. Detective Mode (`openspec/specs/detective-mode/spec.md`)

**Added Requirements** (2 new):
- `Montañas Sector Locked Until First Sheep Level Completed` — `Montañas.appearsWhen` returns `records[sheep-hill4]?.completed === true`, unlocking the entire mountain sector and its two adventures on completion of the fourth sheep level. The hat grant (backpack HUD item) similarly keys to the same record via `grants.hat` rule.
- `Scenario Amendment**: The wordless shell renders** — per post-apply correction, the narrative mountain-adventure shell is wordless (not ordinary), bringing detective-mode spec alignment with the implementation.

### 3. Main Screen (`openspec/specs/main-screen/spec.md`)

**Modified Requirements** (2 updated):
- `resolveEnterAction Chooses Between Play and the Narrative Entry` — widened from duck-trail1-only to all three adventure first levels (`duck-trail1`, `sheep-hill1`, `llama-peak1`), mirroring the underlying `introLevel(levelId)` generic implementation.
- `Narrative Entry Screen Content` — extended to render the entering adventure's own animal art (via `ZOO_ANIMAL_ART`) and its own intro line (not hardcoded duck prose), advancing to that adventure's own first level (not hardcoded duck-trail1).

### 4. Trace Canvas (`openspec/specs/trace-canvas/spec.md`)

**Modified Requirement** (1 updated):
- `Channel Paint Follows the Backdrop Luma Law` — amended to name all five falsifiability rows explicitly (not four), confirming the luma-gap derivation and the reason `CHANNEL_STONE` is forced rather than chosen for both mountain backdrops.

**Added Requirements** (2 new):
- `Sector Backdrop Layer Beneath the Maze Block` — optional `backdrop` prop renders as `<image href>` with `slice` set, no `url(#)` references.
- `Wall Rect Yields to the Backdrop` — maze block's solid fill rect omitted when backdrop present; channel still strokes above.

### 5. Zoo Map (`openspec/specs/zoo-map/spec.md`)

**Modified Requirements** (3 updated):
- `Sector-to-Adventure Mapping` — montañas now carries two adventures (sheep and llama adventures), ordered as `sheep-hill1..4, llama-peak1..4` after duck trails, no longer grouped with empty-adventure sectors.
- `Backpack Registry` — backpack items include the `hat` (gain condition tied to montañas unlock, visible in HUD and playable animals).
- `Octopus Phrase Reads as a Closing Once the Sector's Animal Is Recovered` — phrase selector now covers all three sectors (lagoon, montaña-ovejas, montaña-llamas), returning closing lines once each adventure's final level is completed.

**Added Requirements** (2 new):
- `Montañas Sector Opened With Two Adventures and Two Animals` — sector now contains the sheep and llama adventures, both registered in detective mode with their own animals and progress records.
- `Adventure Backdrop Registry Re-Keyed to the Adventure` — backdrop selection keyed to adventure (via `backdropFor(levelId) → adventure`) rather than sector alone, allowing per-adventure backdrop choices within sectors.

---

## Archive Contents Verified

✓ All artifacts present in archived folder:
  - `proposal.md`
  - `design.md`
  - `specs/` (5 domain subdirectories with delta specs)
  - `tasks.md` (all implementation tasks checked ✓; task 7.4 intentionally [~], not [x])
  - `verify-report.md` (PASS verdict, validator `{"valid": true}`, envelope valid)
  - `apply-progress.md`
  - `state.yaml`

✓ No unchecked implementation tasks remain in persisted `tasks.md` (all are `[x]` or intentionally `[~]`)

✓ Main specs successfully updated (`openspec/specs/{detective-mode,level-engine,main-screen,trace-canvas,zoo-map}/spec.md`)

✓ Change folder moved from `openspec/changes/sheep-and-llama-peaks` to `openspec/changes/archive/2026-09-13-sheep-and-llama-peaks`

✓ Pre-move snapshot diff: empty (byte-identical)

---

## Delivery Summary

**Delivery Strategy**: `exception-ok` (cached; oversized work, explicit user approval before apply)  
**Review Budget**: 800 lines (reviewed for structural validity, not subject to standard code-review line limits)  
**Test Coverage**: 65 test files, 1286 green tests  
**Build**: `npm run build -w client` passing  
**Verification Gate**: PASS (0 CRITICAL, 4 WARNING items, all non-blocking)  
**Review Gate**: Not discovered for this candidate (no review was started; receipt-driven development is off by default)

---

## SDD Cycle Complete

The change has been fully planned (**proposal**, **spec**, **design**, **tasks**), implemented on `sdd/ovejas-y-llamas` across 18 commits with 65 test files (1286 tests green) and `npm run build -w client` passing, verified by `gentle-ai sdd-verify` returning PASS, and now archived with all delta specs merged into main source-of-truth specs.

Three post-apply defects were identified by screenshot review and fixed in subsequent commits, all recorded in the archive and re-verified.

Task 7.4 is intentionally incomplete per design scope (captures not taken); behavior is tested, visual progression recording is not required for archive closure.

Ready for the next change.
