# Apply progress: hedgehog-radial-spines

Batch 2 of 2. Scope: Phases 9-14 (the four catalog levels, zoo
registries, the six RED confirmations, the isUnlocked/orphan sweep, the
final gate and captures, the docs amendment). Batch 1 covered Phases 1-8
(measured tables through LevelPlay wiring); its own section is preserved
below, unedited, per the merge protocol.

## Status

All 14 phases are `[x]` complete in `tasks.md`. All 74 sub-tasks across
both batches are checked. Tests green, `npm run build` green.

| Phase | Status | Commit |
|---|---|---|
| 1 — Measured Silhouette Tables | done (batch 1) | `623119c` |
| 2-4 — Pure Fold Module | done (batch 1) | `cae9149` |
| 5 — Engine Repairs | done (batch 1) | `40c3950` |
| 6 — Render Layer | done (batch 1) | `96598d0` |
| 7 — Debug Flag | done (batch 1) | `c81e78e` |
| 8 — LevelPlay Wiring | done (batch 1) | `ad74f0d` |
| 9 — Four Levels and Catalog Guards | done (batch 2) | `10dc744` |
| 10 — Zoo Registries and the Ink Law | done (batch 2) | `3bbc894` |
| 11 — Six RED Confirmations | done (batch 2) | `3d75b1a` |
| 12 — isUnlocked/Orphan/Open-Questions Sweep | done (batch 2), no code diff | `397f926` |
| 13 — Final Gate and Captures | done (batch 2), no code diff (no defect found) | `65d198e` |
| 14 — docs/13 §4 Amendment 10 | done (batch 2) | `63ae0a6` |

## Test/build counts measured (batch 2)

- Starting point (end of batch 1): 79 test files / 1810 tests, green.
- **End of batch 2: 79 test files / 1833 tests, green** — no new test
  FILES were added in this batch (only existing test files were extended:
  `catalog.test.ts`, `adventures.test.ts`, `sectors.test.ts`,
  `backdrops.test.ts`, `backpack.test.ts`, `buildLevel.test.ts`,
  `SpineLayer.test.tsx`), so the file count did not move; the test count
  rose by 23 (+9 catalog hedgehog-family tests, +9 zoo/backdrop tests, +2
  `demoPlays` split tests, +2 SpineLayer stage-2 tests, +1 backpack test).
- Ran the full suite TWICE at the end of the batch, both green with no
  timeouts: once with `npm test` (the committed default, 5000ms per-test
  timeout) — 79/79 files, 1833/1833 tests, 52.27s; once with
  `npx vitest run --testTimeout=30000` (an UNCOMMITTED CLI flag, used only
  to get an unambiguous correctness reading per this batch's own
  instructions) — 79/79 files, 1833/1833 tests, 53.41s. The host's load
  did not reproduce the directive's warned-about timeout on either run
  this time; both are reported honestly as measured, under their stated
  conditions.
- `npm run build` (`tsc --noEmit && vite build`): green, no new errors,
  same pre-existing >500kB chunk-size warning as batch 1, unrelated to
  this change.
- Zero new `url(#` occurrences (`rg 'url\(#' client/src` returns only
  pre-existing comments/tests that mention the string as prose or as a
  `.not.toContain('url(#')` assertion — no new `fill="url(#..."` usage
  anywhere).

## The six RED confirmations (Phase 11), with observed signatures

1. **Rendered-markup coincidence (all four levels, both poses).** Added a
   stage-2 test to `SpineLayer.test.tsx` against the REAL catalog (not
   just the fixture stage-1 tests batch 1 wrote), then confirmed red via
   BOTH required breaks, then restored both:
   - Break (a): pushed `hedgehog1.spines.body.centre.x` to `5000` (off the
     1000×600 sheet) in `catalog.ts`. Observed: the rendered `<image>` box
     (clamped by `clampArtBox`) diverged from `spineBody(cfg).box`
     (unclamped) by exactly the clamp's own displacement — measured
     difference **4174.49** units on both the direct box-equality
     assertion and the anchor-silhouette-recovery assertion. Restored;
     confirmed green.
   - Break (b): added `x: spines.body.x + 40` inside `SpineLayer.tsx`'s
     own `clampArtBox` call. Observed: 3 tests failed (the stage-1 fixture
     test plus both stage-2 tests), each reporting a **40**-unit
     discrepancy — the exact injected offset. Restored; confirmed green
     (8/8 `SpineLayer.test.tsx` tests, 141/141 `catalog.test.ts` tests).
2. **The debug flag reaches the SCREEN.** Removed `spines={spines}` from
   `TraceCanvas`'s render call in `LevelPlay.tsx`. Observed: 2 of 82
   `LevelPlay.test.tsx` tests failed — `probe.spines` became `undefined`
   (expected a marks array), for every `k` including `k=0`. Restored;
   confirmed green (82/82).
3. **Reset coverage by source-read count.** Already self-contained (the
   test itself breaks-and-restores the source string inline, confirming
   the count falls 3→2 when `restartRun`'s call is regex-deleted).
   Re-ran in isolation this batch: still green, still restored — no stale
   break left in the source.
4. **The ink law as undrawability.** Already self-contained in
   `backdrops.test.ts`'s "the floor is exact" test, which asserts BOTH
   that today's measured value (213) fails the law and that a
   hypothetical 184 would pass it. Re-ran in isolation this batch: green.
5. **The demo is not empty (both halves).** Already confirmed red against
   `main` in batch 1 (5.4/5.6), before their respective repairs landed.
   Re-ran in isolation this batch (`buildLevel.test.ts -t demo`): 10/10
   green, including the two newly-split whole-catalog invariant tests
   this batch added (see "Two things flagged" below).
6. **The backdrop group is substantive, not vacuous.** Removed `ink`/
   `inkDim` from `backdrops.ts`'s `hedgehog` row. Observed: exactly 1 of
   51 `backdrops.test.ts` tests failed — the direct field-equality check
   in the `SPINE_BACKDROPS` group ("the hedgehog row declares no new ink
   token"), `expected undefined to be '#f2efe6'`. Critically, the
   registry-completeness guard test ("the union of the five groups
   equals every registered backdrop") did NOT fail, because it only
   checks key membership — proving the completeness guard alone would
   have missed this, and the group's own substantive law is what catches
   it. Restored; confirmed green (51/51).

Full suite re-run after every break was restored: green, zero
uncommitted diffs left in the tree at any point (`git status --short`
checked immediately after each restore).

## The two things flagged for this batch, and how they were handled

1. **The `demoPlays`/`showGuide` contradiction.** Batch 1 already resolved
   this (a `spines` level bypasses the guide-band gate entirely) and
   documented it in `LevelPlay.tsx`'s doc comment and `buildLevel.test.ts`.
   This batch's job was to VERIFY the demo actually reaches the screen for
   `hedgehog1` (not just trust the rename) — done via a live capture at a
   short `--virtual-time-budget` (800ms instead of the usual 6000ms),
   which shows an actual blue guide stroke being drawn from the first
   anchor outward on screen (see "What the captures showed" below). This
   is direct visual proof, not an inference from green tests.
2. **The whole-catalog `demoPlays` invariant test needed extending.** Split
   `buildLevel.test.ts`'s single test (which previously asserted the old
   formula unconditionally over every level, none of which carried
   `spines`) into two: one for levels WITHOUT `spines` (old formula,
   `!!l.demo && g === 'full'`), one for levels WITH `spines`
   (`!!l.demo`, unconditional on `g`) — the pattern the two `spines`-
   fixture tests immediately above it already established. The
   with-spines test also asserts `spinesLevels.length > 0`, so it cannot
   vacuously pass over zero levels.

## What the captures showed (Phase 13.6-13.8), read together

Ten capture pairs in `capturas/pasoH/` (gitignored, not committed): one
control + one `?debug=espinas:<count>` per level (`hedgehog1..4`), plus
one extra mid-demo capture for `hedgehog1` at a short virtual-time-budget,
plus the map before/after filing `llama-peak4` + `hedgehog1..4`.

- **Does the unfilled mark read against `night.brightest` given its
  measured 0.8-unit margin?** Yes, but thin. In every control screenshot
  the grey (`TORCH_CHALK_DIM`) marks read as small lighter-grey circles
  against the dark blue-grey backdrop — legible, distinguishable from the
  background, but noticeably softer than the filled state. This matches
  the recorded risk exactly: visible, not smoothed over as "obviously
  fine."
- **Does the earned mark's luma jump read as a reward?** Yes, clearly.
  Every `?debug=espinas:<k>` capture shows the first `k` marks as bright
  near-white/cream circles (with a debug ring at `baseRadius` around
  each), a strong, unambiguous visual jump from the grey unfilled state.
- **Does the body's night backdrop still read as a place?** Yes. The dark
  blue-grey ground and the forest-silhouette band across the top are
  unchanged from the shipped `night` backdrop, and the hedgehog's own body
  sits on it without looking pasted onto an unrelated surface.
- **Does the demo's first-k segments read as a plausible hint?** Confirmed
  DIRECTLY, not inferred: an extra capture of `hedgehog1` at
  `--virtual-time-budget=800` (short enough to catch the demo mid-draw)
  shows an actual blue guide stroke running from the first anchor outward,
  at a plausible length — this is the demo repair proven on screen, not
  just via the rename and a green test.
- **The map before/after.** The "after" capture (with `llama-peak4` and
  `hedgehog1..4` filed) shows the nocturna sector's content revealed
  (moon, stars, trees) with the erizo (spineless profile art, as designed
  and flagged in §9 item 2) standing on it — appearing only because
  `hedgehog4` was filed. An extra backpack icon (`andean-hat`) also
  appears in the "after" shot; traced to `llama-peak4`'s own unrelated
  `earnedWhen`, not to anything this change touches — not a defect.

**No defect was found requiring a fix (Phase 13.9 has nothing to correct).**
Every capture read as designed; the only "surprise" (the extra backpack
icon) was traced to an unrelated, pre-existing condition and is not a
regression.

## Deviations from tasks.md / design.md, and why (batch 2)

1. **The `baseRadius` ceiling in `catalog.test.ts`'s new hedgehog-family
   test is NOT computed with the simplified circle formula
   `r_min·sin(Δθ/2)`** design.md §2 D5 states as the general shape. That
   formula, evaluated against the CONTINUOUS minimum radius over each
   level's spine arc, reproduces margins of roughly 2.4-2.5 for
   `hedgehog1` — not the 3.5 design.md's own §8 table declares. The test
   instead computes the ceiling from the REAL minimum chord between two
   adjacent GENERATED anchors (law of cosines between their two, possibly
   different, radii), which reproduces design's stated 41.5/30.9/27.1/27.5
   almost exactly. This is recorded as a finding in `docs/13`'s amendment
   10, not silently substituted — the circle formula explains WHY a
   ceiling exists; the real anchor-chord distance is what the test must
   assert, because "nearest unfilled anchor" ambiguity depends on that
   distance, not on a hypothetical circle's radius.
2. **The "no anchor on a foot or belly" test (task 9.3) and the "table is
   not an ellipse" test (task 9.5) are placed in `catalog.test.ts`'s new
   hedgehog-family describe block, not in `detective/assets.test.ts`**
   (where the raw `HEDGEHOG_SILHOUETTE` guards from Phase 1 live). Task
   9.5's assertion is about the measured table in the abstract (independent
   of any level config), so it could have lived in either file; it was
   kept alongside 9.2/9.3/9.4/9.6 so the whole hedgehog-family block reads
   as one unit, matching the pattern `tasks.md` itself groups them under.
3. **Phase 12 (isUnlocked/orphan sweep/open-questions guard) produced NO
   code diff**, only a `tasks.md` checkbox update — it is grep-based
   verification per its own task list, and every grep result matched the
   design's expected outcome exactly (stated below), so nothing needed
   fixing.
4. **Phase 13.1-13.5 (the gate) produced no code diff either** — the full
   suite and build were already green from Phases 9-12's own work; this
   phase is confirmation, not implementation.

## isUnlocked re-grep result (Phase 12.1), stated

`rg -n "isUnlocked" client/src` was re-run. Its only non-test,
non-migration-comment consumer is `screen/LevelMap.tsx:81`
(`store.isUnlocked(level.id)`), which the codebase's own comments confirm
is dev-only (`screen/GameScreen.tsx:273`: "the internal, dev-gated
`LevelMap`"; `game/migrateEntrance.ts:13`: "the dev-only `LevelMap`
display"). Real navigation routes through `zoo/sectors.ts`'s
`unlockedWhen`, confirmed unchanged for `nocturna` in Phase 10
(`nocturna.unlockedWhen` stayed `isFiled(records,'llama-peak4')`, verbatim).
This CONFIRMS design.md §13/§2 D6's stated expectation exactly — stated
here as the actual grep result, not assumed.

## Orphan sweep result (Phase 12.2), stated

Every one of the thirteen new exported symbols (`spineBody`,
`spineAnchors`, `spineOrigin`, `spineAim`, `spineSettle`, `spineScore`,
`spineMarks`, `spineRings`, `spineDemoPaths`, `debugSpines`, `seedSpines`,
`demoPlays`, `spineDebugCount`) has at least one real, non-test caller:
`spineBody`/`spineMarks`/`spineRings` are called from `LevelPlay.tsx`'s
render-prop memo; `spineAnchors` is called internally by six sibling
functions in `spines.ts` itself; `spineOrigin`/`spineDemoPaths` are called
from `buildLevel.ts`; `spineAim`/`spineSettle` are called from
`LevelPlay.tsx`'s live-fold/recount sites; `spineScore` is called from
`evaluateLevel.ts`; `debugSpines` is called internally by `seedSpines`
(same file), which is itself called from `LevelPlay.tsx`'s initialiser and
both reset sites; `demoPlays` is called from `LevelPlay.tsx`'s demo gate;
`spineDebugCount` is called from `LevelPlay.tsx` at three sites. No orphan
found.

## Open questions confirmed still open (Phase 12.3), stated

All five of design.md §9's open questions remain untouched by this batch:
(1) no new palette token was added anywhere in `zoo/backdrops.ts` or
`detective/assets.ts`; (2) `ZOO_ANIMAL_ART.erizo` still resolves to
`HEDGEHOG_ART.profile` (the spineless art), with the "closing it needs a
third drawing" comment intact; (3) no `mute()`-class art pass and no
`184.0` literal exist anywhere in production code (only as a measured
comparison value inside `backdrops.test.ts`); (4) `BACKPACK_ITEMS`
still has exactly one row with `grantedBy: 'nocturna'` (asserted by a new
test this batch added); (5) `restartRun`'s bare `EMPTY_WAYPOINTS` at
`LevelPlay.tsx` is still present and unrepaired (confirmed by grep).

## Files touched (Phases 9-14)

- `client/src/levels/catalog.ts` — `hedgehog1..4` inserted at the end of
  the phase-1 block, after `dolphin4`, before `f2-guirnalda`.
- `client/src/levels/catalog.test.ts` — extended every named guard
  (`EXPECTED_IDS`, `CORRIDORS`/`FLUENCY`, minAccuracy exemption, the
  free-level census 17→21, tone/haptics, `levelsByPhase(1)`, the phase-1
  detective list) plus a new `LEVELS — the hedgehog family` describe block
  (7 tests: baseRadius ceiling/margin, no anchor on foot/belly, curled
  roundness, non-ellipse table, checkable ladder, hedgehog1's own
  phase-1-guard numbers on real geometry, hedgehog4's pose).
- `client/src/levels/buildLevel.test.ts` — split the whole-catalog
  `demoPlays` invariant into a with-spines/without-spines pair.
- `client/src/zoo/adventures.ts` — `AdventureId += 'hedgehog'`; one
  `ADVENTURES` row appended at the end.
- `client/src/zoo/adventures.test.ts` — updated the row count (9→10) and
  id list; added a `the hedgehog adventure` describe block.
- `client/src/zoo/sectors.ts` — `nocturna.animals` gains its first entry
  (`erizo`); `nocturna.adventureIds` extended to eight ids.
- `client/src/zoo/sectors.test.ts` — extended the `nocturna.adventureIds`
  assertion to the new eight-id list.
- `client/src/zoo/backdrops.ts` — new `hedgehog` row (reusing `night`'s
  art/quiet/brightest/corridorRows, `ink`/`inkDim` from `TORCH_CHALK`/
  `TORCH_CHALK_DIM`, no `tile`, no `channel`); new `SPINE_BACKDROPS` export.
- `client/src/zoo/backdrops.test.ts` — `SPINE_BACKDROPS` joins the
  completeness guard; new `SPINE_BACKDROPS ink law` describe block (7
  tests: no new token, reused literals, the earned/unfilled luma gaps
  against the night band, falsifiability against `INK_COLOR`, the body's
  own undrawability, the exact floor); a `backdropFor` resolution test for
  the four hedgehog levels.
- `client/src/zoo/backpack.test.ts` — one new test confirming
  `hedgehog4` grants no second `nocturna` backpack item.
- `client/src/detective/assets.ts` — `ZooAnimalId += 'erizo'`;
  `HEDGEHOG_ART` moved ABOVE `ZOO_ANIMAL_ART` (module-init ordering, since
  the new `erizo` row references it) with a comment explaining the move;
  `ZOO_ANIMAL_ART.erizo = HEDGEHOG_ART.profile` with the art gap flagged.
- `client/src/canvas/SpineLayer.test.tsx` — new stage-2 coincidence proof
  against the real catalog (all four levels, both poses): rendered box vs
  `spineBody(cfg).box`, and anchors recovered from the rendered box vs the
  real `spineAnchors(cfg)`.
- `docs/13_AVENTURAS_POR_ANIMAL.md` — amendment 10 (§4, Spanish); the
  Erizo status row in §4's table flipped from "No existe." to "Hecha".
- `openspec/changes/hedgehog-radial-spines/tasks.md` — all 74 tasks
  across 14 phases marked `[x]`.

---

## Batch 1's own section (preserved verbatim below)

Batch 1 of N. Scope: Phases 1-8 of `tasks.md` (measured tables through
LevelPlay wiring). Phases 9-14 (four catalog levels, zoo registries, the
six RED confirmations, the isUnlocked/orphan sweep, the final gate and
captures, the docs amendment) are explicitly deferred to a later batch.

### Status

All of Phases 1-8 are `[x]` complete, committed as one work unit per phase
(commit plan units 1-8), tests green, `npm run build` green.

| Phase | Status | Commit |
|---|---|---|
| 1 — Measured Silhouette Tables | done | `623119c` |
| 2-4 — Pure Fold Module (types, geometry, 5 measures, score, render projections, demo segments, debug seed) | done, combined into ONE commit (see deviation below) | `cae9149` |
| 5 — Engine Repairs (levelStart, demo split, evaluateLevel) | done | `40c3950` |
| 6 — Render Layer (SpineLayer, TraceCanvas) | done | `96598d0` |
| 7 — Debug Flag (devMode.ts) | done | `c81e78e` |
| 8 — LevelPlay Wiring | done | `ad74f0d` |
| 9-14 | NOT STARTED — later batch | — |

### Test/build counts measured

- Baseline (before this batch): **76 files / 1730 tests**, green.
- After Phase 1: 78 files (no — `detective/assets.test.ts` is new) / 1739ish — measured cumulatively, not per-phase-committed-separately; see final count below.
- **After Phase 8 (end of this batch): 79 test files / 1810 tests, green.**
- `npm run build` (`tsc --noEmit && vite build`): green, no new errors. Pre-existing chunk-size warning (>500kB) is unrelated to this change.
- One full-suite run reported `1 failed | 1805 passed` at `detective/artHierarchy.test.ts > visual hierarchy: the clue outranks the ground it lies on > keeps zoo and sector art on intrinsic canvases with safe alpha and dark pixels` — re-run in isolation (9/9 passed) and re-run of the full suite (79/79, 1806/1806) both green. This is the documented baseline flake (`tasks.md`'s own note: "Four baseline runs... 1 failed / 1729 passed once... the failing test was never captured"). Now captured: it is in `artHierarchy.test.ts`, unrelated to any file this change touches (canvas image-loading timing, not spines/hedgehog code). Attributed to the pre-existing flake, not to this change.

### Deviations from tasks.md / design.md, and why

1. **Phases 2-4 combined into one commit**, not three. `levels/spines.ts` and
   its test file were authored as one cohesive, previously-nonexistent
   module with no usable intermediate state between "types only" and "the
   whole fold" — splitting the diff by function group (types vs measures vs
   render projections) would have been a file-content split, not a
   work-unit split, per `work-unit-commits`' own "do not commit by file
   type" rule. Recorded here rather than silently deviating from the
   commit plan's literal count.

2. **`spineDemoPaths`'s "tip" length is a design decision I made, not one
   given verbatim in design.md.** Design §3.3 lists the function's
   signature (`spineDemoPaths(cfg, k)`) and calls it "the first `k`
   anchor→tip line segments" but never states what "tip" means
   numerically. I chose the length band's own midpoint,
   `(lenMin + lenMax) / 2`, as a plausible admissible spine — neither the
   shortest nor the longest. This is an implementation decision within an
   underspecified contract, not a resolution of one of §9's five open
   author questions (none of which concern the demo).

3. **Found and resolved a real contradiction in design.md §2 D3 / §11.1
   item 5** (full reasoning in the `demoPlays` doc comment,
   `LevelPlay.tsx`, and in `buildLevel.test.ts`'s own comment block above
   the "half 2" describe): design.md states `demoPlays`'s formula as
   UNCHANGED from the old `playDemo` (`!!level.demo && guide === 'full'`)
   AND separately requires `demoPlays(level, 'none') === true` for a
   routeless `spines` level with `demo: true`. Both cannot hold — every
   hedgehog config carries `showGuide: false` (design.md §8's own literal
   table), so `guideLevelFor` can only ever return `'none'` for it, and the
   unchanged formula would leave hedgehog1's demo permanently unreachable
   despite the rename, which defeats the entire stated purpose of "the
   second, unnamed blocker" repair. **Resolution taken**: a `spines` level
   bypasses the guide-band gate entirely (`!!level.demo`, unconditional on
   `guide`) — it authors no guide ladder to withdraw from in the first
   place, so gating on a `'full'` band it can never reach is not "the band
   rule," it is a vacuous permanent lock. Every other level, including
   every existing `kind: 'free'` level (none of which declares `demo`),
   keeps the exact unchanged formula, so the whole-catalog invariant design
   also states (`demoPlays(l,g) === (!!l.demo && g==='full')` for every `l`
   in the CURRENT catalog) holds for every level this change does not
   touch. Both demo-repair halves were confirmed RED against the
   pre-Phase-5 source (via `git stash` of the source files only, keeping
   the new tests) and confirmed GREEN after restoring, per tasks.md
   5.4/5.6.

4. **The Phase 11 six-RED-confirmations are NOT yet executed** (they are
   Phase 11, out of this batch's scope) — EXCEPT the two demo-repair halves
   (item 3 above), which tasks.md itself schedules inline during Phase 5,
   and which I executed and verified as described.

### What Phase 9 (the next batch) needs to know

- `levels/types.ts`'s `levelStart`/`buildLevelTarget`'s existing
  `"every shipped level's target.start is byte-identical..."` test in
  `buildLevel.test.ts` already has an `else if (level.spines)` branch ready
  for when `hedgehog1..4` land in `LEVELS` — no further edit needed there.
- `demoPlays`'s whole-catalog invariant test in `buildLevel.test.ts`
  ("demoPlays(l, g) === (!!l.demo && g === 'full') for every shipped level
  (none of which carries spines)...") explicitly asserts
  `level.spines` is `undefined` for every level in the CURRENT catalog.
  **Once Phase 9 adds `hedgehog1..4`, this assertion will need to change**
  — the invariant no longer holds unconditionally for hedgehog1 (which has
  `demo: true`); Phase 9 (or whichever batch adds the catalog rows) should
  split this test into "levels without spines keep the old formula" /
  "levels with spines keep `!!demo` unconditionally," using the pattern
  already established by the two new `spines`-fixture tests directly above
  it in the same file.
- `HEDGEHOG_SILHOUETTE`, `spineBody`/`spineAnchors`/`spineOrigin`/
  `spineAim`/`spineSettle`/`spineScore`/`spineMarks`/`spineRings`/
  `spineDemoPaths`/`debugSpines`/`seedSpines`, `demoPlays`, and
  `spineDebugCount` are ALL currently orphans outside their own test files
  — every one of them has a real caller now (`buildLevel.ts`,
  `evaluateLevel.ts`, `LevelPlay.tsx`), but NO catalog level authors
  `spines` yet, so the whole feature is unreachable from any real level
  until Phase 9's four rows land. This matches `tasks.md`'s own note
  ("Unit 6... unreachable from any real level until Unit 7"; "Unit 7...
  unreachable from the map until Unit 8") and is expected, not a defect.
- §9's five open author questions are untouched, as required.
- `restartRun`'s pre-existing bare `EMPTY_WAYPOINTS` bug is recorded in a
  code comment (`LevelPlay.tsx`, inside `restartRun`) and left unrepaired,
  per the explicit non-negotiable constraint #8.

### Files touched (Phases 1-8)

- `client/src/detective/assets.ts` — `HEDGEHOG_SILHOUETTE` + `HedgehogSilhouette` type.
- `client/src/detective/assets.test.ts` — new, guards the transcription ray-for-ray.
- `client/src/levels/spines.ts` — new, the whole pure fold module.
- `client/src/levels/spines.test.ts` — new, 41 tests.
- `client/src/levels/types.ts` — `LevelConfig.spines?`, `LevelTarget.demoPaths`.
- `client/src/levels/buildLevel.ts` — `levelStart`'s third source, `demoPaths` at both return sites.
- `client/src/levels/buildLevel.test.ts` — new describe blocks for the third source and both demo-repair halves.
- `client/src/game/evaluateLevel.ts` — the `spineScore` ternary in the free branch.
- `client/src/game/evaluateLevel.test.ts` — a hedgehog-fixture describe block.
- `client/src/canvas/SpineLayer.tsx` — new render layer.
- `client/src/canvas/SpineLayer.test.tsx` — new, 6 tests (stage 1 coincidence proof).
- `client/src/canvas/TraceCanvas.tsx` — `TraceSpineMark`/`TraceSpines` types, `spines?` prop, render slot.
- `client/src/canvas/TraceCanvas.test.tsx` — a spine-layer describe block.
- `client/src/canvas/devMode.ts` — `spineDebugCount`.
- `client/src/canvas/devMode.test.ts` — its RED-then-GREEN tests, plus the collision guard.
- `client/src/screen/LevelPlay.tsx` — `demoPlays`, `initialSpineState`, `spineRef`/`spineState`/`spinePin`, the live/settle folds, both resets, the render prop, the demo-source rename to `demoPaths`.
- `client/src/screen/LevelPlay.test.tsx` — the call-site-count guard and the screen-level debug-flag-reaches-the-prop test.
