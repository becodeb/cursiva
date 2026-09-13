# Guided Trace Mode (Mode 1) Specification

## Purpose

Teaches the ductus (docs/04 Mode 1): plays the letter's animated draw-path demo (framer-motion `pathLength`), then guides the user to follow the checkpoints in order within tolerance — the rail.

## Requirements

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

On activating every checkpoint in order within tolerance, the mode SHALL
emit a completion signal so the app can advance that letter to free-trace
(Mode 2). When the completed level's `LevelConfig` carries an `arrange`
field (`level-engine` capability), the checkpoint-follow evaluation this
requirement rests on MUST NOT run at all while `isArranged`
(`object-arrange` capability) reports `false` for the level's live
arrange state: the level screen suppresses stroke evaluation entirely
during the arrange phase (no ink is drawn, and a release is never scored)
rather than computing a separate arrangement score to AND against trace
completion. `docs/13` §6's completion criterion is therefore a
conjunction enforced by SEQUENCING, not by a second pillar alongside
accuracy/fluency: the arrangement must complete before a single stroke is
ever captured as ink, and once it has, this requirement's own
checkpoint-follow evaluation runs exactly as it does on any level with no
`arrange` field. A level with no `arrange` field completes exactly as
before this change.

(Previously: completion was checkpoint-follow alone, with no dependency
on any prior phase. `docs/13` §2's víbora adventure is the first to
require ordering objects before the trace itself can begin —
`design.md` §0 A4/§5.2 of `snake-drag-and-art-corridor`, which resolved
the proposal's own "conjunction" framing into a sequencing gate rather
than a simultaneous second score.)

#### Scenario: Advances to free trace on a level with no arrange field

- GIVEN completed guided follow on `a`, a level carrying no `arrange`
  field
- WHEN the completion signal fires
- THEN the app SHALL switch to free-trace mode for `a`, unchanged from
  before this change

#### Scenario: An arrange-gated level's stroke evaluation is suppressed until arranged

- GIVEN `snake2` with `isArranged` reporting `false` for its live arrange
  state
- WHEN a pointer release is attempted on the canvas
- THEN no ink MUST be drawn and no checkpoint-follow evaluation MUST run
  — the completion signal MUST NOT fire

#### Scenario: An arrange-gated level completes once arranged and traced

- GIVEN `snake2` with `isArranged` reporting `true`, then traced correctly
  (every checkpoint activated in order, all three snakes within
  tolerance)
- WHEN the checkpoint-follow evaluation runs
- THEN the completion signal MUST fire, exactly as on a level with no
  `arrange` field

#### Scenario: The arrange requirement never affects the twelve pre-existing reveal levels

- GIVEN any of the twelve `reveal`-bearing levels, which carry no
  `arrange` field
- WHEN their own completion criterion (`reveal-grid` capability) is
  evaluated
- THEN it MUST be unaffected by this requirement