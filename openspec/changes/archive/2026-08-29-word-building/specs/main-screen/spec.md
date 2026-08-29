# Delta for `main-screen`

## ADDED Requirements

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Combo Picker

(Reason: decision 1 — free word building replaces the fixed 12-pair picker (US4).)
(Migration: picker UI and `COMBO_REGISTRY` removed; pair-selection tests (reversed-pair distinctness) replaced by word-building tests.)