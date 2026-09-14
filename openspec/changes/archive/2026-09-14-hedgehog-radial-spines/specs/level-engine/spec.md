# Delta for Level Engine

## ADDED Requirements

### Requirement: Optional spines Field on LevelConfig Gates the Free Branch's Scoring Path, Preserving Existing Scoring as a Bit-Identical Fallback

`LevelConfig` SHALL gain an optional `spines?: SpineConfig` field
(`radial-spines` capability), the seventh member of the family `reveal?` /
`arrange?` / `artCorridor?` / `waypoints?` / `carrierArt?` / `camera?` —
additive, legal only on `kind: 'free'`, and absent on every level that
predates it. `evaluateLevel.ts`'s `kind === 'free'` branch SHALL grow
exactly one conditional: when `config.spines` is present, accuracy SHALL be
computed by `spineScore`; when absent, accuracy MUST remain whatever
computation already applied (reveal, waypoints, or plain coverage),
bit-identical to before this change, on every existing `kind: 'free'`
level.

#### Scenario: A pre-existing free level scores identically to before this change

- GIVEN any `kind: 'free'` level authored before this change and a fixed
  stroke set
- WHEN its accuracy is computed before and after this change
- THEN the two values MUST be identical, byte for byte

#### Scenario: A hedgehog level's accuracy is computed by spineScore

- GIVEN a hedgehog level's config and a settled stroke set
- WHEN `evaluateLevel` computes accuracy
- THEN it MUST equal `spineScore`'s result

#### Scenario: kind stays free, no third LevelKind value is introduced

- GIVEN `hedgehog1..4`
- WHEN their `kind` is read
- THEN it MUST equal `'free'` for all four, and `LevelKind` MUST remain a
  two-value type

### Requirement: levelStart Learns spines.origin as a Third Source

`buildLevel.ts`'s `levelStart` (`:66-69`) — its own comment names itself
the one place a future routeless mechanic plugs in its own start — SHALL
learn `config.spines?.origin` as a third source, alongside
`target.polyline[0]` and `config.waypoints?.start`. A level declaring
`spines.origin` MUST resolve its start marker and carrier position to that
authored point.

#### Scenario: A spines level's start resolves to spines.origin

- GIVEN a `kind: 'free'` level whose `spines.origin` is authored
- WHEN `levelStart` resolves the level's start point
- THEN it MUST equal `spines.origin`

#### Scenario: Existing levels using the other two sources are unaffected

- GIVEN a level using `target.polyline[0]` or `config.waypoints?.start`,
  with no `spines` field
- WHEN `levelStart` resolves
- THEN its result MUST be unchanged from before this change

### Requirement: Routeless Demo Segments — a Level That Declares spines Supplies Its Own, and Every Pre-Existing Level's Demo Stays Byte-Identical

`demos` (`LevelPlay.tsx:791-801`, currently `target.paths.map(...)`) MUST
NOT remain empty on a level whose `demo: true` and which declares
`spines`: when both hold, the level's demo segments MUST be sourced from
the spine generator's own anchor→tip line segments (the first k, k either
author-configured or a fixed default), which are already emitted as line
segments by the anchor generator. This is a MANDATORY repair, not an
enhancement — `docs/13` §5 item 2 requires a demo whenever the movement is
new, and a free level's `paths` is always `[]`, so `demo: true` on any
routeless level today buys only a blank pause. Every level authored before
this change — every level whose config carries no `spines` field — MUST
continue to emit exactly the demo segments it emitted before this change,
byte for byte, whether that is zero segments (a routeless level with
`demo: true` and no `spines`) or its existing path-derived segments (a
corridor level).

#### Scenario: A spines level with demo:true emits at least one segment — red against main today

- GIVEN a hedgehog level with `demo: true`
- WHEN its demo segments are computed
- THEN at least one segment MUST be produced, where main today produces
  zero

#### Scenario: The demo segments are the anchor→tip lines the generator already emits

- GIVEN a hedgehog level's demo segments
- WHEN compared to the spine anchor generator's own anchor→tip output for
  the first k anchors
- THEN they MUST match exactly

#### Scenario: Every pre-existing level's demo output is byte-identical after this change

- GIVEN every level authored before this change, with its `demo` field and
  computed demo segments recorded before this change
- WHEN the same levels are evaluated after this change
- THEN each level's computed demo segments MUST be byte-identical to its
  pre-change value, including any routeless level with `demo: true` and no
  `spines`, which MUST still emit zero segments

### Requirement: Four Hedgehog Levels Occupy Fixed Catalog Positions

`hedgehog1..4`, `phase: 1`, `kind: 'free'`, SHALL be inserted into `LEVELS`
immediately after `dolphin4` and before `f2-guirnalda`. Their ids are
persisted keys: none of the four MUST ever be removed once shipped.
`hedgehog4`'s body SHALL be the curled pose (`hedgehog-curled.png`);
`hedgehog1..3` SHALL be the profile pose (`hedgehog-profile.png`).

#### Scenario: The four ids sit between dolphin4 and f2-guirnalda

- GIVEN `LEVELS` in catalog order
- WHEN the ids between `dolphin4` and `f2-guirnalda` are read
- THEN they MUST equal `hedgehog1, hedgehog2, hedgehog3, hedgehog4`, in
  that order

#### Scenario: hedgehog4 alone uses the curled pose

- GIVEN the four hedgehog configs
- WHEN each config's body art reference is read
- THEN `hedgehog1..3` MUST reference the profile art and `hedgehog4` alone
  MUST reference the curled art

### Requirement: Tolerance and Length-Band Progression Across the Four Hedgehog Levels

`baseRadius`, `tolDeg`, and `straightness`'s tolerance direction (a wider
tolerance means a larger `baseRadius`/`tolDeg` and a smaller `straightness`
floor) SHALL be monotonically non-increasing in strictness-widening terms
across `hedgehog1..4` — each tolerance parameter MUST NOT loosen from one
level to the next (`docs/13` §6: *"la tolerancia empieza amplia y se
reduce"*). The chord length band (`lenMin`..`lenMax`) SHALL be STRICTLY
decreasing across `hedgehog2 → hedgehog3 → hedgehog4`, so *"corto"* and
*"pequeño"* are checked claims rather than adjectives. `hedgehog1`
additionally SHALL satisfy the phase-1 amplitude guard's own three numbers
(`span > 300`, `minY < 180`, `maxY > 420`) plus its horizontal clause, by
assertion, even though `kind: 'free'` already exempts it from the guard's
code path — the guard's spirit is honoured deliberately, the way the bee
family honoured it.

#### Scenario: baseRadius, tolDeg, and straightness's tolerance never loosen across the four levels

- GIVEN `hedgehog1..4`'s `baseRadius`, `tolDeg`, and `straightness` values
  in catalog order
- WHEN compared step to step
- THEN `baseRadius` and `tolDeg` MUST be non-increasing, and
  `straightness`'s floor MUST be non-decreasing

#### Scenario: Length bands strictly decrease from hedgehog2 to hedgehog4

- GIVEN `hedgehog2`, `hedgehog3`, and `hedgehog4`'s `[lenMin, lenMax]`
  bands
- WHEN compared in catalog order
- THEN each band MUST be strictly smaller than the one before it

#### Scenario: hedgehog1 clears the phase-1 guard's numbers by assertion

- GIVEN `hedgehog1`'s authored body height and spine length band
- WHEN the guard's three quantities (`span`, `minY`, `maxY`) are computed
  from them
- THEN `span` MUST exceed 300, `minY` MUST be less than 180, and `maxY`
  MUST exceed 420

### Requirement: minAccuracy Rises 70 → 80 → 90 → 100 Across the Four Hedgehog Levels

`hedgehog1..4`'s `rules.minAccuracy` SHALL be `70, 80, 90, 100`
respectively — deliberately not the bee family's flat 100, because with
roughly fourteen anchors, requiring 100 at every step would mean fourteen
perfect strokes as an entry condition, the hard early penalty `docs/13` §6
forbids. `mustBeContinuous: false` and `minFluency: 0` SHALL be set on all
four, so `allowedStrokes = strokes.length` and `extraLifts` is 0 by
construction — a many-stroke family is never punished for lifting.

#### Scenario: minAccuracy rises across the four levels

- GIVEN `hedgehog1..4`'s `rules.minAccuracy`
- WHEN read in catalog order
- THEN they MUST equal `70, 80, 90, 100`

#### Scenario: No hedgehog level punishes lifting

- GIVEN any of the four hedgehog configs
- WHEN `mustBeContinuous` and `minFluency` are read
- THEN `mustBeContinuous` MUST be `false` and `minFluency` MUST be `0`

### Requirement: catalog.test.ts's Existing Guards Recognize the Hedgehog Family

`EXPECTED_IDS` MUST include the four hedgehog ids in catalog order. The
`minAccuracy`-by-phase exemption MUST add a fourth exemption for
`level.spines`, alongside `level.reveal`, `level.artCorridor`, and
`level.waypoints`. The phase-1 amplitude guard's `kind !== 'path'` skip
MUST continue to exempt all four (they are `kind: 'free'`). The free-level
census (17 → 21) MUST count the four hedgehog levels, and the *"no reveal
and no waypoints"* filter MUST also exclude `level.spines`, so `f1-libre`
does not stop being alone in that filtered set. `levelsByPhase(1)` and the
phase-1 detective list MUST include all four.

#### Scenario: EXPECTED_IDS lists the four hedgehog ids in catalog order

- GIVEN `EXPECTED_IDS`
- WHEN read
- THEN it MUST include `hedgehog1, hedgehog2, hedgehog3, hedgehog4` in
  that order

#### Scenario: A hedgehog level is exempted from the flat phase-1 minAccuracy expectation

- GIVEN a hedgehog level and the phase-1 `minAccuracy` guard
- WHEN the guard runs
- THEN the hedgehog level MUST be skipped, the same exemption `reveal`,
  `artCorridor`, and `waypoints` levels already receive

#### Scenario: The free-level census grows from 17 to 21 and f1-libre stays alone in the no-reveal-no-waypoints-no-spines filter

- GIVEN the free-level census filter extended to exclude `level.spines`
- WHEN evaluated against the full catalog
- THEN the count MUST be 21, and the "no reveal, no waypoints, no spines"
  subset MUST contain only `f1-libre`

### Requirement: Docs §6/§14 Checklist Coverage for the Hedgehog Family

Each of the four hedgehog `LevelConfig`s SHALL populate, in terms `docs/13`
§6's per-level checklist can be read off directly: start zone
(`spines.origin`, the single authored point plugged into `levelStart`);
expected trajectory (none authored — replaced by anchor, outward normal,
and length band, the same sentence `reveal` and `waypoints` each earned
their own field with); tolerance (`baseRadius` + `tolDeg` +
`straightness`, widest at level 1, narrowest at level 4); visual response
to contact (the anchor mark's unfilled→filled swap, plus `haptics: true`);
error conditions (none punitive — a rejected stroke fills no anchor, no
hazard, no `resetOnContact`); restart (`clearAttempt`/`resetSurface` and
`restartRun`, both reseeding through `seedSpines`); help animation
(`demo: true`, sourced from the spine generator's own segments);
completion criterion (`spineScore ≥ minAccuracy`, recomputed from the
complete settled stroke list). The narrative transition is NOT expressed by
any `LevelConfig` field — it is satisfied by paso B's reusable
entry/closing components and `zoo-map`'s closing-phrase requirement.

#### Scenario: Every hedgehog LevelConfig answers the engine-owned checklist items

- GIVEN the four hedgehog `LevelConfig`s
- WHEN each is inspected
- THEN `spines.origin`, `baseRadius`/`tolDeg`/`straightness`,
  `rules.minAccuracy`, `haptics`, and `demo` MUST all be defined as
  specified

#### Scenario: The narrative transition is not claimed by any hedgehog LevelConfig

- GIVEN the four hedgehog `LevelConfig`s
- WHEN scanned for any field naming a narrative transition
- THEN none MUST exist

---

**Accepted deviation:** this delta exceeds the skill's 650-word cap, the
same deviation this project's other capability specs already record under
`delivery_strategy: exception-ok`.
