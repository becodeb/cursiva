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

The `nextView` reducer (`GameScreen.tsx:33`) SHALL gain a deduction view
state, distinct from any catalog level and derived from whether all four
detective trails' clues are filed into `PISTAS`. It MUST become reachable
only once that condition holds, and MUST NOT be represented as a 5th catalog
level (no path, no ink, no corridor to derive from — proposal decision #3).

#### Scenario: Deduction view becomes reachable after the fourth clue

- GIVEN three of four trails' clues filed and the fourth trail just completed
- WHEN `nextView` is evaluated
- THEN it MUST return the deduction view state

#### Scenario: Deduction view stays unreachable with clues missing

- GIVEN fewer than four trails' clues filed
- WHEN `nextView` is evaluated from any trail's completion
- THEN it MUST NOT return the deduction view state

### Requirement: PISTAS Rail Chrome

`LevelPlay` chrome SHALL render the `PISTAS` rail in the DOM beside the
canvas, outside the `0 0 1000 600` viewBox, visible during play (proposal
decision #2). The rail's only copy MUST be the literal word `PISTAS`,
hand-drawn as SVG capitals — no additional text and no font subsystem (D6).

#### Scenario: Rail renders beside the canvas, not inside the viewBox

- GIVEN `LevelPlay` rendered during an active trail
- WHEN the DOM structure is inspected
- THEN the `PISTAS` rail element MUST exist outside the canvas's `<svg>`
  viewBox content and MUST be present alongside the canvas in the chrome

#### Scenario: Rail carries no copy beyond PISTAS

- GIVEN the rendered rail markup
- WHEN its text content is inspected
- THEN the only literal word present MUST be `PISTAS`, with no other prose

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
