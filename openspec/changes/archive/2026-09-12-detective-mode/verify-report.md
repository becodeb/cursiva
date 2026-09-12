```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:69f37290c36f5bcf92735f1d759def50dcf81bf032e6008afa5c5c59dfee0f50
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 12/12
scenarios: 34/34
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:fa4a64d22976f7461dfd65559e35ff220d67b17246f5bd93457d6dd6a8bad4f5
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:e866af2f8ebc982fda2c5558d259e13b7b715c97001cdc5f5878902969e1f864
```

> **Envelope provenance — read this before trusting the numbers above.**
>
> This envelope was added on 2026-09-12, after the fact, to unblock verify
> routing. The original verification of `detective-mode` (the prose report
> below) predates it and was never rewritten; not one word of it was changed.
>
> The envelope's command evidence therefore does **not** describe the tree that
> `detective-mode` originally shipped. `test_command`, `test_exit_code`,
> `test_output_hash`, `build_command`, `build_exit_code` and
> `build_output_hash` were produced by running `npm test` and `npm run build`
> at the repository root on branch `feat/case-registry-and-captions` at commit
> `fab58e2`, which is many commits ahead of the state the prose report
> verified. Those runs observed **57 test files / 1042 tests passing** and a
> clean `tsc --noEmit && vite build`. The prose report below observed **45 test
> files / 791 tests passing** on `feat/detective-s7-roadmap-doc`. The two sets
> of numbers are different measurements of different trees, and the envelope
> claims only the recent one. Nothing here asserts that the historical hashes
> were recovered — they were not, and they are not recoverable from this
> report.
>
> `evidence_revision` is the SHA-256 of the concatenation, in this order, of
> `specs/detective-mode/spec.md`, `specs/level-engine/spec.md`,
> `specs/trace-canvas/spec.md`, `tasks.md`, the captured `npm test` output and
> the captured `npm run build` output.
>
> `requirements: 12/12` counts `### Requirement:` headings across the change's
> three delta specs (4 in `detective-mode`, 7 in `level-engine`, 1 in
> `trace-canvas`); all twelve are traced to code and tests in the report below.
> `scenarios: 34/34` counts `#### Scenario:` headings (10 + 20 + 4). The
> completed count restates the prose report's own claim that every requirement
> and scenario traces to real, falsifiable tests; it is not an independent
> re-derivation. One caveat travels with it: SUGGESTION 2 below records that
> the covering tests for "Finishing a trail lights the lamp and files the clue"
> exercise the wiring rather than a full trace → filed-clue path. That is
> depth of coverage, not an absent test, and the report filed it as a
> suggestion rather than a compliance gap — but a reader auditing scenario
> coverage should start there.
>
> `verdict: pass_with_warnings` mirrors the report's own tally: 0 CRITICAL,
> 3 WARNING, 2 SUGGESTION.

# Verify Report: detective-mode

Verified against `feat/detective-s7-roadmap-doc` (chain tip), worktree clean.
`npm test` → **791 passed, 45 files** (confirmed by re-running). `npm run build`
(`tsc --noEmit && vite build`) → green (confirmed by re-running). No code was
edited during this verification.

## Summary

- **CRITICAL: 0**
- **WARNING: 3**
- **SUGGESTION: 2**

The implementation is sound: the four hard checks named in the assignment
(magnifying glass wiring, five-interior-clue-marks, ink-only rendering, the
five previously-named unfalsifiable assertions) are all genuinely fixed in
the code that HEAD actually ships, and all fixes are backed by tests that can
fail. The findings below are documentation-integrity gaps in
`apply-progress.md`, not defects in the shipped behaviour.

## Traceability: specs → code

### `detective-mode/spec.md` (4 requirements)

1. **Clue Collection State Machine** — `client/src/detective/clues.ts:77-105`
   (`clueMarks`), `:107-140`-ish (`clueTick`, monotone, no side effect on
   re-pass). Tests: `client/src/detective/clues.test.ts:23-31` (mark flips
   once), `:106-…` (no motion field while down), re-pass inertness test
   present in the same file. Traced, passes.
2. **Trail Completion Lamp and Rail Filing** — `client/src/screen/LevelPlay.tsx`
   `shouldFileClue(hasClueTrail, approved)` wired from `onRelease`; tested in
   `LevelPlay.test.tsx` (6.3/6.4 — filing on approval only, refused mid-trace).
   Traced, passes.
3. **Deduction Screen** — `client/src/screen/GameScreen.tsx` (`resolveNextAction`,
   `allEarned`), `client/src/screen/Deduction.tsx` (`pickAnimal`,
   `DeductionState`). Tests: `GameScreen.test.tsx` (8.5/8.6),
   `Deduction.test.tsx` (8.7/8.8/8.9, plus the structural
   solvability/pairwise-distinct tests at `Deduction.test.tsx:33-60`). Traced,
   passes. Confirmed visually: `/tmp/verify-deduccion.png` shows four ink
   silhouettes on one line, rail fully filed, lamp lit, no card styling.
4. **Colour Asset Registry** — `client/src/detective/palette.ts`,
   `client/src/detective/assets.ts` (`CLUE_ART`). Tests:
   `palette.test.ts` (pairwise-distinct, zero-chroma `PRINT`, warm-clay-band
   exclusion, hue-distance from `GOAL_COLOR`/`HAZARD_COLOR`). Traced, passes.
   One gap: `CARRIER_COLOR` is deliberately excluded from the hue-distance
   check (see WARNING 1 below); the design's literal text ("none ... approaches
   GOAL_COLOR, HAZARD_COLOR or CARRIER_COLOR") is not implemented for the third
   term, on a documented, reasoned basis.

### `level-engine/spec.md` (7 requirements)

1. **Triangular and Square Wave Path Generators** — `client/src/levels/paths.ts`
   (`triangularWave`, `squareWave`). Tests: `paths.test.ts` (command alphabet,
   `transformPath` rejection, ≥3 points). Traced, passes.
2. **Square-Wave Corner Constraint** — `cornerClearance`/`armClearance` in
   `paths.ts`. Tests: `paths.test.ts` (pass case `w=70,amplitude=110`; FAILING
   case for the misread peak-to-peak reading, `armClearance` fails as
   required by C5). Traced, passes — this is one of the "assertion that can
   fail" instances done right from the start.
3. **Phase-1 Trail Set and Arc-Length Floor** — `client/src/levels/catalog.ts`
   (`PHASE_1`, `LEGACY_PHASE_1`). Tests: `catalog.test.ts` — id
   presence/absence, `LEGACY_PHASE_1` preservation, arc-length sum (10,102 vs
   8,006, ~1.26x margin), coil radial-gap (measured from raw `spiral()`
   output, not a bounding-box approximation — apply-progress documents the
   earlier bounding-box attempt was wrong and was caught before landing).
   Traced, passes. Confirmed all three forced-mutation checks
   (arc-length shrink, run shrink, radial-gap) documented in apply-progress
   S6, and confirmed no leftover mutation in the diff.
4. **Deduction View Reachable from nextView** — `GameScreen.tsx`
   (`nextView`'s `deduce` case, `resolveNextAction`). Tests:
   `GameScreen.test.tsx`. Traced, passes.
5. **PISTAS Rail Chrome** — `client/src/detective/PistasRail.tsx`. Tests:
   `PistasRail.test.tsx` (rail outside the canvas `<svg>`, text content is
   only `PISTAS`). Traced, passes. Confirmed visually in all screenshots.
6. **Level Progress Copy-Forward Migration** — `client/src/game/migratePhase1.ts`.
   Tests: `migratePhase1.test.ts` (11 tests) PLUS the real end-to-end test
   against the REAL catalog and REAL `LevelProgressStore` in
   `catalog.test.ts:576-643` (`isUnlocked('trail3')` false before, true after,
   on the same store; orphan `f1-ondas` untouched). This is a genuine,
   falsifiable assertion — confirmed via apply-progress's documented
   "temporarily broke `seedFrom`, watched exactly one assertion turn red"
   check. Traced, passes. **D3 verified.**
7. **f1-libre Retheme Carries No Clue** — `catalog.ts` (`f1-libre` entry has no
   `clue` field). Tests: `catalog.test.ts` structural assertion
   (`f1-libre.clue` is `undefined`). Traced, passes. Confirmed visually:
   `f1-libre` still renders full chrome (title/hint/buttons), no `PISTAS`
   rail, per S6's own screenshot record.

### `trace-canvas/spec.md` (1 requirement)

1. **Clue Layer Rendering** — `client/src/canvas/TraceCanvas.tsx` (`clues` prop,
   `<g>` before the ink `<path>`, `TraceCarrierArt`). Tests:
   `TraceCanvas.test.tsx` (drained-grey, earned-colour, earned-footprint-black,
   z-order under ink, no `url(#`). Traced, passes.
   **Gap, not a defect**: the spec has no requirement/scenario for `inkOnly`
   (the fix that stops `GOAL_COLOR`/`HAZARD_COLOR`/the green start dot from
   rendering on a detective trail). The behaviour exists and is tested
   (`TraceCanvas.test.tsx:489-515`, bidirectional), but it was never written
   into `trace-canvas/spec.md` as a requirement — see WARNING 2.

## The four hard checks

### 1. Magnifying glass wiring — CONFIRMED, genuinely fixed

`LevelPlay.tsx:933` passes
`carrierArt={isDetectiveTrail ? { ...GLASS_ART, color: INK_COLOR } : undefined}`.
All four trails in `catalog.ts` carry `carrier: true` (lines 216, 241, 265,
290). The old test that asserted the gap ("carries no fingertip carrier yet")
no longer exists anywhere in the tree (`rg` across all `.test.*` files finds
nothing); it is replaced by `LevelPlay.test.tsx`'s "passes the glass art,
drawn in ink, on a detective trail", which reads a captured `carrierArt` prop
off a real component probe and asserts its `d`/`color` — this fails if the
wiring regresses. Confirmed visually: `/tmp/verify-trail1.png` and
`/tmp/verify-trail4.png` both show the ink magnifying glass at the route
start.

**Stale comment, not a functional bug**: `catalog.ts:166-171`'s block comment
still says *"`carrierArt` is NOT wired from `LevelPlay.tsx` yet... every trail
below keeps `carrier: false`"*, directly above code that sets `carrier: true`
on all four trails a few lines later. See WARNING 3.

### 2. Five interior clue marks — CONFIRMED, genuinely fixed

`client/src/detective/clues.ts:88-105`: `denom = count + 1`,
`arc = ((i + 1) / denom) * length` — genuinely interior, matches the commit
message's stated fix. `clues.test.ts:38-45` explicitly asserts no mark lands
at either endpoint across `count` in `[1,2,3,5,8]`. Confirmed visually on
both `trail1` (sine) and `trail4` (square wave): five grey drained marks
visible, none under the start (magnifying glass) or goal (diamond) markers.

**Stale doc comment, not a functional bug**: the docblock above the function
(`clues.ts:55`) still reads *"at fractions `i / (count − 1)`"*, describing the
OLD (buggy) formula, while the code three lines into the function body
correctly documents and implements `(i + 1) / (count + 1)`. See WARNING 3.
Also, `clues.test.ts:27`'s test title ("places count marks uniformly in arc
length, **first at the start and last at the end**") now describes the
opposite of what the test's own body asserts (interior spacing) — see
SUGGESTION 1.

### 3. Ink-only rendering on detective trails — CONFIRMED, genuinely fixed

`TraceCanvas.tsx` gained an `inkOnly` prop gating `GOAL_COLOR` (`:871,878`),
the start dot's `#22c55e` (`:891-893`), the direction arrow's `#22c55e`
(`:910`), and `HAZARD_COLOR` (`:1007-1009`) — all fall back to `INK_COLOR`
when `inkOnly` is set. `LevelPlay.tsx:934` passes `inkOnly={isDetectiveTrail}`.
The carrier itself is unconditionally ink when `carrierArt` is supplied
(`:1027-1034`, unrelated to the `inkOnly` flag but correct by construction —
detective trails always pass `carrierArt`). `TraceCanvas.test.tsx:489-515`
asserts BOTH directions: none of the three shipped hex values render with
`inkOnly`, and the immediately following test confirms they DO render
without it — a genuinely bidirectional, falsifiable pair. Confirmed visually:
no orange goal marker, no purple hazard, no green start/arrow anywhere in
`/tmp/verify-trail1.png` (which exercises the goal marker, the hazard, the
start point and the direction arrow all at once).

### 4. The five "assertions that cannot fail" — all five now genuinely fail-capable

1. **Hue threshold calibrated to admit the value it would have rejected** —
   FIXED. `palette.test.ts:64`: `HUE_COLLISION_DEG = 15`, chosen against the
   tightest GENUINE pair (`KERNEL` vs `GOAL_COLOR`, 16.9°) with margin, not
   tuned to the value it needed to admit. `CARRIER_COLOR` is explicitly
   EXCLUDED from this hue check (not folded in at a wider threshold), with a
   comment explaining the exclusion is covered structurally elsewhere
   (`TraceCanvas.test.tsx`'s `carrierArt` suite, which requires `#5f8a86`
   absent when an override is supplied). This is an honest, reasoned
   narrowing of scope rather than a padded threshold — see WARNING 1 for the
   one residual gap this creates.
2. **Chrome check on raw HTML punishing an `aria-label`** — FIXED.
   `LevelPlay.test.tsx:108-133`'s "control buttons carry no text label" test
   now asserts against `textOf(html)` (a stripped-text helper), not raw HTML,
   with an inline comment explaining exactly why: aria-label must survive.
   Confirmed every icon-only control (`BackIcon`/`RetryIcon`/`ReplayIcon`/
   `ContinueIcon`, `Deduction.tsx`'s animal buttons) carries a Spanish
   `aria-label` (`LevelPlay.tsx:833,997,1006,1025`; `Deduction.tsx:140`).
3. **`border:` check defeated by regex backtracking** — FIXED.
   `Deduction.test.tsx:160-161`:
   `/border\s*:(?!\s*none\b)/` puts the whitespace INSIDE the negative
   lookahead, so `border: none` correctly does not match and any other
   `border:` declaration does.
4. **Card-styling check scoped to the whole document** — FIXED.
   `Deduction.test.tsx:152-170` asserts against the screen's own
   `DEDUCTION_CSS` string constant, not the full rendered document, so it
   cannot be satisfied by styling that belongs to a sibling shell.
5. **Carrier test asserting the gap** — FIXED, see check 1 above.

## Deviations reviewed (already flagged by the orchestrator) — confirmed, not re-litigated

- **`Deduction.tsx` lives in `screen/`, not `detective/`.** Confirmed:
  `client/src/screen/Deduction.tsx` is the real, only copy; there is no
  `client/src/detective/Deduction.tsx` anywhere in the tree. It correctly
  imports `LAYOUT_CSS` from `LevelPlay.tsx` rather than duplicating shell CSS.
  See WARNING 3 for the stale narrative this leaves in `apply-progress.md`.
- **S3 task 7.3 deferred to S6, completed there.** Confirmed: all four trails
  set `demo: true` in `catalog.ts` (`:203,225,250,299`-ish), task marked `[x]`
  in `tasks.md` with the deferral noted inline.
- **`LEGACY_PHASE_1` exported and deliberately unwired.** Confirmed:
  `catalog.ts` exports it, physically separated by a comment block from
  `PHASE_1`, and it is not spread into `LEVELS`.
- **Five test files outside S6's nominal scope had lookup-source-only
  fixes.** Spot-checked `evaluateLevel.test.ts`'s diff in commit `c72ba66`:
  only the lookup helper (`getLevel` → `LEGACY_PHASE_1`) changed; no
  assertion or fixture value differs from before. Consistent with
  apply-progress's own claim for all five files.

## Findings

### WARNING 1 — `CARRIER_COLOR` is excluded from the palette's hue-approach check, not tested against it at all

`design.md`'s palette rules state the earned colours must not "equal or
approach `GOAL_COLOR`, `HAZARD_COLOR` or `CARRIER_COLOR`."
`palette.test.ts:53-63` implements the hue-distance check for only the first
two, explicitly excluding `CARRIER_COLOR` with the stated reasoning that
`CARRIER_COLOR` never renders in this mode because every detective trail
supplies `carrierArt`. That reasoning is correct **today** (confirmed:
`catalog.ts` has no detective-trail entry without `carrier: true`, and
`LevelPlay.tsx` always supplies `carrierArt` when `isDetectiveTrail`), but it
is an invariant enforced by two independent call sites (`catalog.ts` +
`LevelPlay.tsx`), not by a single guarded seam — nothing stops a future trail
config from setting `carrier: true` without checking whether `carrierArt` is
still conditionally supplied, or a future non-detective-flagged level from
reusing `PLUME`. If that ever happens, `CARRIER_COLOR` (`#5f8a86`) and
`PLUME` (`#2f6b5c`) sit only 9.4° apart in hue — well inside the 15°
threshold used everywhere else — and nothing in the test suite would catch
the collision. Not blocking; the design's own text already flags this
closeness as the reason the `carrierArt` override exists. Recommend either a
narrow structural test (assert every entry in `PHASE_1` with `carrier: true`
also implies detective-trail wiring) or accept the residual risk explicitly
in the design doc rather than leaving it implicit in a test comment.

### WARNING 2 — `inkOnly` has no traced spec requirement

The `inkOnly` prop and its four gated colour sites (`GOAL_COLOR`, the start
dot, the direction arrow, `HAZARD_COLOR`) are real, tested, and confirmed
working — but `trace-canvas/spec.md` names only one requirement ("Clue Layer
Rendering") and its four scenarios are all about the `clues` prop, not
`inkOnly`. Design.md principle 1 ("colour only ever means *earned*") implies
this behaviour but no requirement/scenario formalizes it. This is a real
capability shipped with real test coverage but zero spec traceability — a gap
in the spec artifact, not in the code. Recommend adding an `inkOnly`
requirement to `trace-canvas/spec.md` (or `detective-mode/spec.md`) before
archive, so a future change has something written to check itself against.

### WARNING 3 — `apply-progress.md` and inline comments are stale relative to the code HEAD actually ships

Three separate staleness issues, none of which affect runtime behaviour:

1. `apply-progress.md`'s S4 entry describes `Deduction.tsx` as deliberately
   placed at `client/src/detective/Deduction.tsx`, with several paragraphs of
   reasoning for that placement. The actual commit that shipped S4
   (`21485be`) created the file at `client/src/screen/Deduction.tsx` from the
   start — `git show 21485be --stat` shows no `detective/Deduction.tsx` ever
   existed. The progress doc's own diff (same commit) contradicts its own
   commit's file list. The current location is correct per `design.md`; the
   documentation narrative is simply wrong about what shipped.
2. `apply-progress.md`'s S6 entry states "All five screenshots match the
   design's intent; nothing looked wrong" and records no defects found. The
   actual S6 commit (`c72ba66`)'s own commit message documents three real
   defects the same screenshot pass caught and fixed (missing carrier,
   endpoint clue marks, colour bleed) — this is the opposite finding from
   what apply-progress.md records for the same slice. `apply-progress.md` was
   never updated after the fixes landed.
3. `apply-progress.md` has no S7 entry at all (the roadmap-doc slice and the
   final cross-cutting-verification closure both happened as separate commits
   — `7c3d484`, `7aa312b` — neither touched `apply-progress.md`).
4. `catalog.ts:166-171`'s block comment and `clues.ts:55`'s docblock (detailed
   under checks 1 and 2 above) both describe the pre-fix state of the code
   they sit directly above.

None of this is a functional defect — `npm test`/`npm run build` are green
and every behavioural claim I could check against the code and screenshots
held. But an archived change whose own progress artifact contradicts its own
final commits, and whose inline comments describe bugs that were already
fixed three lines below, is a real maintainability hazard for whoever reads
this change next without re-deriving the git history the way this
verification pass did. Recommend a short pass updating `apply-progress.md`'s
S4/S6 sections and the two stale comments before or during archive.

### SUGGESTION 1 — misleading test title in `clues.test.ts`

`clues.test.ts:27`: `'places count marks uniformly in arc length, first at
the start and last at the end'` — the test body (lines 28-35) asserts
`(i+1)/(count+1)` interior spacing, the opposite of what the title says. Low
severity (the assertions themselves are correct and the very next test
explicitly re-asserts no-endpoint placement), but a reader skimming test
names would form the wrong belief about the current formula.

### SUGGESTION 2 — `LevelPlay.test.tsx`'s SSR-probe wiring tests stop short of proving a full trace → filed-clue path

Documented candidly by the S3 apply-progress entry itself: this repo's
node-only `renderToString` harness cannot re-render after a state dispatch,
so 6.3/6.4 are proven by decomposition (a pure `shouldFileClue` function plus
a captured-closure invocation) rather than a literal "trace it, finish it,
observe the rail" test. This is a pre-existing, already-accepted constraint
of the codebase (the same one `canvas/multiStroke.test.ts` documents), not
introduced by this change, and the decomposition is sound. Flagging only
because it is the one place in the traced requirements where "finishing a
trail lights the lamp and files the clue" is asserted about the DECISION
function and the WIRING separately, never together in one assertion.

## Screenshots taken during this verification

- `/tmp/verify-trail1.png` — sine trail: magnifying glass at start, 5
  interior grey clue marks, ink-only goal/hazard/direction-arrow/start,
  `PISTAS` rail beside the canvas.
- `/tmp/verify-trail4.png` — square-wave trail: sharp, non-merging elbows,
  magnifying glass, 5 interior clue marks.
- `/tmp/verify-deduccion.png` — deduction view: four ink animal silhouettes on
  one line, no cards/borders/shadows, rail fully filed with all four earned
  colours, lamp lit.

## Success Criteria (proposal.md) — resolved item by item

- [x] Four trails plus the deduction screen are reachable from the map; all
      four clues file into `PISTAS`. — Confirmed via code + screenshots.
- [x] Total trail arc length ≥ the six removed levels, asserted in a test. —
      10,102 vs 8,006, `catalog.test.ts`.
- [x] Square and triangular corner constraints asserted against
      `corridorWidth`. — `paths.test.ts`, including the required failing case.
- [x] Clue reducer unit-tested with no DOM; clue layer and rail asserted via
      `renderToString`. — Confirmed.
- [x] An existing `cursiva.levels.v1` payload from mid-phase-1 loads with no
      loss and no locked dead end. — `catalog.test.ts:576-643`, real store,
      real catalog, before/after `isUnlocked` assertion that can fail.
- [x] `npm test` and `npm run build` green; no new `url(#…)` reference
      introduced. — Confirmed by direct re-run and `rg` sweep.

## Result Contract

- **status**: done
- **executive_summary**: 0 CRITICAL, 3 WARNING (all documentation/comment
  staleness, no functional defect), 2 SUGGESTION — every spec requirement and
  every named hard check traces to real, falsifiable code and tests, and the
  five previously-unfalsifiable assertions the assignment named are now all
  genuinely fail-capable.
- **artifacts**: `openspec/changes/detective-mode/verify-report.md`
- **next_recommended**: sdd-archive (after an optional, non-blocking pass to
  reconcile `apply-progress.md`'s S4/S6 narrative and the two stale inline
  comments named in WARNING 3 — none of this blocks archive, since the code
  and tests are already correct; it is a readability debt, not a correctness
  gap)
- **risks**: none blocking. The one residual runtime risk (WARNING 1,
  `CARRIER_COLOR`/`PLUME` proximity if a future trail ever ships
  `carrier: true` without `carrierArt`) is pre-empted today by both call
  sites agreeing, but is not structurally enforced.
- **skill_resolution**: none (Engram MCP was down for this task per explicit
  instruction; this report was written directly to the OpenSpec change
  directory instead of persisted via `mem_save`)

## Key Learnings

1. Commit `c72ba66` both landed the four themed trails and fixed three defects a headless screenshot pass caught that 786 green tests had missed.
2. The magnifying glass carrier, the five interior clue marks, and ink-only rendering on detective trails are all confirmed working by direct visual inspection of `/tmp/verify-trail1.png` and `/tmp/verify-trail4.png`.
3. All five previously named unfalsifiable test assertions in this change are now genuinely capable of failing, verified by reading each fixed implementation directly.
4. `openspec/changes/detective-mode/apply-progress.md`'s S4 and S6 sections describe file placements and screenshot outcomes that contradict what the corresponding git commits actually shipped.
5. The mid-campaign no-demotion guarantee (D3) is proven end to end in `client/src/levels/catalog.test.ts` against the real catalog and the real `LevelProgressStore`, not only against synthetic fixtures.
