# Delta for Main Screen

## MODIFIED Requirements

### Requirement: resolveEnterAction Chooses Between Play and the Narrative Entry

The screen module SHALL expose a pure `resolveEnterAction(levelId,
records)`, mirroring `resolveNextAction`'s shape and export, called from
`App.tsx`'s `ZooMap.onEnter` in place of a hardcoded `{view:'play',
levelId}`. It MUST return the `'intro'` `GameView` variant whenever
`levelId` is `levelIds[0]` of ANY registered adventure — `duck-trail1`,
`sheep-hill1`, or `llama-peak1` — unconditionally, not gated on `records`,
and MUST return `{type:'play', levelId}` for every other level id,
including every other sheep/llama level, unchanged from before this
change. `records` stays a required parameter for symmetry with
`resolveNextAction` and for a later change's unlock rules.

(Previously: this requirement asserted the `'intro'` routing only for
`levelId === 'duck-trail1'`, before a second and third adventure existed;
the underlying resolution was always adventure-generic via
`introLevel(levelId)`, and this requirement's asserted scope now widens to
match.)

#### Scenario: Entering any adventure's first level resolves to the narrative entry

- GIVEN `records` including empty records, `resolveEnterAction` called with
  `'duck-trail1'`, `'sheep-hill1'`, and `'llama-peak1'` in turn
- WHEN each call is evaluated
- THEN each MUST return the `'intro'` variant for its own level id

#### Scenario: Every other level resolves straight to play

- GIVEN any other catalog level id (e.g. `'sheep-hill2'`, `'llama-peak3'`,
  `'trail1'`)
- WHEN `resolveEnterAction` is called with that id
- THEN it MUST return `{type:'play', levelId}` unchanged

#### Scenario: resolveEnterAction is pure and DOM-free

- GIVEN the function called directly, outside any component
- WHEN inspected
- THEN it MUST require no `window`/DOM access and no component context

### Requirement: Narrative Entry Screen Content

The narrative entry screen SHALL render the octopus with its backpack, the
speech bubble, and the entering adventure's OWN registered animal — via
`ZOO_ANIMAL_ART` (`detective-mode` "ZooAnimalId Widens the Zoo's Animal
Vocabulary") — through `detective/CaptionedArt.tsx` (`label` required,
audited by `detective/captionAudit.ts`). The duck, sheep, and llama entries
MUST each render their own adventure's `intro` line and animal art, and no
new art asset MAY be introduced beyond what `detective/assets.ts` already
registers. Advancing past the screen (a tap) MUST lead into that
adventure's OWN first level (`adventure.levelIds[0]`), never a hardcoded
level id.

(Previously: this requirement named only the octopus, the speech bubble,
and the duck, and asserted advancing led into `duck-trail1` specifically,
before more than one adventure existed.)

#### Scenario: The sheep adventure's entry renders its own animal and line

- GIVEN the narrative entry rendered for the sheep adventure via
  `renderToString`
- WHEN the HTML string is inspected
- THEN `ZOO_ANIMAL_ART.oveja`'s registered `href` and the sheep adventure's
  own `intro` text MUST appear, and no `href` outside
  `detective/assets.ts`'s registered set MUST appear

#### Scenario: The llama adventure's entry renders its own animal and line

- GIVEN the narrative entry rendered for the llama adventure via
  `renderToString`
- WHEN the HTML string is inspected
- THEN `ZOO_ANIMAL_ART.llama`'s registered `href` and the llama adventure's
  own `intro` text MUST appear

#### Scenario: auditCaptions reports zero uncaptioned words for both new entries

- GIVEN either new narrative entry rendered via `renderToString`
- WHEN `auditCaptions` runs on the resulting HTML string
- THEN `uncaptioned` MUST be `[]`

#### Scenario: Tapping through reaches each adventure's own first level

- GIVEN the sheep entry's and the llama entry's advance controls invoked in
  turn
- WHEN the resulting views are inspected
- THEN they MUST equal `{view:'play', levelId:'sheep-hill1'}` and
  `{view:'play', levelId:'llama-peak1'}` respectively
