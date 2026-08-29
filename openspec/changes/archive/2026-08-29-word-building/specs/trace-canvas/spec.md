# Delta for `trace-canvas`

## ADDED Requirements

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

## MODIFIED Requirements

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