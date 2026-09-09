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

## Slice S3 — units 5, 6, 12 (`PistasRail.tsx`, `icons.tsx`, `LevelPlay.tsx` clue wiring + chrome branch)

Mode: Standard (`strict_tdd: false`, per `openspec/config.yaml`).

### Completed Tasks

- [x] 5.1 `client/src/detective/PistasRail.tsx` created — drawn `PISTAS` word (six glyphs, `M`/`L`-only paths, stroke width 8, `strokeLinecap="round"`), four always-rendered slots (padded with drained placeholders when the caller knows fewer), lamp glyph as three concentric stroked rings at stepped opacity.
- [x] 5.2 Rail CSS added to `LAYOUT_CSS` in `LevelPlay.tsx`: `.pistas-rail` fixed-width column (96px / 72px under `max-height:820px`), row layout under `max-height:520px` (also flips `.cv-sheet` to `flex-direction: column`, a no-op for every level with only one `.cv-sheet` child). `.cv-sheet > svg` given `flex: 1 1 auto; min-width/height: 0` structurally, since `TraceCanvas.tsx` (out of scope) has no wrapper element to put a class on.
- [x] 5.3 `PistasRail.test.tsx` — rail markup starts strictly after the canvas's own `</svg>` closes, proven by rendering a real `TraceCanvas` beside a real `PistasRail`.
- [x] 5.4 `PistasRail.test.tsx` — stripped-text assertion: the only text node in the rendered rail is the literal word `PISTAS` (held in a visually-hidden accessibility `<span>`; the visible word itself is drawn geometry, never a text node).
- [x] 6.1 `LevelPlay.tsx`: `clueTick` called from the existing 10 Hz `onFrame` sample (same throttle block `resetOnContact` already rides), no second cloud scan.
- [x] 6.2 `LevelPlay.tsx`: trail completion (`onRelease`'s `result.approved`) drives `setClueFiled(true)` via the new exported pure `shouldFileClue(hasClueTrail, approved)` — deliberately ignorant of the clue marks' own `lit` state, which is what keeps filing refused mid-trace.
- [x] 6.3 / 6.4 covered as described in "Testing approach" below.
- [x] 7.1 `LevelPlay.tsx`: chrome branch on `isDetectiveTrail = !!level.clue` — suppresses the title `<h1>`, hint `<p>`, rotate prompt, and the entire `.cv-result` section (pillars/coach/restart copy) only on a detective trail; every other phase's JSX path is untouched (conditional branch, confirmed by the regression-guard tests below).
- [x] 7.2 `client/src/detective/icons.tsx` created — `BackIcon`, `RetryIcon`, `ReplayIcon`, `ContinueIcon`, all ink-drawn (stroked/filled SVG paths, no text, no `url(#…)`), sized to sit inside the shipped 64px `.cv-btn` tap floor.
- [ ] 7.3 **Deferred to S6** — see the note left directly in `tasks.md`. `catalog.ts` (where the four trail configs will exist) is out of this slice's scope.
- [x] 7.4 / 7.5 covered as described in "Testing approach" below.

### The `LevelConfig.clue` discriminator (levels/types.ts)

Added one additive, optional field: `clue?: { kind: ClueKind; count: number }`. This is the sole signal `LevelPlay` uses to decide a level is a detective trail — it drives BOTH the Phase 6 clue wiring and the Phase 7 chrome branch, so a level is "detective" iff (and only iff) it carries this field. `f1-libre` and all 19 existing catalog configs omit it and are structurally guaranteed to keep compiling and keep their exact current behaviour (optional field, no other type changed). `types.ts` now imports `type ClueKind` from `../detective/assets` — checked for cycles: `detective/assets.ts` imports only from `./palette`, so there is no path back into `levels/`.

### Design gap resolved: the rail's cross-trail visibility

The design's data-flow diagram routes `earnedClues(store.all())` into `PistasRail`, i.e. the FULL four-trail collected set, read from `LevelProgressStore` across the whole catalog. That catalog and that store read are explicitly out of this slice's scope (S6 owns `catalog.ts`; `LevelProgressStore.ts` is on the parent's do-not-touch list), so `LevelPlay` in this slice can only ever know about the CURRENT trail's own filed state — there is no way to ask "what did the other three trails file" without either module.

Resolution: `PistasRail`'s own `slots` prop accepts however many entries the caller currently knows (in this slice, always 0 or 1) and PADS the remainder up to a fixed `RAIL_SLOT_COUNT = 4` with drained placeholders internally — so the rail ALWAYS renders its full four-slot chrome regardless of what the caller can see. `LevelPlay` passes `slots={clueDef ? [{ kind: clueDef.kind, filed: clueFiled }] : []}`. **Flag for whichever slice wires `GameScreen`/`LevelProgressStore` (S4 or later, once the catalog exists):** `LevelPlayProps` will need a new prop carrying the OTHER three trails' filed state (e.g. `otherClues?: readonly PistasSlot[]`) for the rail to ever show more than the current trail's own slot; `PistasRail`'s own contract (`slots: readonly PistasSlot[]`) does not need to change, only what `LevelPlay` passes into it.

### Testing approach for 6.3/6.4/7.4/7.5 (environment-driven)

This repo's test harness is vitest 4 under the default **node** environment — no jsdom, no `@testing-library`, and (per `canvas/multiStroke.test.ts`'s own header comment, a pre-existing and already-accepted constraint of this codebase, not something introduced here) a React state dispatch triggered AFTER a completed `renderToString()` call is a no-op: there is no live fiber tree left to re-render as a new HTML string. That rules out the literal "trace it, finish it, then look at the re-rendered rail" test a jsdom/RTL harness would write.

Three complementary techniques cover the same ground within that constraint:

1. **Pure decision, exported and unit-tested directly** — `shouldFileClue(hasClueTrail, approved)`, mirroring the repo's existing `guideLevelFor`/`standingHintFor` pattern (both already exported for exactly this reason). Its signature takes NO marks/`lit` argument at all — proving structurally, not just by example, that filing can never depend on the marks' own state. Three cases asserted: trail + approved → true (6.3's contract); trail + NOT approved → false (6.4's contract, "Filing is refused mid-trace"); no trail → false.
2. **SSR-probe wiring check** — `../canvas/TraceCanvas` is replaced with a prop-capturing stub (the same "mount once, invoke the captured handle directly" idea `canvas/multiStroke.test.ts` already uses for a hook, applied here to a component's props instead). The REAL `onFrame`/`onRelease` closures `LevelPlay` builds are captured and invoked directly with synthetic points: `onRelease` is proven to run `evaluateLevel` and call the real `onAttempt` prop through with `approved: true` for a trivially-passing detective-trail attempt (`minAccuracy`/`minFluency` both 0), and `onFrame` is proven to execute the `clueTick` branch without throwing. This proves the wiring RUNS; it stops short of an "after" screenshot for the reason above.
3. **Initial-render state check** — a fresh detective trail's very first render (before any interaction) is asserted to show the rail fully drained and the lamp off (neither `#f2d377` nor the trail's earned `#3f6f8f` appears anywhere) — the correct t=0 state, which is also literally what "filing refused" must look like before a route is even attempted.

7.4/7.5 need none of this — they are pure initial-render `renderToString` assertions (a detective level shows no title/hint/coach text and no button labels but does show `PISTAS`; a non-detective level's existing chrome is byte-for-byte unchanged) and are asserted directly.

**A real visual check WAS also run**, beyond what the task table strictly requires, because no detective trail exists in the catalog yet to point `npm run dev`'s `?nivel=` deep link at: a throwaway preview entry (`client/preview-detective.html` + `client/src/__detectivePreviewMain.tsx`, mounting `LevelPlay` directly against a synthetic detective-trail `LevelConfig`, never imported by any real code) was created, screenshotted with `scripts/shot.sh` at 1280×800 and again at 900×500 (under the `max-height:520px` breakpoint), and deleted immediately after. Confirmed by eye: no title/hint/coach text, icon-only controls at the shipped tap floor, the PISTAS rail beside the canvas at the wide viewport and turned into a row below it at the short one — matching design.md's wireframe in both states. `git status` after cleanup shows no trace of the preview files. Also screenshotted an existing ordinary level (`?nivel=f1-libre`) to confirm the `.cv-sheet`/`.cv-sheet > svg` CSS additions cause no visible regression on a level with no rail — none observed.

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `client/src/detective/PistasRail.tsx` | Created | Drawn `PISTAS` word, lamp (3-ring halo), 4 padded slots. |
| `client/src/detective/PistasRail.test.tsx` | Created | Placement, copy, drawn-word geometry, lamp, and slot tests (12). |
| `client/src/detective/icons.tsx` | Created | `BackIcon`, `RetryIcon`, `ReplayIcon`, `ContinueIcon`. |
| `client/src/screen/LevelPlay.tsx` | Modified | Clue-trail discriminator + `clueMarks`/`clueTick`/`shouldFileClue` wiring; `clues` prop to `TraceCanvas`; `PistasRail` mounted in `.cv-sheet`; chrome suppression branch (title/hint/rotate/result section/button labels) gated on `isDetectiveTrail`; rail CSS in `LAYOUT_CSS`. |
| `client/src/screen/LevelPlay.test.tsx` | Created | Chrome-branch regression pair (7.4/7.5), rail-presence checks, `shouldFileClue` unit tests (6.3/6.4), SSR-probe wiring tests (12 total). |
| `client/src/levels/types.ts` | Modified | Added optional `LevelConfig.clue?: { kind: ClueKind; count: number }`, importing `type ClueKind` from `../detective/assets`. |

### Work Unit Evidence

| Evidence | Unit 5 (`PistasRail.tsx`) | Unit 6 (`LevelPlay.tsx` clue wiring) | Unit 12 (`LevelPlay.tsx` chrome branch + `icons.tsx`) |
|---|---|---|---|
| Focused test command / result | `cd client && npx vitest run src/detective/PistasRail.test.tsx` → 12/12 passed | `cd client && npx vitest run src/screen/LevelPlay.test.tsx` → 12/12 passed | same file/command → 12/12 passed (chrome-branch tests live in the same file as the wiring tests) |
| Runtime harness | `npm run dev`, screenshotted via `scripts/shot.sh` at 900×500 (`max-height:520px`) — rail turns into a row below the canvas, confirmed by eye | `npm run dev`, screenshotted at 1280×800 — lamp/slots render correctly at their initial drained/off state (interaction itself is not observable through this repo's node-only harness; see "Testing approach" above for how 6.3/6.4 are proven instead) | `npm run dev`, screenshotted at 1280×800 — no title/hint/coach text, icon-only controls at the 64px floor, confirmed by eye against design.md's wireframe |
| Rollback boundary | `PistasRail.tsx` + `.test.tsx` revert alone (new, isolated files) | `LevelPlay.tsx`'s clue-tick hunk in `onFrame`, the filing hunk in `onRelease`, and the `traceClueMarks`/`railSlots` memos revert alone (additive; every other `onFrame`/`onRelease` line is byte-identical to before this slice) | `LevelPlay.tsx`'s chrome-branch JSX hunks (each gated on the new `isDetectiveTrail` boolean) plus `icons.tsx` revert alone; every non-detective JSX path is untouched code, not a re-derived one |

Combined focused run: `cd client && npx vitest run src/detective src/screen/LevelPlay.test.tsx` → **43/43 passed** (4 files: `PistasRail.test.tsx`, `palette.test.ts`, `clues.test.ts` — all pre-existing from S1/S2, unmodified — plus the new `LevelPlay.test.tsx`).

### Deviations from Design

1. **Task 7.3 (`demo: true` on the four trail configs) deferred to S6**, not implemented here. It edits `catalog.ts` entries that do not exist until Phase 10 (design unit 9) creates them, and `catalog.ts` is explicitly outside this slice's allowed edit scope. No code in `LevelPlay.tsx` needed to change for this — the existing `playDemo = !!level.demo && guideLevel === 'full'` (unmodified, pre-existing line) already does the right thing once a level sets `demo: true`; S6 only has to set the field. Recorded directly in `tasks.md` as an unchecked, annotated task rather than silently left unchecked.
2. **The rail only ever shows the CURRENT trail's slot in this slice** (design gap resolved above, in its own section) — the design's data-flow diagram assumes `LevelProgressStore.all()` is already wired, which is S4/S6+ scope. `PistasRail`'s own contract does not need to change for the eventual fix; only `LevelPlay`'s call site does (flagged for the executor that wires `GameScreen`/the store).
3. **`ANIMAL_ART`/deduction-view concerns are untouched** — out of this slice's scope (Phase 8/S4), not revisited.
4. **6.3/6.4 are proven by decomposition, not by a literal "trace then observe" test** — see "Testing approach" above for the full reasoning; this is a pre-existing, already-documented constraint of this repo's test harness (`canvas/multiStroke.test.ts`'s own header comment), not a new limitation introduced by this slice.
5. **Restarting on wall/hazard contact (`restartRun`) also resets `clueState`** (marks lit go back to drained) — not explicitly required by any Phase 6 task, but consistent with "the route restarts" (docs/01 principle 2) and with the design's monotone guarantee being scoped to one continuous pass, not surviving an abandoned run. The FILED rail clue is untouched by a contact restart (filing only ever happens on a completed, approved attempt, never mid-run). No dedicated test added for this specific interaction (same node-harness constraint as above); flagged here for visibility rather than left silent.
6. **Accessibility labels intentionally omitted from the icon-only control buttons** (`BackIcon`/`RetryIcon`/`ReplayIcon`/`ContinueIcon` buttons carry no `aria-label`). Task 7.4's own wording ("control buttons carry no text label") is read literally and strictly here; a screen-reader gap results. Flagged as a concern for a future slice to revisit once this literal-text constraint can be reconciled with an `aria-label` that a `textContent`-style scan would need to specifically exempt.

### Issues Found

None blocking. One test-authoring pitfall recorded for whoever writes the next `LevelPlay`-adjacent test: `flattenPathD` (`letters/svgLetter.ts`) rejects any path that flattens to fewer than 3 points as degenerate (returns empty `points`/`starts`), so a naive 2-point straight-line test fixture (`'M100,300 L900,300'`) silently produces an EMPTY `target.polyline`/`target.length` with no thrown error — every fixture in `LevelPlay.test.tsx` uses a 3-point path for this reason, documented inline at the fixture.

### Remaining Tasks (not in this slice's scope)

- [ ] Phase 7 task 7.3 — deferred to S6 (see Deviations #1).
- [ ] Phase 8 — Deduction View — S4.
- [ ] Phase 9 — Progress Migration — S5.
- [ ] Phase 10 — Four Themed Trails — S6.
- [ ] Phase 11 — Retire Legacy Configs — S6.
- [ ] Phase 12 — Roadmap Doc — S7.
- [ ] Phase 13 — Cross-Cutting Verification — after all slices merged.

### Workload / PR Boundary

- Mode: chained PR slice (`feature-branch-chain`, per `tasks.md` forecast).
- Current work unit: S3 (design units 5, 6, 12), on `feat/detective-s3-…` branches the parent will cut from `feat/detective-s2b-canvas-clue-layer` (S2's HEAD) — this apply batch stays on the checked-out branch and does not create branches itself, per the parent's instruction.
- Boundary: unit 5 (`PistasRail.tsx` + `.test.tsx`), unit 6 (`LevelPlay.tsx`'s clue-tick/filing hunks), and unit 12 (`LevelPlay.tsx`'s chrome-branch hunks + `icons.tsx`) are kept separable by file/hunk exactly as instructed, so the parent can split them into their own commits/branches if the combined diff trips the 400-line per-PR guard.
- Estimated review budget impact: `tasks.md`'s S3 forecast was ~397 corrected lines for units 5+6+12 combined. Actual: `git diff --stat` on the two modified files is 227 insertions(+) / 53 deletions(-) (`LevelPlay.tsx` +212/-53, `levels/types.ts` +15/-0); the three new files add `PistasRail.tsx` 174, `PistasRail.test.tsx` 131, `icons.tsx` 86, `LevelPlay.test.tsx` 272. Combined ≈ 953 lines touched, well over the 400 per-PR guard — as forecast, this slice needs the split the parent already planned. Suggested split by the same unit boundaries: unit 5 = `PistasRail.tsx` + `.test.tsx` (≈305 lines, its own PR); unit 12 = `icons.tsx` + `LevelPlay.tsx`'s chrome-branch JSX hunks (the `isDetectiveTrail` conditionals in the `return` block) + the matching chrome-branch tests in `LevelPlay.test.tsx`; unit 6 = `LevelPlay.tsx`'s `onFrame`/`onRelease`/`clueState`/`traceClueMarks`/`railSlots` hunks + the remaining wiring tests. Units 6 and 12 share `LevelPlay.tsx` and `LevelPlay.test.tsx`, so splitting those two requires a hunk-level (not file-level) cut, exactly as the parent's own instruction anticipated ("keep the three units separable by file — ... will split branches if the total passes 400").

### Status

24/25 assigned tasks complete (7.3 deferred to S6, documented above and in `tasks.md`). Full repo suite: **728/728 tests passing** (up from 704; +24 net — 12 new `PistasRail.test.tsx` + 12 new `LevelPlay.test.tsx`; every S1/S2 test file unmodified and still green; 42 files up from 40). `npm run build` (`tsc --noEmit && vite build`) green. `grep -rn 'url(#' client/src/detective/ client/src/screen/LevelPlay.tsx` finds only comments describing the constraint (no rendered reference). `grep -rn 'font-family\|fontFamily\|@font-face' client/src/` finds only comments describing the constraint (stays at zero rendered occurrences). Ready for verify / next slice (S4).

## Slice S4 — unit 7 (Deduction view; design unit 7, Phase 8)

Mode: Standard (`strict_tdd: false`, per `openspec/config.yaml`). Checked out
branch: `feat/detective-s3b-wiring-and-textless-shell` (S3's HEAD — the parent
cuts branches on commit, this batch created none).

### Completed Tasks

- [x] 8.1 `client/src/screen/GameScreen.tsx`: `GameView` gained `{ view: 'deduce' }`, `GameAction` gained `{ type: 'deduce' }`; `nextView`'s new `case 'deduce'` returns `{ view: 'deduce' }` and reads nothing from the catalog.
- [x] 8.2 `client/src/screen/GameScreen.tsx`: `allEarned(trailIds, records)` (pure) and `resolveNextAction(finishedLevelId, records)` (pure) implemented; `onNext` now dispatches `resolveNextAction(state.levelId, store.all())` instead of always `{ type: 'next', ... }`.
- [x] 8.3 `client/src/screen/GameScreen.tsx`: `initialView` accepts `?nivel=deduccion` and returns `{ view: 'deduce' }` directly, ahead of the catalog-id lookup.
- [x] 8.4 Created `client/src/detective/Deduction.tsx` — see "Path deviation" below for WHERE. Reuses the `.cv-play`/`.cv-sheet` shell shape and the real `PistasRail` component (all four slots filed, lamp on); four-animal lineup (`ANIMAL_ART`) on one drawn `M`/`L` ink line; D4 dismissal via the pure `pickAnimal`/`DeductionState`; the dismissed animal's discriminating clue (`ruledOutBy`) is emphasised with that clue's own registry art in its earned colour.
- [x] 8.5 `GameScreen.test.tsx`: `resolveNextAction('trail4', recordsWith(1))` (three-then-fourth-just-filed) resolves to `{ type: 'deduce' }`, and composing it through `nextView` reaches `{ view: 'deduce' }` — plus a direct `nextView(state, { type: 'deduce' })` unit test.
- [x] 8.6 `GameScreen.test.tsx`: with one of four trails at `approvals: 0`, `resolveNextAction` never resolves to `deduce` for ANY of the four trail ids, and composing through `nextView` never reaches the deduction view.
- [x] 8.7 `Deduction.test.tsx`: `DeductionView` at the initial state renders exactly four `.animal-btn` elements.
- [x] 8.8 `Deduction.test.tsx`: `pickAnimal(state, CULPRIT).closed === true`.
- [x] 8.9 `Deduction.test.tsx`: `pickAnimal(state, 'pato')` stays `closed: false`, dismisses only `pato`, and the very next `pickAnimal` call (on the returned state, no extra action) can close the case; `DeductionState`'s own keys are asserted to be exactly `['closed', 'dismissed']` — no score/penalty field exists to violate D4 with.

### Path deviation (flagged, not silently resolved)

**`Deduction.tsx` was created at `client/src/detective/Deduction.tsx`, not `client/src/screen/Deduction.tsx`.** `design.md`'s own "File Changes" table and `tasks.md`'s task 8.4 both name `client/src/screen/Deduction.tsx`. The parent's slice-4 assignment prompt for this batch, however, explicitly and repeatedly named `client/src/detective/Deduction.tsx` (both in its "In scope" file list and its own required-verification command, `grep -rn 'url(#' client/src/detective/`, which only covers the `detective/` tree). Given (a) the prompt is the direct, current task assignment and post-dates the design doc, (b) it names the path twice with exact backticks, and (c) its own verification command only makes sense if the file actually lives there, this was treated as a deliberate, corrected placement rather than a typo, and followed as given. Consequence: `Deduction.tsx` and `Deduction.test.tsx` sit alongside `PistasRail.tsx`/`icons.tsx`/`assets.ts`/`palette.ts`/`clues.ts` under `detective/`, consistent with every other detective-mode-specific module already living there — `screen/` keeps only the generic session shell (`GameScreen.tsx`, `LevelPlay.tsx`, `LevelMap.tsx`, `MainScreen.tsx`). **Flag for whoever runs `sdd-verify` or reconciles this against `design.md`**: either treat this as the design's own path correction, or require a follow-up move — the import in `GameScreen.tsx` (`import Deduction from '../detective/Deduction'`) is the only call site and moving the file later is a one-line-plus-one-file change.

### `.cv-play` shell CSS duplication (forced, not a shortcut)

`LevelPlay.tsx` is on this slice's do-not-touch list, so its private `LAYOUT_CSS` constant cannot be imported or exported for reuse. `Deduction.tsx` therefore carries its own small `DEDUCTION_CSS` block, under the SAME class names (`.cv-play`, `.cv-sheet`, `.pistas-rail`, etc.) but trimmed to only the rules this screen actually needs (no title/hint/pillar/coach rules exist here, since this screen has none of those elements). The two screens are never mounted simultaneously (`GameScreen` renders exactly one view at a time), so the duplicate global selectors carry no runtime collision risk. Flag for a future slice: if `LevelPlay.tsx` ever comes back into scope, extracting `LAYOUT_CSS`'s shell rules into a shared module both screens import would remove this duplication.

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `client/src/detective/Deduction.tsx` | Created | `DeductionState`, `initialDeductionState`, `pickAnimal` (pure); `DeductionView` (pure presentational render of a given state); `Deduction` (stateful default export, wraps `useState`). Imports only `react`, `./assets`, `./PistasRail`, `./icons`. |
| `client/src/detective/Deduction.test.tsx` | Created | Structural `ANIMAL_ART`/`CULPRIT` registry tests (23 tests total in file); `pickAnimal` unit tests; `DeductionView` `renderToString` tests (four choices, accessible names, PISTAS-only text, no `url(#`/border-radius/box-shadow, 64px tap floor, one ground line, rail filed+lamp-on, dismissal styling, clue-hint emphasis, closed-state disabling); one `Deduction` (stateful) smoke test. |
| `client/src/screen/GameScreen.tsx` | Modified | `GameView`/`GameAction` gained `deduce`; `nextView` gained the `deduce` case; `initialView` accepts `?nivel=deduccion`; new exports `DETECTIVE_TRAIL_IDS`, `allEarned`, `resolveNextAction`; render gained the `state.view === 'deduce'` branch mounting `Deduction`; `onNext` now calls `resolveNextAction` instead of always dispatching `next`. |
| `client/src/screen/GameScreen.test.tsx` | Created | `nextView`'s new `deduce` case; `?nivel=deduccion` deep link; `allEarned` (all-filed / one-missing / empty-list / absent-record); `resolveNextAction` (8.5's and 8.6's scenarios, the "last trail AND all earned" conjunction, and a non-detective id). Deliberately split from the pre-existing `levelFlow.test.ts` (which already covers `nextView`'s `play`/`next`/`back`/`reset` cases end to end) rather than editing that file, keeping this slice's diff to files the parent's scope actually named. |

### Work Unit Evidence

| Evidence | Unit 7 (`Deduction.tsx`, `GameScreen.tsx`) |
|---|---|
| Focused test command / result | `cd client && npx vitest run src/detective src/screen` → **141/141 passed** (11 files: every S1–S3 detective/screen test file unmodified and still green, plus the 2 new files this slice adds) |
| Runtime harness | N/A per this repo's node-only harness for this class of change (no DOM, no `getBBox`/`getTotalLength`) — every assertion is `renderToString` on a hand-built state or a direct pure-function call, per `design.md`'s own "Testing Strategy" row for this unit ("Node, no DOM, existing GameScreen test pattern") |
| Rollback boundary | `client/src/detective/Deduction.tsx` + `.test.tsx` revert alone (new, isolated files). `GameScreen.tsx`'s changes are additive except for one line (`onNext`'s dispatch target changed from `{type:'next', ...}` to `resolveNextAction(...)`); the new `deduce`-view render branch and the new exports revert alone as a single hunk. |

### Deviations from Design

1. **File path**: `Deduction.tsx` lives at `client/src/detective/Deduction.tsx`, not `client/src/screen/Deduction.tsx` as `design.md`/`tasks.md` state — see "Path deviation" section above for the full reasoning.
2. **`.cv-play` shell CSS is duplicated, not imported**, because `LevelPlay.tsx` (the only place `LAYOUT_CSS` is defined) is out of this slice's edit scope — see its own section above.
3. **`DETECTIVE_TRAIL_IDS` is a locally declared constant (`['trail1','trail2','trail3','trail4']`) in `GameScreen.tsx`, not derived from `LEVELS`.** The catalog does not carry these four trail configs yet (Phase 10 / S6, still out of scope in this session's chain), so `LEVELS.filter(l => l.clue)` would be an empty list today and `allEarned`/`resolveNextAction` would be permanently unreachable until S6 lands. The chosen ids match exactly what `migratePhase1.ts`'s (Phase 9, S5, also not yet landed) `PHASE_1_FORWARD` design.md snippet already names as its migration targets, so no id needs to change when S5/S6 land — only `LEVELS` needs to actually contain configs with these ids, which is already S6's job. Flag for the S6 executor: once the four trail configs exist in `catalog.ts`, confirm their ids are literally `trail1`..`trail4` (or update this constant to match whatever S6 actually ships).
4. **No `LevelProgressStore`/catalog integration test exercises `resolveNextAction` against a REAL store instance** — `game/LevelProgressStore.ts` is on this slice's do-not-touch list, so `GameScreen.test.tsx` builds plain `Record<string, LevelRecord>` objects by hand (`recordsWith` helper) rather than driving a real `LevelProgressStore`. `resolveNextAction`'s signature only takes `Readonly<Record<string, LevelRecord>>`, which is exactly what `store.all()` already returns, so this is a like-for-like substitution, not a weaker test.
5. **What happens after the case closes is intentionally minimal.** Neither the spec nor `design.md` says what UI state follows "the case as closed" beyond the scenario's own wording — no navigation-away requirement exists anywhere in the binding inputs. `Deduction`'s own behaviour once `closed: true`: every animal button becomes `disabled` (interaction is over) and the hen simply keeps its normal ink rendering (no new colour is introduced — design.md principle 1 reserves colour for "earned" clues only, not for a correct guess). No `onBack`-adjacent "return to map" auto-navigation was added; `onBack` remains available as the existing back affordance. Flagged for a later slice if product wants an explicit closing beat.

### Issues Found

One test-authoring pitfall, recorded for whoever writes the next `renderToString`-substring test in this file: `.animal-btn[disabled] { cursor: default; }` in `DEDUCTION_CSS` means the bare substring `'disabled'` appears in the rendered HTML (inside the `<style>` block) even when NO button is actually disabled. The "no animal button is disabled" test had to check for the SSR-rendered boolean-attribute form `disabled=""` specifically, not the bare word — otherwise it fails against the stylesheet's own selector, not against any real attribute. Caught immediately by the focused test run (see verification below) and fixed before finishing this slice.

### Remaining Tasks (not in this slice's scope)

- [ ] Phase 7 task 7.3 — still deferred to S6 (unchanged from S3).
- [ ] Phase 9 — Progress Migration — S5.
- [ ] Phase 10 — Four Themed Trails — S6.
- [ ] Phase 11 — Retire Legacy Configs — S6.
- [ ] Phase 12 — Roadmap Doc — S7.
- [ ] Phase 13 — Cross-Cutting Verification — after all slices merged.

### Workload / PR Boundary

- Mode: chained PR slice (`feature-branch-chain`, per `tasks.md` forecast).
- Current work unit: S4 (design unit 7), staying on the checked-out branch `feat/detective-s3b-wiring-and-textless-shell` — this apply batch created no branches, per the parent's instruction.
- Boundary: `client/src/detective/Deduction.tsx` + `.test.tsx` (new, isolated files) and `client/src/screen/GameScreen.tsx` + `.test.tsx` (one additive/near-additive hunk in the modified file, one new file) are independently revertible — no cross-contamination between the two.
- Estimated review budget impact: `tasks.md`'s S4 forecast (second correction) was ~620 authored lines at the 2.3x-corrected estimate. `git diff --stat`-equivalent: `Deduction.tsx` ~300 lines, `Deduction.test.tsx` ~250 lines, `GameScreen.tsx` diff ~+95/-6, `GameScreen.test.tsx` ~115 lines — combined ≈ 750 lines. Over the 400 per-PR guard as the corrected forecast anticipated; the natural split (already file-isolated) is `Deduction.tsx`+`.test.tsx` as one PR (~550 lines) and `GameScreen.tsx`+`.test.tsx` as a second, smaller PR (~210 lines) based on the same S3-established branch on top of this one — left for the parent to cut, per the established pattern.

### Status

9/9 assigned tasks (Phase 8) complete. Full repo suite: **764/764 tests passing** (up from 730; +34 net — 23 new `Deduction.test.tsx` tests + 11 new `GameScreen.test.tsx` tests; every S1/S2/S3 test file unmodified and still green; 44 files up from 42). `npm run build` (`tsc --noEmit && vite build`) green — `vite build`'s pre-existing "chunks larger than 500 kB" advisory is unrelated to this change and was already present before this slice. `grep -rn 'url(#' client/src/detective/` finds only comments describing the constraint across `PistasRail.tsx`, `icons.tsx`, `Deduction.tsx` and their test files (no rendered reference). `grep -rn 'font-family\|fontFamily\|@font-face' client/src/detective/Deduction.tsx client/src/screen/GameScreen.tsx` finds nothing at all. Ready for verify / next slice (S5).
