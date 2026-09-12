# Delta for Level Engine

## MODIFIED Requirements

### Requirement: Duck Trail Set Precedes trail1

Four trail levels (`duck-trail1..4`) SHALL remain inserted into `LEVELS`
immediately before `trail1`, one clue each (`webfoot`, `breadcrumb`,
`bubble`, `feather`, in that order), with corridor widths strictly
decreasing 100/90/80/70, none carrying a timed obstacle. Their path
generators SHALL now form one undulation family per `docs/13` §2's
four-step progression (proposal decision 1):

| Step | Level | Generator call (`y = 300`, `x0 = 90`, `x1 = 910`) | `taper` |
|---|---|---|---|
| 1 | `duck-trail1` | `wave({ amplitude: 170, cycles: 1 })` | — |
| 2 | `duck-trail2` | `wave({ amplitude: 170, cycles: 2 })` | — |
| 3 | `duck-trail3` | `waveVaried({ cycles: [{ width: 470, amplitude: 155 }, { width: 350, amplitude: 205 }] })` | — |
| 4 | `duck-trail4` | `wave({ amplitude: 170, cycles: 3 })` | `{ from: 1, to: 0.85 }` |

`duck-trail3`'s `rules.mustBeContinuous` MUST be `false`, aligning it with
its three siblings — the reversal that justified `true` is retired along
with `switchback`. `duck-trail3`'s and `duck-trail4`'s title and hint text
MUST describe the wave movement, not the retired shapes: neither MUST
reference a switchback/reversal or a corner-by-corner path. Ids, clue
kinds, `resetOnContact`, `carrier`, the rail on `duck-trail1` only, and
`demo: true` remain untouched.

(Previously: `duck-trail3` used `switchback({ x0: 120, x1: 880, yTop: 140,
yBottom: 480 })` with `mustBeContinuous: true`, justified solely by its
reversal; `duck-trail4` used `squareWave({ x0: 100, mid: 300, amplitude:
170, run: 200, cycles: 3 })` with `taper: { from: 1.15, to: 0.9 }`, guarded
by `cornerClearance`/`armClearance`. Both retired: `docs/13` §4 assigns the
spiral to the snail and the triangular/square shapes to the sheep, and the
four ducks recut as one undulation family instead of borrowing shapes that
belong to other animals.)

#### Scenario: Corridor width strictly decreases across the duck trails

- GIVEN the four duck trail configs in catalog order
- WHEN their `corridorWidth` values are read
- THEN they MUST strictly decrease: 100, 90, 80, 70

#### Scenario: No duck trail carries a timed obstacle

- GIVEN any of the four duck trail configs
- WHEN its hazard/timing fields are inspected
- THEN none MUST configure a timed obstacle

#### Scenario: Each duck step matches its authored generator call

- GIVEN the four duck configs' path generator calls, in catalog order
- WHEN compared against the decision-1 table
- THEN `duck-trail1` and `duck-trail2` MUST call `wave` with
  `amplitude: 170` and `cycles` 1 and 2 respectively; `duck-trail3` MUST
  call `waveVaried` with two cycles of widths 470/350 and amplitudes
  155/205; `duck-trail4` MUST call `wave` with `amplitude: 170`,
  `cycles: 3`, and `taper: { from: 1, to: 0.85 }`

#### Scenario: duck-trail3 drops the reversal continuity requirement

- GIVEN `duck-trail3`'s `rules.mustBeContinuous`
- WHEN read
- THEN it MUST be `false`

#### Scenario: Retired-shape language does not leak into the new copy

- GIVEN `duck-trail3`'s and `duck-trail4`'s `hint` strings
- WHEN scanned for the retired shapes' descriptive language
- THEN `duck-trail3`'s hint MUST NOT contain "vuelta" and `duck-trail4`'s
  hint MUST NOT contain "esquina"

## ADDED Requirements

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
