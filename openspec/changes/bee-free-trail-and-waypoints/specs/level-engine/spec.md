# Delta for Level Engine

## ADDED Requirements

### Requirement: Optional Waypoints Field on LevelConfig Gates the Free Branch's Scoring Path, Preserving revealScore as the Bit-Identical Fallback

`LevelConfig` SHALL gain an optional `waypoints?: WaypointConfig` field
(`free-trail-waypoints` capability) — additive and absent on every level
that predates it, the same convention `goalArt`, `vertexArt`, `reveal`, and
`arrange` already established. `evaluateLevel.ts`'s `kind === 'free'` branch
SHALL grow exactly one conditional: when `config.waypoints` is present,
accuracy SHALL be computed by `waypointScore`; when absent, accuracy MUST
remain `revealScore`'s existing computation, bit-identical to before this
change, on every existing `kind: 'free'` level.

#### Scenario: A pre-existing free level scores identically to before this change

- GIVEN any `kind: 'free'` level authored before this change and a fixed
  stroke set
- WHEN its accuracy is computed before and after this change
- THEN the two values MUST be identical, byte for byte

#### Scenario: A bee level's accuracy is computed by waypointScore

- GIVEN a bee level's config and a stroke set
- WHEN `evaluateLevel` computes accuracy
- THEN it MUST equal `waypointScore`'s result, not `revealScore`'s

#### Scenario: kind stays free, no third LevelKind value is introduced

- GIVEN `bee1..4`
- WHEN their `kind` is read
- THEN it MUST equal `'free'` for all four, and `LevelKind` MUST remain a
  two-value type

### Requirement: LevelConfig.carrierArt and an Authored Start Repair Carrier Visibility on a Routeless Level

`LevelConfig` SHALL gain an optional `carrierArt?: ArtImage` field.
`LevelPlay`'s `startMarker` (`:1186`, currently `target.polyline[0]`) MUST
fall back to `config.waypoints.start` when `target.polyline` is empty, so a
`carrier: true` + `kind: 'free'` level that declares `waypoints` renders its
carrier at that authored point instead of rendering no carrier at all — the
defect this proposal names as certain-today. The carrier `<image>`'s art
(`:1511`, currently the hard-wired `inWorld ? CARRIER_LENS_ART : undefined`)
MUST resolve to `level.carrierArt` when the level declares one, falling back
to today's hard-wired expression otherwise.

#### Scenario: A routeless carrier level with an authored start renders a carrier

- GIVEN a `carrier: true`, `kind: 'free'` level whose `waypoints.start` is
  authored
- WHEN `LevelPlay` computes the carrier prop passed to the canvas
- THEN it MUST render a carrier `<image>` at that authored point, not
  `undefined`

#### Scenario: A bee level's carrier renders its own art

- GIVEN a bee level with `carrierArt` set
- WHEN the carrier `<image>` is rendered
- THEN its art MUST equal `level.carrierArt`, not `CARRIER_LENS_ART`

#### Scenario: Existing corridor levels are unaffected

- GIVEN `duck-trail1..4` and `trail1..4`, none of which declares `waypoints`
  or `carrierArt`
- WHEN each is rendered before and after this change
- THEN their carrier rendering MUST be byte-identical

### Requirement: Bee Waypoint Level Set — Four Levels, One Rung Per Step, Radius Strictly Decreasing

Four levels, `bee1..4`, `phase: 1`, SHALL be inserted into `LEVELS`; their
ids are persisted keys and MUST never be removed once shipped. Each carries
a `waypoints` field whose flower count is non-decreasing from `bee1` to
`bee4`, and whose per-waypoint touch radius strictly decreases across the
four levels. `bee1` MUST carry exactly one flower (the author's resolved
decision: a zero-flower `bee1` would not exercise the family's own mechanic
at all). `bee1` alone SHALL set `demo: true`; all four SHALL set
`haptics: true`; none SHALL configure `resetOnContact` or any hazard.

#### Scenario: bee1..4 carry a non-decreasing flower count

- GIVEN `bee1..4` in catalog order
- WHEN each level's flower count is read
- THEN the sequence MUST be non-decreasing across the four

#### Scenario: Touch radius strictly decreases across the four levels

- GIVEN `bee1..4`'s per-waypoint touch radii
- WHEN compared step to step
- THEN each MUST be strictly less than the one before it

#### Scenario: bee1 carries exactly one flower

- GIVEN `bee1`'s `waypoints` field
- WHEN its flower list is read
- THEN it MUST contain exactly one entry

#### Scenario: demo, haptics, and the absence of hazard/resetOnContact hold as specified

- GIVEN all four bee configs
- WHEN `demo`, `haptics`, `resetOnContact`, and any hazard field are read
- THEN `demo` MUST be `true` only on `bee1`, `haptics` MUST be `true` on all
  four, and none MUST configure `resetOnContact` or a hazard

### Requirement: catalog.test.ts's Existing Guards Recognize the Waypoint Family

The `minAccuracy`-by-phase exemption (`catalog.test.ts:251-264`) MUST add a
third exemption for `level.waypoints`, alongside `level.reveal` and
`level.artCorridor`. The `haptics`/`tone` clause (`catalog.test.ts:399-411`)
MUST add `|| !!level.waypoints` to its `haptics` predicate, since a bee
level has neither a corridor nor a `reveal` field but still legitimately
ships `haptics: true`. `EXPECTED_IDS` (`catalog.test.ts:48-97`) MUST include
the four bee ids in play order.

#### Scenario: A bee level is exempted from the flat phase-1 minAccuracy expectation

- GIVEN a bee level and the phase-1 `minAccuracy` guard
- WHEN the guard runs
- THEN the bee level MUST be skipped, the same exemption `reveal` and
  `artCorridor` levels already receive

#### Scenario: A bee level's haptics:true does not fail the tone/haptics guard

- GIVEN a bee level with `haptics: true` and no corridor and no `reveal`
  field
- WHEN the tone/haptics guard runs
- THEN it MUST pass

#### Scenario: EXPECTED_IDS lists the four bee ids in play order

- GIVEN `EXPECTED_IDS`
- WHEN read
- THEN it MUST include `bee1, bee2, bee3, bee4` in that order

### Requirement: Docs §6/§14 Checklist Coverage for the Bee Waypoint Family

Each of the four bee `LevelConfig`s SHALL populate, in terms `docs/13` §6's
per-level checklist can be read off directly: start zone (`waypoints.start`,
where the bee rests and departs immediately with the finger, `docs/14` §10);
expected trajectory (none is authored — continuous from `start`, through
every flower, ending at the hive, IS the mechanic); tolerance (each
waypoint's own touch radius, widest at `bee1`, narrowest at `bee4`); visual
response to contact (the flower's dormant→drawn swap plus `haptics: true`);
error conditions (none punitive — an unlit flower lowers `waypointScore`'s
accuracy, never a separate failure state); restart (the existing
`clearAttempt`, with the latch cleared alongside it); help animation
(`demo: true` on `bee1` only); completion criterion (`waypointScore`: every
flower and the hive reached, gated by `rules.minAccuracy`). The narrative
transition is NOT expressed by any `LevelConfig` field — it is satisfied
instead by `main-screen`'s narrative-entry requirements and `zoo-map`'s
closing-phrase requirement.

#### Scenario: Every bee LevelConfig answers the engine-owned checklist items

- GIVEN the four bee `LevelConfig`s
- WHEN each is inspected
- THEN `waypoints.start`, each waypoint's own radius, `rules.minAccuracy`,
  and `haptics` MUST all be defined as specified, and `demo` MUST be `true`
  only on `bee1`

#### Scenario: The narrative transition is not claimed by any bee LevelConfig

- GIVEN the four bee `LevelConfig`s
- WHEN scanned for any field naming a narrative transition
- THEN none MUST exist
