# Level Engine Specification

## Purpose

The level engine (`client/src/levels/`, `client/src/game/LevelPlay.tsx`,
`client/src/screen/GameScreen.tsx`, `client/src/game/LevelProgressStore.ts`)
shipped in the archived `level-engine-mvp` change (2026-09-09) with no delta
spec at all. Its pre-existing behaviour — the declarative `LevelConfig` →
`LevelTarget` derivation, corridor rendering as clipped maze walls, wall-contact
reset, the fingertip-following carrier, adaptive corridor widening after
repeated failures, positional level unlock, and per-level persistence under
`cursiva.levels.v1` — is documented only in `docs/08_MOTOR_DE_NIVELES.md`, not
specified here.

This file is **not** a complete engine spec. It adds only the requirements
that the `detective-mode` change introduces to the engine: two new path
generators and their corner-merge constraint, the phase-1 catalog swap and its
arc-length floor, the deduction-view state the engine's screen reducer gains,
the `PISTAS` rail chrome the engine's screen renders beside the canvas, and the
progress-store migration the reshaped catalog requires. Backfilling a full
spec for the already-shipped engine is a recorded gap, out of scope for this
change.

## Requirements

### Requirement: Triangular and Square Wave Path Generators

`client/src/levels/paths.ts` SHALL provide a triangular-wave generator and a
square-wave generator, each producing an SVG path `d` string built only from
`M`, `L`, and `C` commands, matching `transformPath`'s accepted command set
(`paths.ts:172-175`). Any other command MUST cause `transformPath` to throw
when applied to their output. Each generator's flattened output MUST contain
at least 3 points.

#### Scenario: Generators emit only supported commands

- GIVEN the triangular-wave generator's output and the square-wave
  generator's output
- WHEN each is scanned for path commands
- THEN only `M`, `L`, and `C` MUST appear

#### Scenario: transformPath rejects an unsupported command

- GIVEN a path string containing a command other than `M`, `L`, or `C`
- WHEN `transformPath` is applied to it
- THEN it MUST throw

#### Scenario: Minimum point count holds

- GIVEN the output of either new generator
- WHEN the flattened point count is measured
- THEN it MUST be at least 3

### Requirement: Square-Wave Corner Constraint

The square-wave generator MUST relate its straight-run length to the level's
`corridorWidth` so that, with the corridor's `strokeLinejoin="round"`, the
rounded elbows of two consecutive 90° corners cannot merge into a single
filled shape (the same failure mode documented for `spiral` at
`paths.ts:361`).

`amplitude` MUST follow the shipped convention: the offset from the
centreline, so extrema land at `y ∓ amplitude` and arm-to-arm gap is
`2·amplitude` (`paths.ts:320`). The two inequalities are therefore
`run >= 2·corridorWidth` and `amplitude >= corridorWidth`.

#### Scenario: Straight run stays wider than the merge threshold

- GIVEN a square-wave trail generated with run length `R` and a level
  `corridorWidth` of `w`
- WHEN the constraint helper is applied
- THEN it MUST assert `R >= 2 * w`, so the readable flat left after both
  round joins consume `(w/2)/tan(45 deg)` each is at least `w`

#### Scenario: Parallel arms keep a visible wall between them

- GIVEN a square-wave trail generated with `amplitude` `A` and a level
  `corridorWidth` of `w`
- WHEN the arm-to-arm gap `2*A` is checked
- THEN `2*A - w` MUST be at least `0.7 * w`, the same wall-to-corridor ratio
  the shipped spiral keeps (about 50 units against a 70 corridor,
  `catalog.ts:329`), which `A >= w` satisfies

#### Scenario: The assertion fails on a merging candidate

- GIVEN `w` of 70 with `amplitude` misread as a peak-to-peak 70 rather than an
  offset
- WHEN the constraint helper is applied
- THEN it MUST fail, because the arm-to-arm wall would be zero and the trail
  would render as one filled block

### Requirement: Phase-1 Trail Set and Arc-Length Floor

The four detective trails (sine/droplets, counter-clockwise coil/corn,
triangular-wave/footprints, square-wave/feathers) SHALL replace the six
unthemed phase-1 corridor configs (`f1-travesia`, `f1-pelotas`, `f1-paseo`,
`f1-pasillo`, `f1-ondas`, `f1-espiral`) in the active `LEVELS` catalog. The
six removed configs MUST remain exported as `LEGACY_PHASE_1`, unwired, so
reverting is a one-line swap. The sum of the four trails' path arc lengths
MUST be at least the sum of the six removed levels' path arc lengths. The
coil trail (trail 2) SHALL reuse the shipped `spiral()` generator
counter-clockwise, with `corridorWidth` no wider than the generator's radial
gap requires to keep its arms visually separated (D2, `catalog.ts:329`'s
70-against-120 relationship).

#### Scenario: Four trails replace the six corridor levels

- GIVEN the active `LEVELS` catalog
- WHEN phase-1 entries are listed
- THEN exactly the four detective trail configs MUST be present and none of
  the six removed ids MUST appear among them

#### Scenario: LEGACY_PHASE_1 preserves the removed configs

- GIVEN the catalog module
- WHEN `LEGACY_PHASE_1` is inspected
- THEN it MUST export all six removed level configs unchanged and unwired
  from the active `LEVELS` array

#### Scenario: Total arc length does not regress

- GIVEN the four trails' path arc lengths summed and the six removed levels'
  path arc lengths summed
- WHEN the two sums are compared
- THEN the four-trail sum MUST be greater than or equal to the six-level sum

#### Scenario: Coil trail's corridor stays narrower than the radial gap

- GIVEN the coil trail's `corridorWidth` and `spiral()`'s radial gap between
  consecutive turns
- WHEN the two are compared
- THEN `corridorWidth` MUST be less than the radial gap so the arms remain
  visually separated

### Requirement: Deduction View Reachable from nextView

The `nextView` reducer (`GameScreen.tsx:33`) MUST NOT route to a deduction
view state under any input; filing a case's fourth clue MUST NOT change what
`nextView` returns for the trail that filed it. The deduction view remains
reachable only through the deep-link routes handled by `initialView`
(`detective-mode` "Deduction Screen"), outside `nextView`. The after-level
decision (`resolveNextAction`) MUST instead resolve to an outcome that exits
the game shell — distinct from any `GameAction` — whenever the finished level
belongs to a zoo sector (`sectorOf(levelId)` is non-null); for a level no
sector owns, it MUST return today's `{type:'next'}` behavior unchanged, and
`nextView`'s own switch stays exhaustive over exactly the states it could
already express.
(Previously: `nextView` gained a deduction view state, distinct from any
catalog level, reachable once all four detective trails' clues were filed;
it MUST NOT be represented as a 5th catalog level.)

#### Scenario: Filing the fourth clue does not route to deduction via nextView

- GIVEN three of four trails' clues filed and the fourth trail just completed
- WHEN `nextView` is evaluated
- THEN it MUST NOT return the deduction view state

#### Scenario: Deduction stays reachable only through the deep link

- GIVEN a case fully filed
- WHEN the child's `nextView`/after-level flow is exercised with no
  `?nivel=deduccion` deep link present
- THEN no deduction view MUST become reachable through that flow

#### Scenario: A sector adventure's completion exits the shell

- GIVEN a finished level id owned by a zoo sector
- WHEN `resolveNextAction` is evaluated
- THEN it MUST return the shell-exit outcome, not a `GameAction`

#### Scenario: A non-sector level keeps today's next behavior

- GIVEN a finished level id owned by no sector
- WHEN `resolveNextAction` is evaluated
- THEN it MUST return `{type:'next', levelId: nextLevelId(finishedLevelId)}`,
  unchanged from before this change

### Requirement: PISTAS Rail Chrome

`LevelPlay` chrome SHALL render the `PISTAS` rail in the DOM beside the
canvas, outside the `0 0 1000 600` viewBox, visible during play on a case
trail (`isCaseTrail(level)` true) only — never for a detective-world level
with no clue (proposal decision #2, D1). The rail's only copy MUST be the
literal word `PISTAS`, hand-drawn as SVG capitals — no additional text and no
font subsystem (D6).
(Previously: gated implicitly on `isDetectiveTrail = !!level.clue`, before
world membership and case membership were distinct concepts.)

#### Scenario: Rail renders beside the canvas on a case trail

- GIVEN `LevelPlay` rendered during an active case trail
- WHEN the DOM structure is inspected
- THEN the `PISTAS` rail element MUST exist outside the canvas's `<svg>`
  viewBox content and MUST be present alongside the canvas in the chrome

#### Scenario: Rail carries no copy beyond PISTAS

- GIVEN the rendered rail markup
- WHEN its text content is inspected
- THEN the only literal word present MUST be `PISTAS`, with no other prose

#### Scenario: A Nivel 3 world-only level renders no rail

- GIVEN a Nivel 3 level with `inDetectiveWorld` true and `isCaseTrail` false
- WHEN `LevelPlay` renders it
- THEN no `PISTAS` rail element MUST be present anywhere in the chrome
### Requirement: Level Progress Copy-Forward Migration

`LevelProgressStore` (`cursiva.levels.v1`, distinct from the per-letter
`ProgressStore`) MUST run a one-time copy-forward migration when a removed
phase-1 level id's stored record exists and its replacement trail id has no
record yet: the removed record's values MUST be copied into the replacement
trail id. The migration MUST NOT delete or mutate the original removed-id
record, and MUST NOT run more than once for the same removed→replacement
pair. `isUnlocked` MUST remain correct after migration: because it is
positional (`LEVELS.findIndex`, then checking `LEVELS[index - 1]`,
`LevelProgressStore.ts:123-129`), a returning child already past
`f1-travesia` MUST NOT be locked out of any trail by the position shift
caused by replacing six levels with four.

#### Scenario: Mid-phase-1 payload loads with no loss

- GIVEN a stored `cursiva.levels.v1` payload with approvals recorded against
  a removed level id (e.g. `f1-paseo`) at a level the child had unlocked
- WHEN a fresh `LevelProgressStore` loads that payload against the new
  four-trail catalog
- THEN the removed id's record MUST still be readable unchanged, and the
  migrated replacement trail id MUST carry forward the same progress values

#### Scenario: No locked dead end for a mid-campaign child

- GIVEN the migrated store from the prior scenario
- WHEN `isUnlocked` is checked for the trail that replaced the child's next
  unplayed level
- THEN it MUST return `true`, not `false`

#### Scenario: Migration does not repeat or destroy the source record

- GIVEN a store that has already migrated a removed id once
- WHEN the store loads again on a later session
- THEN the removed id's original record MUST remain present and unchanged,
  and no second migration write MUST occur for the same pair

#### Scenario: Unrelated ids remain untouched

- GIVEN a payload containing an id with no defined replacement
- WHEN migration runs
- THEN that record MUST be left exactly as stored, per the store's existing
  unknown-id tolerance (`LevelProgressStore.ts:123-129`)

### Requirement: f1-libre Retheme Carries No Clue

`f1-libre`, the app's `kind: 'free'` onboarding level, SHALL be rethemed as
the detective mode's opening beat and MUST remain explicitly clue-free: it
MUST NOT own a clue mark, MUST NOT contribute an entry to the `PISTAS` rail,
and MUST NOT be evaluated by the clue-collection reducer. Its free-draw
coverage mechanic is unchanged by this requirement.

#### Scenario: f1-libre contributes no clue

- GIVEN `f1-libre` played to completion
- WHEN the `PISTAS` rail's collected set is inspected
- THEN it MUST NOT contain any clue attributed to `f1-libre`

#### Scenario: f1-libre is not tracked by the clue reducer

- GIVEN the clue-collection reducer's tracked trail ids
- WHEN `f1-libre`'s id is checked against that set
- THEN it MUST NOT appear

### Requirement: Duck Trail Set Precedes trail1

Four new trail levels (`duck-trail1..4`) SHALL be inserted into `LEVELS` immediately before `trail1`, using generators `wave(170,1)`, `wave(170,2)`, `switchback(140,480)`, `squareWave(170,200,3)` with corridor widths 100, 90, 80, 70 (strictly decreasing) and clues `webfoot`, `breadcrumb`, `bubble`, `feather` respectively. **Corrected after apply:** this requirement first named `wave(140,1)`, `garland(3)` and `squareWave(140,200,3)`. The amplitudes moved to 170 because 140 failed the pre-existing "phase 1 uses the whole blank sheet" guard in `catalog.test.ts`, and `duck-trail3` became a `switchback` because a garland IS the row of U's, which is the signature of the directive's Nivel 3 — spending it on a Nivel 2 case trail flattens that level before it ships, which is proposal D1's ruling applied to the shape instead of to the obstacle. Both corrections are recorded in `apply-progress.md`. None of the four MUST carry a timed obstacle (D1). `duck-trail4` MUST satisfy the existing `cornerClearance` and `armClearance` guards. Level ids are persisted keys; none of the four MUST ever be removed once shipped.

#### Scenario: Corridor width strictly decreases across the duck trails
- GIVEN the four duck trail configs in catalog order
- WHEN their `corridorWidth` values are read
- THEN they MUST strictly decrease: 100, 90, 80, 70

#### Scenario: No duck trail carries a timed obstacle
- GIVEN any of the four duck trail configs
- WHEN its hazard/timing fields are inspected
- THEN none MUST configure a timed obstacle

#### Scenario: duck-trail4 clears the corner and arm guards
- GIVEN `duck-trail4`'s `run=200`, `amplitude=140`, `corridorWidth=70`
- WHEN `cornerClearance` and `armClearance` are applied
- THEN both MUST hold

### Requirement: Duck Case Positional-Unlock Migration

`game/migrateDuckCase.ts`, in `migratePhase1.ts`'s exact three-part shape (declarative table, per-field merge policy, pure function), SHALL seed the four duck trail ids and the duck case's `duck-deduce` pseudo-id when none of them has a record yet, guarded on the condition that used to grant `trail1` its unlock (`f1-libre.approvals >= APPROVALS_TO_UNLOCK`). The migration MUST be pure, copy-forward only, MUST NOT delete or mutate any existing record, and MUST return only the entries it changed.

#### Scenario: A mid-hen-campaign payload loses no unlock
- GIVEN a stored payload with `trail1..trail4` progress and no duck records
- WHEN the migration runs and its returned entries are merged into the store
- THEN `isUnlocked('trail1')` MUST remain `true` after the position shift

#### Scenario: Migration returns only changed entries
- GIVEN a payload where the duck ids already have records
- WHEN the migration runs
- THEN it MUST return an empty set of changes and MUST NOT touch any existing record

#### Scenario: Migration never deletes
- GIVEN any payload
- WHEN the migration's output is inspected
- THEN it MUST contain no instruction or value that removes a record

### Requirement: waveVaried Per-Cycle Amplitude Generator

`paths.ts` SHALL provide `waveVaried`, sibling of `garlandVaried`,
accepting an array of `WaveCycle` entries (`{ width, amplitude }`) in place
of `wave`'s scalar `amplitude`/`cycles`, preserving `wave`'s C1-continuous
alternating-arch construction (`paths.ts:82-83`) and emitting only absolute
`M` and `C` commands — the alphabet `transformPath` accepts
(`paths.ts:172-174`). A uniform `cycles` list, where every entry's `width`
and `amplitude` equal `wave`'s own half-width and amplitude, MUST reproduce
`wave`'s `d` string byte for byte.

#### Scenario: Non-uniform cycles still emit only M/C

- GIVEN a `cycles` array with at least two differing `{width, amplitude}`
  entries
- WHEN `waveVaried`'s output is scanned for path commands
- THEN only `M` and `C` MUST appear

#### Scenario: A uniform cycles list reproduces wave's output exactly

- GIVEN a `cycles` list whose entries all carry the same `width` and
  `amplitude` that a `wave` call with matching `x0`/`x1`/`y`/`cycles` would
  produce
- WHEN both `d` strings are compared
- THEN they MUST be byte-identical

#### Scenario: buildLevel derives valid checkpoints on non-uniform input

- GIVEN `waveVaried`'s output with differing per-cycle amplitude as a
  level's path
- WHEN `buildLevel.ts` derives checkpoints and the ideal band
- THEN both MUST be produced with no gap or overlap at the amplitude
  change between cycles

### Requirement: Duck Undulation Progression Invariant

Every duck trail's route SHALL clear the pre-existing phase-1
writing-band guard — `catalog.test.ts`'s span > 300, `minY` < 180, `maxY`
> 420 (`docs/01:49`, this project's founding pedagogy, unchanged and
still binding by this change) — and the four steps' peak slope
(`4·amplitude / halfWidth`) SHALL increase strictly step to step:
approximately 1.66, 3.32, 4.69, 4.98 for steps 1 through 4, so each step
introduces exactly one new demand over the last (amplitude, repetition,
variation, then narrowing), never a lower one. Step 3's amplitude MUST
vary per cycle (via `waveVaried`), not be one global number. Step 4's
taper (`{ from: 1, to: 0.85 }` against `corridorWidth: 70`) MUST keep its
effective half-width below step 3's fixed `corridorWidth / 2` (40) along
its entire length, so step 4 reads as narrower than step 3 everywhere, not
only at one end.

#### Scenario: Every step clears the phase-1 writing-band guard

- GIVEN each of the four duck trails' flattened path points
- WHEN their vertical span, minimum Y, and maximum Y are measured
- THEN span MUST exceed 300, `minY` MUST be less than 180, and `maxY` MUST
  exceed 420, for all four

#### Scenario: Peak slope rises monotonically across the four steps

- GIVEN the four duck trails' peak slope (`4·amplitude / halfWidth`) at
  each internal join
- WHEN the four values are compared in catalog order
- THEN each MUST be strictly greater than the one before it

#### Scenario: Step 4 stays narrower than step 3 along its whole length

- GIVEN `duck-trail4`'s `corridorWidth` (70) and `taper` (`{from: 1, to:
  0.85}`) evaluated at both ends of its route, and `duck-trail3`'s fixed
  `corridorWidth` (80)
- WHEN the two are compared
- THEN `duck-trail4`'s effective width MUST be less than `duck-trail3`'s
  80 at every point, not only at the tapered end

#### Scenario: Every step stays on the sheet with its channel

- GIVEN each step's vertical extremum offset by half its `corridorWidth`
  (or taper-adjusted half-width at that point)
- WHEN checked against the 0..600 sheet
- THEN none MUST exceed 600 or fall below 0; the tightest case (step 3,
  `505 + 40 = 545` and `95 - 40 = 55`) MUST hold within bounds

### Requirement: Corridor Tolerance Band Stays Inside the Channel on Wave Crests

For every duck route, the ideal band's fixed `±half` tolerance offset,
evaluated at the route's tightest crest, MUST place its folded boundary
points within the drawn channel — inside `[crest_y − corridorWidth/2,
crest_y + corridorWidth/2]` at that crest's x — even where the crest's
local radius of curvature (`w²/(8·amplitude)`) is smaller than the
tolerance band. Unlike a garland's U, a wave crest has no adjacent arm for
a folded point to leak across, so the tolerance cloud staying inside the
stroked channel is the correct invariant to assert, not a U-shaped
non-overlap predicate.

#### Scenario: Folded tolerance points stay inside the stroked channel

- GIVEN `duck-trail2`'s and `duck-trail4`'s tightest crest, each with a
  local radius of curvature smaller than the tolerance band
- WHEN the ideal band's boundary points are computed at that crest
- THEN both MUST fall within `±corridorWidth/2` of the centreline at that
  crest's x, for both trails

### Requirement: Docs/13 §6 Checklist Coverage for Duck Trails

Each of the four duck `LevelConfig`s SHALL populate, in terms `docs/13`
§6's per-level checklist can be read off directly: start zone (the
route's first point, where the carrier and octopus stand), expected
trajectory (`paths[0]`), corridor tolerance (`corridorWidth`, narrowing
via `taper` where declared), visual response to contact and error
conditions (`resetOnContact: true`, the shared wall-contact reset), restart
(the same reset, with no separate control), help animation (`demo: true`),
and completion criterion (`rules`, via `feedback`'s `minAccuracy`/
`minFluency`). The one checklist item the engine does not express — the
narrative transition — is satisfied instead by the `main-screen`
narrative entry before `duck-trail1` and the `zoo-map` closing phrase
after `duck-trail4`, not by any `LevelConfig` field.

#### Scenario: Every duck LevelConfig answers the engine-owned checklist items

- GIVEN the four duck `LevelConfig`s
- WHEN each is inspected
- THEN `paths[0]`, `corridorWidth`, `resetOnContact === true`,
  `demo === true`, `rules`, and `clue` MUST all be defined

#### Scenario: The narrative transition is not claimed by LevelConfig

- GIVEN the four duck `LevelConfig`s
- WHEN scanned for any field naming a narrative transition
- THEN none MUST exist — the transition is asserted instead by
  `main-screen`'s `resolveEnterAction` requirement and `zoo-map`'s closing
  phrase requirement

## ADDED Requirements

### Requirement: Nivel 3 Trail Set Between f2-guirnalda and f2-colinas

Four levels SHALL occupy `LEVELS` between the existing `f2-guirnalda`
(retained id, retheme only) and `f2-colinas`: `f2-guirnalda` itself as
desafío 1, plus three new ids for desafíos 2–4, in that order. None of the
four MUST use an angular-peak path generator, and none but desafío 4 MUST
configure a timed obstacle (D5). The four MUST form a measurable
microprogression — decreasing per-cycle width and/or increasing cycle count
from desafío 1 to desafío 2 — and desafío 3 alone MUST vary width and/or
depth across its own cycles (per-cycle garland variant).

#### Scenario: Four ids sit between the two catalog anchors

- GIVEN `LEVELS` in catalog order
- WHEN the ids between `f2-guirnalda` and `f2-colinas` are read
- THEN exactly three new ids MUST appear, and `f2-guirnalda` MUST immediately
  precede the first of them

#### Scenario: No angular peak leaks into Nivel 3

- GIVEN the four Nivel 3 configs
- WHEN each config's path generator is inspected
- THEN none MUST be an angular-peak generator (e.g. `hills`, `crests`)

#### Scenario: Only desafío 4 carries a timed obstacle

- GIVEN the four Nivel 3 configs
- WHEN each config's hazard/obstacle field is inspected
- THEN desafíos 1–3 MUST configure none, and desafío 4 MUST configure at
  least one

### Requirement: Rhythm Instruction Survives the Wordless Shell

Desafío 1 (`f2-guirnalda`) MUST set `demo: true` and keep a positive
`feedback.metronomeBpm`, so that with its hint text suppressed by the
detective world's wordless shell (`detective-mode` "World Behaviours Gate on
inDetectiveWorld"), the rhythm instruction is still carried by the animated
demonstration and the metronome's beat cue at the start marker.

#### Scenario: Desafío 1 carries a demo and a metronome

- GIVEN `f2-guirnalda`'s config after the retheme
- WHEN `demo` and `feedback.metronomeBpm` are read
- THEN `demo` MUST be `true` and `metronomeBpm` MUST be greater than 0

### Requirement: Per-Cycle Garland Variant

`paths.ts` SHALL provide a garland variant accepting an array of
`{width, depth}` entries, one per cycle, in place of a scalar `cycles`,
preserving `garland`'s rounded-U cubic construction and emitting only
absolute `M`/`C` commands.

#### Scenario: Non-uniform cycles still emit only M/C

- GIVEN a per-cycle array with at least two differing `{width, depth}`
  entries
- WHEN the variant's output is scanned for path commands
- THEN only `M` and `C` MUST appear

#### Scenario: buildLevel derives valid checkpoints on non-uniform input

- GIVEN the per-cycle variant's output as a level's path
- WHEN `buildLevel.ts` derives checkpoints and the ideal band
- THEN both MUST be produced with no gap or overlap at the amplitude change
  between cycles

### Requirement: LevelConfig.goalArt

`LevelConfig` SHALL gain an optional `goalArt?: TraceStandingArt` field. When
present, it MUST determine the level's end-of-route art in place of the case
lamp. `LAMP`, `LAMP_ART`, and `caseState.lampOn` MUST remain unaffected by
this field's presence or absence.

#### Scenario: A level with goalArt uses it at the route's end

- GIVEN a level with `goalArt` set to the medusa art
- WHEN `LevelPlay` computes the value passed as the canvas's `endArt`
- THEN it MUST equal the level's `goalArt`, not the lamp

#### Scenario: A case trail without goalArt keeps the lamp

- GIVEN a case trail with no `goalArt`
- WHEN the same value is computed
- THEN it MUST remain the case lamp, on or off per its trail-end latch

### Requirement: Nivel 3 Positional-Unlock Migration

`game/migrateNivel3.ts`, in `migrateDuckCase.ts`'s shape, SHALL ship before
the four-level insertion and MUST copy `f2-colinas`'s existing unlock state
forward so that inserting the three new ids does not relock `f2-colinas` for
a child who already had it unlocked. The migration MUST be pure, idempotent,
copy-forward only, MUST NOT delete or mutate any existing record, and MUST
return only changed entries.

#### Scenario: An unlocked f2-colinas is not relocked by the insertion

- GIVEN a stored payload with `f2-guirnalda.approvals` at or above the unlock
  threshold and no Nivel 3 desafío 2–4 records
- WHEN the migration runs, its output is merged, and `isUnlocked('f2-colinas')`
  is checked against the new four-level catalog
- THEN it MUST remain `true`

#### Scenario: Migration returns only changed entries and never deletes

- GIVEN a payload where the migration has already run once
- WHEN it runs again
- THEN it MUST return an empty change set and MUST NOT remove or alter any
  existing record

## MODIFIED Requirements

### Requirement: PISTAS Rail Chrome

`LevelPlay` chrome SHALL render the `PISTAS` rail in the DOM beside the
canvas, outside the `0 0 1000 600` viewBox, visible during play on a case
trail (`isCaseTrail(level)` true) only — never for a detective-world level
with no clue (proposal decision #2, D1). The rail's only copy MUST be the
literal word `PISTAS`, hand-drawn as SVG capitals — no additional text and no
font subsystem (D6).
(Previously: gated implicitly on `isDetectiveTrail = !!level.clue`, before
world membership and case membership were distinct concepts.)

#### Scenario: Rail renders beside the canvas on a case trail

- GIVEN `LevelPlay` rendered during an active case trail
- WHEN the DOM structure is inspected
- THEN the `PISTAS` rail element MUST exist outside the canvas's `<svg>`
  viewBox content and MUST be present alongside the canvas in the chrome

#### Scenario: Rail carries no copy beyond PISTAS

- GIVEN the rendered rail markup
- WHEN its text content is inspected
- THEN the only literal word present MUST be `PISTAS`, with no other prose

#### Scenario: A Nivel 3 world-only level renders no rail

- GIVEN a Nivel 3 level with `inDetectiveWorld` true and `isCaseTrail` false
- WHEN `LevelPlay` renders it
- THEN no `PISTAS` rail element MUST be present anywhere in the chrome

## ADDED Requirements

### Requirement: Per-Vertex-Height Ridge Path Generator

`levels/paths.ts` SHALL provide `peakRidge({x0, x1, base, heights})`, a generator
whose route starts and ends on the base line `y = base`, touches `base` at
every valley, and rises to `heights[i]` above `base` at peak `i`. Peaks MUST be
evenly spaced: over `n = heights.length` peaks and width `x1 - x0`, each hill
is `W = (x1-x0)/n` wide, peak `i` sits at `x0 + (i+0.5)*W` with `y = base -
heights[i]` exactly, and valley `i` sits at `x0 + i*W` with `y = base`. The
output SHALL contain only `M` and `L` commands — never `C` — and MUST survive
`transformPath` unchanged. This is the RIDGE sibling of `triangularWave`: a
wave alternates about a centreline, a ridge only ever rises from `base`, which
is what makes a literal "alta - baja" height list drawable under the phase-1
arm guard (`minY < 180` AND `maxY > 420`) that a centreline wave cannot
satisfy for a genuinely short vertex.

#### Scenario: Output contains only M and L

- GIVEN `peakRidge`'s output for any `heights` array
- WHEN the `d` string is scanned for path commands
- THEN only `M` and `L` MUST appear, and `transformPath` applied to it MUST
  NOT throw

#### Scenario: Peaks land exactly at base minus their height

- GIVEN `peakRidge({x0:90, x1:910, base:480, heights:[320,170,320]})`
- WHEN the flattened vertex list is inspected
- THEN the three peak y-coordinates MUST equal `480-320`, `480-170`,
  `480-320` exactly, at their computed x positions

#### Scenario: The route starts and ends on the base line

- GIVEN any `peakRidge` output
- WHEN its first and last points are read
- THEN both MUST have `y === base`

### Requirement: Ridge Corner-Fusion Corridor Limit

`levels/paths.ts` SHALL provide `peakRidgeCorridorLimit({x0, x1, heights})`,
returning the widest corridor a `peakRidge` route can carry before two
rounded joins (`strokeLinejoin="round"`) merge into one filled shape. The
derivation MUST charge each straight run its own two corners' consumption —
`(w/2)/tan(peak-angle/2)` and `(w/2)/tan(valley-angle/2)`, where an END
corner (the route's first or last vertex) contributes zero — never applying
one angle to both ends of a run. When every entry in `heights` is equal, the
result MUST equal `cornerClearance`'s own closed-form inversion
(`r*sqrt(r²+h²)/(r+h)`, `r` the run) exactly. This predicate is defined only
over a ridge's own height list; it MUST NOT be applied to a wave-family
level (e.g. `trail3`'s `triangularWave`), which has no height list to
evaluate it against.

#### Scenario: Uniform heights reduce to cornerClearance's own inversion

- GIVEN a `heights` array where every entry equals `h`, and run `r`
- WHEN `peakRidgeCorridorLimit` is compared to `r*sqrt(r²+h²)/(r+h)`
- THEN the two values MUST be equal within float epsilon

#### Scenario: Hand-computed angles for a non-uniform height list

- GIVEN `heights: [320, 170, 320]` with `r = 136.67`
- WHEN `peakRidgeCorridorLimit` is evaluated
- THEN it MUST equal the value derived by hand from each run's own peak and
  valley half-angles, not the conservative "smaller incident angle" formula

#### Scenario: The limit is tight, not merely sufficient

- GIVEN any authored ridge's `peakRidgeCorridorLimit` value `W*`
- WHEN the same corner-fusion condition is evaluated at `W* + 1`
- THEN it MUST fail

### Requirement: Sheep and Llama Ridge Level Set

Eight levels, `sheep-hill1..4` and `llama-peak1..4`, SHALL be appended to the
END of `PHASE_1` — after `duck-trail4`, immediately before `f2-guirnalda` —
with no positional-unlock migration written. All eight SHALL share: `x0:90,
x1:910, base:480, phase:1, kind:'path', surface:'blank', maze:true,
resetOnContact:true, carrier:false, showGuide:true, letters:[],
rules(1,false,true,0)`, `mustBeContinuous:false`, and no configured
obstacle. `corridorWidth` MUST strictly decrease within each adventure —
sheep 100/90/80/60, llama 90/80/70/60 (step 4 additionally tapered
`{from:1, to:0.85}`). `demo:true` MUST be set on `sheep-hill1` and
`llama-peak1` only; `feedback.rail:true` MUST be set on `sheep-hill1` only.
Because `LevelProgressStore.isUnlocked` is positional, appending moves
`f2-guirnalda`'s dev-only `LevelMap` predecessor from `duck-trail4` to
`sheep-hill4`; this is an accepted, test-mode-only cost, not a defect to
migrate away.

#### Scenario: The eight ids sit between duck-trail4 and f2-guirnalda

- GIVEN `LEVELS` in catalog order
- WHEN the ids between `duck-trail4` and `f2-guirnalda` are read
- THEN exactly the eight sheep/llama ids MUST appear, in
  `sheep-hill1..4, llama-peak1..4` order

#### Scenario: corridorWidth strictly decreases within each adventure

- GIVEN the four sheep configs and the four llama configs, each in catalog
  order
- WHEN their `corridorWidth` values are read
- THEN both sequences MUST strictly decrease

#### Scenario: No obstacle on any of the eight

- GIVEN all eight configs
- WHEN their hazard/obstacle fields are inspected
- THEN none MUST configure one

#### Scenario: demo and rail are scoped to exactly one level each

- GIVEN all eight configs
- WHEN `demo` and `feedback.rail` are read
- THEN `demo` MUST be `true` only for `sheep-hill1` and `llama-peak1`, and
  `feedback.rail` MUST be `true` only for `sheep-hill1`

### Requirement: Sheep vs Llama Height, Slope and Corner Invariants

The eight levels' authored literals SHALL satisfy, restated directly in the
catalog test rather than re-derived from geometry:

| # | Invariant | Frozen values |
|---|---|---|
| I1 | Every sheep peak height < every llama peak height | 320,170 < 360,180 |
| I2 | The steepest sheep leg slope < the steepest llama leg slope | 3.122 < 3.512 |
| I3 | The sharpest sheep corner angle > the sharpest llama corner angle (blunter) | 35.52° > 31.78° |
| I4 | From `sheep-hill3` onward, at least one vertex ≤ 0.55 × that level's own tallest | 170/320 = 0.531 |
| I6 | Llama heights are uniform except `llama-peak2`, which is `[tall, tall/2]` | `[360,180]` |
| I7 | `peakRidgeCorridorLimit ≥ corridorWidth * max(taper.from, 1)` | holds for all eight |

#### Scenario: I1-I4, I6 hold over the frozen literals

- GIVEN the eight levels' authored `heights` and `corridorWidth`
- WHEN each of I1, I2, I3, I4, I6 above is evaluated
- THEN each MUST hold exactly as stated

#### Scenario: I7 holds for every one of the eight authored levels

- GIVEN each level's `heights`, run, and `corridorWidth`/`taper`
- WHEN `peakRidgeCorridorLimit` is compared against `corridorWidth *
  max(taper.from, 1)`
- THEN the limit MUST be greater than or equal to that product, for all
  eight

### Requirement: Vertex Art Field and Placement Selector

`LevelConfig` SHALL gain an optional `vertexArt?: {art: ArtImage; size:
number}` field, additive and absent on every level that predates it — the
same convention `goalArt` established. `levels/vertexArt.ts` SHALL export a
pure, DOM-free `routeApexes(polyline, minRise = 40)`, returning the route's
local y-minima (its peaks, in route order), read off the already-centred
`LevelTarget.polyline`. This selector and field MUST NOT introduce any
`ClueKind`, MUST NOT add a `PISTAS` rail entry, and MUST NOT change
`isCaseTrail`/`inDetectiveWorld` for any level.

#### Scenario: routeApexes finds the right peak count

- GIVEN `sheep-hill3`'s built polyline (3 peaks) and `llama-peak4`'s (4
  peaks)
- WHEN `routeApexes` is applied to each
- THEN it MUST return 3 points for the former and 4 for the latter, each
  within 3 units of its authored apex

#### Scenario: A flat polyline yields no apexes

- GIVEN a polyline with no vertical variation
- WHEN `routeApexes` is applied
- THEN it MUST return `[]`

#### Scenario: vertexArt carries no case membership

- GIVEN any level with `vertexArt` set
- WHEN `isCaseTrail(level)` and `inDetectiveWorld(level)` are evaluated
- THEN neither MUST be affected by the field's presence

### Requirement: Docs §6/§14 Checklist Coverage for Sheep and Llama Levels

Each of the eight `LevelConfig`s SHALL populate, in terms `docs/13` §6's and
`docs/14` §14's per-level checklist can be read off directly: start zone
(the route's first point `(90, 480)`), expected trajectory (`paths[0] =
peakRidge(...)`), tolerance (`corridorWidth`, tapered on step 4 of each
adventure), contact response and error conditions (`feedback.tone`/
`haptics`; leaving the corridor only — no obstacle), restart
(`resetOnContact: true`), help animation (`demo` on step 1 of each
adventure; `feedback.rail` on `sheep-hill1` only), and completion criterion
(`rules(1,false,true,0)`, `mustBeContinuous:false`). The narrative
transition is NOT expressed by any `LevelConfig` field — it is satisfied
instead by `main-screen`'s narrative-entry requirements and `zoo-map`'s
closing-phrase requirement.

#### Scenario: Every sheep/llama LevelConfig answers the engine-owned checklist items

- GIVEN the eight `LevelConfig`s
- WHEN each is inspected
- THEN `paths[0]`, `corridorWidth`, `resetOnContact === true`, `rules`, and
  `mustBeContinuous === false` MUST all be defined as specified

#### Scenario: The narrative transition is not claimed by LevelConfig

- GIVEN the eight `LevelConfig`s
- WHEN scanned for any field naming a narrative transition
- THEN none MUST exist