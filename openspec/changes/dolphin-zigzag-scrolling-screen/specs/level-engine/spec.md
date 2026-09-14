# Delta for Level Engine

## ADDED Requirements

### Requirement: Optional Camera Field on LevelConfig and viewWidth on LevelTarget

`LevelConfig` SHALL gain an optional `camera?: { viewWidth: number; lead:
number }` field (`scrolling-camera` capability owns the runtime
behaviour it gates) — additive and absent on every level that predates
it, the same convention `goalArt`, `vertexArt`, `reveal`, `arrange`, and
`artCorridor` already established. `LevelTarget.viewBoxWidth` keeps its
existing name and meaning — the WORLD the level is laid out on, per
`layOutPaths`'s existing wide-sheet widening — and gains one sibling,
`viewWidth: number`, the WINDOW the rendered `viewBox` attribute reports.
`viewWidth` equals `viewBoxWidth` unless `config.camera` is present, in
which case it equals the camera's own authored, narrower window width. A
level with no `camera` field MUST derive `viewWidth === viewBoxWidth`.

#### Scenario: A pre-existing level's target keeps viewWidth equal to viewBoxWidth

- GIVEN any level authored before this change
- WHEN `target.viewBoxWidth` and `target.viewWidth` are read
- THEN they MUST be equal

#### Scenario: A camera level's target reports a narrower view than the world

- GIVEN `dolphin3` or `dolphin4`
- WHEN `target.viewBoxWidth` and `target.viewWidth` are read
- THEN `target.viewBoxWidth` MUST exceed `target.viewWidth`

### Requirement: The Existing wave Generator Is Reused, and a Trough-Aware Extrema Sibling Is Added

No new path generator is introduced: the existing `wave` generator
(`paths.ts:327-336`) is reused unchanged to produce every dolphin route,
including the multi-period routes on `dolphin3`/`dolphin4`, across a
world wider than `MIN_VIEWBOX_WIDTH` via `layOutPaths`'s existing
wide-sheet widening. `levels/dolphinExtrema.ts` SHALL export
`routeExtrema`, a pure, DOM-free sibling to `vertexArt.ts`'s
`routeApexes` that returns every turning point of a route — crests AND
troughs, each tagged by side — in route order, without modifying
`routeApexes` or either of its two existing consumers.

#### Scenario: wave's output survives transformPath at every dolphin width

- GIVEN `wave`'s output for each of `dolphin1..4`'s authored spans
- WHEN `transformPath` is applied
- THEN it MUST NOT throw, for all four

#### Scenario: routeExtrema is a superset of routeApexes on the shipped ridge levels

- GIVEN `routeExtrema`'s output filtered to `side === 'crest'`, for each
  of the eight shipped `sheep-hill*`/`llama-peak*` polylines
- WHEN compared to `routeApexes`'s own output for the same polylines
- THEN they MUST be equal

#### Scenario: routeExtrema finds a dolphin route's troughs, not only its crests

- GIVEN a dolphin route's flattened polyline
- WHEN `routeExtrema` is applied
- THEN it MUST return points tagged `'trough'` as well as points tagged
  `'crest'`

#### Scenario: routeApexes and its existing consumers are unaffected

- GIVEN `sheep-hill3` and `llama-peak4`'s built polylines
- WHEN `routeApexes` is applied to each after this change
- THEN it MUST return the same peak counts and positions as before this
  change

### Requirement: Dolphin Level Set — Four Levels, One Rung Per docs/13 §2 Step, Amplitude Guard Satisfied at Full Amplitude

Four levels, `dolphin1..4`, `kind: 'path'`, `phase: 1`, SHALL be inserted
into `LEVELS`; their ids are persisted keys and MUST never be removed
once shipped. `dolphin1` and `dolphin2` MUST declare no `camera` field;
`dolphin3` and `dolphin4` MUST declare one. Across the four, period count
SHALL be non-decreasing and corridor width SHALL be non-increasing, step
to step. Every one of the four MUST clear the pre-existing phase-1 span
guard (`span > 300`, `minY < 180`, `maxY > 420`) with amplitude `A >
150`. `dolphin1` alone SHALL set `demo: true`; none of the four SHALL
configure an obstacle, and `resetOnContact` MUST NOT be `true` on any of
the four.

#### Scenario: Period count rises and corridor width falls monotonically

- GIVEN `dolphin1..4` in catalog order
- WHEN their period counts and corridor widths are read
- THEN period count MUST be non-decreasing and corridor width MUST be
  non-increasing across the four

#### Scenario: Every dolphin level clears the phase-1 amplitude guard

- GIVEN each of `dolphin1..4`'s flattened path points
- WHEN span, `minY`, and `maxY` are measured
- THEN span MUST exceed 300, `minY` MUST be less than 180, and `maxY`
  MUST exceed 420, for all four

#### Scenario: Only dolphin3 and dolphin4 declare a camera

- GIVEN all four dolphin configs
- WHEN each config's `camera` field is read
- THEN it MUST be absent on `dolphin1`/`dolphin2` and present on
  `dolphin3`/`dolphin4`

#### Scenario: demo and the absence of hazard hold as specified

- GIVEN all four dolphin configs
- WHEN `demo`, `resetOnContact`, and any obstacle field are read
- THEN `demo` MUST be `true` only on `dolphin1`, `resetOnContact` MUST
  NOT be `true` on any of the four, and none MUST configure an obstacle

### Requirement: catalog.test.ts's Existing Guards Recognize the Dolphin Family

`EXPECTED_IDS` MUST include the four dolphin ids in play order. The
`minAccuracy`-by-phase and tone/haptics guards MUST treat the dolphin
family the same as every other `kind: 'path'` corridor family already in
the catalog, requiring no new exemption.

#### Scenario: EXPECTED_IDS lists the four dolphin ids in play order

- GIVEN `EXPECTED_IDS`
- WHEN read
- THEN it MUST include `dolphin1, dolphin2, dolphin3, dolphin4` in that
  order

#### Scenario: The dolphin family passes the existing corridor-level guards with no new exemption

- GIVEN the four dolphin configs and the existing `minAccuracy`/tone/
  haptics guards
- WHEN the guards run
- THEN all four MUST pass with no code change to the guards themselves

### Requirement: Docs §6/§14 Checklist Coverage for the Dolphin Family

Each of the four dolphin `LevelConfig`s SHALL populate, in terms
`docs/13` §6's per-level checklist can be read off directly: start zone
(the route's first point), expected trajectory (`paths[0]`), corridor
tolerance (`corridorWidth`), visual response to contact (the shared
wall-contact reset — leaving the corridor already reads as "touching" a
dolphin, per the decorative-placement design), restart (the existing
off-corridor tone/haptics response, since `resetOnContact` is not set),
help animation (`demo: true` on `dolphin1` only), and completion
criterion (`rules`, via `feedback`'s `minAccuracy`). The narrative
transition is NOT expressed by any `LevelConfig` field — it is satisfied
by `main-screen`'s narrative-entry requirements and `zoo-map`'s
closing-phrase requirement.

#### Scenario: Every dolphin LevelConfig answers the engine-owned checklist items

- GIVEN the four dolphin `LevelConfig`s
- WHEN each is inspected
- THEN `paths[0]`, `corridorWidth`, `rules`, and `demo` (true only on
  `dolphin1`) MUST all be defined as specified

#### Scenario: The narrative transition is not claimed by any dolphin LevelConfig

- GIVEN the four dolphin `LevelConfig`s
- WHEN scanned for any field naming a narrative transition
- THEN none MUST exist

---

**Accepted deviation:** this spec exceeds the skill's 650-word cap, the
same deviation this project's other capability specs already record; the
session's delivery strategy is `exception-ok`.
