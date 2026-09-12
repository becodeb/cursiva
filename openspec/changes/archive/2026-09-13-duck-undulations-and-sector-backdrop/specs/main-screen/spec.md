# Delta for Main Screen

## ADDED Requirements

### Requirement: resolveEnterAction Chooses Between Play and the Narrative Entry

The screen module SHALL expose a pure `resolveEnterAction(levelId,
records)`, mirroring `resolveNextAction`'s shape and export, called from
`App.tsx`'s `ZooMap.onEnter` in place of today's hardcoded `{view:'play',
levelId}`. It MUST return the `'intro'` `GameView` variant whenever
`levelId === 'duck-trail1'`, unconditionally — not gated on `records` —
and MUST return `{type:'play', levelId}` for every other level id,
unchanged from today's `onEnter` behaviour. `records` stays a required
parameter for symmetry with `resolveNextAction` and for a later change's
unlock rules, even though this function does not read it yet.

#### Scenario: Entering duck-trail1 always resolves to the narrative entry

- GIVEN any `records` value, including empty records and records where
  every duck level is already filed
- WHEN `resolveEnterAction('duck-trail1', records)` is called
- THEN it MUST return the `'intro'` variant, not `{type:'play',
  levelId:'duck-trail1'}`

#### Scenario: Every other level resolves straight to play

- GIVEN any other catalog level id (e.g. `'duck-trail2'`, `'trail1'`)
- WHEN `resolveEnterAction` is called with that id
- THEN it MUST return `{type:'play', levelId}` unchanged

#### Scenario: resolveEnterAction is pure and DOM-free

- GIVEN the function called directly, outside any component
- WHEN inspected
- THEN it MUST require no `window`/DOM access and no component context

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
speech bubble, the duck, and one short phrase through
`detective/CaptionedArt.tsx` (`label` required, audited by
`detective/captionAudit.ts`), following the same bubble-plus-phrase
pairing `ZooMap.tsx:341-360` already uses. No new art asset MAY be
introduced: every asset used (the backpack octopus, the speech bubble, the
duck) MUST come from the existing registry (`detective/assets.ts`).
Advancing past the screen (a tap) MUST lead into `duck-trail1`'s ordinary
play view.

#### Scenario: The entry renders every required registered asset

- GIVEN the narrative entry rendered via `renderToString`
- WHEN the HTML string is inspected
- THEN the backpack octopus's, the speech bubble's, and the duck's
  registered `href`s MUST each appear, and no `href` outside
  `detective/assets.ts`'s registered set MUST appear

#### Scenario: auditCaptions reports zero uncaptioned words

- GIVEN the narrative entry rendered via `renderToString`
- WHEN `auditCaptions` runs on the resulting HTML string
- THEN `uncaptioned` MUST be `[]`

#### Scenario: Tapping through reaches duck-trail1's play view

- GIVEN the narrative entry's advance control invoked
- WHEN the resulting view is inspected
- THEN it MUST equal `{view:'play', levelId:'duck-trail1'}`
