# Delta for Main Screen

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: close GameView Variant and resolveCloseAction

`GameView` SHALL gain a `'close'` variant. `resolveCloseAction(finishedLevelId,
records)` SHALL be exported and pure, mirroring `resolveNextAction`'s call
site, and MUST return the `'close'` view when `finishedLevelId` is the last
`levelIds` entry of an adventure that declares a closing beat (the
entrance's `sand` adventure, ending on `sand4`), and MUST return the
ordinary `resolveNextAction`/exit-to-map outcome for every other finished
level, including every other reveal-grid adventure (`glass`, `night`) and
every pre-existing adventure. `nextView`'s reducer switch MUST remain
unaffected by this addition, the same contract `'intro'` and `'deduce'`
already hold to (`level-engine` "Deduction View Reachable from nextView").

#### Scenario: Finishing sand4 resolves to the close view

- GIVEN `finishedLevelId = 'sand4'`
- WHEN `resolveCloseAction('sand4', records)` is evaluated
- THEN it MUST return the `'close'` view

#### Scenario: Finishing glass4 does not resolve to the close view

- GIVEN `finishedLevelId = 'glass4'`
- WHEN `resolveCloseAction('glass4', records)` is evaluated
- THEN it MUST NOT return the `'close'` view

#### Scenario: Finishing night4 does not resolve to the close view

- GIVEN `finishedLevelId = 'night4'`
- WHEN `resolveCloseAction('night4', records)` is evaluated
- THEN it MUST NOT return the `'close'` view, and it MUST exit to the map as
  an ordinary sector-adventure completion

#### Scenario: nextView's reducer switch is unaffected

- GIVEN the `'close'` variant added to `GameView`
- WHEN `nextView`'s exhaustive switch is inspected
- THEN it MUST remain unchanged for every pre-existing input

### Requirement: AdventureClosing Screen Renders the Transformation

`screen/AdventureClosing.tsx` SHALL render as a distinct, full-screen
component (props `{ adventure, onContinue }`) mirroring `AdventureIntro`'s
stage/`CaptionedArt`/speech-bubble shape as its own component —
`AdventureIntro` MUST remain byte-identical, unaffected by this addition.
Advancing past the closing (`onContinue`) MUST lead to the zoo map (`App`'s
`{ at: 'map' }` shell). The closing MUST be reachable only via the `'close'`
`GameView` produced by `resolveCloseAction`, with no state persisted to
suppress it: replaying `sand4` to completion MUST replay the closing, exactly
as re-entering `glass1` replays the intro.

#### Scenario: The closing screen renders its content and passes the caption audit

- GIVEN `AdventureClosing` rendered via `renderToString` for the entrance
  adventure
- WHEN `auditCaptions` runs on the resulting HTML string
- THEN `uncaptioned` MUST be `[]`

#### Scenario: AdventureIntro is unaffected by this addition

- GIVEN `AdventureIntro`'s rendered output before and after this change
- WHEN compared for the same props
- THEN they MUST be byte-identical

#### Scenario: Advancing past the closing resolves to the zoo map

- GIVEN the closing screen's `onContinue` invoked
- WHEN the resulting `App` shell is inspected
- THEN it MUST equal `{ at: 'map' }`

#### Scenario: Replaying sand4 replays the closing

- GIVEN `sand4` already filed once
- WHEN it is played to completion again
- THEN `resolveCloseAction` MUST return the `'close'` view again, with no
  persisted flag suppressing it
