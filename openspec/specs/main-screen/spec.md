# Main Screen Specification

## Purpose

Thin book-style home screen: letter picker, per-letter progress display, and a bloom-on-complete element that flowers when the "ola" family is complete.

## Requirements

### Requirement: Letter Picker

The screen SHALL list every registered letter as a build button; pressing one SHALL append that letter to the current word iff registered AND word-eligible, and SHALL restart the guided demo for the whole word on every append (the flow returns to guided mode so the sequential stroke replays from the first letter; mode is no longer kept across appends). The word flow SHALL remount whenever the word changes, keyed by `word.join('')`. The current-word label and canvas SHALL render only while `word.length > 0` (placeholder otherwise).

(Previously: selection launched the single letter's flow directly; the flow KEPT its current mode across appends — after the demo completed the appended word appeared without replay.)

#### Scenario: Selecting a letter appends and replays the demo

- GIVEN the free flow for `a` running (demo already completed)
- WHEN the user presses `c`
- THEN the word MUST become `ac`, the flow MUST return to guided mode, and the guided demo MUST restart for the whole word from the first letter

#### Scenario: Remount key follows the word

- GIVEN word `ac`
- WHEN `a` is appended
- THEN the flow MUST remount with key `aca`

#### Scenario: Word-ineligible letter refused

- GIVEN a letter failing `isWordEligible`
- WHEN it is pressed
- THEN it MUST NOT append and the word MUST NOT change

#### Scenario: Empty word shows placeholder

- GIVEN an empty word
- WHEN the screen renders
- THEN no canvas or current-word label MUST render

### Requirement: Per-Letter Progress Display

The screen SHALL show each letter's stored progress percentage from `ProgressStore` and MUST refresh it whenever progress changes. Progress SHALL be persisted ONLY when `word.length === 1`; multi-letter words MUST NOT write progress.

(Previously: any completed flow persisted progress.)

#### Scenario: Stored progress shown

- GIVEN stored progress `a` = 90, `c` = 40
- WHEN the screen renders
- THEN each letter MUST display its stored percentage

#### Scenario: Progress refreshes

- GIVEN the screen showing `c` = 40
- WHEN `c` completes a free trace and progress becomes 100
- THEN the display for `c` MUST update to 100 without a manual reload

#### Scenario: Multi-letter completion not persisted

- GIVEN word `ca` completing a free trace
- WHEN it finishes
- THEN `ProgressStore` MUST remain unchanged

### Requirement: Keyboard Word Building

The screen SHALL build words from the keyboard: `a–z` SHALL append when registered AND word-eligible (letter-model `isWordEligible`); `Backspace` SHALL delete the last letter and SHALL call `preventDefault()`; keys pressed while Ctrl/Alt/Meta/Shift are held (uppercase included) and the space bar SHALL be ignored; typing while an input/textarea has focus MUST NOT mutate the word. The "Borrar" button SHALL clear the whole word.

#### Scenario: Letter appends on keydown

- GIVEN word `c`
- WHEN the user types `a`
- THEN the word MUST become `ca` and the guided demo MUST restart for the whole word

#### Scenario: Backspace removes and prevents default

- GIVEN word `ca`
- WHEN the user presses Backspace
- THEN the word MUST become `c` and the browser default MUST be prevented

#### Scenario: Modifiers, uppercase, and space ignored

- GIVEN Ctrl held, or Shift producing `A`, or the space bar
- WHEN the user presses a key
- THEN no append MUST occur

#### Scenario: Focused input exempt

- GIVEN focus inside an input or textarea
- WHEN any key is typed
- THEN the word MUST NOT change

#### Scenario: Borrar clears the word

- GIVEN word `casa`
- WHEN "Borrar" is pressed
- THEN the word MUST be empty and the canvas MUST hide

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

### Requirement: Checkpoint Overlay Toggle

The screen SHALL render a toggle button labeled verbatim "Mostrar puntos del trazo", and SHALL thread its state into both guided and free trace modes and into the launched selection (letter or combo), so the overlay choice carries through the whole flow.

#### Scenario: Toggle ON carries into the launched flow

- GIVEN the toggle ON with dev checkpoint data available
- WHEN the user selects a letter or pair
- THEN the launched flow MUST render the checkpoint overlay in both modes

#### Scenario: Toggle OFF keeps overlay hidden in production

- GIVEN the toggle OFF in a non-dev session
- WHEN the user selects a letter or pair
- THEN the checkpoint overlay MUST NOT render in either mode

## Open Values (design phase)

- Family-complete threshold value (proposed: every family letter at 100).