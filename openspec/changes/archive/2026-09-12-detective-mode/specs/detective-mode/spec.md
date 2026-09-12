# Detective Mode Specification

## Purpose

The four-trail detective campaign that replaces phase 1's six unthemed
corridor levels: clue collection along a bounded trail, the pure clue-state
reducer, the `PISTAS` rail filing moment, the deduction screen, and the typed
placeholder-asset registry. No copy beyond the single word `PISTAS`; no font
subsystem (D6).

## Requirements

### Requirement: Clue Collection State Machine

The mode MUST expose a pure, DOM-free reducer that tracks each trail's clue
marks as `drained` or `earned`. A mark MUST transition from `drained` to
`earned` exactly once, the moment the magnifying glass's live position passes
within the mark's capture radius. The transition MUST be a discrete state
change: no interpolation, easing, or ambient motion MAY be driven by the
reducer while the pointer is down (D5). Passing an already-earned mark again
MUST NOT re-fire the transition or any side effect.

#### Scenario: Mark flips exactly once as the glass passes

- GIVEN a trail's clue mark in `drained` state
- WHEN the reducer receives a position update placing the glass within the
  mark's capture radius
- THEN the mark's state MUST become `earned` in that single dispatch, with no
  intermediate state emitted

#### Scenario: No motion while the pointer is down

- GIVEN a `drained` mark and a stream of position updates while the pointer
  remains down
- WHEN each update is applied to the reducer
- THEN the reducer's output MUST contain no tween, delay, or animation
  parameter — only the discrete `drained`/`earned` value per mark

#### Scenario: Re-passing an earned mark is inert

- GIVEN a mark already in `earned` state
- WHEN a later position update places the glass inside that same mark's
  capture radius again
- THEN the reducer's returned state MUST equal its input state and MUST emit
  no collection event

### Requirement: Trail Completion Lamp and Rail Filing

When a trail's route is finished (per the existing pass/goal signal), the
mode SHALL switch on that trail's lamp and file its clue into the `PISTAS`
rail. This filing MUST fire only once, after the trail is finished — never
mid-trace — honouring the rule that no thematic animation runs while the
child traces (D5, `docs/05:14`).

#### Scenario: Finishing a trail lights the lamp and files the clue

- GIVEN a trail whose route has just been completed
- WHEN the completion signal fires
- THEN the trail's lamp state MUST become "on" and its clue MUST appear in
  the `PISTAS` rail's collected set exactly once

#### Scenario: Filing is refused mid-trace

- GIVEN a trail with every mark `earned` but whose route has NOT been
  completed
- WHEN the rail's collected set is read
- THEN that trail's clue MUST be absent and its lamp MUST remain off

### Requirement: Deduction Screen

With all four clues filed, the mode SHALL present a deduction screen offering
exactly four animal choices, of which exactly one (the hen) is correct.
Picking the hen MUST close the case. Picking any other animal MUST cost
nothing: no score penalty, no lockout, and the child MUST be able to pick
again immediately (D4).

#### Scenario: All four clues collected reaches the deduction screen

- GIVEN all four trails' clues are `earned` and filed
- WHEN the mode evaluates its state
- THEN the deduction screen MUST become reachable, presenting four animal
  choices

#### Scenario: Correct pick closes the case

- GIVEN the deduction screen with four choices shown
- WHEN the child picks the hen
- THEN the mode MUST record the case as closed

#### Scenario: Wrong pick is free and immediately retryable

- GIVEN the deduction screen with four choices shown
- WHEN the child picks a distractor (duck, pig, or cow)
- THEN no penalty or score change MUST occur, the case MUST remain open, and
  the child MUST be able to pick again without any additional action

### Requirement: Colour Asset Registry

The mode SHALL expose a typed placeholder-asset registry with one entry per
clue kind (droplets, corn, footprints, feathers) and one per animal choice, so
real art can replace placeholders by editing the registry alone. Each trail
MUST own exactly one earned colour that appears only once its clue is earned;
elsewhere the scene MUST stay ink-on-paper. Footprints are the sole exception:
their earned colour MUST progress grey to black and MUST NOT use any
chromatic (hued) colour.

#### Scenario: Footprints earn in greyscale only

- GIVEN the footprints trail's clue mark transitions to `earned`
- WHEN its rendered colour token is read from the registry
- THEN the token MUST be a grey-to-black value and MUST NOT be any chromatic
  colour

#### Scenario: Trail colour absent before earning

- GIVEN a trail whose clue is still `drained`
- WHEN the scene's rendered colours are inspected
- THEN that trail's registered earned colour MUST NOT appear anywhere
