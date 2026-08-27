# Main Screen Specification

## Purpose

Thin book-style home screen: letter picker, per-letter progress display, and a bloom-on-complete element that flowers when the "ola" family is complete.

## Requirements

### Requirement: Letter Picker

The screen SHALL list every letter in the registry (`a`, `c`) and SHALL launch the selected letter's flow — guided demo (Mode 1) then free trace (Mode 2) — on selection.

#### Scenario: Selecting a letter starts its flow

- GIVEN the main screen with seeds `a` and `c`
- WHEN the user selects `a`
- THEN the guided-trace flow for `a` MUST start

### Requirement: Per-Letter Progress Display

The screen SHALL show each letter's stored progress percentage from `ProgressStore` and MUST refresh it whenever progress changes.

#### Scenario: Stored progress shown

- GIVEN stored progress `a` = 90, `c` = 40
- WHEN the screen renders
- THEN each letter MUST display its stored percentage

#### Scenario: Progress refreshes

- GIVEN the screen showing `c` = 40
- WHEN `c` completes a free trace and progress becomes 100
- THEN the display for `c` MUST update to 100 without a manual reload

### Requirement: Family Bloom

The screen SHALL include an interactive element that blooms when every letter in the `ola` family reaches completion, and MUST derive its state from stored progress on load so the bloomed state survives reloads. Family-complete threshold is DESIGN-FIXED (proposed: progress = 100 for all family letters). The bloomed element SHOULD respond to interaction (e.g. replay its bloom).

#### Scenario: Bloom triggers on completion

- GIVEN stored progress `a` = 100, `c` = 100
- WHEN the screen renders or progress updates complete the family
- THEN the element MUST be in its bloomed (flowered) state

#### Scenario: Bloom survives reload

- GIVEN the family already complete
- WHEN the page reloads
- THEN the element MUST render bloomed without any new completion occurring

#### Scenario: Incomplete family stays dormant

- GIVEN stored progress `a` = 100, `c` = 40
- WHEN the screen renders
- THEN the element MUST NOT be bloomed

## Open Values (design phase)

- Family-complete threshold value (proposed: every family letter at 100).