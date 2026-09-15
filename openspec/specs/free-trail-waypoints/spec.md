# Free Trail Waypoints Specification

## Purpose

A routeless level scored by authored waypoints — a start point, N flower
waypoints, one goal (the hive) — where the child invents the trail with a
finger and the carrier follows it immediately (`docs/13` §2, §8 row F). This
is the first family where no corridor is drawn and no route is authored: the
mechanic IS the invented trail. This capability owns the pure fold module
(`levels/waypoints.ts`), the flower's two-state art and its achromatic
legibility law, the coincidence proof between what is rendered and what is
scored, and the ungated screenshot-seeding flags. It does not own the
`LevelConfig` field wiring or the catalog levels (`level-engine`), nor the
render layer's own image contract (`trace-canvas`), nor the sector registry
(`zoo-map`).

## Requirements

### Requirement: WaypointConfig Shape and the Pure Fold Module

`levels/waypoints.ts` SHALL export `WaypointConfig` (an authored `start:
Point`, a list of flower waypoints each with an authored coordinate, art, and
touch radius, and a hive goal with its own coordinate and radius),
`WaypointState`, `waypointTick(prev, p, cfg)`, `waypointScore(strokes, cfg)`,
and `debugWaypoints(cfg, litCount)` — all pure and DOM-free, the same
convention `levels/arrange.ts`'s own header states is mandatory: this repo's
test harness is node with no jsdom and no testing-library, so a decision made
only inside a pointer handler is invisible to every test that can exist.

#### Scenario: Every export runs with no DOM

- GIVEN `waypointTick`, `waypointScore`, and `debugWaypoints`
- WHEN imported and called directly from a plain node test file
- THEN each MUST execute and return a value with no jsdom, no
  testing-library, and no component render involved

#### Scenario: waypointTick returns the same reference when nothing changes

- GIVEN a `waypointTick` call whose inputs light no new waypoint
- WHEN the returned value is compared to `prev` by reference
- THEN they MUST be the same object, the same no-op contract
  `revealGrid.ts`'s `revealTick` and `arrange.ts`'s `arrangeTick` already hold

### Requirement: The Waypoint Latch Is Monotone and Visit-Order-Free

Once a flower or the hive is registered lit by `waypointTick`, it MUST NOT
unlight before the attempt restarts. Containment MUST be Euclidean: a sample
point lights a waypoint whenever its distance to that waypoint's authored
coordinate is within that waypoint's own touch radius, independent of the
order in which waypoints are touched — matching the only existing
touch-N-authored-points precedent in the repo (`reveal.mode: 'light'`,
deliberately unordered) and `docs/13` §2's own wording, which does not ask for
a visit order.

#### Scenario: A lit flower stays lit after the point moves away

- GIVEN a flower lit by an earlier sample
- WHEN later samples land far from it
- THEN it MUST remain lit for the rest of the attempt

#### Scenario: Restart clears every latch

- GIVEN one or more flowers and the hive latched as lit
- WHEN the attempt restarts
- THEN every latch MUST reset to unlit

#### Scenario: Flowers touched in reverse authored order all light

- GIVEN a level with three flowers
- WHEN the sample path touches them in reverse authored order
- THEN all three MUST end up lit

#### Scenario: A point outside every radius lights nothing

- GIVEN a sample point farther than every waypoint's own radius from all of
  them
- WHEN the fold runs
- THEN no waypoint MUST become lit

### Requirement: waypointScore Recomputes Purely From the Complete Stroke List, Gated by the Existing minAccuracy Field

`waypointScore` MUST be a pure function of the level's config and the
complete stroke list at evaluation time — it MUST NOT reuse or depend on
`waypointTick`'s live incremental state, the same separation `revealScore`
already keeps from `revealTick`. Its returned accuracy MUST report the
fraction of waypoints (flowers plus the hive) reached, compared against the
SAME `rules.minAccuracy` field every other free level already uses.
`WaypointConfig` introduces NO separate completion-threshold field of its
own. An unlit flower MUST lower the reported accuracy fraction; it MUST NOT
trigger any separate punitive failure path — the level simply falls short of
`minAccuracy`, exactly as an under-cleared erase-mode reveal level does
(`docs/13` §6 forbids punishing early errors hard).

#### Scenario: Recomputing from the full stroke list reproduces the live fold's result

- GIVEN a completed attempt's full stroke list and the live fold's own final
  lit set for the same attempt
- WHEN `waypointScore` is called over the complete stroke list
- THEN it MUST report the same waypoints reached as the live fold did

#### Scenario: All flowers and the hive reached scores complete

- GIVEN a stroke list that lights every flower and reaches the hive
- WHEN `waypointScore` is compared against `rules.minAccuracy`
- THEN it MUST be at or above `minAccuracy` and the level MUST report
  complete

#### Scenario: One flower never touched lowers the score with no separate failure state

- GIVEN a stroke list that reaches the hive and every flower but one
- WHEN `waypointScore` is evaluated
- THEN the reported accuracy MUST be below `minAccuracy`, completion MUST
  report incomplete, and no separate error/hazard state MUST be introduced

### Requirement: The Rendered Flower and Hive Coincide With the Coordinate waypointScore Measures, in Both States

For every bee level, each flower's and the hive's rendered `<image>` centre
— recovered by parsing `x`/`y`/`width`/`height` out of `renderToString`'s
HTML output, the same technique `ArtCorridorLayer.test.tsx:50+` already uses
— MUST equal the authored coordinate `waypointScore` measures against, in
the dormant state and in the drawn (lit) state alike. This is the mandatory
insurance the proposal names directly against paso E's own failure: 1,553
green tests shipped once while the snake's drawn art sat at one coordinate
and its scored route sat at another, because nothing rendered the real
`<image>` and compared it.

#### Scenario: A dormant flower's rendered centre equals its authored coordinate

- GIVEN each of `bee1..4`'s flowers, rendered dormant
- WHEN the rendered `<image>` centre is parsed and compared to the
  `WaypointConfig` coordinate `waypointScore` measures against
- THEN they MUST be equal, for all four levels

#### Scenario: A lit flower's rendered centre equals the same authored coordinate

- GIVEN the same flowers rendered in their drawn (lit) state
- WHEN the rendered centre is parsed and compared to the same authored
  coordinate
- THEN they MUST be equal — the dormant→drawn swap MUST NOT move the art

#### Scenario: The hive's rendered centre equals its authored coordinate

- GIVEN each of `bee1..4`'s hives
- WHEN the rendered `<image>` centre is parsed
- THEN it MUST equal the authored hive coordinate `waypointScore` measures
  against

#### Scenario: An artificially shifted authored coordinate fails the assertion

- GIVEN a hypothetical flower whose rendered centre is offset from its
  authored coordinate
- WHEN the coincidence assertion is evaluated
- THEN it MUST fail, proving the assertion is sensitive rather than
  vacuously true

### Requirement: The Flower's Dormant State Is Achromatic and Provably Separated From the Forest Band

`FLOWER_DORMANT`, the flower's off-state palette token, MUST be achromatic
(chroma ≤ 12) and MUST separate from the forest backdrop's quiet-band luma
(`#86a678`, luma 151.2) by at least 55 luma. The test MUST assert this
CONSTRAINT, not the provisional literal (`#d2d2d2`) — the exact light is the
author's to set, and the assertion MUST continue to hold whatever value she
picks against this law.

#### Scenario: FLOWER_DORMANT's chroma is at most 12

- GIVEN `FLOWER_DORMANT`
- WHEN its chroma is measured
- THEN it MUST be at most 12

#### Scenario: FLOWER_DORMANT separates from the forest band by at least 55 luma

- GIVEN `FLOWER_DORMANT`'s luma and the forest band's luma (151.2)
- WHEN their absolute difference is computed
- THEN it MUST be at least 55

#### Scenario: A low-luma grey fails the gap check

- GIVEN a hypothetical dormant colour at luma 131 (the shipped
  `CLUE_DRAINED`)
- WHEN the 55-gap check is evaluated against the forest band
- THEN it MUST fail, by 20.2, proving the law is sensitive rather than
  vacuously true

### Requirement: The Flower's Two-State Swap Is the Reward, Not a Ground-Mark Comparison

The flower's dormant→drawn swap is `docs/09` §4's "gaining a clue is gaining
tone" rule applied to the bee family. Because the forest backdrop introduces
no scattered ground marks (`zoo-map` capability, decision 3), the hierarchy
rule (a dormant mark must separate from its ground more than any decorative
ground mark separates from its own, `docs/09` §4) MUST NOT be evaluated
against an empty decorative set for this sector as a false failure — it MUST
either be skipped for a sector with none or trivially satisfied.

#### Scenario: The forest sector's decorative ground-mark set is empty

- GIVEN the forest backdrop's registered decorative marks
- WHEN enumerated
- THEN the set MUST be empty

#### Scenario: artHierarchy.test.ts does not fail the forest for lack of a ground mark

- GIVEN the forest sector's empty decorative set
- WHEN `artHierarchy.test.ts` evaluates the hierarchy rule for this sector
- THEN it MUST NOT report a failure caused by comparing against nothing

### Requirement: Screenshot Seeding Flags for the Waypoint Fold

Two ungated flags, each parsed by a pure exported function in
`canvas/devMode.ts` following `isSectorDebug`'s own stated reason (paints
render state only, adds no control, persists nothing, and must work against
the exact build being screenshotted): one pins the live trail position at a
fixed viewBox coordinate — a static frame cannot show a moving finger — and
one seeds the first *k* flowers as already lit — a single pinned point
cannot express an accumulated latch. Neither MUST be gated by `isDevMode()`.

#### Scenario: The position-pin flag replaces live pointer input

- GIVEN the position-pin debug flag set to a fixed coordinate
- WHEN the waypoint fold runs with no pointer input
- THEN the current point MUST equal that fixed coordinate

#### Scenario: The lit-seed flag lights exactly the first k flowers

- GIVEN the lit-seed flag set to `k`
- WHEN `debugWaypoints(cfg, k)` is applied
- THEN exactly the first `k` flowers (by authored order) MUST be lit and the
  rest MUST remain dormant

#### Scenario: Both parsers are pure and DOM-free

- GIVEN either parser called directly with a query string
- WHEN inspected
- THEN neither MUST require `window` access or component context

### Requirement: No Fragment Reference Anywhere the Waypoint Fold's Output Is Rendered

No decision this capability's fold produces MAY be rendered through a
`<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, or `url(#…)`
reference.

#### Scenario: No forbidden reference is introduced

- GIVEN a bee level rendered via `renderToString`
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, or the
  substring `url(#`

---

**Accepted deviation:** this spec exceeds the skill's 650-word cap, the same
deviation `zoo-map/spec.md` already records for this project. The session's
delivery strategy (`exception-ok`) removes the review-line budget, not the
requirement to write down every independently testable invariant this new
capability introduces — the fold's shape, its latch semantics, its scoring
contract, the render/score coincidence proof, the palette law, the hierarchy
exemption, the debug flags, and the fragment-reference ban — none of which
can be merged or dropped without losing an assertion the harness can
actually check.
