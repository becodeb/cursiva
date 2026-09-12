# Trace Canvas Specification

## Purpose

The drawing surface: fixed normalized SVG viewBox `0 0 1000 600`, three-zone ruled lines, Pointer Events capture into normalized `Point[]`, perfect-freehand ink, and arc-length resampling to K points.

## Requirements

### Requirement: Viewport and Ruled Lines

The canvas MUST render as an SVG with `viewBox="0 0 1000 600"` and MUST draw full-width guide lines at Y=180 (upper guide), Y=300 (middle guide), Y=420 (baseline), and Y=540 (descender guide), dividing sky (0–180), grass (180–420), and roots (420–600) zones with the descender line marking the bottom of the roots zone. Rendering SHALL be responsive across touch screen sizes while coordinates stay normalized.

(Previously: only Y=180 and Y=420 were drawn — the descender line at Y=540 did not exist on the canvas.)

#### Scenario: Guides sit on the viewBox grid

- GIVEN the canvas rendered at any device size
- WHEN the SVG is inspected
- THEN the viewBox MUST be `0 0 1000 600` and the guide lines MUST lie at Y=180, Y=300, Y=420, and Y=540 in viewBox space

#### Scenario: Descender letter visible below the baseline

- GIVEN a `mixta`-zone letter (e.g. `f`) whose stroke descends below the baseline
- WHEN the canvas renders
- THEN the stroke MUST be visible below Y=420 and the descender guide MUST render at Y=540

### Requirement: Pointer Capture and Normalization

The canvas SHALL capture `pointerdown`, `pointermove`, `pointerup`, and `pointercancel`. Raw pointer coordinates MUST be mapped into viewBox space via `getScreenCTM().inverse()`; naive scaling from `clientX`/`clientY` is FORBIDDEN. Pressure (`e.pressure`) MAY be captured when available.

#### Scenario: Correct normalization

- GIVEN a pointer event at screen point p on a scaled canvas
- WHEN p is converted
- THEN the result MUST equal p transformed by the inverse screen CTM (within float epsilon) and fall inside `0..1000` × `0..600`

### Requirement: Primary Pointer Only

The canvas SHALL track exactly one active stroke. A second `pointerdown` while a stroke is active MUST be ignored (multi-pointer deferred beyond this slice). `pointercancel` MUST discard the active stroke and its ink.

#### Scenario: Second finger ignored

- GIVEN an active stroke from pointer 1
- WHEN pointer 2 fires `pointerdown`/`pointermove`
- THEN its points MUST NOT be appended to the stroke

#### Scenario: pointercancel clears

- GIVEN an active stroke with ink on screen
- WHEN `pointercancel` fires
- THEN the stroke and its ink MUST be discarded

### Requirement: Ink Rendering

Captured points MUST be rendered as fluid ink computed with perfect-freehand `getStroke`. Rendering is display-only and MUST NOT mutate captured data.

#### Scenario: Stroke polygon generated

- GIVEN a captured stroke of at least 3 points
- WHEN ink is computed
- THEN a closed polygon outlining the input centerline MUST be produced

### Requirement: Arc-Length Resampling

Captured strokes MUST be resampled to exactly K equidistant points along their arc length, with K = 64 (constant; design MAY tune). Strokes with fewer than 2 distinct captured points MUST yield an empty resample.

#### Scenario: Fixed cardinality

- GIVEN a raw stroke of 400 points
- WHEN resampled
- THEN exactly 64 points MUST be produced, spaced `totalLength / 64` apart

#### Scenario: Degenerate input

- GIVEN a stroke with fewer than 2 distinct points
- WHEN resampling is requested
- THEN it MUST return an empty result and downstream evaluation MUST NOT run

### Requirement: Real-Time Responsiveness

The capture→ink pipeline SHALL sustain ~60fps on touch with no perceptible lag (docs/04 criterion 2), demonstrated by device checklist plus vitest on the pure capture/resample/ink modules. Average frame time during continuous `pointermove` MUST be ≤ 17ms on the reference touch device.

#### Scenario: Frame budget holds

- GIVEN continuous pointer movement on the reference touch device
- WHEN frame times are measured across capture, resample, and ink render
- THEN average frame time MUST be ≤ 17ms (60fps target)

### Requirement: Checkpoint Overlay Gate

The canvas SHALL accept an optional `showCheckpoints` prop and SHALL render the checkpoint overlay exactly when `showCheckpoints && devCheckpoints && devIdeal`; dev mode alone MUST NOT enable the overlay. The live score line SHALL render only in dev mode (`showScore = isDevMode()`), independently of the overlay gate.

(Previously: gate was `(isDevMode() || showCheckpoints) && devCheckpoints && devIdeal` — dev forced the overlay regardless of the toggle.)

#### Scenario: Toggle reveals overlay in production

- GIVEN a non-dev session with `showCheckpoints` true and dev checkpoint data loaded
- WHEN the canvas renders
- THEN the checkpoint overlay MUST render and the live score line MUST NOT render

#### Scenario: Overlay stays hidden when toggle is off

- GIVEN a non-dev session with `showCheckpoints` false
- WHEN the canvas renders
- THEN the overlay MUST NOT render

#### Scenario: Dev mode no longer forces the overlay

- GIVEN a dev session with `showCheckpoints` false and dev checkpoint data loaded
- WHEN the canvas renders
- THEN the overlay MUST NOT render

#### Scenario: Dev toggle ON shows overlay with score

- GIVEN a dev session with `showCheckpoints` true and dev checkpoint data loaded
- WHEN the canvas renders
- THEN the overlay MUST render and the live score line MUST render (score stays dev-only)

### Requirement: Multi-Step Demo Rendering

The `demo` prop SHALL accept a single `DrawDemo` or an array `DrawDemo[]`; the canvas SHALL render one animated `motion.path` per demo entry, each drawing its own `d` via framer-motion `pathLength` at that entry's delay and duration. Timeline completion SHALL consider every entry. The single-object form SHALL preserve the previous single-path behavior.

#### Scenario: Array renders one path per demo

- GIVEN a demo array of 3 segments
- WHEN the demo plays
- THEN 3 `motion.path` entries MUST animate with their own `d`, delay, and duration

#### Scenario: Single object unchanged

- GIVEN a single `DrawDemo` object
- WHEN the demo plays
- THEN exactly one path MUST animate as before

### Requirement: Demo and Guide Stroke Joins

The animated demo path(s) (`motion.path`, single or array per `Multi-Step Demo Rendering`) and the static guide path MUST render with `stroke-linejoin="round"`, matching the existing `stroke-linecap="round"`, to prevent sharp miter cusps at interior direction reversals.

#### Scenario: Demo path has round joins

- GIVEN a demo config with an interior reversal (e.g. letter `a`)
- WHEN the animated path renders
- THEN its `stroke-linejoin` attribute MUST equal `"round"`

#### Scenario: Guide path has round joins

- GIVEN any letter's guide path
- WHEN rendered
- THEN its `stroke-linejoin` attribute MUST equal `"round"`

### Requirement: Guide Path Pen-Lift Fidelity

The static guide path SHALL render every subpath of a letter's `pathDefinition` (MAIN and any SECONDARY) without drawing a connecting line between the end of one subpath and the start of the next, consuming the pen-lift boundary already encoded in the letter's data (letter-model `LetterConfig Shape`).

#### Scenario: No line across the dot gap

- GIVEN letter `i`'s guide is rendered
- WHEN inspected
- THEN no line segment MUST connect the body end to the dot start

#### Scenario: Multi-letter words unaffected

- GIVEN a multi-letter word's guide (already pen-lift-safe via `buildWord`)
- WHEN rendered
- THEN its rendering behavior MUST remain unchanged

### Requirement: Clue Layer Rendering

The canvas SHALL accept an optional `clues` prop, following the `hazards`
prop precedent (`TraceCanvas.tsx:166-177`), and render each clue mark as its
own `<g>` layer. A mark's rendered colour MUST reflect its reducer state:
grey while `drained`, and its trail's registered earned colour (or, for
footprints, black) once `earned` — the colour change MUST be a discrete
attribute swap, not an animated transition. The clue layer, and every other
element this change adds to the canvas, MUST NOT introduce any `url(#…)`
reference (gradient, mask, or filter), because such references hydrate blank
on real devices (`TraceCanvas.tsx:70-84`).

#### Scenario: Drained mark renders grey

- GIVEN a clue mark in `drained` state passed via the `clues` prop
- WHEN the canvas renders
- THEN the mark's fill or stroke colour MUST be the shared grey token

#### Scenario: Earned mark renders its trail colour

- GIVEN a clue mark in `earned` state whose trail owns colour `X`
- WHEN the canvas renders
- THEN the mark's fill or stroke colour MUST equal `X`

#### Scenario: Earned footprint renders black, never chromatic

- GIVEN a footprints clue mark in `earned` state
- WHEN the canvas renders
- THEN the mark's colour MUST be black (or a grey-to-black value) and MUST
  NOT be any chromatic colour

#### Scenario: No url() reference is introduced

- GIVEN the canvas rendered with `clues` populated via `renderToString`
- WHEN the resulting HTML string is scanned
- THEN it MUST NOT contain the substring `url(#`

### Requirement: Carrier Art Placement via placeArt()

`placeArt(art, height, center, grip?)` SHALL be the single pure exported function computing where carrier/lens art is drawn: given an optional grip point `[gx, gy]` in the art's own 0..1 box, it MUST return the `x`, `y`, `width`, `height` that place the grip point exactly at `center`. When no grip is declared, it MUST default to the box centre `(0.5, 0.5)`. Every call site (`TraceCanvas`, `home/modes.ts`) MUST use this function and MUST NOT compute its own centring offset.

#### Scenario: Declared grip lands on the target point
- GIVEN `CARRIER_LENS_ART`'s declared grip `(0.603, 0.391)` and a target center `C`
- WHEN `placeArt` is called with that grip
- THEN the returned box MUST place the art's `(0.603, 0.391)` point exactly at `C`, not the box's geometric centre

#### Scenario: No grip defaults to box centre
- GIVEN art with no declared grip
- WHEN `placeArt` is called
- THEN its result MUST equal calling it with grip `(0.5, 0.5)`

#### Scenario: TraceCanvas renders the carrier via placeArt's output
- GIVEN a trail rendered via `renderToString` with the carrier at a known position
- WHEN the carrier `<image>`'s `x`/`y` attributes are read from the HTML string
- THEN they MUST equal `placeArt`'s computed `x`/`y` for that art and grip, not the previous `(0.5, 0.5)` bounding-box formula
# Delta for Trace Canvas

## ADDED Requirements

### Requirement: Hazard Rendering via Optional Art

`TraceHazards` SHALL accept an optional per-hazard art declaration. When a
hazard declares art, its element SHALL render as a `<g>` carrying a
`transform="translate(x,y)"` written by the same rAF loop that currently
mutates `cx`/`cy`, holding a static `<image>` placed by `placeArt`. When a
hazard declares no art, it MUST render exactly as today: a `<circle>` with
mutated `cx`/`cy`. `trail1`'s hazard MUST NOT change: its rendered
attributes before and after this change MUST be numerically identical.

#### Scenario: An art-bearing hazard renders as a transformed group with an image

- GIVEN a hazard configured with art, rendered via `renderToString`
- WHEN the hazard's element is inspected
- THEN it MUST be a `<g>` with a `transform` attribute containing
  `translate(`, holding an `<image>` child, and MUST NOT be a `<circle>`

#### Scenario: A hazard with no art keeps the circle default

- GIVEN a hazard configured with no art
- WHEN rendered
- THEN it MUST be a `<circle>` with `cx`/`cy` attributes, exactly as before
  this change

#### Scenario: trail1's hazard is byte-identical

- GIVEN `trail1`'s hazard configuration, unchanged by this proposal
- WHEN its rendered attributes are compared before and after this change at
  the same `timeMs`
- THEN every numeric attribute MUST be equal

### Requirement: Level-Sourced Goal Art

`TraceCanvas`'s existing `endArt` prop, when the caller supplies a level's
`goalArt` (level-engine), SHALL render that art at the end of the route in
place of any other end-of-route art. This adds no new prop to `TraceCanvas`:
`endArt` already accepts any `TraceStandingArt` (the existing carrier/lens
art placement behaviour); the caller decides which art value to pass.

#### Scenario: endArt renders the supplied goal art

- GIVEN `TraceCanvas` rendered with `endArt` set to the medusa's
  `TraceStandingArt`
- WHEN the HTML string is inspected
- THEN the medusa's `href` MUST appear as an `<image>`'s
  `href`/`xlink:href` at the route's end position
