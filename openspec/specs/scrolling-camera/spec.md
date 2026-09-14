# Scrolling Camera Specification

## Purpose

A level whose drawn world is wider than the player's view window, with a
camera x-origin that advances forward-only as the child's stroke
progresses, a lead window that prevents a stationary finger from
self-scrolling the world, and a world/window split every full-sheet
render site must respect so a level that opts out (`viewBoxWidth ===
viewWidth`) renders byte-identically to today. This capability owns the
conceptual invariants; `trace-canvas` owns the concrete rendering site and
`level-engine` owns the `LevelConfig`/`LevelTarget` field wiring and the
catalog levels that opt in.

## Requirements

### Requirement: Sheet Width and View Width Are Distinct Quantities

A level SHALL declare `viewBoxWidth` (the world every path, guide, and
backdrop spans) and `viewWidth` (the width the rendered `viewBox`
attribute reports) as two independently readable quantities. For every
level that predates this capability and for every level that does not
opt into scrolling, `viewBoxWidth` MUST equal `viewWidth`.

#### Scenario: A non-scrolling level's sheet and view widths are equal

- GIVEN any level with no camera declared
- WHEN `viewBoxWidth` and `viewWidth` are read
- THEN they MUST be equal

#### Scenario: A scrolling level's sheet is wider than its view

- GIVEN `dolphin3` or `dolphin4`
- WHEN `viewBoxWidth` and `viewWidth` are read
- THEN `viewBoxWidth` MUST exceed `viewWidth`

### Requirement: The Camera Origin Is Forward-Only, Monotone, and Clamped at the Route's End

Within a single attempt, the camera's x-origin MUST NOT decrease from any
value it has already reached, and MUST never exceed `viewBoxWidth −
viewWidth`. Restarting the attempt MUST reset the origin to its initial
value.

#### Scenario: The origin never decreases within an attempt

- GIVEN a sequence of stroke samples that moves forward then briefly
  backward in world-x
- WHEN the camera origin is sampled after each
- THEN no later sample MUST be less than an earlier one

#### Scenario: The origin clamps at the route's end

- GIVEN a stroke that reaches the route's final point
- WHEN the camera origin is read
- THEN it MUST equal `viewBoxWidth − viewWidth`, never exceeding it

#### Scenario: Restarting resets the origin

- GIVEN an attempt whose camera origin has advanced
- WHEN the attempt restarts
- THEN the origin MUST return to its initial value

### Requirement: A Lead Window Gates Camera Advance, So a Stationary Finger Never Self-Scrolls

The camera MUST advance only once the finger's world-x position passes a
fixed fraction of the view width ahead of the current origin. A finger
held stationary in screen space MUST NOT cause the origin to move, even
though the view's world-space content beneath a moving camera would
otherwise imply motion.

#### Scenario: A held-still finger does not move the camera

- GIVEN a stroke that stops advancing and holds one screen position for
  many frames
- WHEN the camera origin is sampled across those frames
- THEN it MUST NOT change

#### Scenario: Crossing the lead threshold advances the camera

- GIVEN a stroke whose world-x passes the lead fraction ahead of the
  current origin
- WHEN the next frame's origin is computed
- THEN it MUST have advanced

### Requirement: Frame/Event Ordering Between the Camera and Pointer Input Is Named and Bounded

Because the camera mutates the `viewBox` attribute once per animation
frame while pointer events arrive independently, a `pointermove` MAY be
evaluated against a camera origin that is at most one frame stale. This
staleness MUST be measured against a stated tolerance rather than assumed
safe, and MUST NOT cause a sample to be attributed to the wrong side of
the corridor at ordinary stroke speeds.

#### Scenario: A fast stroke's sample stays within the stated tolerance

- GIVEN a stroke advancing at a measured worst-case speed and a
  one-frame-stale camera origin
- WHEN the resulting pointer-to-world mapping error is computed
- THEN it MUST fall within the stated tolerance

### Requirement: A Non-Opting Level Renders Byte-Identically

Every level with `viewBoxWidth === viewWidth`, including every
word-building level using `layOutPaths`'s existing wide-sheet behaviour,
MUST render with `fit="contain"` exactly as before this capability
existed — the camera code path MUST be unreachable for such a level.

#### Scenario: A word-building level's render is unaffected

- GIVEN `f4-la` or `f5-mama`, rendered before and after this capability's
  introduction
- WHEN the rendered markup is compared
- THEN it MUST be byte-identical

### Requirement: The Backdrop Is Pinned to the View Window on a Camera Level

**Post-verify amendment A4** (this requirement originally read "The
Backdrop Spans the World as One Element", spanning `viewBoxWidth`; the
apply phase's own capture read-back was performed incorrectly and the
verify phase's direct inspection of the same screenshots — `dolphin3-
control.png`, `dolphin3-debug280.png`, `dolphin4-control.png`, `dolphin4-
debug9999-clamp.png` — showed a flat, textureless field of open water
with zero visible reed or bank texture, confirming design.md §3.3's
original, more pessimistic prediction rather than the amendment that had
"corrected" it. Design.md §3.3 always named the fallback below; it is
adopted here.)

A scrolling level's backdrop MUST render as a single `<image>` with
`preserveAspectRatio="xMidYMid slice"`, its `x` and `width` following the
SAME window the `<svg>`'s own `viewBox` attribute reports — the camera's
origin and `viewWidth` — rather than the world (`viewBoxWidth`). This
keeps the whole lagoon (banks, reeds) in frame at every camera
magnification while the corridor and the dolphins pan beneath a fixed
background, instead of panning an already-cropped slice of open water. No
sibling backdrop image, `<pattern>`, or `url(#…)` reference MAY be
introduced to cover the panned world.

#### Scenario: The backdrop image is pinned to the window, not the world

- GIVEN a scrolling dolphin level rendered via `renderToString`
- WHEN the backdrop layer is inspected
- THEN exactly one `<image>` MUST be present, its `x` MUST equal the
  camera's origin, its `width` MUST equal `viewWidth` (not
  `viewBoxWidth`), and no `<pattern>` or `url(#` MUST appear

#### Scenario: A non-camera level's backdrop is unaffected

- GIVEN any level with no `camera` field, where `viewWidth === viewBoxWidth`
- WHEN the backdrop `<image>` is inspected
- THEN its `x` MUST equal 0 and its `width` MUST equal `viewBoxWidth`,
  byte-identical to before this capability existed

### Requirement: prefers-reduced-motion Does Not Suppress the Camera

The camera MUST continue to advance under `prefers-reduced-motion:
reduce`, because it is driven one-to-one by the child's own finger with
no easing or inertia, not by decorative animation the reduced-motion
contract is meant to suppress.

#### Scenario: The camera advances identically under reduced motion

- GIVEN the same stroke replayed with `prefers-reduced-motion: reduce`
  active and inactive
- WHEN the resulting camera origin sequence is compared
- THEN the two sequences MUST be identical

### Requirement: The Rendered viewBox Attribute Is the Required Test Surface

At least one test MUST read the real rendered `viewBox` attribute off the
real `<svg>` element — not a pure camera-function return value alone —
covering the initial origin, an origin seeded via `?debug=camara:<x>`,
and the clamp at the route's end. `?debug=camara:<x>` MUST be an ungated
flag that seeds the camera origin with no live stroke, following
`?debug=estela:<k>`'s convention of painting render state only.

#### Scenario: The initial rendered viewBox reports origin zero

- GIVEN a scrolling level rendered fresh via `renderToString`
- WHEN the `<svg>`'s `viewBox` attribute is parsed
- THEN its x-origin MUST equal 0

#### Scenario: The debug flag seeds the rendered origin

- GIVEN `?debug=camara:400` active
- WHEN the `<svg>`'s `viewBox` attribute is parsed
- THEN its x-origin MUST equal 400

#### Scenario: A seeded origin beyond the extent clamps in the rendered viewBox

- GIVEN `?debug=camara:9999` active on a scrolling dolphin level, seeding
  an origin far past the route's extent — the only way to observe the
  clamp under vitest's `node` environment, which has no jsdom and no rAF
  to drive a live stroke
- WHEN the `<svg>`'s `viewBox` attribute is parsed
- THEN its x-origin MUST equal `viewBoxWidth − viewWidth`, not `9999`

#### Scenario: The live per-frame clamp is proven by capture, not by test

- GIVEN a real stroke driven to the route's final point in a live browser
- WHEN the rendered `capturas/pasoG/` screenshot pair is inspected
- THEN the visible window MUST show the route's end with no blank space
  past the world's right edge, corroborating the seeded-origin test above
  under conditions the `node` test environment cannot itself exercise

#### Scenario: The debug flag is ungated

- GIVEN `isDevMode()` returns `false`
- WHEN `?debug=camara:<x>` is present
- THEN the origin MUST still be seeded

---

**Accepted deviation:** this spec exceeds the skill's 650-word cap, the
same deviation `free-trail-waypoints/spec.md` and `zoo-map/spec.md`
already record for this project. The session's delivery strategy
(`exception-ok`) removes the review-line budget, not the requirement to
name every independently testable invariant the camera introduces.
