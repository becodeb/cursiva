# Radial Spines Specification

## Purpose

A routeless level scored **per stroke**: the child draws individual loose
straight strokes that leave a hedgehog's silhouette and become its spines,
instead of following a corridor or inventing a continuous trail. Each
settled stroke is tested on its own against a derived anchor on the
silhouette, never folded together with every other stroke into one point
list. This capability owns the pure fold module (`levels/spines.ts`), the
build-time-derived anchor table, the five acceptance measures a stroke must
all pass to fill an anchor, the render/score coincidence proof, the ungated
screenshot-seeding flag, and the reset contract. It does not own the
`LevelConfig` field wiring, `levelStart`'s new source, the demo repair, or
the four catalog levels (`level-engine`), the render layer's own image
contract (`trace-canvas`), or the sector registry (`zoo-map`).

## Requirements

### Requirement: SpineConfig Shape and the Pure Fold Module

`levels/spines.ts` SHALL export `SpineConfig` (an authored `origin: Point`,
the anchor arc span, anchor count, and per-measure tolerances `baseRadius`,
`tolDeg`, `straightness`, `lenMin`/`lenMax`), `SpineState`, `EMPTY_SPINES`,
`spineTick(prev, strokes, cfg)`, `spineScore(strokes, cfg)`,
`spineArt`/`spineRings` render projections, `debugSpines(cfg, k)`, and
`seedSpines(cfg)` — all pure and DOM-free, the convention `levels/
waypoints.ts`'s own header states is mandatory: this repo's test harness is
node with no jsdom and no testing-library, so a decision made only inside a
pointer handler is invisible to every test that can exist.

#### Scenario: Every export runs with no DOM

- GIVEN `spineTick`, `spineScore`, `debugSpines`, and `seedSpines`
- WHEN imported and called directly from a plain node test file
- THEN each MUST execute and return a value with no jsdom, no
  testing-library, and no component render involved

#### Scenario: spineTick returns the same reference when nothing latches

- GIVEN a `spineTick` call whose inputs fill no new anchor
- WHEN the returned value is compared to `prev` by reference
- THEN they MUST be the same object, the same no-op contract
  `revealGrid.ts`'s `revealTick` and `waypoints.ts`'s `waypointTick` already
  hold

### Requirement: Anchors Are Derived From a Build-Time-Measured Silhouette, Never Hand-Authored Coordinates

The anchor generator SHALL compute each anchor `Aᵢ`'s position and outward
normal `n̂ᵢ` from the same measured radius-by-angle table that derives the
body `<image>`'s box — never from independently typed coordinates. For a
fixed `SpineConfig` (arc span, anchor count, centroid, radius table),
calling the generator twice MUST produce byte-identical anchor sets. This
closes paso E's failure class: art drawn at one box, scored geometry at
another.

#### Scenario: The generator is deterministic

- GIVEN the same `SpineConfig` and radius table
- WHEN the anchor generator runs twice
- THEN both anchor sets MUST be identical, including outward normals

#### Scenario: Anchor count and arc span match the authored config

- GIVEN a `SpineConfig` with a declared anchor count `n` and arc span
- WHEN anchors are generated
- THEN exactly `n` anchors MUST be produced, evenly spaced across the
  declared arc

#### Scenario: Rendered body box and scored anchors agree

- GIVEN `hedgehog1..4` rendered via `renderToString`, and the body
  `<image>`'s `x`/`y`/`width`/`height` recovered from the HTML string
- WHEN each level's anchors are recomputed from that exact recovered box
- THEN every anchor MUST lie on the silhouette implied by that box, for all
  four levels and both poses

#### Scenario: A moved body fails the coincidence assertion

- GIVEN the same check with the body `<image>` artificially offset by 40
  units
- WHEN the coincidence assertion is evaluated
- THEN it MUST fail, proving the assertion is sensitive rather than
  vacuously true

### Requirement: Measure 1 — Base Proximity, Nearest-Unfilled Anchor, One Stroke Per Anchor, Deterministic Greedy Assignment

A settled stroke `S = (p₀..pₙ)` MAY only be tested against an anchor `Aᵢ`
when `‖p₀ − Aᵢ‖ ≤ baseRadius`. Among all anchors within `baseRadius` of
`p₀`, the fold SHALL select the nearest one that is not yet filled; an
anchor already filled MUST NOT be reassigned. Strokes SHALL be considered in
settlement order, so a stroke set replayed in the same order always
produces the same assignment.

#### Scenario: A stroke whose base is within radius of an unfilled anchor is assigned to it

- GIVEN a settled stroke whose first point lies within `baseRadius` of
  exactly one unfilled anchor
- WHEN measure 1 is evaluated
- THEN that anchor MUST be the one tested against

#### Scenario: A stroke whose base is outside every anchor's radius fills nothing

- GIVEN a settled stroke whose first point lies farther than `baseRadius`
  from every anchor
- WHEN measure 1 is evaluated
- THEN no anchor MUST be assigned, and the stroke fills nothing — the
  negative case for this measure

#### Scenario: The nearer of two unfilled anchors within radius wins

- GIVEN a stroke base within `baseRadius` of two unfilled anchors at
  different distances
- WHEN measure 1 is evaluated
- THEN the nearer anchor MUST be selected, deterministically

#### Scenario: An already-filled anchor is never reassigned

- GIVEN a stroke base within `baseRadius` of one already-filled anchor and
  one unfilled anchor
- WHEN measure 1 is evaluated
- THEN the unfilled anchor MUST be selected, never the filled one, and if
  none is unfilled the stroke fills nothing

### Requirement: Measure 2 — Outward Direction Within Angular Tolerance

The angle between the stroke's direction `p_end − p₀` and its assigned
anchor's outward normal `n̂ᵢ` (centroid→anchor) MUST be at most `tolDeg` for
the anchor to fill.

#### Scenario: A stroke aimed within tolerance fills its anchor

- GIVEN a stroke whose direction is within `tolDeg` of its assigned
  anchor's outward normal, and which also satisfies measures 1, 3, 4, and 5
- WHEN scored
- THEN the anchor MUST fill

#### Scenario: A stroke aimed inward fails on direction alone

- GIVEN a stroke that otherwise satisfies measures 1, 3, 4, and 5 but whose
  direction exceeds `tolDeg` from the outward normal (e.g. aimed toward the
  centroid)
- WHEN scored
- THEN the anchor MUST NOT fill, even though every other measure passed

### Requirement: Measure 3 — Straightness (Chord-to-Arclength Ratio)

`‖p_end − p₀‖ / arclength(S)` MUST be at least `straightness` for the
anchor to fill — the number that makes *recto* a checked claim rather than
an adjective.

#### Scenario: A straight stroke clears the straightness floor

- GIVEN a stroke whose chord-to-arclength ratio is at or above
  `straightness`, and which also satisfies measures 1, 2, 4, and 5
- WHEN scored
- THEN the anchor MUST fill

#### Scenario: A wobbly stroke fails on straightness alone

- GIVEN a stroke that wanders enough that its chord-to-arclength ratio
  falls below `straightness`, while otherwise satisfying measures 1, 2, 4,
  and 5
- WHEN scored
- THEN the anchor MUST NOT fill

### Requirement: Measure 4 — Chord Length Inside the Authored Band

`lenMin ≤ ‖p_end − p₀‖ ≤ lenMax` MUST hold, measured as the stroke's
chord, never its arclength — so a long wobbly stroke earns nothing on
length alone.

#### Scenario: A chord inside the band fills, alongside the other four measures

- GIVEN a stroke whose chord length falls within `[lenMin, lenMax]`, and
  which also satisfies measures 1, 2, 3, and 5
- WHEN scored
- THEN the anchor MUST fill

#### Scenario: A chord outside the band fails on length alone

- GIVEN a stroke whose chord length falls outside `[lenMin, lenMax]`, while
  otherwise satisfying measures 1, 2, 3, and 5
- WHEN scored
- THEN the anchor MUST NOT fill

### Requirement: Measure 5 — No Sample Crosses the Body Interior

No sample point of `S`, except those within `baseRadius` of its own
assigned anchor, MUST lie inside `r(θ)` of the centroid — the geometric
form of the derived undrawability: chalk over the body fails the 55-luma
law (`trace-canvas` capability), so a stroke that visually crosses the
silhouette MUST NOT be scored as a spine regardless of how well it
satisfies the other four measures.

#### Scenario: A stroke that stays outside the body fills, alongside the other four measures

- GIVEN a stroke whose samples (beyond its own base) never fall inside
  `r(θ)` of the centroid, and which also satisfies measures 1–4
- WHEN scored
- THEN the anchor MUST fill

#### Scenario: A stroke that crosses the body fails on the crossing rule alone

- GIVEN a stroke that otherwise satisfies measures 1–4 but whose path
  re-enters `r(θ)` of the centroid beyond its own base radius
- WHEN scored
- THEN the anchor MUST NOT fill, even though every other measure passed

### Requirement: All Five Measures Must Hold Jointly — Partial Credit Does Not Exist

A stroke fills an anchor if and only if measures 1 through 5 all hold.
There is no partial score for an anchor; an anchor is either filled or
unfilled.

#### Scenario: Four of five measures passing still fills nothing

- GIVEN a stroke that satisfies any four of the five measures and fails
  exactly one
- WHEN scored
- THEN the anchor MUST NOT fill

#### Scenario: All five measures passing fills the anchor

- GIVEN a stroke that satisfies all five measures
- WHEN scored
- THEN the anchor MUST fill

### Requirement: spineScore Recomputes Purely From the Complete Settled Stroke List, Never From the Live Fold

`spineScore(strokes, cfg) = round(100 · filled / anchors.length)` MUST be a
pure function of the level's config and the complete stroke list at
evaluation time. It MUST NOT reuse or depend on `spineTick`'s live
incremental state — the same separation `waypointScore` already keeps from
`waypointTick`, and `revealScore` from `revealTick`. `onFrame`'s live
buffer (emptied on lift) MUST never be the source of the authoritative
score; only `onRelease`'s complete settled stroke list MAY be.

#### Scenario: Recomputing from the full stroke list reproduces the live fold's result

- GIVEN a completed attempt's full stroke list and the live fold's own
  final filled set for the same attempt
- WHEN `spineScore` is called over the complete stroke list
- THEN it MUST report the same anchors filled as the live fold did

#### Scenario: The score is unaffected by what the live buffer held mid-stroke

- GIVEN an attempt where the live buffer momentarily suggested a different
  fill count mid-drawing
- WHEN `spineScore` is evaluated after settlement
- THEN it MUST reflect only the settled stroke list, never the mid-drawing
  live state

### Requirement: A Filled Anchor Never Unfills Within an Attempt

Once an anchor is registered filled by `spineTick`, it MUST NOT become
unfilled before the attempt restarts, regardless of what later strokes do.

#### Scenario: A filled anchor stays filled after later strokes are drawn

- GIVEN an anchor filled by an earlier stroke
- WHEN later strokes are drawn anywhere on the sheet, including ones that
  fail every measure
- THEN the anchor MUST remain filled for the rest of the attempt

#### Scenario: Restart clears every latch

- GIVEN one or more anchors latched filled
- WHEN the attempt restarts
- THEN every latch MUST reset to unfilled

### Requirement: A Stroke That Fills No Anchor Is Not Punished

A stroke that fails any of the five measures and therefore fills no anchor
MUST NOT trigger a reset, a hazard, or a lost attempt. Its ink MUST remain
on the sheet. The level simply reports fewer anchors filled than
`anchors.length`, exactly as an under-cleared erase-mode reveal level falls
short of `minAccuracy` (`docs/13` §6 forbids punishing early errors hard).

#### Scenario: A rejected stroke leaves the sheet unreset

- GIVEN an attempt in progress and a stroke that fills no anchor
- WHEN the stroke settles
- THEN no reset MUST occur, no hazard MUST fire, and the stroke's ink MUST
  remain visible

#### Scenario: A rejected stroke does not lower the score below what filled anchors already earned

- GIVEN an attempt where 3 of 10 anchors are already filled and a new
  stroke fills none
- WHEN `spineScore` is recomputed
- THEN it MUST still report 3 filled, not fewer

### Requirement: Reset Reseeds Through seedSpines at Every Reset Site, Never the Bare Empty Constant

Mount, `resetSurface`, and `restartRun` MUST each reseed spine state
through `seedSpines(cfg)`, never through the bare `EMPTY_SPINES` constant —
the same discipline `arrange.ts`'s own shipped-bug comment records needing.
A source-read count of `seedSpines` call sites MUST find exactly three.

#### Scenario: All three reset sites call seedSpines

- GIVEN the source of mount initialisation, `resetSurface`, and
  `restartRun`
- WHEN each is inspected for its spine-state initialiser
- THEN all three MUST call `seedSpines(cfg)`, and none MUST assign the bare
  `EMPTY_SPINES` constant directly

#### Scenario: Removing one call site is caught

- GIVEN the source-read count of `seedSpines` call sites
- WHEN one of the three (e.g. `restartRun`'s) is hypothetically deleted
- THEN the count MUST fall from 3 to 2, and the guard MUST fail

### Requirement: The Debug Flag Reaches the Screen's Rendered Output, Not Only a Helper

`?debug=espinas:<k>`, parsed by a pure exported function in
`canvas/devMode.ts` following `isSectorDebug`'s own stated reason (paints
render state only, adds no control, persists nothing, and must work against
the exact build being screenshotted), SHALL seed the first `k` anchors (by
generator order) as already filled via `debugSpines(cfg, k)`. It MUST be
ungated (no `isDevMode()` check). The flag MUST be wired into the SCREEN's
own prop passed to the canvas, not merely into a helper function that
nothing invokes — the same lesson `debugCarrier` cost: written, green, and
never wired, caught only by captures.

#### Scenario: The flag seeds exactly the first k anchors as filled

- GIVEN `?debug=espinas:3`
- WHEN `debugSpines(cfg, 3)` is applied
- THEN exactly the first 3 anchors (by generator order) MUST render filled
  and the rest MUST render unfilled

#### Scenario: The flag works with no dev mode active

- GIVEN a production-mode session with `?debug=espinas:2` set
- WHEN the level renders
- THEN the debug seeding MUST take effect regardless of `isDevMode()`'s
  value

#### Scenario: The seeded state reaches the rendered markup, not only a helper's return value

- GIVEN `?debug=espinas:2` and the level rendered via `renderToString`
- WHEN the rendered anchor marks are inspected
- THEN exactly 2 MUST render in their filled visual state, proving the
  value reached the screen's prop passed to the canvas and not only
  `debugSpines`'s own return value

### Requirement: No Fragment Reference Anywhere the Spine Fold's Output Is Rendered

No decision this capability's fold produces MAY be rendered through a
`<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, or `url(#…)`
reference.

#### Scenario: No forbidden reference is introduced

- GIVEN a hedgehog level rendered via `renderToString`
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, or the
  substring `url(#`

---

**Accepted deviation:** this spec exceeds the skill's 650-word cap, the
same deviation this project's other capability specs already record; the
session's delivery strategy (`exception-ok`) removes the review-line
budget, not the requirement to write down every independently testable
invariant this new capability introduces — the fold's shape, the anchor
derivation, all five measures with their negative cases, the score
contract, the render/score coincidence proof, monotonicity, the
no-punishment rule, the reset contract, the debug flag, and the
fragment-reference ban — none of which can be merged or dropped without
losing an assertion the harness can actually check.
