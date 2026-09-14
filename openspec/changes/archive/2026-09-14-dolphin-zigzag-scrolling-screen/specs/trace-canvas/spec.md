# Delta for Trace Canvas

## ADDED Requirements

### Requirement: Camera Origin Mutates the viewBox Attribute Imperatively, With Zero setState Per Frame

When a level declares `camera` (`level-engine` field, `scrolling-camera`
capability), `TraceCanvas`'s existing rAF loop SHALL compute the camera
x-origin from the same expression already used for the carrier's head
position and SHALL write it into the `<svg>`'s `viewBox` attribute via
`svgRef.current.setAttribute('viewBox', …)`, alongside the loop's
existing ink/hazard/carrier attribute writes. No `setState` call MAY be
introduced for this per-frame write. A level with no `camera` field MUST
leave the `viewBox` attribute's x-origin at 0 for the entire attempt.

#### Scenario: The camera write reuses the existing rAF loop, not a new one

- GIVEN a camera-enabled level under active tracing
- WHEN the render loop's per-frame DOM writes are inspected
- THEN the `viewBox` mutation MUST occur inside the same loop that writes
  ink/hazard/carrier attributes

#### Scenario: A non-camera level's viewBox x-origin never moves

- GIVEN any level with no `camera` field, under active tracing
- WHEN the `viewBox` attribute is sampled across frames
- THEN its x-origin MUST remain 0 throughout

### Requirement: Full-Sheet Render Sites Already Span the World and Require No Re-Anchoring

Every render site that spans `x={0}` and `width={viewBoxWidth}` —
`sheetBounds` (which `clampArtBox`/`placeArt` clamp against), the
`contain` base rect, the backdrop quiet rect, the ground image, the maze
wall rect, the four guide lines, `LevelPlay`'s `groundScatter` viewBox and
`buildIdealGrid` bucketing, and `coverage.ts`/`revealGrid.ts`'s own
`viewBoxWidth` consumers — already means the WORLD, both before and after
this capability, and MUST continue to span `target.viewBoxWidth`
unchanged. No site in this list is re-anchored, re-pointed, or edited by
this change. The `<svg>`'s own rendered `viewBox` attribute means the
WINDOW, reporting `target.viewWidth` as its width and the camera origin as
its x, per `scrolling-camera` — not `target.viewBoxWidth`.

**Post-verify amendment A4** carves the backdrop `<image>` OUT of this
list: it is the one full-sheet render site that now follows the WINDOW,
not the world, on a camera level — see `scrolling-camera`'s "The Backdrop
Is Pinned to the View Window on a Camera Level". The backdrop's own quiet
`<rect>` (painted underneath, as a fallback while the image loads) stays
world-anchored, unchanged, since only the visible window is ever painted
over it anyway.

#### Scenario: The base rect spans the world on a camera level, unchanged

- GIVEN `dolphin3` rendered via `renderToString`
- WHEN the base `<rect>` width is read
- THEN it MUST equal `target.viewBoxWidth`

#### Scenario: The backdrop image is pinned to the window on a camera level

- GIVEN `dolphin3` rendered via `renderToString`
- WHEN the backdrop `<image>`'s `x` and `width` are read
- THEN `x` MUST equal the camera's origin and `width` MUST equal
  `target.viewWidth`, not `target.viewBoxWidth` (`scrolling-camera`'s
  post-verify amendment A4)

#### Scenario: The rendered viewBox width reports the window, not the world

- GIVEN `dolphin3` rendered via `renderToString`
- WHEN the `<svg>`'s `viewBox` attribute is parsed
- THEN its width component MUST equal `target.viewWidth`, not
  `target.viewBoxWidth`

#### Scenario: Guide lines span the world on a camera level, exactly as before

- GIVEN `dolphin3` rendered via `renderToString`
- WHEN the four guide lines' full-width span values are read
- THEN each MUST equal `target.viewBoxWidth`, the same expression these
  lines already used before this capability existed

#### Scenario: A non-camera level's spans are unaffected

- GIVEN any non-camera level rendered before and after this change
- WHEN the same render sites are inspected
- THEN they MUST be byte-identical, since `viewBoxWidth === viewWidth`
  makes the new code path unreachable and no expression outside the
  `viewBox` attribute is touched by this change

## MODIFIED Requirements

### Requirement: Viewport and Ruled Lines

The canvas MUST render as an SVG whose `viewBox` reports `0 {viewBoxY}
{viewWidth} 600` for a level with no `camera` field (the pre-existing `0
0 1000 600` default when `viewWidth` is also 1000), and MUST draw
full-width guide lines at Y=180 (upper guide), Y=300 (middle guide),
Y=420 (baseline), and Y=540 (descender guide), each spanning
`viewBoxWidth` — unchanged from before this capability existed — dividing
sky (0–180), grass (180–420), and roots (420–600) zones with the
descender line marking the bottom of the roots zone. On a camera-enabled
level, the `viewBox` attribute's x-origin MUST advance per the
`scrolling-camera` capability's rules while its width stays `viewWidth`
and its y-origin/height stay unchanged. Rendering SHALL be responsive
across touch screen sizes while coordinates stay normalized.

(Previously: the `viewBox` was asserted as the fixed string `"0 0 1000
600"` with guide lines spanning that same fixed width; this requirement
now distinguishes the window's width, `viewWidth` — a new quantity — from
the world's width, `viewBoxWidth`, which keeps its pre-existing name and
meaning unchanged, and states that the window's x-origin — fixed at 0
before this change — may advance on a camera-enabled level.)

#### Scenario: Guides sit on the viewBox grid for a non-camera level

- GIVEN the canvas rendered at any device size with no `camera` field
- WHEN the SVG is inspected
- THEN the viewBox MUST be `0 0 1000 600` and the guide lines MUST lie at
  Y=180, Y=300, Y=420, and Y=540 in viewBox space

#### Scenario: Descender letter visible below the baseline

- GIVEN a `mixta`-zone letter (e.g. `f`) whose stroke descends below the
  baseline
- WHEN the canvas renders
- THEN the stroke MUST be visible below Y=420 and the descender guide
  MUST render at Y=540

#### Scenario: A camera-enabled level's viewBox x-origin advances while width stays the window

- GIVEN `dolphin3` under active tracing, with the camera origin advanced
- WHEN the `viewBox` attribute is parsed
- THEN its x-origin MUST be greater than 0, its width MUST equal
  `viewWidth`, and its y-origin/height MUST remain unchanged

---

**Accepted deviation:** this spec exceeds the skill's 650-word cap, the
same deviation this project's other capability specs already record; the
session's delivery strategy is `exception-ok`.
