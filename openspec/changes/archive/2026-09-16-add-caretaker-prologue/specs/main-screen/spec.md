# Delta for Main Screen

## MODIFIED Requirements

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

## ADDED Requirements

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

---

**Accepted deviation:** this delta exceeds the skill's 650-word cap, the
same deviation this project's other capability specs already record under
`delivery_strategy: exception-ok`. The `resolveCloseAction` widening
retires a named negative-case scenario (`glass4`) rather than merely
adding to it, which this delta states explicitly rather than leaving the
reader to infer from the code diff alone.
