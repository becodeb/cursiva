# Apply Progress: detective-mode

## Slice S1 — units 1, 2 (`paths.ts`, `clues.ts`)

Mode: Standard (strict_tdd: false, per `openspec/config.yaml`).

### Completed Tasks

- [x] 1.1 `cornerClearance(legLength, interiorDeg, w)` — closed-form predicate, `client/src/levels/paths.ts`.
- [x] 1.2 `triangularWave(...)` — `M`/`L` only, ≥3 flattened points.
- [x] 1.3 `squareWave(...)` — `M`/`L` only, ≥3 flattened points, `run` a first-class param satisfying `run ≥ 2·corridorWidth` via `cornerClearance`.
- [x] 1.4 `paths.test.ts` — command alphabet is `M`/`L` only for both generators.
- [x] 1.5 `paths.test.ts` — `transformPath` throws on an injected non-`M`/`L`/`C` command (both the pre-existing generic test and a new one applied to `squareWave()`'s output).
- [x] 1.6 `paths.test.ts` — flattened point count ≥ 3 for both generators.
- [x] 1.7 `paths.test.ts` — `squareWave` run length (190) exceeds the `cornerClearance`-derived threshold for `corridorWidth = 70`.
- [x] 1.8 `amplitude` documented on both new generators as the offset from the centreline (design C5), matching `wave`'s shipped contract.
- [x] 1.9 `armClearance(amplitude, w)` — closed-form predicate, `client/src/levels/paths.ts`.
- [x] 1.10 `paths.test.ts` — `armClearance` passes for `w = 70, amplitude = 110` (wall 150 vs. threshold 49).
- [x] 1.11 `paths.test.ts` — `armClearance` **fails** for `w = 70` with `amplitude` misread as peak-to-peak 70 (offset 35 → wall 0).
- [x] 2.1 `client/src/detective/clues.ts` created — `ClueMark`, `ClueState`, `emptyClueState(count)`.
- [x] 2.2 `clueMarks(polyline, length, count)` implemented — pure, uses `pointAtArcLength` (`letters/svgLetter.ts`) and the tangent helpers `screen/directionArrow.ts`'s `directionArrowOf` is built from (`indexAtDistance` + `tangentAngleAt`), reused directly since `directionArrowOf` itself needs a full `LevelTarget`.
- [x] 2.3 `clueTick(state, head, marks, radius)` implemented — monotone, discrete flip, returns the same state reference (no-op) on re-pass.
- [x] 2.4 `clues.test.ts` — a mark flips `drained → earned` in exactly one dispatch.
- [x] 2.5 `clues.test.ts` — a stream of position updates yields only `{ lit: boolean[] }`, no motion field.
- [x] 2.6 `clues.test.ts` — re-passing an earned mark returns the SAME state (`toBe`) and stays `toEqual`.

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `client/src/levels/paths.ts` | Modified | Added `cornerClearance`, `armClearance`, `alternatingZigzag` (private), `triangularWave`, `squareWave`. |
| `client/src/levels/paths.test.ts` | Modified | Added `cornerClearance`/`armClearance`/`triangularWave`/`squareWave` describe blocks; added both generators to the shared `GENERATORS` contract table. |
| `client/src/detective/clues.ts` | Created | `ClueMark`, `ClueState`, `emptyClueState`, `clueMarks`, `clueTick`. New directory. |
| `client/src/detective/clues.test.ts` | Created | Placement + reducer tests. |

### Work Unit Evidence

| Evidence | Unit 1 (`paths.ts`) | Unit 2 (`clues.ts`) |
|---|---|---|
| Focused test command / result | `cd client && npx vitest run src/levels/paths.test.ts` → 98/98 passed | `cd client && npx vitest run src/detective/clues.test.ts` → 11/11 passed |
| Runtime harness | N/A — pure geometry, no DOM | N/A — pure reducer, no DOM |
| Rollback boundary | New exports (`cornerClearance`, `armClearance`, `triangularWave`, `squareWave`) revert alone; no existing generator touched | `client/src/detective/clues.ts` + its test revert alone (new, isolated directory) |

### Deviations from Design

1. **`clueMarks` cannot literally call `directionArrowOf`.** The design's interface comment says the function is built "via `pointAtArcLength` + `directionArrowOf`", but `directionArrowOf` (`screen/directionArrow.ts`) takes a full `LevelTarget` (`{ config, paths, viewBoxWidth, ... }`), not a bare `(polyline, length)` pair — which is exactly what `clueMarks`'s fixed signature receives. Resolved by importing and composing `directionArrowOf`'s own two underlying pure exports, `indexAtDistance` and `tangentAngleAt` (both already `readonly Point[]`-typed, no cast needed), so the tangent math is reused verbatim rather than reimplemented, and the produced angle is identical to what `directionArrowOf` would compute for the same arc position.
2. **`ClueMark.kind` omitted for this slice.** The design's full interface block shows `ClueMark { x, y, angle, kind: ClueKind }`, with `ClueKind` defined in `detective/assets.ts` (design unit 3 / Phase 3, out of this slice's scope). `clueMarks(polyline, length, count)`'s fixed signature also has no `kind` input, so there is no way to populate a per-mark kind from within this file without either (a) importing a not-yet-existing sibling module, or (b) inventing a parallel `ClueKind` type here that Phase 3 would then have to reconcile/collide with. Left `ClueMark` without `kind` and documented the gap in the type's own doc comment. **Flag for the Phase 3/S2 executor**: `clueMarks` will likely need a `kind: ClueKind` parameter added (all marks on one trail share one kind), or the caller (catalog, Phase 10) will need to stamp `kind` onto each returned mark before handing them to the canvas layer — either is a small, additive change to this file.
3. Floating-point note (not a design deviation, but worth recording): `Math.tan(Math.PI / 4)` is `0.9999999999999999` in JS, not exactly `1`, so `cornerClearance`'s literal boundary value (`legLength = 2·w` exactly) sits on a float rounding edge. The unit test for that boundary asserts one unit either side (141/139) instead of exactly at 140, rather than changing the (correct) production formula.

### Issues Found

None.

### Remaining Tasks (not in this slice's scope)

- [ ] Phase 3 — Asset Registry and Palette (`detective/assets.ts`, `detective/palette.ts`) — S2.
- [ ] Phase 4 — Canvas Clue Layer (`TraceCanvas.tsx`) — S2.
- [ ] Phase 5 — PISTAS Rail — S3.
- [ ] Phase 6 — Wire Clue Collection into LevelPlay — S3.
- [ ] Phase 7 — Suppress Shell Copy on Detective Levels — S3.
- [ ] Phase 8 — Deduction View — S4.
- [ ] Phase 9 — Progress Migration — S5.
- [ ] Phase 10 — Four Themed Trails — S6.
- [ ] Phase 11 — Retire Legacy Configs — S6.
- [ ] Phase 12 — Roadmap Doc — S7.
- [ ] Phase 13 — Cross-Cutting Verification — after all slices merged.

### Workload / PR Boundary

- Mode: chained PR slice (`feature-branch-chain`, per tasks.md forecast).
- Current work unit: S1 (design units 1 + 2), on `feat/detective-s1-generators-reducer`, cut from tracker `feat/detective-mode`.
- Boundary: starts at the tracker branch tip, ends with `paths.ts`/`paths.test.ts` (unit 1, ~160 authored ±) and `clues.ts`/`clues.test.ts` (unit 2, ~165 authored ±) as two independently revertible commits — kept in separate files per the parent's instruction, no cross-contamination.
- Estimated review budget impact: ~325–360 lines, under both the 400 per-PR guard and the 800 session budget; S1 alone does not require a further split.

### Status

13/13 assigned tasks (Phase 1 + Phase 2) complete. Full repo suite: 685/685 tests passing (up from 654; +19 in `paths.test.ts`, +11 new `clues.test.ts` — net +31, 39 files up from 38). `npm run build` (`tsc --noEmit && vite build`) green. Ready for verify / next slice (S2).

## Slice S2 — units 3, 4 (`assets.ts`, `palette.ts`, `TraceCanvas.tsx`)

Mode: Standard (strict_tdd: false, per `openspec/config.yaml`).

### Completed Tasks

- [x] 3.1 `client/src/detective/assets.ts` created — `ClueKind`, `AnimalId`, `ClueArt`, `CLUE_ART`, `ANIMAL_ART`, `GLASS_ART`, placeholder `d` strings centred on the origin (`M`/`L`/`C` only, by convention not requirement).
- [x] 3.2 `client/src/detective/palette.ts` created — `CLUE_DRAINED`, `POND`, `KERNEL`, `PRINT`, `PLUME`, `LAMP`.
- [x] 3.3 `palette.test.ts` — the four earned values are pairwise distinct.
- [x] 3.4 `palette.test.ts` — `PRINT` has zero chroma (HSL saturation 0).
- [x] 3.5 `palette.test.ts` — no earned value falls in the warm-clay hue band (10-35°, saturation ≥0.3), and none equals or (hue-)approaches `GOAL_COLOR`/`HAZARD_COLOR`/`CARRIER_COLOR`.
- [x] 3.6 `palette.test.ts` — every `CLUE_ART[...].earned` value is distinct from `CLUE_DRAINED` and pairwise distinct from each other, asserted against the registry mapping (no DOM).
- [x] 4.1 `TraceCanvas.tsx` — `TraceClueMark`, `TraceClues`, `clues` prop; `<g>` rendered immediately before the ink `<path>` (opposite z-order from `hazards`, which renders above the ink).
- [x] 4.2 `TraceCanvas.tsx` — `TraceCarrierArt` prop; carrier `<g>` now renders either the registry-art `<path>` (stroked, in ink) or the shipped sage rect+circle, absent `carrierArt` unchanged.
- [x] 4.3 `TraceCanvas.test.tsx` — drained mark renders `fill="#c8cdd2"`.
- [x] 4.4 `TraceCanvas.test.tsx` — earned mark renders its trail's colour (`#3f6f8f` in the test).
- [x] 4.5 `TraceCanvas.test.tsx` — earned footprint mark renders `fill="#000000"`.
- [x] 4.6 `TraceCanvas.test.tsx` — `url(#` absent from the rendered HTML with `clues` populated.

### Inherited S1 defect closed

`ClueMark.kind: ClueKind` (flagged as deviation #2 in the S1 entry above) is now populated. Resolution chosen: **`clueMarks` gained a fourth parameter**, `kind: ClueKind = 'droplet'`, defaulted rather than required. Rationale: the parent's scope explicitly limited edits to `detective/clues.ts` "only for the kind fix" and did not include `clues.test.ts` — a *required* fourth parameter would have broken the existing 11 `clueMarks(LINE, LENGTH, n)` call sites (no 4th argument) at compile time, forcing an out-of-scope edit to the test file. A defaulted parameter keeps every existing call site source-identical and compiling, while still populating and type-checking `kind` on every returned mark (verified: `npx tsc --noEmit` clean, `clues.test.ts` 11/11 still passing unmodified). The real per-trail kind is wired later — the catalog (design unit 9 / Phase 10, S6) is expected to call `clueMarks(polyline, length, count, trailKind)` explicitly; the default only ever protects a caller that forgets to.

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `client/src/detective/assets.ts` | Created | Typed registry: `CLUE_ART` (4 kinds), `ANIMAL_ART` (4 animals + `ruledOutBy`), `GLASS_ART`. Imports only from `./palette`. |
| `client/src/detective/palette.ts` | Created | Six tokens: `CLUE_DRAINED`, `POND`, `KERNEL`, `PRINT`, `PLUME`, `LAMP`. No import from `TraceCanvas.tsx` (base palette stays there, per design). |
| `client/src/detective/palette.test.ts` | Created | Hex→HSL reference conversion; pairwise-distinct, zero-chroma, warm-clay-band, and UI-accent-hue-proximity assertions; registry-mapping assertion importing `CLUE_ART`. |
| `client/src/detective/clues.ts` | Modified | `ClueMark.kind: ClueKind` added (imports `type ClueKind` from `./assets`); `clueMarks` gained defaulted 4th param `kind`. |
| `client/src/canvas/TraceCanvas.tsx` | Modified | `TraceClueMark`, `TraceClues`, `TraceCarrierArt` interfaces + `CLUE_STROKE_WIDTH`/`CARRIER_ART_STROKE_WIDTH` consts; `clues`/`carrierArt` props; clue `<g>` inserted immediately before the ink `<path>`; carrier `<g>` branches on `carrierArt` presence. Imports nothing from `detective/` (colour-agnostic, per design). |
| `client/src/canvas/TraceCanvas.test.tsx` | Modified | New `describe` blocks: "clues prop" (8 tests: absence, drained grey, earned colour, earned-footprint black, no `url(#`, z-order under ink, stroke-paint, translate/rotate/scale placement) and "carrierArt override" (3 tests: default unaffected, override swaps shape, no effect without `carrier`). |

### Work Unit Evidence

| Evidence | Unit 3 (`assets.ts`, `palette.ts`) | Unit 4 (`TraceCanvas.tsx`) |
|---|---|---|
| Focused test command / result | `cd client && npx vitest run src/detective/palette.test.ts` → 6/6 passed | `cd client && npx vitest run src/canvas/TraceCanvas.test.tsx` → 57/57 passed (46 pre-existing + 11 new: 8 clues-prop + 3 carrierArt) |
| Runtime harness | N/A — pure data module | N/A per task list; manually reasoned through `renderToString` z-order (no `npm run dev` smoke run performed this slice — not required by the task's own harness column, which is blank for units 3/4) |
| Rollback boundary | `assets.ts`, `palette.ts`, `palette.test.ts` revert alone (new, isolated files) | `TraceCanvas.tsx`'s new interfaces/props/`<g>`/carrier branch revert alone (additive); `clues.ts`'s kind fix is a separate, isolated hunk (defaulted param, zero call-site breakage) |

Combined focused run: `cd client && npx vitest run src/detective/palette.test.ts src/detective/clues.test.ts src/canvas/TraceCanvas.test.tsx` → **74/74 passed** (6 new `palette.test.ts` + 11 existing `clues.test.ts`, unmodified and still green + 57 `TraceCanvas.test.tsx`, 46 pre-existing + 11 new).

### Deviations from Design

1. **`clueMarks`'s `kind` parameter is defaulted, not required.** See "Inherited S1 defect closed" above — forced by the parent's file-scope restriction (`clues.test.ts` excluded), not a technical necessity. Flag for whichever slice wires the catalog (S6, Phase 10): pass `kind` explicitly there; the default exists only as a safety net.
2. **`ANIMAL_ART`'s `ruledOutBy` assignments are placeholder, not story-verified.** Phase 8 (Deduction view, S4) is out of this slice's scope and owns the actual elimination logic; the four kind↔animal pairings here (`gallina`→`feather`, `pato`→`droplet`, `chancho`→`corn`, `vaca`→`footprint`) are an arbitrary bijection satisfying the type, not a narrative decision. Flag for the S4 executor to confirm or reassign against the brief's actual case-file story.
3. **No `npm run dev` / visual smoke pass performed for unit 4.** The task table's "Runtime harness" column is blank for units 3 and 4 (unlike units 5/6/9/10, which do list a dev-server check), so none was run; correctness was verified via `renderToString` assertions and `tsc --noEmit` only, consistent with the rest of this design's node-only testing strategy.

### Issues Found

None. The palette's hue-proximity test needed a carefully chosen threshold (8°) to admit `PLUME` (hue ~165°) safely alongside `CARRIER_COLOR` (hue ~174.4°, ~9.4° apart) — the design's own text ("That frees the green band that `CARRIER_COLOR` would otherwise crowd") flags this exact closeness as *why* the `carrierArt` override exists, not as a defect; a naive broader threshold (e.g. 15°) would have made the required "none approaches" test contradict the design's own accepted `PLUME` value. Documented inline in `palette.test.ts`'s `HUE_COLLISION_DEG` comment.

### Remaining Tasks (not in this slice's scope)

- [ ] Phase 5 — PISTAS Rail — S3.
- [ ] Phase 6 — Wire Clue Collection into LevelPlay — S3.
- [ ] Phase 7 — Suppress Shell Copy on Detective Levels — S3.
- [ ] Phase 8 — Deduction View — S4.
- [ ] Phase 9 — Progress Migration — S5.
- [ ] Phase 10 — Four Themed Trails — S6.
- [ ] Phase 11 — Retire Legacy Configs — S6.
- [ ] Phase 12 — Roadmap Doc — S7.
- [ ] Phase 13 — Cross-Cutting Verification — after all slices merged.

### Workload / PR Boundary

- Mode: chained PR slice (`feature-branch-chain`, per tasks.md forecast).
- Current work unit: S2 (design units 3 + 4), branch `feat/detective-s2-assets-canvas`, cut from the S1 branch tip.
- Boundary: unit 3 (`assets.ts`, `palette.ts`, `palette.test.ts`, plus the isolated `clues.ts` kind-fix hunk) and unit 4 (`TraceCanvas.tsx`, `TraceCanvas.test.tsx`) as two independently revertible file groups — no cross-contamination between the two commit boundaries the parent will cut.
- Estimated review budget impact: S1 measured 1.30x over its own forecast; this slice's corrected forecast was ~400 authored ±. Actual diff: `git diff --stat` reports 221 insertions(+) / 31 deletions(-) across `TraceCanvas.test.tsx` (+84/-0), `TraceCanvas.tsx` (+108/-25), `clues.ts` (+29/-6), well under the 400 per-PR guard even before counting the two new untracked files (`assets.ts` ~92 lines, `palette.ts` ~32 lines, `palette.test.ts` ~104 lines) — combined new+diff total is comfortably under 400 authored lines, no further split needed.

### Status

11/11 assigned tasks (Phase 3 + Phase 4) complete, plus the inherited S1 `kind` defect closed. Full repo suite: **702/702 tests passing** (up from 685; +17 net — 6 new `palette.test.ts` tests + 11 new `TraceCanvas.test.tsx` tests; `clues.test.ts` stayed at 11/11 unmodified; 40 files up from 39). `npm run build` (`tsc --noEmit && vite build`) green. `grep -rn 'url(#' client/src/` finds only pre-existing guard-rail prose (`TraceCanvas.tsx`'s `MAZE_WALL` doc comment, untouched by this diff) plus this slice's own required absence-check test in `TraceCanvas.test.tsx` (task 4.6) — zero new *rendered* `url(#…)` references. Ready for verify / next slice (S3).
