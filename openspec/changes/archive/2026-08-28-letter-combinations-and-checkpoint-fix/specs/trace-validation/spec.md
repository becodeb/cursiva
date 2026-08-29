# Delta for `trace-validation`

## MODIFIED Requirements

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