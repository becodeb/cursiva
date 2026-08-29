# Free Trace Mode (Mode 2) Specification

## Purpose

Free trace over the guide (docs/04 Mode 2): the user draws freely, the stroke renders as fluid ink, evaluation runs ON RELEASE, and feedback is a soft Web Audio tone plus a star (SVG placeholder) with tolerant approval.

## Requirements

### Requirement: Free Trace over Guide

The mode SHALL render the letter's ideal path as a faint guide and capture the user stroke through the trace canvas. Evaluation MUST NOT run while the stroke is in progress.

#### Scenario: Drawing shows ink only

- GIVEN free mode on `a`
- WHEN the user strokes
- THEN ink MUST render and no score, tone, or star MAY appear before release

### Requirement: Score on Release

On `pointerup`, the system SHALL evaluate the complete stroke per trace-validation (order, continuity, score — touch-widened when `pointerType` is touch) and MUST present feedback exactly once per stroke.

#### Scenario: Release triggers single evaluation

- GIVEN a completed stroke
- WHEN `pointerup` fires
- THEN exactly one evaluation MUST run and exactly one feedback outcome MUST be presented

### Requirement: Approval Feedback

On approval (order passed, continuity kept, score ≥ ApprovalThreshold), the system SHALL play a short soft tone through the Web Audio API and SHALL show a star rendered from placeholder SVG geometry under the themes assets path. Non-approved traces MUST NOT play the approval tone and MUST show rescue guidance instead of the star.

#### Scenario: Approved trace rewarded

- GIVEN a touch stroke passing order, continuity, and score ≥ 70
- WHEN released
- THEN a soft tone MUST play and the star MUST render

#### Scenario: Wrong direction not rewarded

- GIVEN a clockwise stroke on `a`
- WHEN released
- THEN no approval MUST occur, no approval tone MUST play, and a rescue hint MUST show

#### Scenario: Natural deviation still approves

- GIVEN a touch stroke with mean deviation ≤ 5 virtual px (criterion 3)
- WHEN released
- THEN the trace MUST be approved and rewarded

### Requirement: Retry

After feedback, the mode MUST clear the previous stroke and result so the user can immediately retry.

#### Scenario: New stroke starts clean

- GIVEN feedback has been shown
- WHEN the user begins a new stroke
- THEN the canvas MUST be clear and the previous star/hint MUST be hidden