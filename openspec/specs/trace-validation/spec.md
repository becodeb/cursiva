# Trace Validation Specification

## Purpose

Evaluates a resampled user stroke against the letter's ideal path: checkpoint order (mechanical counterclockwise enforcement), continuity, and the docs/02 avg-distance score with tolerant margins — wider for touch.

## Requirements

### Requirement: Checkpoint Order Validation

The system SHALL determine whether the stroke passes within each checkpoint's `radius` and MUST require activation in strictly increasing `order` (1→N). Out-of-order activation — e.g. a clockwise stroke over the `a` oval — MUST fail order validation and MUST flag wrong-direction guidance (docs/02 rescue).

#### Scenario: Counterclockwise `a` passes

- GIVEN a stroke following the `a` ductus counterclockwise
- WHEN validated
- THEN checkpoints MUST activate in order 1→6 and order MUST pass

#### Scenario: Clockwise `a` fails mechanically

- GIVEN a stroke drawn clockwise around the `a` oval
- WHEN validated
- THEN order MUST fail and the wrong-direction flag MUST be set (criterion 1, mechanical)

#### Scenario: Skipped checkpoint

- GIVEN a stroke that never enters cresta_ola's radius
- WHEN validated
- THEN order MUST fail

### Requirement: Continuity

For single-stroke letters (`a`, `c`), the system SHALL mark `isContinuous = false` when the pointer lifts before the final checkpoint is activated, and SHALL report it with the result.

#### Scenario: Early lift

- GIVEN a stroke that lifts right after activating checkpoint 2 of `a`
- WHEN evaluated
- THEN `isContinuous` MUST be false

### Requirement: Geometric Score

The score SHALL follow the docs/02 formula with named constants: `Score = max(0, 100 − 100·Σᵢ dist(User[i], Ideal[i]) / (K · Tolerance))`, equivalently `max(0, 100 − 100·meanDev / Tolerance)` with `meanDev = Σᵢ dist(User[i], Ideal[i]) / K`, where `dist` is Euclidean and `Ideal[]` is the ideal path arc-length-sampled to K points (K = 64). Fréchet distance is deferred. `Tolerance` values are DESIGN-FIXED (proposed: TolPen = 12, TolTouch = 18).

#### Scenario: Perfect trace scores 100

- GIVEN a user stroke that overlaps the ideal path
- WHEN scored
- THEN the score MUST be 100

#### Scenario: Score bounds

- GIVEN any stroke
- WHEN scored
- THEN the score MUST be clamped to [0, 100]

### Requirement: Touch Tolerance Widening

The system SHALL widen `Tolerance` for `touch` pointers versus fine pointers: `TolTouch = TolPen × 1.5` (factor DESIGN-MAY-TUNE). Natural finger deviation MUST pass (docs/04 criterion 3): a touch stroke with mean deviation of 5 virtual px MUST score ≥ 70, while the same stroke under pen tolerance MUST score < 70.

#### Scenario: Natural deviation passes on touch

- GIVEN a touch stroke with mean deviation 5 virtual px from the ideal path
- WHEN scored with TolTouch = 18
- THEN the score MUST be ≥ 70 (approved)

#### Scenario: Same trace is stricter for pen

- GIVEN the identical stroke evaluated with pointerType pen (TolPen = 12)
- WHEN scored
- THEN the score MUST be < 70 and lower than the touch score

### Requirement: Admission and Approval

Approval SHALL require: order passed AND continuity kept AND score ≥ ApprovalThreshold (DESIGN-FIXED, proposed 70). A stroke with no captured movement MUST NOT be evaluated — no score, no feedback, no approval.

#### Scenario: Empty stroke not evaluated

- GIVEN `pointerdown`/`pointerup` with no movement
- WHEN validation runs
- THEN no score MUST be produced and nothing MUST be approved

#### Scenario: Full pass approves

- GIVEN correct order, continuous stroke, score 82
- WHEN evaluated
- THEN the trace MUST be approved