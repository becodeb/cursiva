# Tasks: Detective Mode (Phase 1 Retheme)

Binding inputs: `design.md` §Orchestrator Correction (C1–C4, supersedes the
Layout section) and `proposal.md` §Orchestrator Decision Block (D1–D6). Neither
is reopened here. Base branch for the whole chain is **`feat/svg-letters`**
(carries the unpushed level engine), not `main`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ≈1,794 authored ± (design units 1–11 = 1,664; C2 unit 12 ≈95; C5 arm-clearance helper + its two tests ≈35) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Tracker + 7 child PRs (S1…S7 below) |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Slice recount (resolves the design's open question)

Design C2 moves unit 12 into the unit-5/6 slice, making S3 = 165+45+95 = 305,
and leaves S6 (units 9, 10, 11 = 205+180+22 = 407) over the 400 per-PR guard
by 7 lines. **Decision: split unit 11 off S6.** It is a docs-only, 22-line,
zero-dependency change, so isolating it costs nothing and brings S6 to 385
(units 9+10 only), both under 400.

| Slice | Units | Files touched | ± | PR base |
|---|---|---|---|---|
| S1a | 1 | `paths.ts`, `paths.test.ts` | 241 actual | tracker `feat/detective-mode` |
| S1b | 2 | `detective/clues.ts`, `.test.ts` | 227 actual | S1a branch |
| S2 | 3, 4 | `assets.ts`, `palette.ts`, `TraceCanvas.tsx` | 307 | S1 branch |
| S3 | 5, 6, 12 | `PistasRail.tsx`, `LevelPlay.tsx`, `icons.tsx` | 305 | S2 branch |
| S4 | 7 | `Deduction.tsx`, `GameScreen.tsx` | 270 | S3 branch |
| S5 | 8 | `migratePhase1.ts` | 145 | S4 branch |
| S6 | 9, 10 | `catalog.ts` | 385 | S5 branch |
| S7 | 11 | `docs/05_ROADMAP_EVOLUTIVO_POR_ETAPAS.md` | 22 | S6 branch |

Tracker `feat/detective-mode` is cut from `feat/svg-letters` and stays
draft/no-merge until S1–S7 are reviewed; only the tracker merges toward
`feat/svg-letters` → `main`. PR 1 (S1) targets the tracker; each later PR
targets its immediately previous PR's branch, per `chained-pr` SKILL.md.

### Forecast correction after S1 (measured, not estimated)

S1 forecast 360 authored code lines and delivered **468** (`paths.ts` +143,
`paths.test.ts` +98, `clues.ts` 123, `clues.test.ts` 104). The native ledger
counted **581** because it also counts `tasks.md` and `apply-progress.md`.
Estimation ran **1.30x low**, so the remaining slices are re-forecast at
`estimate x 1.30`:

| Slice | Units | Forecast | Corrected |
|---|---|---|---|
| S2 | 3, 4 | 307 | ~400 |
| S3 | 5, 6, 12 | 305 | ~397 |
| S4 | 7 | 270 | ~351 |
| S5 | 8 | 145 | ~189 |
| S6 | 9, 10 | 385 | ~501 -> splits |
| S7 | 11 | 22 | ~29 |

Revised total ≈ **2,330** authored, against 1,794 planned.

**Two budgets, kept separate.** The native `sdd-attempt` changed-line budget is
attempt accounting and is declared generously so a correct implementation does
not trip it; S1 tripped it at 400 and needed a maintainer decision for nothing.
The 400 per-PR guard is the review surface and stays enforced by splitting
commits onto their own branches, which is what S1a/S1b did and what S6 will
need. A slice going over 400 is not a failure, it is a signal to cut another
branch.

### Second forecast correction, measured across three slices

The 1.30x factor recorded after S1 was still far too kind. Native ledger counts:

| Slice | Forecast | Ledger actual | Factor |
|---|---|---|---|
| S1 | 360 | 581 | 1.6x |
| S2 | 307 | 613 | 2.0x |
| S3 | 305 | 1,138 | 3.7x |

Slices 1-3 total **2,332**, more than the 1,794 this plan gave for the whole
change.

**The systematic error: the plan estimated production code and this repo's
tests are about 40% of every change.** S3 broke down as 567 lines of code, 448
of tests and 123 of SDD artifacts. The `renderToString` harness needs its own
scaffolding per component, and behaviour that a browser test would assert in
one line needs a pure exported function plus its own suite here. That is the
repo's convention and it is a good one, but it has to be budgeted.

Remaining slices re-forecast at **2.3x** the original estimate:

| Slice | Original | Corrected |
|---|---|---|
| S4 deduction | 270 | ~620 |
| S5 migration | 145 | ~335 |
| S6 trails + retire | 385 | ~885 |
| S7 roadmap doc | 22 | ~30 |

Projected change total ≈ **4,200**, against 1,794 planned.

**What this changes and what it does not.** The per-PR review guard still holds
and is still enforced by splitting branches: S3's raw diff was 1,138 but it
shipped as two PRs whose logic surfaces were 305 and 393. The native ledger's
changed-line budget is attempt accounting, so from S4 on it is declared at
2,500 rather than re-tripped every slice for a correct implementation. Tripping
it costs a maintainer decision and buys nothing.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Triangular/square generators + corner and arm clearance (C5) | S1 | `cd client && npx vitest run src/levels/paths.test.ts` | N/A — pure geometry, no DOM | `paths.ts` new exports revert alone |
| 2 | Clue placement + collection reducer | S1 | `cd client && npx vitest run src/detective/clues.test.ts` | N/A — pure reducer, no DOM | `clues.ts` revert alone |
| 3 | Asset registry + mode palette | S2 | `cd client && npx vitest run src/detective/palette.test.ts` | N/A — data module | `assets.ts`, `palette.ts` revert alone |
| 4 | Canvas `clues` prop + `carrierArt` override | S2 | `cd client && npx vitest run src/canvas/TraceCanvas.test.tsx` | `npm run dev`, `?nivel=` any trail, confirm no console error | `TraceCanvas.tsx` clue `<g>` + prop revert alone (additive) |
| 5 | PISTAS rail beside the sheet | S3 | `cd client && npx vitest run src/detective/PistasRail.test.tsx` | `npm run dev`, resize to `max-height:520px`, confirm row layout | `PistasRail.tsx` + its CSS block revert alone |
| 6 | Wire clue collection into `LevelPlay` | S3 | `cd client && npx vitest run src/game/LevelPlay.test.tsx` | `npm run dev`, trace trail 1, watch a mark flip | `LevelPlay.tsx` `onFrame` clue-tick hunk revert alone |
| 12 | Suppress shell copy on detective levels; ink icon controls | S3 | `cd client && npx vitest run src/game/LevelPlay.test.tsx` | `npm run dev`, open a detective trail, confirm no title/hint/coach text | `LevelPlay.tsx` conditional-branch hunk + `icons.tsx` revert alone |
| 7 | Deduction view + dismissal | S4 | `cd client && npx vitest run src/screen/Deduction.test.tsx src/screen/GameScreen.test.tsx` | `npm run dev`, `?nivel=deduccion`, pick a distractor then the hen | `Deduction.tsx` + `GameScreen.tsx` `deduce` branch revert alone |
| 8 | Seed new trails from replaced records | S5 | `cd client && npx vitest run src/game/migratePhase1.test.ts` | N/A — pure store transform, asserted against a hand-built payload | `migratePhase1.ts` + its call site in `GameScreen.tsx` revert alone |
| 9 | Four themed trails; `f1-libre` rethemed, clue-free | S6 | `cd client && npx vitest run src/levels/catalog.test.ts` | `npm run dev`, `?nivel=` each of the 4 trail ids, visual smoke pass | `catalog.ts` new trail entries revert alone (LEVELS unchanged) |
| 10 | Retire six unthemed configs behind `LEGACY_PHASE_1` | S6 | `cd client && npx vitest run src/levels/catalog.test.ts src/game/LevelProgressStore.test.ts` | `npm run dev`, load a mid-campaign payload, confirm no locked trail | One-line swap: reinsert `LEGACY_PHASE_1` entries into `LEVELS` |
| 11 | Roadmap doc update | S7 | N/A — docs-only | N/A — docs-only | `docs/05_ROADMAP_EVOLUTIVO_POR_ETAPAS.md` revert alone |

---

## Phase 1: Path Generators (design unit 1 — spec: level-engine R1, R2)

- [x] 1.1 In `client/src/levels/paths.ts`, add `cornerClearance(legLength, interiorDeg, w)`: closed-form `legLength − 2·(w/2)/tan(interiorDeg/2) ≥ w`.
- [x] 1.2 Add `triangularWave(...)`, emitting only `M`/`L`, ≥3 flattened points.
- [x] 1.3 Add `squareWave(...)`, emitting only `M`/`L`, ≥3 flattened points, satisfying `run ≥ 2·corridorWidth` via `cornerClearance`.
- [x] 1.4 `paths.test.ts`: assert command alphabet is `M`/`L` only for both generators (level-engine spec, "Generators emit only supported commands").
- [x] 1.5 `paths.test.ts`: assert `transformPath` throws on an injected non-`M`/`L`/`C` command (level-engine spec, "transformPath rejects an unsupported command").
- [x] 1.6 `paths.test.ts`: assert flattened point count ≥ 3 for both generators (level-engine spec, "Minimum point count holds").
- [x] 1.7 `paths.test.ts`: assert `squareWave` run length exceeds the `cornerClearance`-derived threshold for `corridorWidth = 70` (level-engine spec, "Straight run stays wider than the merge threshold"), using the worked values `run 190`, `amplitude 110`.

- [x] 1.8 Document `amplitude` on both new generators as the offset from the centreline, matching the shipped contract at `paths.ts:320` ("Extrema land exactly at `y ∓ amplitude`"), so arm-to-arm gap is `2·amplitude` (design C5).
- [x] 1.9 Add `armClearance(amplitude, w)` asserting `2·amplitude − w ≥ 0.7·w`, the wall-to-corridor ratio the shipped spiral keeps (`catalog.ts:329`); `squareWave` must satisfy it alongside `cornerClearance`.
- [x] 1.10 `paths.test.ts`: assert `armClearance` passes for `w = 70, amplitude = 110` (wall 150 against a 49 threshold) (level-engine spec, "Parallel arms keep a visible wall between them").
- [x] 1.11 `paths.test.ts`: assert the constraint **fails** for `w = 70` with `amplitude` misread as a peak-to-peak 70, where the wall would be zero and the trail would render as one filled block (level-engine spec, "The assertion fails on a merging candidate"). A constraint test that can only pass proves nothing.

## Phase 2: Clue Reducer (design unit 2 — spec: detective-mode R1)

- [x] 2.1 Create `client/src/detective/clues.ts`: `ClueMark`, `ClueState`, `emptyClueState(count)`.
- [x] 2.2 Implement `clueMarks(polyline, length, count)` via `pointAtArcLength` + `directionArrowOf`, pure.
- [x] 2.3 Implement `clueTick(state, head, marks, radius)`: monotone, discrete flip, no side effect on re-pass.
- [x] 2.4 `clues.test.ts`: a mark flips `drained → earned` in one dispatch, no intermediate state (detective-mode spec, "Mark flips exactly once as the glass passes").
- [x] 2.5 `clues.test.ts`: a stream of position updates while "down" yields no tween/delay/animation field, discrete values only (detective-mode spec, "No motion while the pointer is down").
- [x] 2.6 `clues.test.ts`: re-passing an earned mark returns an equal state and emits no event (detective-mode spec, "Re-passing an earned mark is inert").

## Phase 3: Asset Registry and Palette (design unit 3 — spec: detective-mode R4)

- [x] 3.1 Create `client/src/detective/assets.ts`: `ClueKind`, `AnimalId`, `ClueArt`, `CLUE_ART`, `ANIMAL_ART`, `GLASS_ART`, placeholder `d` strings centred on the origin.
- [x] 3.2 Create `client/src/detective/palette.ts`: `CLUE_DRAINED`, `POND`, `KERNEL`, `PRINT`, `PLUME`, `LAMP`.
- [x] 3.3 `palette.test.ts`: the four earned values are pairwise distinct.
- [x] 3.4 `palette.test.ts`: `PRINT` has zero chroma (detective-mode spec, "Footprints earn in greyscale only").
- [x] 3.5 `palette.test.ts`: none of the four earned values equals or falls in the warm-clay band around `GOAL_COLOR`/`HAZARD_COLOR`/`CARRIER_COLOR` (`TraceCanvas.tsx:149,177,194`).
- [x] 3.6 `palette.test.ts`: a trail's earned colour does not appear when that trail's mark is `drained` (detective-mode spec, "Trail colour absent before earning") — assert against the registry mapping, no DOM.

## Phase 4: Canvas Clue Layer (design unit 4 — spec: trace-canvas R1)

- [x] 4.1 `client/src/canvas/TraceCanvas.tsx`: add `TraceClueMark`, `TraceClues`, `clues` prop; render a `<g>` immediately before the ink path, following the `hazards` precedent (`:166-177`, `:893-910`).
- [x] 4.2 Add `TraceCarrierArt` prop to override the hardcoded carrier shape (absent = unchanged shipped sage figure).
- [x] 4.3 New canvas test: `renderToString` with a `drained` mark asserts the shared grey token as fill/stroke (trace-canvas spec, "Drained mark renders grey").
- [x] 4.4 New canvas test: `renderToString` with an `earned` mark asserts the trail's colour `X` (trace-canvas spec, "Earned mark renders its trail colour").
- [x] 4.5 New canvas test: `renderToString` with an earned footprint mark asserts black/grey-to-black, never chromatic (trace-canvas spec, "Earned footprint renders black, never chromatic").
- [x] 4.6 New canvas test: scan the rendered HTML string for the substring `url(#` with `clues` populated — MUST be absent (trace-canvas spec, "No url() reference is introduced").

## Phase 5: PISTAS Rail (design unit 5 — spec: level-engine R5)

- [x] 5.1 Create `client/src/detective/PistasRail.tsx`: drawn `PISTAS` word (stroked `M`/`L` polylines, 100-unit em), four slots, lamp glyph + three-ring halo.
- [x] 5.2 Add rail CSS to `LAYOUT_CSS` (or level-play stylesheet): fixed DOM column, 96px wide / 72px under `max-height:820px`; row layout under `max-height:520px`.
- [x] 5.3 `PistasRail.test.tsx`: `renderToString` — rail element exists outside the canvas `<svg>` viewBox content, alongside the canvas in chrome (level-engine spec, "Rail renders beside the canvas, not inside the viewBox").
- [x] 5.4 `PistasRail.test.tsx`: text content contains only the literal word `PISTAS`, no other prose (level-engine spec, "Rail carries no copy beyond PISTAS").

## Phase 6: Wire Clue Collection into LevelPlay (design unit 6 — spec: detective-mode R2)

- [x] 6.1 `client/src/screen/LevelPlay.tsx`: call `clueTick` from the existing 10 Hz `onFrame` sample, no second cloud scan (mirrors `resetOnContact` at `:613`).
- [x] 6.2 On trail completion (existing pass/goal signal), switch the trail's lamp "on" and file its clue into the rail's collected set, exactly once.
- [x] 6.3 `LevelPlay.test.tsx`: finishing a trail flips its lamp "on" and adds its clue to the rail's collected set exactly once (detective-mode spec, "Finishing a trail lights the lamp and files the clue").
- [x] 6.4 `LevelPlay.test.tsx`: all marks `earned` but route NOT completed — clue absent from the rail, lamp off (detective-mode spec, "Filing is refused mid-trace").

## Phase 7: Suppress Shell Copy on Detective Levels (design unit 12, per C1/C2 — no title/hint/coach text; icon controls)

- [x] 7.1 `client/src/screen/LevelPlay.tsx`: branch chrome rendering — when the active level is a detective trail (or the deduction view), suppress the `Fase 1 · <trail title>` header, hint line, and pillar/coach copy. Phases 2–5 keep existing chrome untouched (conditional branch, not a removal).
- [x] 7.2 Create `client/src/detective/icons.tsx` (or extend an existing icon module): retry and continue as ink-drawn glyphs, back as an icon affordance, all keeping the shipped 64px tap floor (`LevelPlay.tsx:140`).
- [ ] 7.3 Set `demo: true` on the four trail configs (ties into Phase 10) so the route animates in place of the removed hint sentence. **Deferred to S6** — this edits the four trail entries in `catalog.ts`, which do not exist until Phase 10 (design unit 9) creates them; `catalog.ts` is explicitly out of this slice's scope. `LevelPlay`'s own `demo:true` handling needs no change (`playDemo = !!level.demo && guideLevel === 'full'` already exists and is untouched) — S6 only needs to set the field.
- [x] 7.4 `LevelPlay.test.tsx`: `renderToString` for a detective-trail level asserts no title/hint/coach text node is present and control buttons carry no text label.
- [x] 7.5 `LevelPlay.test.tsx`: `renderToString` for a non-detective (phase 2+) level asserts existing chrome (title, hint, coach copy) is unchanged — regression guard for the branch.

## Phase 8: Deduction View (design unit 7 — spec: detective-mode R3, level-engine R4)

- [x] 8.1 `client/src/screen/GameScreen.tsx`: add `{ view: 'deduce' }` to `GameView`, `{ type: 'deduce' }` to `GameAction`; `nextView` stays catalog-independent.
- [x] 8.2 `client/src/screen/GameScreen.tsx`: implement `allEarned` predicate (pure, over plain progress values) and dispatch `deduce` from `onNext` when the finished level is the last trail and all four clues are earned, else `next`.
- [x] 8.3 `client/src/screen/GameScreen.tsx`: accept `?nivel=deduccion` in `initialView`, mirroring the existing deep-link pattern (`:47-52`).
- [x] 8.4 Create `client/src/detective/Deduction.tsx` (**deviation**: parent's slice-4 assignment explicitly placed this file under `detective/`, not the `screen/Deduction.tsx` this task and design.md's File Changes table name — see apply-progress.md for the full note): reuses `.cv-play` shell and rail; four-animal lineup on one ink line, D4 dismissal (no penalty, immediate re-pick), discriminating clue MAY be emphasised for the dismissed animal.
- [x] 8.5 `GameScreen.test.tsx`: three of four clues filed + fourth trail just completed → `nextView` returns the deduction view (level-engine spec, "Deduction view becomes reachable after the fourth clue").
- [x] 8.6 `GameScreen.test.tsx`: fewer than four clues filed → `nextView` never returns the deduction view (level-engine spec, "Deduction view stays unreachable with clues missing").
- [x] 8.7 `Deduction.test.tsx`: all four clues earned/filed → deduction screen presents exactly four animal choices (detective-mode spec, "All four clues collected reaches the deduction screen").
- [x] 8.8 `Deduction.test.tsx`: picking the hen records the case as closed (detective-mode spec, "Correct pick closes the case").
- [x] 8.9 `Deduction.test.tsx`: picking a distractor causes no penalty/score change, case stays open, immediate re-pick available (detective-mode spec, "Wrong pick is free and immediately retryable").

## Phase 9: Progress Migration (design unit 8 — spec: level-engine R6) — MUST land before Phase 11

- [x] 9.1 Create `client/src/game/migratePhase1.ts`: `PHASE_1_FORWARD` = `[['f1-travesia','trail1'], ['f1-pelotas','trail2'], ['f1-paseo','trail3'], ['f1-pasillo','trail4']]` (`f1-ondas`, `f1-espiral` have no successor, left as orphans).
- [x] 9.2 Implement `migratePhase1(records)`: field-wise `max` on `bestAccuracy`, `bestFluency`, `approvals`, `streakPass`, `widthFactor`; `attempts` summed; `streakFail` kept from the newer record; never deletes, never overwrites a higher value; returns only changed entries.
- [x] 9.3 Wire the call inside `GameScreen`'s `useState(() => …)` store initialiser, so idempotence covers StrictMode's double-invoke.
- [x] 9.4 `migratePhase1.test.ts`: mid-phase-1 payload with approvals on `f1-paseo` migrates into `trail3` with matching values, original record untouched (level-engine spec, "Mid-phase-1 payload loads with no loss").
- [x] 9.5 `migratePhase1.test.ts`: after migration, `isUnlocked('trail3')` (or the appropriate replacement) returns `true` for a mid-campaign payload (level-engine spec, "No locked dead end for a mid-campaign child").
- [x] 9.6 `migratePhase1.test.ts`: running migration twice on an already-migrated store leaves the source record unchanged and performs no second write (level-engine spec, "Migration does not repeat or destroy the source record").
- [x] 9.7 `migratePhase1.test.ts`: an id with no defined replacement is left exactly as stored (level-engine spec, "Unrelated ids remain untouched").

## Phase 10: Four Themed Trails (design unit 9 — spec: level-engine R3, R7)

- [ ] 10.1 `client/src/levels/catalog.ts`: add trail 1 (sine/droplets, themed hazard per C3 — trail 1 carries the hazard, not trail 2).
- [ ] 10.2 `client/src/levels/catalog.ts`: add trail 2 (counter-clockwise coil/corn) reusing `spiral()`, `corridorWidth: 70` against the generator's 120 radial gap (D2, `:329`).
- [ ] 10.3 `client/src/levels/catalog.ts`: add trail 3 (triangular-wave/footprints) using `triangularWave` from Phase 1.
- [ ] 10.4 `client/src/levels/catalog.ts`: add trail 4 (square-wave/feathers) using `squareWave` from Phase 1; set 5 clue marks per trail (C3).
- [ ] 10.5 `client/src/levels/catalog.ts`: retheme `f1-libre` (id and kind unchanged) as the opening beat; explicitly no clue mark, no `PISTAS` entry, not tracked by the clue reducer.
- [ ] 10.6 `catalog.test.ts`: exactly the four detective trail configs are present in `LEVELS`; none of the six removed ids appear yet (this task runs before Phase 11 removes them) (level-engine spec, "Four trails replace the six corridor levels" — precondition half).
- [ ] 10.7 `catalog.test.ts`: sum of the four trails' `buildLevel().length` ≥ sum of the six removed levels' lengths (level-engine spec, "Total arc length does not regress").
- [ ] 10.8 `catalog.test.ts`: trail 2's `corridorWidth` < `spiral()`'s radial gap (level-engine spec, "Coil trail's corridor stays narrower than the radial gap").
- [ ] 10.9 `catalog.test.ts` / clue-reducer test: `f1-libre` played to completion contributes no entry to the `PISTAS` rail's collected set, and its id is absent from the clue reducer's tracked trail ids (detective-mode spec "f1-libre contributes no clue" / "f1-libre is not tracked by the clue reducer").

## Phase 11: Retire Legacy Configs (design unit 10 — spec: level-engine R3) — HARD DEPENDENCY: Phase 9 tasks 9.1–9.7 MUST be merged before this phase starts (D3, no-demotion rule)

- [ ] 11.1 **Blocked-by-check**: confirm Phase 9 (S5) is merged into the chain before opening this PR — `isUnlocked` is positional (`LEVELS.findIndex`, then `LEVELS[index - 1]`, `LevelProgressStore.ts:123-129`); removing six configs before migration lands would lock trails 2–4 for any child already past `f1-travesia`.
- [ ] 11.2 `client/src/levels/catalog.ts`: move `f1-travesia`, `f1-pelotas`, `f1-paseo`, `f1-pasillo`, `f1-ondas`, `f1-espiral` out of `LEVELS` into an exported `LEGACY_PHASE_1`, unwired, config bodies unchanged.
- [ ] 11.3 `catalog.test.ts`: `LEGACY_PHASE_1` exports all six removed configs unchanged and unwired from `LEVELS` (level-engine spec, "LEGACY_PHASE_1 preserves the removed configs").
- [ ] 11.4 `catalog.test.ts`: none of the six removed ids appear in `LEVELS` (level-engine spec, "Four trails replace the six corridor levels" — completion half).
- [ ] 11.5 `LevelProgressStore.test.ts`: a stored payload with an id that has no defined replacement (e.g. `f1-ondas`) is left exactly as stored after this catalog swap (level-engine spec, "Unrelated ids remain untouched", re-asserted against the final `LEVELS` shape).

## Phase 12: Roadmap Doc (design unit 11 — D1, Spanish, only `docs/` edit this change may make)

- [ ] 12.1 Update `docs/05_ROADMAP_EVOLUTIVO_POR_ETAPAS.md` Módulo A: reward ladder no longer contradicts shipped behaviour — phase 1 now collects all four clues and runs the deduction screen (D1); record phases 2–5 losing their thematic reward as a follow-up, not a gap, in Spanish.

## Phase 13: Cross-Cutting Verification (all slices merged)

- [ ] 13.1 Run `npm test` from the repo root — all suites green, including every test added in Phases 1–12.
- [ ] 13.2 Run `npm run build` from the repo root (`tsc --noEmit && vite build`) — green. Do not run bare `tsc --noEmit` (TS 7 quirk recorded in `openspec/config.yaml`).
- [ ] 13.3 Grep the full `client/src/detective/`, `client/src/canvas/TraceCanvas.tsx`, `client/src/screen/Deduction.tsx`, `client/src/screen/LevelPlay.tsx` diff plus their `renderToString` test output for the substring `url(#` — MUST find zero new occurrences anywhere in the change (proposal success criterion; trace-canvas spec).
- [ ] 13.4 C4 — after Phase 10 lands: start the dev server, screenshot the square-wave trail (trail 4) with `scripts/shot.sh <url> <out.png>` against `?nivel=<trail-4-id>`, and confirm by eye that the elbows read as corners rather than merging (the `run ≥ 2·corridorWidth` closed form is derived, not observed, and this repo has no pixel check). Record the pass/fail result and the screenshot path in the verify report.
- [ ] 13.5 Load a hand-built mid-phase-1 `cursiva.levels.v1` payload (approvals through `f1-paseo`) against the final catalog and confirm no locked dead end end-to-end (integration re-check of Phase 9/11, proposal success criterion).

## Ordering Summary (load-bearing)

Phase 9 (migration) → Phase 10 (four trails) → Phase 11 (retire legacy) is a
strict chain. Phase 11 MUST NOT start before Phase 9's tasks are merged: D3
(no-demotion) requires the copy-forward migration to exist before the
position-shifting removal happens, or `isUnlocked` locks trails 2–4 for any
returning child. This is encoded above as an explicit blocking task (11.1),
not a comment, and reflected in the slice table's PR base chain (S6 bases on
S5).
