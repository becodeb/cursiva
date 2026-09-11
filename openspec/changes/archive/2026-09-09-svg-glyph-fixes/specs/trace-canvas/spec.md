# Delta for Trace Canvas

## ADDED Requirements

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
