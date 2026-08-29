# Trace Validation Specification

## Purpose

Evaluates a resampled user stroke against the letter's ideal path: checkpoint order (mechanical counterclockwise enforcement), continuity, and the docs/02 avg-distance score with tolerant margins — wider for touch.

## Requirements

### Requirement: Checkpoint Order Validation

The system SHALL determine whether the stroke passes within each checkpoint's `radius` and MUST require activation in strictly increasing `order` (1→N). Activation SHALL be by containment of the expected order: the expected checkpoint SHALL activate whenever the head is inside its zone, fresh outside→inside entry or not. Only the expected order SHALL activate — co-located or overlapping zones remain order-gated and MUST NOT activate early. `orderPassed` SHALL equal `sorted.length > 0 && activated.length === sorted.length` (the empty-input floor stays: zero checkpoints MUST NOT pass). `wrongDirection` SHALL latch on a fresh entry into a still-pending zone ahead of the expected order, with a benign-reentry carve-out for fresh entries into already-activated zones, and SHALL reset to false when the full strict-order pass completes — a genuine reversal still fails because it can never activate every checkpoint in order. This leniency is pedagogically intended for reentrant letters like `c`. Out-of-order activation — e.g. a clockwise stroke over the `a` oval — MUST fail order validation and MUST flag wrong-direction guidance (docs/02 rescue).

(Previously: activation required a fresh outside→inside entry of the expected order; `wrongDirection` never cleared; `orderPassed` = `N > 0 && !wrongDirection && activated.length === N`.)

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

#### Scenario: Reentrant `c` backtrack passes by containment

- GIVEN a `c` stroke whose head enters checkpoint 3's zone before checkpoint 2 activates (backtrack after the bounce)
- WHEN the expected order reaches 3 and the head nears its center
- THEN checkpoint 3 MUST activate by containment, the full pass [1..4] MUST succeed, and `wrongDirection` MUST read false

#### Scenario: Co-located zones stay order-gated

- GIVEN an overlapping checkpoint pair (e.g. `a` entry/cierre sharing a center) with the head inside the shared zone while expected is 1
- WHEN the head leaves without activating further orders
- THEN only the expected order MUST activate; the later order MUST activate no earlier than when expected reaches it

#### Scenario: Empty checkpoint list stays a fail

- GIVEN a validation with zero checkpoints
- WHEN evaluated
- THEN `orderPassed` MUST be false

### Requirement: Continuity

For single-stroke letters (`a`, `c`), the system SHALL mark `isContinuous = false` when the pointer lifts before the final checkpoint is activated, and SHALL report it with the result.

#### Scenario: Early lift

- GIVEN a stroke that lifts right after activating checkpoint 2 of `a`
- WHEN evaluated
- THEN `isContinuous` MUST be false

### Requirement: Geometric Score

The score SHALL follow the area-cloud model with named constants: `Score = max(0, 100 − 100·Σᵢ penalizedᵢ / (K · Tolerance))`, where `penalizedᵢ = max(0, dist(User[i], cloud) − AREA_GRACE)`, `dist` is the Euclidean MIN distance from the resampled user point `User[i]` to ANY point of the ideal AREA cloud, `K = 64` (resampled user cardinality), `AREA_GRACE = 3` (dead zone: a trace point within 3px of the letter area scores as a perfect hit), and `Tolerance` is DESIGN-FIXED (TolPen = 16, TolTouch = 26). The ideal is the REAL glyph AREA — a dense point cloud extracted from the Kalam-Regular font outline (letters/ideal_a.ts, ideal_c.ts), NOT a thin centerline. There is NO index pairing: each user point scores against the whole cloud by nearest-neighbor distance, so a trace that covers the letter body in any parametrization scores well. Fréchet distance is deferred. Tolerances are widened because the glyph strokes are ~36px thick — a trace anywhere inside the body scores near-perfect, and only a clear miss outside the body is penalized — and this is deliberately child-friendly.

#### Scenario: Perfect trace scores 100

- GIVEN a user stroke that overlaps the ideal path
- WHEN scored
- THEN the score MUST be 100

#### Scenario: Score bounds

- GIVEN any stroke
- WHEN scored
- THEN the score MUST be clamped to [0, 100]

### Requirement: Touch Tolerance Widening

The system SHALL widen `Tolerance` for `touch` pointers versus fine pointers: `TolTouch` (26) wider than `TolPen` (16), DESIGN-FIXED. Natural finger deviation MUST pass (docs/04 criterion 3): a touch stroke 8 virtual px outside the letter area MUST score ≥ 70, while the same stroke under pen tolerance MUST score < 70.

#### Scenario: Natural deviation passes on touch

- GIVEN a touch stroke 8 virtual px outside the letter area (distance to cloud = 8)
- WHEN scored with TolTouch = 26 (penalized = 8 − 3 = 5)
- THEN the score MUST be 100 − 100·5/26 ≈ 80.8 ≥ 70 (approved)

#### Scenario: Same trace is stricter for pen

- GIVEN the identical 8px-off stroke evaluated with pointerType pen (TolPen = 16)
- WHEN scored (penalized = 5)
- THEN the score MUST be 100 − 100·5/16 = 68.75 < 70 and lower than the touch score (rejected)

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