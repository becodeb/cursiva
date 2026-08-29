# Delta for `guided-trace-mode`

## MODIFIED Requirements

### Requirement: Guided Demo Playback

The mode SHALL play ALL of the timeline's `draw_path` steps, mapping each to a demo entry with that step's delay, duration, and `properties.d`; when a step carries no `properties.d`, the letter's `pathDefinition.d` SHALL be used (single-letter behavior preserved). Every entry SHALL draw via framer-motion `pathLength` 0→1 at its own delay over its own duration, in timeline order. Pointer input during ANY demo step MUST NOT be captured as a trace or evaluated. When the full timeline ends (max(delay + duration) + 200ms, unchanged), the mode SHALL signal ready-to-draw.

(Previously: only the FIRST `draw_path` step played — a word demo showed a single segment; `readyMs` already spanned all steps.)

#### Scenario: Multi-step word demo plays sequentially

- GIVEN a 2-letter word config whose timeline has letter, connector, and secondary `draw_path` steps
- WHEN the mode starts
- THEN every entry MUST draw in order at its own delay/duration (first at 1000ms) and the mode MUST become ready at max(delay + duration) + 200ms

#### Scenario: Single-letter fallback draws the letter path

- GIVEN a single-letter config whose `draw_path` has no `properties.d`
- WHEN the mode starts
- THEN exactly ONE demo entry MUST draw the letter's `pathDefinition.d` at the step's configured delay and duration

#### Scenario: Input ignored during demo

- GIVEN the demo is animating
- WHEN the user touches the canvas
- THEN no stroke MUST be created and nothing MUST be evaluated