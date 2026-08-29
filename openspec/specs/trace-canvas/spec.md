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