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
