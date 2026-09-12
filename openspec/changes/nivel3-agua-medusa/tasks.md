# Tasks: Nivel 3 — Water, Jellyfish and U Movements

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ≈1,340 authored ± across 8 slices (design §Slice Plan; S7 alone ≈340) |
| 400-line budget risk | High (informational only — see below) |
| Chained PRs recommended | No |
| Suggested split | Single PR, 8 internally green commits (S1..S8) |
| Delivery strategy | auto-chain (session preflight) |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

**Note**: `review_budget_lines` is unlimited by explicit user acceptance of
`size:exception` for this session. The guard does not fire. Reported as
information, not a gate: one branch, one PR, sliced internally into 8
independently-green commits (S1..S8), matching design's Slice Plan. `npm test`
and `npm run build` MUST be green at the end of every slice (baseline: 1073
tests / 58 files). Never run bare `tsc --noEmit` — use `npm run build`.

### Suggested Work Units (commits within the one PR)

| Unit | Goal | Commit | Focused test command | Runtime harness | Rollback boundary |
|------|------|--------|----------------------|-----------------|-------------------|
| S1 | World/case predicate split, alone, before any Nivel 3 level exists | `refactor(level-engine)` | `npm test -- world LevelPlay` | N/A — no new Nivel 3 render surface yet | Collapse `isCaseTrail`/`inDetectiveWorld` back into one predicate; provably behaviour-neutral while no level sets `detectiveWorld` |
| S2 | Seed the water levels before they exist | `fix(progress)` | `npm test -- migrateNivel3` | N/A — pure store logic, no visual surface yet | Delete `migrateNivel3.ts`; seeded records tolerated by store (rollback item 4) |
| S3 | Per-cycle garland and the U-radius arithmetic | `feat(level-engine)` | `npm test -- paths` | N/A — no level authored with it yet | Additive-only: `garlandVaried`/`uTurnRadius`/`BAND_INSET` unused until S7 |
| S4 | Hazard art as a second branch, circle untouched | `feat(canvas)` | `npm test -- TraceCanvas` | N/A — numeric DOM dump, not a screenshot | Drop the optional `art` branch; circle stays default (rollback item 2) |
| S5 | Medusa and estrella de mar art | `feat(art)` | `npm test -- artManifest` | `scripts/shot.sh` — direct PNG contour view | Delete the two `SINGLES` rows + registry entries together (rollback item 6) |
| S6 | `goalArt`/`hazardArt` on the config and the screen | `feat(level-engine)` | `npm test -- LevelPlay` | N/A — no level sets the fields yet | Optional fields, absent-means-inert (rollback item 5) |
| S7 | The four Nivel 3 levels | `feat(level-engine)` | `npm test -- catalog obstacles` | `scripts/shot.sh` — 4-level sequence, band, goal, hazard | Delete the three contiguous new ids; retheme revert restores the config literal (rollback item 3) |
| S8 | Docs: Nivel 3 inventory, §4's fourth exception, §7's note | `docs` | N/A — docs-only | N/A — prose review | Docs-only; no code path depends on wording |

## Ordering Summary

Hard dependencies (violating these breaks a green slice or D7):

1. **S1 ships alone, before any Nivel 3 level exists.** With no Nivel 3 level
   in the catalog, `inDetectiveWorld ≡ isCaseTrail` for every shipped level,
   so the slice is provably behaviour-neutral (rollback item 1).
2. **S2 before S7**, or inserting the three ids relocks `f2-colinas` for a
   returning child (D7 / proposal decision #6).
3. **S3 before S7** — S7 is the first and only slice to author a level with
   `garlandVaried` (desafío 3) and assert the `uTurnRadius`/`BAND_INSET` band.
4. **S4 before S7** — S7 is the first slice to set `hazardArt` on a real level
   (desafío 4).
5. **S5 before S6 and S7** — `GOAL_MEDUSA_ART`/`HAZARD_STARFISH_ART` must
   exist in `assets.ts` before `LevelPlay` wires `goalArt` (S6) or `catalog.ts`
   references either constant (S7).
6. **S6 before S7** — S7 is the first slice to set `goalArt`/`hazardArt` on
   real `LevelConfig`s.
7. **S7 consumes S2–S6 simultaneously.** Within S7, `obstacles.ts` before the
   catalog entries that call it; catalog entries before `catalog.test.ts`
   edits; both before the screenshot checks.
8. **S8 has no code dependency** and runs last.

---

## Phase 1: World/case predicate split, alone (S1)

- [x] 1.1 Create `client/src/levels/world.ts`: `isCaseTrail(level)` (`!!level.clue`, `LevelPlay.tsx:633`'s old logic under its real name) and `inDetectiveWorld(level)` (`isCaseTrail(level) || level.detectiveWorld === true` — widening only).
- [x] 1.2 Add `detectiveWorld?: boolean` to `LevelConfig` in `client/src/levels/types.ts`.
- [x] 1.3 Create `client/src/levels/world.test.ts`: four fixtures (clue-only, world-only, both, neither); the widening invariant (`detectiveWorld: false` + a clue still reports world `true`); a regression guard over every level in `LEVELS` — `isCaseTrail(l)` implies `inDetectiveWorld(l)`, and today's shipped set is unchanged (S1's own behaviour-neutrality proof).
- [x] 1.4 **Audit task (mandatory, closes the slice).** Run `rg -n "isDetectiveTrail" client/src` and `rg -n "clueDef" client/src/screen/LevelPlay.tsx`; reconcile every hit against design.md §1's table — the 24 renamed sites (3 → `isCaseTrail` at the lamp latch/`PistasRail`/`endArt`; 17 → `inDetectiveWorld`) and the 6 already-correct `clueDef` consumers (`:635`, `:862`, `:1004`, `:1065`, `:1119`, `:1281`). Do not close this phase until zero `isDetectiveTrail` code references remain and every design row has a matching converted call site. **Discrepancy found and reconciled — see apply-progress.md.**
- [x] 1.5 Convert all 24 sites in `client/src/screen/LevelPlay.tsx` per the reconciled audit: delete the `isDetectiveTrail` definition (`:633`); route the lamp latch, `PistasRail` mount, and `endArt` lamp branch through `isCaseTrail`; route ground scatter, back control, `<h1>`, hint, rotate prompt, `startArt`, arrow suppression, `GLASS_REST_DX/DY`, `carrierArt`, `inkOnly`, `MUD_INK`/`MUD_INK_DIM`, the result block, and the three action-control labels through `inDetectiveWorld`.
- [x] 1.6 Update stale prose only, no logic: `client/src/levels/catalog.ts:162`, `client/src/detective/palette.test.ts:260`, `docs/03:131` — rename `isDetectiveTrail` to the split predicates in comments/prose. **Partial — `docs/03:131` deliberately NOT touched, see deviation in apply-progress.md.**
- [x] 1.7 Add a `detectiveWorld: true, clue: undefined` fixture to `client/src/screen/LevelPlay.test.tsx`'s eight suites (`:95`, `:173`, `:209`, `:249`, `:365`, `:391`, `:477`, `:564`): asserts ground, mud ink, octopus, glass, no chrome text, no rail, no `clues` prop, no result block/star glyph.
- [x] 1.8 Run `npm test` and `npm run build`; confirm green against the 1073/58 baseline plus this slice's new tests.

## Phase 2: Seed the water levels before they exist (S2)

- [x] 2.1 Add `NIVEL3_TRAIL_IDS` (exactly the three new ids, in order) to `client/src/game/types.ts`, beside `DUCK_TRAIL_IDS`. **MUST NOT include `'f2-guirnalda'`** — it is the migration's source id; including it makes the second guard below true on the first run and the migration writes nothing.
- [x] 2.2 Create `client/src/game/migrateNivel3.ts`: `NIVEL3_PREDECESSOR_ID = 'f2-guirnalda'`, `seedFrom()` copied verbatim from `migrateDuckCase.ts`, `migrateNivel3(records)` guarded on `f2-guirnalda.approvals >= APPROVALS_TO_UNLOCK`, returns `{}` if any of the three new ids already has a record, never mutates or deletes `f2-guirnalda`'s own entry.
- [x] 2.3 Create `client/src/game/migrateNivel3.test.ts`: idempotent re-run is a no-op; no write below the approval threshold; no write when any destination exists; never deletes; **named guard**: `NIVEL3_TRAIL_IDS.length === 3` and does not include `'f2-guirnalda'`; a captured `cursiva.levels.v1` payload with `f2-guirnalda` approved keeps `f2-colinas` unlocked and demotes nothing.
- [x] 2.4 Wire `migrateNivel3` into `client/src/game/openProgressStore.ts`'s migration array as a third entry (order irrelevant — the three migrations share no id).
- [x] 2.5 Run `npm test` and `npm run build`; confirm green.

## Phase 3: Per-cycle garland and the U-radius arithmetic (S3)

- [ ] 3.1 Add `GarlandCycle` interface and `garlandVaried(o)` to `client/src/levels/paths.ts` (design §2's exact rounded-U cubic; absolute `M`/`C` only).
- [ ] 3.2 Add `uTurnRadius(width, depth)` to `client/src/levels/paths.ts` (design §2's derivation, `≈0.2032·w²/depth`).
- [ ] 3.3 Export `BAND_INSET` from `client/src/levels/buildLevel.ts:38`. No other change to `buildLevel.ts` — checkpoints and the ideal band hold unconditionally for non-uniform paths (design §2).
- [ ] 3.4 Update `client/src/levels/paths.test.ts`: a uniform `cycles` list reproduces `garland`'s exact `d`; only `M`/`C` emitted; each cycle's `t = ½` point sits on `yTop + depth`; `uTurnRadius` reproduces shipped `f2-guirnalda` (43.9); the band predicate `uTurnRadius(width, depth) > corridorWidth/2 − BAND_INSET` holds for every garland/hills level at its authored width, per design §2's table (including desafío 3's 4.5-unit margin).
- [ ] 3.5 Run `npm test` and `npm run build`; confirm green.

## Phase 4: Hazard art as a second branch, circle untouched (S4)

- [ ] 4.1 Add optional `art?: { href: string; w: number; h: number }` to `TraceHazards` in `client/src/canvas/TraceCanvas.tsx`; widen the hazard ref array to `Array<SVGCircleElement | SVGGElement | null>`.
- [ ] 4.2 Add the art branch to hazard markup as a **separate, untouched** JSX alternative to the existing `<circle>` (design §4): `<g ref transform>` holding a static `<image>` placed by `placeArt(art, 2·r, {x:0,y:0})`.
- [ ] 4.3 Branch the rAF loop on `!!hz.art`, read once per frame: `transform="translate(x,y)"` for art hazards, `cx`/`cy` mutation for circle hazards — exact snippet in design §4.
- [ ] 4.4 **Numeric verification (mandatory, not a screenshot).** In `client/src/canvas/TraceCanvas.test.tsx`, `renderToString` `trail1`'s hazard through the changed component and assert `cx`, `cy`, `r="30"` are unchanged and the markup does NOT match a translated `<g>` wrapping a `<circle>` (design §4's regex). Add a parallel art-present case asserting the group's `transform`, the `<image href>`, and `width`/`height` equal `placeArt(art, 2·radius, {x:0,y:0})`.
- [ ] 4.5 Run `npm test` and `npm run build`; confirm green.

## Phase 5: Medusa and estrella de mar art (S5)

- [ ] 5.1 Add two `SINGLES` rows to `scripts/art/build_art.py`: `('medusa.png', 'goal-medusa.png', 384, None, True)` and `('estrella de mar.png', 'hazard-starfish.png', 320, None, True)` — `fill=None`, no new palette tuple.
- [ ] 5.2 **Run `python3 scripts/art/build_art.py` and commit its outputs**, including `client/public/art/goal-medusa.png`, `client/public/art/hazard-starfish.png`, and the regenerated `client/public/art/manifest.json`, in this same commit. Art never enters by hand. `ART_OUTLINE` is the token for every drawn-world contour.
- [ ] 5.3 Read the freshly emitted `manifest.json` for the two new entries' `w`/`h`; add `GOAL_MEDUSA_ART` and `HAZARD_STARFISH_ART` to `client/src/detective/assets.ts` using those emitted sizes, never guessed.
- [ ] 5.4 Update `client/src/detective/artManifest.test.ts`: `REGISTERED` gains `['GOAL_MEDUSA_ART', GOAL_MEDUSA_ART]` and `['HAZARD_STARFISH_ART', HAZARD_STARFISH_ART]` plus their imports (`:26-37`, `:68-82`); `:122` count `44 → 46`; `:117-118` comment gains "+ 1 goal (medusa) + 1 hazard (estrella de mar)".
- [ ] 5.5 **Screenshot check (human-reviewed, mandatory — contour colour).** Directly view `client/public/art/goal-medusa.png` and `client/public/art/hazard-starfish.png` (no level renders them yet, so `scripts/shot.sh` needs no URL here — read the PNG files directly). PASS: both contours read as the same near-achromatic dark ink as the rest of the drawn world, matching `ART_OUTLINE`. FAIL: either contour is visibly hued/coloured, which would grow the drawn world a third coloured line — the `#19241c` grass failure repeating. If FAIL, move that `SINGLES` row to a two-tone recolour, not a palette token.
- [ ] 5.6 Run `npm test` and `npm run build`; confirm green.

## Phase 6: `goalArt`/`hazardArt` on the config and the screen (S6)

- [ ] 6.1 Add `goalArt?: ArtImage` and `hazardArt?: ArtImage` to `LevelConfig` in `client/src/levels/types.ts`.
- [ ] 6.2 In `client/src/screen/LevelPlay.tsx`, compute `endArt`: `goalArt` wins over the case lamp (design §5's exact branch); add `GOAL_ART_SIZE = 96`; pass `level.hazardArt` through to `TraceHazards.art` when present.
- [ ] 6.3 Update `client/src/screen/LevelPlay.test.tsx`: `endArt.href` is the goal art on a level with `goalArt` set; the lamp on a case trail with no `goalArt`; `goalArt` wins when both are present; absent on an ordinary level (`:526` stays green).
- [ ] 6.4 Run `npm test` and `npm run build`; confirm green.

## Phase 7: The four Nivel 3 levels (S7)

- [ ] 7.1 Add `hazardGapFraction(o, corridorWidth)` to `client/src/levels/obstacles.ts` (design §4's closed form).
- [ ] 7.2 Extend `client/src/levels/obstacles.test.ts`: reproduces retired `f1-pelotas` (0.540) and live `trail1` (0.420); `f2-agua4` > 0.5; `f2-agua4`'s hazard triple ≠ `trail1`'s (D3).
- [ ] 7.3 Insert four `LevelConfig`s into `client/src/levels/catalog.ts` between `f2-guirnalda` and `f2-colinas`. All four share `phase: 2`, `kind: 'path'`, `surface: 'blank'`, `maze: false`, `showGuide: true`, `letters: []`, `rules(2, true, true, …)`, `demo: true`, `carrier: true`, `detectiveWorld: true`, `goalArt: GOAL_MEDUSA_ART`, no `clue`, no `taper`. Per-level: `f2-guirnalda` — `garland({x0:120,x1:880,yTop:190,yBottom:430,cycles:3})`, corridor 100, bpm 54, `minFluency` 35; `f2-agua2` — `garland({x0:120,x1:880,yTop:290,yBottom:430,cycles:4})`, corridor 80, bpm 64, `minFluency` 38; `f2-agua3` — `garlandVaried({x0:95,yTop:220,cycles:[{180,180},{130,95},{195,200},{140,110},{165,170}]})`, corridor 68, bpm 68, `minFluency` 40; `f2-agua4` — same `garland(...)` as desafío 1, corridor 90, `feedback(0,false)`, `rules(2,true,true,0)`, `obstacles:[{at:0.5,travel:280,periodMs:3000,phase:0,radius:34}]`, `resetOnContact:true`, `hazardArt: HAZARD_STARFISH_ART`. Use the four hint strings from design §3 (each ≤ 80 chars).
- [ ] 7.4 **Guard task (mandatory, named).** Add to `catalog.test.ts`: the ONLY level with `feedback.metronomeBpm === 0` is `f2-agua4`; it has exactly one obstacle; its `rules.minFluency === 0` — design §3's exact exemption guard, so the beat/fluency silence cannot become an unguarded hole.
- [ ] 7.5 Update `client/src/levels/catalog.test.ts` per design §3's eleven edits: `EXPECTED_IDS` inserts the three ids between `f2-guirnalda`/`f2-colinas`; `CORRIDORS` (`f2-guirnalda` 85→100, + three new); `FLUENCY` (+ three new); metronome band re-scoped to "…where it beats at all"; bpm-ordering pair replaced with `f2-agua2 > f2-guirnalda`; reset list gains `f2-agua4` and its title generalises; hazard list `['trail1']` → `['trail1', 'f2-agua4']` with `periodMs`/`radius` bands widened to admit §4's numbers; the `uTurnRadius`/`BAND_INSET` band assertion; the `hazardGapFraction` assertion; confirm the tapered-set count (`:268-274`) stays at 3 unchanged — no Nivel 3 level grew a taper.
- [ ] 7.6 **Screenshot check (human-reviewed) — microprogression.** Start the dev server; `scripts/shot.sh http://localhost:<port>/?nivel=f2-guirnalda /tmp/shots/nivel3-1-guirnalda.png`, then the same for `f2-agua2`, `f2-agua3`, `f2-agua4` into `/tmp/shots/nivel3-2-agua2.png`, `nivel3-3-agua3.png`, `nivel3-4-agua4.png`. PASS: viewed in id order, corridor width visibly narrows 1→2, desafío 3 reads as five differently-sized U's (not a mistake), desafío 4 returns to desafío 1's wide geometry. FAIL: two adjacent shots look identical, or desafío 3's U's look uniform.
- [ ] 7.7 **Screenshot check (human-reviewed) — desafío 3's ideal band.** Inspect `nivel3-3-agua3.png` (crop closer if needed) at the shallowest U (the `{130, 95}` cycle). PASS: the pale ideal-band fill hugs the U bottom with a small but real margin, consistent with the computed 4.5-unit margin — the tightest of the four levels. FAIL: the band appears to bulge past the U's stroke or looks pinched/folded at that bottom.
- [ ] 7.8 **Screenshot check (human-reviewed) — medusa at the goal.** Inspect any of the four shots' route end. PASS: the medusa (`goal-medusa.png`) stands at the route's end, not the two hollow diamonds and not a case lamp. FAIL: the endpoint shows the default diamonds, the lamp, or no art.
- [ ] 7.9 **Screenshot check (human-reviewed) — starfish crossing the path.** Inspect `nivel3-4-agua4.png`. PASS: the starfish art visibly occupies/crosses the middle-U corridor, drawn as `hazard-starfish.png`, not a bare circle. FAIL: the hazard renders as a plain circle, is missing, or sits outside the corridor.
- [ ] 7.10 Run `npm test` and `npm run build`; confirm green.

## Phase 8: Docs — Nivel 3 inventory and the two style-guide notes (S8)

- [ ] 8.1 Update `docs/04`'s Nivel 3 inventory with the four ids (`f2-guirnalda` retheme + `f2-agua2/3/4`).
- [ ] 8.2 Update `docs/09` §4 with the fourth exception: medusa/estrella de mar keep authored colour, `fill=None`.
- [ ] 8.3 Update `docs/09` §7 with a short note that the sheet-as-a-place rule reaches Nivel 3 without a case.
- [ ] 8.4 Run `npm test` and `npm run build`; confirm green (docs-only slice; this run is a regression check, not a proof of the docs themselves).

---

## Falsifiability and Screenshot Index (cross-reference)

| Concern | Task |
|---|---|
| `isDetectiveTrail` fully retired, every site reconciled | 1.4 |
| `trail1`'s hazard is numerically unchanged, not just visually | 4.4 |
| Medusa/starfish contours stay near-achromatic | 5.5 |
| Desafío 4 beat/fluency silence guarded to exactly one id | 7.4 |
| Four levels read as a progression, not repetitions | 7.6 |
| Desafío 3's 4.5-unit band margin reads correctly | 7.7 |
| Medusa renders at the goal | 7.8 |
| Starfish crosses the corridor | 7.9 |

---

### Accepted deviation

This document exceeds the skill's 530-word cap. `openspec/config.yaml`'s
`tasks` rule requires hierarchical, per-session-sized tasks; this change
carries eight ordered slices, a 24-site conversion audit, two named guard
tests, and eight human-reviewed screenshot checks with explicit PASS/FAIL
criteria — the same class of deviation `design.md`'s and `proposal.md`'s own
"Accepted deviation" sections recorded for this change.
