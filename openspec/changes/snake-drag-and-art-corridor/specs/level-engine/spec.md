# Delta for Level Engine

## ADDED Requirements

### Requirement: Optional Arrange Field on LevelConfig

`LevelConfig` SHALL gain an optional `arrange?: { readonly from: readonly
Point[]; readonly snapRadius: number }` field — additive and absent on
every level that predates it, the same convention `goalArt`, `vertexArt`,
and `reveal` established. `from` is the deterministic scatter point for
each art-corridor piece before it is dragged home; `snapRadius` is how
close a drop must land to a piece's own slot to count. `arrange` names
the sibling ordering phase (`object-arrange` capability) a level gates
tracing behind. A level with no `arrange` field is unaffected by this
field's existence and completes exactly as before this change.

#### Scenario: A pre-existing level carries no arrange field

- GIVEN any level authored before this change
- WHEN its config is inspected
- THEN it MUST carry no `arrange` field, and its completion criterion MUST
  be unaffected

#### Scenario: snake1 carries no arrange field, snake2..4 do

- GIVEN `snake1..4`
- WHEN each config's `arrange` field is read
- THEN it MUST be absent on `snake1` and present on `snake2`, `snake3`,
  `snake4`, each carrying `from` (one scatter point per piece) and a
  `snapRadius`

### Requirement: Optional Art Corridor Field, and the Derived Routes and Placements That Travel Through the Same Layout Translation

`LevelConfig` SHALL gain an optional `artCorridor?: readonly
ArtCorridorPiece[]` field (`art-corridor` capability owns
`ArtCorridorPiece`'s shape and `placeArtCorridor`'s derivation) —
additive and absent on every level that predates it. `LevelTarget` SHALL
gain `routes: readonly RouteSegment[]` (`routes[0]` IS `polyline`/
`length` — the SAME objects, never copies) and an optional `artCorridor?:
readonly ArtCorridorPlacement[]`. Both MUST be derived AFTER
`layOutPaths`'s centring translation, through the SAME translation the
scored `paths` receive, so the picture, the routes, and the scored
geometry can never disagree about where the level sits on the sheet.

#### Scenario: A single-path level's routes[0] is its own polyline and length

- GIVEN any level with one `paths` entry
- WHEN `target.routes[0]` is compared to `target.polyline`/`target.length`
- THEN they MUST be the same objects, not copies

#### Scenario: artCorridor is derived through the same translation as paths

- GIVEN a snake level's `config.artCorridor` and its built `target.paths`
- WHEN `target.artCorridor`'s placements are compared against
  `target.paths`'s centred geometry
- THEN both MUST reflect the identical horizontal translation `tx`
  `layOutPaths` computed for that level

#### Scenario: A level with no artCorridor field derives none

- GIVEN any level authored before this change
- WHEN `target.artCorridor` is read
- THEN it MUST be `undefined`

### Requirement: Snake Levels Satisfy the Phase-1 Span Guard via the Union of Three Centrelines

Each of `snake1..4`'s `paths` array SHALL hold EXACTLY three centrelines —
one per drawn snake body — with `kind: 'path'`, `phase: 1`, and
`mustBeContinuous: false` (three strokes, three pen-lifts).
`catalog.test.ts`'s pre-existing phase-1 span guard ("puts no phase-1
route inside the writing band": `maxY − minY > 300`, `minY < 180`, `maxY >
420`, computed over the union of a level's flattened `paths` points) and
its sibling "keeps every phase-1 route on the paper" guard (every point
inside `[0, 600]`) MUST both continue to hold for all four snake levels,
with the guards' own test code UNEDITED.

#### Scenario: Each snake level's paths array holds exactly three centrelines

- GIVEN `snake1..4`
- WHEN each config's `paths` array length is read
- THEN it MUST equal 3 for all four

#### Scenario: The union of the three centrelines clears the phase-1 span guard

- GIVEN each of `snake1..4`'s three flattened centrelines, unioned
- WHEN `maxY − minY`, `minY`, and `maxY` are measured
- THEN span MUST exceed 300, `minY` MUST be less than 180, and `maxY` MUST
  exceed 420, for all four levels

#### Scenario: Every point of every snake level stays on the paper

- GIVEN each of `snake1..4`'s three flattened centrelines, unioned
- WHEN every point's y-coordinate is measured
- THEN all MUST fall within `[0, 600]`

#### Scenario: The guards' own test file is unedited and stays green

- GIVEN `catalog.test.ts`'s "puts no phase-1 route inside the writing
  band" and "keeps every phase-1 route on the paper" tests, byte-compared
  before and after this change
- WHEN the diff is inspected
- THEN it MUST show no edit to either test, and running them MUST still
  pass

### Requirement: Snake Route Wall-Contact Feedback Covers All Three Centrelines, Not Only the First

Because `buildLevelTarget` derives `polyline`/`length` from `paths[0]`
alone, and the shipped `corridorTick` is called with that single
polyline, a level whose `paths` holds more than one route (every snake
level) MUST NOT have its live wall-contact feedback (tone, dimmed ink,
haptics) computed against `paths[0]` only — doing so would read the
child's finger as permanently off-corridor while tracing the second and
third snake. `screen/corridorTrack.ts` SHALL provide `multiCorridorTick`,
which walks EVERY one of `target.routes` with that route's own carried
track and reports the nearest route's distance, its own advanced track,
and which route is active. A single-route call MUST return the exact
same `{distance, track}` the untouched `corridorTick` itself would
return for that same route — `corridorTick` itself MUST remain
unmodified. The screen MUST call `multiCorridorTick(target.routes, …)`
in place of a direct `corridorTick(target.polyline, …)` call whenever a
level's wall feedback is computed.

#### Scenario: A single-route level's feedback is unchanged

- GIVEN any pre-existing level (one `paths` entry, hence one route)
- WHEN `multiCorridorTick` is called for it
- THEN its returned `distance` and advanced `track` MUST equal what
  `corridorTick` itself returns for the same polyline, track, and point

#### Scenario: The nearest of three disjoint routes is selected and advanced

- GIVEN a snake level's three routes and a point near the second snake's
  body
- WHEN `multiCorridorTick` is called
- THEN it MUST report the second route as nearest, advance only that
  route's own track, and leave the other two routes' tracks unchanged

#### Scenario: A route the finger never visits keeps no banked progress

- GIVEN a snake level where the finger only ever traces the first and
  third snakes
- WHEN the second route's track is inspected after the attempt
- THEN its `maxArc` MUST remain `0`

#### Scenario: corridorTick itself is unmodified

- GIVEN `screen/corridorTrack.ts`'s `corridorTick` function, compared
  before and after this change
- WHEN the diff is inspected
- THEN it MUST show no change

### Requirement: Snake Adventure Occupies a Fixed Catalog Position, With Progression Carried by minAccuracy Past the Tolerance Clamp

`snake1..4` SHALL be appended to `LEVELS` immediately after `night4` and
before `f2-guirnalda`. Across the four, in catalog order:
`corridorWidth` SHALL be strictly decreasing, `minAccuracy` SHALL be
strictly increasing, `demo: true` SHALL be set on `snake1` only, and
`enforceOrder` SHALL be `true` on ALL FOUR — the only rule that requires
every one of the three snakes to be traced, since accuracy alone is
scored as nearest-neighbour distance to the UNION of the three bands and
a single traced snake would otherwise score near the passing threshold
on its own. `resetOnContact` SHALL be `false` on all four.

Because `evaluateLevel`'s tolerance derivation clamps its
`corridorWidth`-driven multiplier to a fixed floor once `corridorWidth`
drops to 56 or below, EVERY one of the four snake corridors (all ≤ 56)
scores at the SAME live tolerance: narrowing `corridorWidth` further
moves only the live wall-contact feedback (tone, dimmed ink, haptics),
never the accuracy score. The progressive narrowing `docs/13` §2 and §6
require is therefore carried by `minAccuracy`'s strict increase, not by
`corridorWidth` alone — a reader who only checked `corridorWidth` would
wrongly conclude the four levels score at different tolerances.

(Previously drafted: `enforceOrder: false` on `snake1` and `true` on
`snake2..4`, and arc length claimed non-decreasing across all four — both
superseded, `design.md` §0 A3 and A7.)

#### Scenario: snake1..4 sit between night4 and f2-guirnalda

- GIVEN `LEVELS` in catalog order
- WHEN the ids between `night4` and `f2-guirnalda` are read
- THEN they MUST equal `snake1, snake2, snake3, snake4`, in that order

#### Scenario: corridorWidth strictly decreases and minAccuracy strictly increases

- GIVEN `snake1..4`'s `corridorWidth` and `rules.minAccuracy`, in catalog
  order
- WHEN compared step to step
- THEN `corridorWidth` MUST strictly decrease and `minAccuracy` MUST
  strictly increase

#### Scenario: enforceOrder is true on all four, demo only on snake1

- GIVEN `snake1..4`
- WHEN `rules.enforceOrder` and `demo` are read on each
- THEN `enforceOrder` MUST be `true` on all four, and `demo` MUST be
  `true` only on `snake1`

#### Scenario: resetOnContact stays off on every one of the four

- GIVEN `snake1..4`
- WHEN `resetOnContact` is read on each
- THEN it MUST equal `false` on all four — a snake is carried, not a wall
  to bounce off

#### Scenario: Every corridor width sits at or below the tolerance clamp's floor

- GIVEN `snake1..4`'s `corridorWidth` values
- WHEN each is compared to the tolerance derivation's clamp threshold (56)
- THEN all four MUST be at or below it, confirming their live scoring
  tolerance is identical and the narrowing is carried by `minAccuracy`

### Requirement: Arc Length Is Non-Decreasing Within Each Orientation Group, Not Across All Four

`snake3` alone is authored at a different scale and a different
orientation (rotated for `docs/13` §2 step 3's "orientación vertical")
than `snake1`, `snake2`, and `snake4`. The three horizontal levels'
summed centreline arc length SHALL be non-decreasing step to step
(`snake1 ≤ snake2 ≤ snake4`). No ordering is required, or asserted,
between `snake3`'s arc length and any other level's — it is the named
orientation outlier, shorter by construction because fitting three
snakes in a vertical orientation on the sheet requires a smaller scale
than fitting them horizontally.

(Previously drafted: arc length non-decreasing across all four levels —
superseded, `design.md` §0 A7: three oblique snakes do not fit the sheet
at any scale that also clears the phase-1 span guard, and the vertical
branch `docs/13` §2 offers only fits at a smaller scale, which shortens
`snake3`'s arc relative to what a same-scale progression would predict.)

#### Scenario: Arc length is non-decreasing across the three horizontal levels

- GIVEN `snake1`, `snake2`, `snake4`'s summed centreline arc lengths
- WHEN compared step to step in that order
- THEN each MUST be greater than or equal to the one before it

#### Scenario: snake3's arc length is not compared to any other level's

- GIVEN `snake3`'s summed arc length and each of the other three levels'
- WHEN the catalog invariant test is inspected
- THEN no assertion MUST order `snake3`'s arc length against any other
  level's

### Requirement: Docs §6/§14 Checklist Coverage for Snake Levels

Each of the four `LevelConfig`s SHALL populate, in terms `docs/13` §6's
and `docs/14` §14's per-level checklist can be read off directly: start
zone (the tail end of the first snake, where the octopus already stands
on any level carrying a backdrop, plus the shipped green start dot),
expected trajectory (the level's own three centrelines, fitted to the
drawn art per the `art-corridor` capability), tolerance (`corridorWidth`
narrowing across the four, with `minAccuracy`'s own strict increase
carrying the narrowing past the tolerance clamp), error conditions
(`resetOnContact: false`), restart (the existing retry path; the
arrangement resets to its deterministic scatter with the attempt), help
animation (`demo` on `snake1` only, demonstrating all three snakes in
seriation order), and completion criterion (all three centrelines traced
within tolerance, order-enforced, gated behind a completed arrangement
on `snake2..4` — the sequencing `guided-trace-mode` specifies). The
narrative transition is NOT expressed by any `LevelConfig` field.

#### Scenario: Every snake LevelConfig answers the engine-owned checklist items

- GIVEN `snake1..4`
- WHEN each is inspected
- THEN `paths` (3 entries), `corridorWidth`, `resetOnContact === false`,
  `rules` (with `enforceOrder === true`), and (on `snake2..4`) `arrange`
  MUST all be defined as specified

#### Scenario: The narrative transition is not claimed by LevelConfig

- GIVEN `snake1..4`
- WHEN scanned for any field naming a narrative transition
- THEN none MUST exist

### Requirement: Pre-Existing Levels, Migrations and Guard Tests Stay Byte-Identical, and No New Migration Is Written

Every level that predates this change (`glass1..4`, `sand1..4`,
`duck-trail1..4`, `sheep-hill1..4`, `llama-peak1..4`, `night1..4`,
`trail1..4`, `f2-guirnalda..colinas`, `f1-libre`, `cases.ts`,
`Deduction.tsx`) MUST render and score byte-identical to `main`. No new
migration is required or written: `snake1..4` appending after `night4`
demotes no id a real consumer reads — `LevelProgressStore.isUnlocked`'s
only surviving consumer is `LevelMap.tsx`'s dev chrome (verified, not
inherited), never the zoo map's own `nextAdventure`/`isFiled` routing,
and there is no successor chain past the catalog's new last id.
`game/migrateEntrance.ts` MUST remain byte-identical. `useTraceInput.ts`,
`evaluateLevel.ts`, `revealGrid.ts`, and `coverage.ts` MUST all remain
byte-identical. `TraceCanvas.test.tsx`'s `url(#)` guard tests MUST stay
unedited and green — the same "delegation, not amendment" precedent
`free-trace-mode`'s `coverageScore` generalization set for `reveal-grid`'s
fold (its widened signature still reproduces `f1-libre`'s prior score
exactly).

#### Scenario: A pre-existing level renders and scores identically

- GIVEN `night4`, `llama-peak4`, and `f1-libre`, played before and after
  this change
- WHEN their render output and score are compared
- THEN both MUST be identical

#### Scenario: migrateEntrance.ts is byte-for-byte unchanged, and no new migration file exists

- GIVEN `game/migrateEntrance.ts` and the set of migration files in the
  repo, compared before and after this change
- WHEN the diff is inspected
- THEN `migrateEntrance.ts` MUST show no change, and no new migration
  file MUST be introduced for the snake insertion

#### Scenario: useTraceInput.ts, evaluateLevel.ts, revealGrid.ts and coverage.ts are unchanged

- GIVEN those four files, compared before and after this change
- WHEN the diff is inspected
- THEN none MUST show a change

#### Scenario: The url(#) guard tests are unedited and green

- GIVEN `TraceCanvas.test.tsx`'s existing `url(#)` guard assertions
- WHEN compared before and after this change and then run
- THEN the test code MUST be unedited and MUST still pass
