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

### Requirement: resolveEnterAction Chooses Between Play and the Narrative Entry

The screen module SHALL expose a pure `resolveEnterAction(levelId,
records)`, mirroring `resolveNextAction`'s shape and export, called from
`App.tsx`'s `ZooMap.onEnter` in place of a hardcoded `{view:'play',
levelId}`. It MUST return the `'intro'` `GameView` variant whenever
`levelId` is `levelIds[0]` of ANY registered adventure — including
`duck-trail1`, `sheep-hill1`, `llama-peak1`, `glass1`, `sand1`, and
`night1` — unconditionally, not gated on `records` and not gated on whether
the adventure declares an `animal`, and MUST return `{type:'play', levelId}`
for every other level id, unchanged from before this change. `records`
stays a required parameter for symmetry with `resolveNextAction` and for a
later change's unlock rules.

(Previously: this requirement's asserted scope covered `duck-trail1`,
`sheep-hill1`, and `llama-peak1`; `glass1`, `sand1`, and `night1` widen it to
the first animal-less adventures.)

#### Scenario: Entering any adventure's first level resolves to the narrative entry

- GIVEN `records` including empty records, `resolveEnterAction` called with
  `'duck-trail1'`, `'sheep-hill1'`, `'llama-peak1'`, `'glass1'`, `'sand1'`,
  and `'night1'` in turn
- WHEN each call is evaluated
- THEN each MUST return the `'intro'` variant for its own level id

#### Scenario: Every other level resolves straight to play

- GIVEN any other catalog level id (e.g. `'sheep-hill2'`, `'glass2'`,
  `'trail1'`)
- WHEN `resolveEnterAction` is called with that id
- THEN it MUST return `{type:'play', levelId}` unchanged

#### Scenario: resolveEnterAction is pure and DOM-free

- GIVEN the function called directly, outside any component
- WHEN inspected
- THEN it MUST require no `window`/DOM access and no component context

#### Scenario: An animal-less adventure's first level still resolves to the narrative entry

- GIVEN `glass1`, whose adventure declares no `animal`
- WHEN `resolveEnterAction('glass1', records)` is evaluated
- THEN it MUST return the `'intro'` variant, exactly as for an
  animal-bearing adventure

### Requirement: Narrative Entry GameView Variant and App Wiring

`GameView` SHALL gain an `'intro'` variant carrying the target level id
(`duck-trail1` today), rendered by `GameScreen` as a new narrative entry
screen distinct from `'play'`/`'map'`/`'deduce'`. `nextView`'s existing
reducer switch MUST remain unaffected by this addition — the same
reasoning already established for `'deduce'` (`level-engine` spec
"Deduction View Reachable from nextView"): the intro is reached only
through `App.tsx`'s `onEnter` calling `resolveEnterAction`, never through
a `GameAction`. `App.tsx`'s `onEnter` MUST route through
`resolveEnterAction` instead of hardcoding `{view:'play', levelId}`.

#### Scenario: onEnter routes duck-trail1 through the intro

- GIVEN `App`'s `ZooMap.onEnter('duck-trail1')` invoked
- WHEN the resulting shell/view is inspected
- THEN it MUST be the narrative entry view, not the play view

#### Scenario: onEnter routes every other level straight to play

- GIVEN `App`'s `ZooMap.onEnter('duck-trail2')` invoked
- WHEN the resulting shell/view is inspected
- THEN it MUST equal `{view:'play', levelId:'duck-trail2'}`, unchanged
  from before this change

### Requirement: Narrative Entry Screen Content

The narrative entry screen SHALL render the octopus with its backpack, the
speech bubble, and — when the entering adventure declares an `animal` — that
adventure's OWN registered animal via `ZOO_ANIMAL_ART` (`detective-mode`
"ZooAnimalId Widens the Zoo's Animal Vocabulary") — through
`detective/CaptionedArt.tsx` (`label` required, audited by
`detective/captionAudit.ts`). When the adventure declares no `animal`
(`glass`, `sand`, `night`), the screen MUST render its own `intro` line with
no animal art in its place, and MUST NOT fabricate a placeholder animal. No
new art asset MAY be introduced beyond what `detective/assets.ts` already
registers. Advancing past the screen (a tap) MUST lead into that adventure's
OWN first level (`adventure.levelIds[0]`), never a hardcoded level id.

(Previously: this requirement asserted an animal was ALWAYS rendered,
before `Adventure.animal` became optional.)

#### Scenario: An animal-bearing adventure's entry renders its own animal and line

- GIVEN the narrative entry rendered for the sheep adventure via
  `renderToString`
- WHEN the HTML string is inspected
- THEN `ZOO_ANIMAL_ART.oveja`'s registered `href` and the sheep adventure's
  own `intro` text MUST appear

#### Scenario: An animal-less adventure's entry renders no animal art

- GIVEN the narrative entry rendered for the glass adventure via
  `renderToString`
- WHEN the HTML string is inspected
- THEN no `ZOO_ANIMAL_ART` `href` MUST appear, and the glass adventure's own
  `intro` text MUST appear

#### Scenario: auditCaptions reports zero uncaptioned words for an animal-less entry

- GIVEN the glass adventure's narrative entry rendered via `renderToString`
- WHEN `auditCaptions` runs on the resulting HTML string
- THEN `uncaptioned` MUST be `[]`

#### Scenario: Tapping through reaches each adventure's own first level

- GIVEN the glass entry's and the night entry's advance controls invoked in
  turn
- WHEN the resulting views are inspected
- THEN they MUST equal `{view:'play', levelId:'glass1'}` and
  `{view:'play', levelId:'night1'}` respectively

### Requirement: The Opening Reuses AdventureIntro's Stage Pattern Without Modifying It

`screen/PrologueOpening.tsx` (`prologue-opening` capability) MUST reuse
`AdventureIntro`'s stage/`CaptionedArt`/speech-bubble SHAPE — backdrop,
octopus, bubble, one short line, tap to advance — without editing
`AdventureIntro.tsx` itself and without `AdventureIntro` importing
anything from the opening. `AdventureIntro`'s own rendered output for
every pre-existing adventure MUST stay byte-identical to before this
change.

#### Scenario: AdventureIntro's file is untouched by the opening's addition

- GIVEN `AdventureIntro.tsx`'s source before and after this change
- WHEN compared
- THEN it MUST be byte-identical

#### Scenario: AdventureIntro's rendered output for an existing adventure is unaffected

- GIVEN `AdventureIntro` rendered for `duck-trail1` before and after this
  change
- WHEN compared
- THEN they MUST be byte-identical

### Requirement: GameView Gains No New Member

`GameView`'s union MUST retain exactly its five existing variants (`map`,
`play`, `intro`, `deduce`, `close`) after this change. Neither the opening
nor the beat-sequence widening introduces a sixth variant: the opening is
reached through `App.tsx`'s `Shell` type (a layer above `GameView`, owned
by `App.tsx`, not by `GameScreen`), and the beat-sequence position is
tracked by state local to whatever renders the `'close'` view, not by
widening `GameView` itself. `nextView`'s existing reducer switch MUST
remain unaffected by this change, the same contract `'intro'`, `'deduce'`,
and `'close'` already held to when each was added.

#### Scenario: GameView's variant count is unchanged

- GIVEN `GameView`'s type definition before and after this change
- WHEN its variants are enumerated
- THEN both MUST list exactly the same five: `map`, `play`, `intro`,
  `deduce`, `close`

#### Scenario: nextView's reducer switch is unaffected

- GIVEN the reducer switch inspected before and after this change
- WHEN compared for every pre-existing input
- THEN it MUST remain unchanged

## Open Values (design phase)

- Family-complete threshold value (proposed: every family letter at 100).

### Requirement: Exit Returns to the Zoo Map

(Reason: `client/src/screen/HomeScreen.tsx` and its mode registry are
retired; the zoo map (`zoo-map` capability) is the application's entry screen
and the destination every exit affordance now reaches.)
(Migration: no call-site signature changes — `GameScreenProps.onExit` stays
required and is still what a trail's and the deduction screen's back
controls invoke. `App.tsx`'s `goHome` is renamed `goToMap` and now resolves
`Shell` to `{ at: 'map' }` instead of `{ at: 'home' }`.)

`GameScreenProps` SHALL carry a required `onExit: () => void` prop. Both exit
affordances inside the game shell — a trail's back control and the deduction
screen's back control — MUST invoke `onExit` instead of dispatching the
internal `back` action, so leaving any mode lands on the zoo map (`App`'s
`{ at: 'map' }` shell), never on the internal level map.
(Previously: `onExit` resolved to the home office, `App`'s `{ at: 'home' }`
shell rendering `HomeScreen`.)

#### Scenario: Omitting onExit is a type error
- GIVEN a `GameScreen` call site with `onExit` omitted
- WHEN the project is type-checked
- THEN it MUST fail to compile

#### Scenario: A trail's back control calls onExit
- GIVEN `LevelPlay` rendered inside `GameScreen` with a given `onExit`
- WHEN its exposed `onBack` prop is invoked directly
- THEN `onExit` MUST be called, and no dispatch to the internal map view MUST occur

#### Scenario: The deduction screen's back control calls onExit
- GIVEN `Deduction` rendered inside `GameScreen` with a given `onExit`
- WHEN its exposed `onBack` prop is invoked directly
- THEN `onExit` MUST be called

#### Scenario: Finishing an adventure that belongs to a zoo sector exits to the map
- GIVEN a finished level id owned by a zoo sector
- WHEN the after-level decision resolves and `onExit` fires
- THEN the resulting `App` shell MUST be the zoo map, never the home office

### Requirement: Level Map Is a Development-Gated Route

The level map view MUST NOT be reachable through ordinary exit navigation. It
SHALL remain reachable only when `isDevMode()` is `true` or via an explicit
`?nivel=mapa` deep-link route, and while reachable it MUST continue to own
"Reiniciar progreso" and "Modo prueba: abrir todo".
(Previously: ordinary exit resolved to the home office; this requirement's
sole edit re-anchors that destination to the zoo map, which is the same
`App`-shell re-anchoring `Exit Returns to the Zoo Map` records above.)

#### Scenario: Ordinary exit never resolves to the internal map
- GIVEN `isDevMode()` is `false` and no `?nivel=` deep link is present
- WHEN the child exits a trail or the deduction screen
- THEN the resulting view MUST be the zoo map, never the internal level map

#### Scenario: Dev-gated map still owns reset and test mode
- GIVEN `isDevMode()` is `true` and the level map is reached
- WHEN the map renders
- THEN its "Reiniciar progreso" and "Modo prueba: abrir todo" controls MUST render as before

### Requirement: close GameView Variant and resolveCloseAction

`resolveCloseAction(finishedLevelId, records)` SHALL remain exported and
pure, mirroring `resolveNextAction`'s call site, and MUST return the
`'close'` view when `finishedLevelId` is the last `levelIds` entry of an
adventure that declares a `closingBeat`. The SET of level ids this now
covers widens from one (`sand4`, the old `sand` adventure's last level)
to four: `glass2` (`peces`), `sand2` (`tortugas`), `glass4` (`monos`), and
`sand4` (`sendero`) — the last level of each of the four entrance
adventures, all four of which now declare a `closingBeat` (`zoo-map`
delta). It MUST continue to return the ordinary
`resolveNextAction`/exit-to-map outcome for every other finished level,
including every other reveal-grid or animal-recovering adventure
(`night`, `snake`, `bee`, `hedgehog`) and every pre-existing adventure.
`nextView`'s reducer switch MUST remain unaffected by this widening, the
same contract `'intro'`, `'deduce'`, and `'close'` already hold to.

(Previously: only `sand4` resolved to the `'close'` view; `glass4` was
asserted, by name, NOT to resolve to `'close'`. Since `glass4` is now
`monos`'s own last level and `monos` now declares a `closingBeat`,
`glass4` MUST resolve to `'close'` after this change — that prior
negative-case scenario is retired, not merely widened, by the entrance's
regrouping.)

#### Scenario: Finishing each entrance adventure's last level resolves to the close view

- GIVEN `finishedLevelId` in turn equal to `glass2`, `sand2`, `glass4`,
  and `sand4`
- WHEN `resolveCloseAction` is evaluated for each
- THEN all four MUST return the `'close'` view

#### Scenario: Finishing night4 still does not resolve to the close view

- GIVEN `finishedLevelId = 'night4'`
- WHEN `resolveCloseAction('night4', records)` is evaluated
- THEN it MUST NOT return the `'close'` view, and it MUST exit to the map
  as an ordinary sector-adventure completion, unchanged from before this
  change

#### Scenario: Finishing a mid-adventure level does not resolve to the close view

- GIVEN `finishedLevelId` equal to `glass1`, `sand1`, or `glass3` — none
  of which is any entrance adventure's LAST level
- WHEN `resolveCloseAction` is evaluated for each
- THEN none MUST return the `'close'` view

#### Scenario: nextView's reducer switch is unaffected

- GIVEN the reducer switch inspected before and after this change
- WHEN compared for every pre-existing input
- THEN it MUST remain unchanged

### Requirement: AdventureClosing Screen Renders the Transformation

`screen/AdventureClosing.tsx` SHALL render as a distinct, full-screen
component (props `{ adventure, onContinue }`) mirroring `AdventureIntro`'s
stage/`CaptionedArt`/speech-bubble shape as its own component —
`AdventureIntro` MUST remain byte-identical, unaffected by this addition.
It SHALL render `adventure.closingBeat`'s beats ONE AT A TIME, starting at
the first: a tap on the stage MUST advance to the NEXT beat in the list;
tapping past the LAST beat MUST invoke `onContinue`, leading to the zoo
map (`App`'s `{ at: 'map' }` shell) — exactly as a single-beat adventure's
one tap already led to `onContinue` before this change. The closing MUST
be reachable only via the `'close'` `GameView` produced by
`resolveCloseAction`, with no state persisted to suppress it: replaying
any entrance adventure's last level to completion MUST replay its closing
(all its beats, from the first), exactly as re-entering any adventure's
first level replays its intro.

(Previously: `AdventureClosing` rendered a SINGLE fixed beat, with one tap
leading straight to `onContinue`; this widens it to an ordered,
possibly-multi-beat sequence, reusing the same component and the same
`'close'` view — no new component, no new `GameView` variant.)

#### Scenario: A single-beat adventure's closing is unaffected

- GIVEN `AdventureClosing` rendered for `peces` (one beat)
- WHEN the stage is tapped once
- THEN `onContinue` MUST be invoked, exactly as before this change

#### Scenario: sendero's two-beat closing advances, then continues

- GIVEN `AdventureClosing` rendered for `sendero` (two beats)
- WHEN the stage is tapped once, then tapped again
- THEN the first tap MUST reveal the second beat (the magnifier line) and
  MUST NOT invoke `onContinue`; the second tap MUST invoke `onContinue`

#### Scenario: Each beat in sequence passes the caption audit

- GIVEN `AdventureClosing` rendered for `sendero`'s first beat, then its
  second, via `renderToString`
- WHEN `auditCaptions` runs on each resulting HTML string
- THEN `uncaptioned` MUST be `[]` for both

#### Scenario: AdventureIntro is unaffected by this widening

- GIVEN `AdventureIntro`'s rendered output before and after this change
- WHEN compared for the same props
- THEN they MUST be byte-identical

#### Scenario: Advancing past the closing resolves to the zoo map

- GIVEN the closing screen's LAST beat's `onContinue` path invoked
- WHEN the resulting `App` shell is inspected
- THEN it MUST equal `{ at: 'map' }`

#### Scenario: Replaying any entrance adventure's last level replays its full closing

- GIVEN `glass4` (`monos`'s last level) already filed once
- WHEN it is played to completion again
- THEN `resolveCloseAction` MUST return the `'close'` view again, and all
  of `monos`'s beats MUST replay from the first, with no persisted flag
  suppressing any of them
