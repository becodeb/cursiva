# Delta for Level Engine

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
