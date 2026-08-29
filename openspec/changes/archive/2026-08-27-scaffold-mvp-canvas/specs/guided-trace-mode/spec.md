# Guided Trace Mode (Mode 1) Specification

## Purpose

Teaches the ductus (docs/04 Mode 1): plays the letter's animated draw-path demo (framer-motion `pathLength`), then guides the user to follow the checkpoints in order within tolerance — the rail.

## Requirements

### Requirement: Guided Demo Playback

The mode SHALL play the letter's `animationTimeline`: the ink path MUST draw via framer-motion `pathLength` 0→1 with the `draw_path` step's delay and duration. Pointer input during the demo MUST NOT be captured as a trace or evaluated. When the timeline ends, the mode SHALL signal ready-to-draw.

#### Scenario: Demo completes into ready state

- GIVEN seed `c` selected
- WHEN the mode starts
- THEN the path MUST animate `pathLength` 0→1 at the configured delay over 1.2s, and after the full timeline (max(delay + duration) + 200ms) the mode MUST become ready

#### Scenario: Input ignored during demo

- GIVEN the demo is animating
- WHEN the user touches the canvas
- THEN no stroke MUST be created and nothing MUST be evaluated

### Requirement: Checkpoint Follow Rail

In ready state, the mode SHALL evaluate the live stroke against checkpoints in strict order (trace-validation rules) using each checkpoint's `radius`. A stroke that leaves the current checkpoint's radius before activation MUST show a visual rescue hint and MUST NOT activate that checkpoint.

#### Scenario: Follows the rail to completion

- GIVEN ready state on `c`
- WHEN the user traces checkpoints 1→5 within radius in one stroke
- THEN each checkpoint MUST activate in order and the mode MUST complete

#### Scenario: Leaves the rail

- GIVEN ready state with the stroke near checkpoint 2
- WHEN the stroke drifts beyond radius before checkpoint 2 activates
- THEN a rescue hint MUST appear and checkpoint 2 MUST remain unactivated until the stroke re-enters its radius

#### Scenario: Wrong direction triggers rescue

- GIVEN ready state on `a`
- WHEN the user draws the oval clockwise
- THEN activation MUST fail in reverse order and the wrong-direction rescue hint MUST be shown

### Requirement: Completion Handoff

On activating every checkpoint in order within tolerance, the mode SHALL emit a completion signal so the app can advance that letter to free-trace (Mode 2).

#### Scenario: Advances to free trace

- GIVEN completed guided follow on `a`
- WHEN the completion signal fires
- THEN the app SHALL switch to free-trace mode for `a`