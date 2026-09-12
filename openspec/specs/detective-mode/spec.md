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

The mode SHALL present a deduction screen only when reached through the
deep-link routes `?nivel=deduccion` (the first unresolved case) or
`?nivel=deduccion-<caseId>` (a specific case), offering exactly
`case.options.length` captioned animal choices, of which exactly one
(`case.culprit`) is correct. Picking the culprit MUST close the case. Picking
any other option MUST cost nothing: no score penalty, no lockout, and the
child MUST be able to pick again immediately (D4). The screen MUST read its
options, `ruledOutBy`, and culprit from the active `DetectiveCase`, never from
a global constant. Filing all of a case's trail clues MUST NOT, by itself,
route to this screen — finishing a sector's adventure exits to the zoo map
instead (`main-screen` "Exit Returns to the Zoo Map").
(Previously: hardcoded to exactly four choices with a global `CULPRIT` always
equal to the hen; then automatically reachable once all of the active case's
trails were filed, with no deep-link path.)

#### Scenario: A deep link reaches the deduction screen
- GIVEN the URL carries `?nivel=deduccion-duck`
- WHEN `initialView` resolves the shell
- THEN the deduction screen MUST render for the duck case

#### Scenario: Filing all trail clues alone does not route there
- GIVEN all of a case's trails filed by finishing its last adventure
- WHEN the child exits that adventure
- THEN the resulting view MUST be the zoo map, not the deduction screen

#### Scenario: Correct pick closes the case
- GIVEN the deduction screen for a case with its choices shown
- WHEN the child picks `case.culprit`
- THEN the mode MUST record that case as closed

#### Scenario: Wrong pick is free and immediately retryable
- GIVEN the deduction screen for a case with its choices shown
- WHEN the child picks a distractor
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

### Requirement: Case Registry Data Shape

The mode SHALL expose `DetectiveCase` (`id`, `culprit`, ordered `options`, per-case `ruledOutBy`, `trailIds`) and an ordered `DETECTIVE_CASES: readonly DetectiveCase[]`, duck first, hen second. `ruledOutBy` MUST NOT be a property of `ANIMAL_ART` or any other global animal record — it lives only on the case, since the hen is a cleared distractor in one case and the culprit in another. Within one case, exactly one option MUST be absent from `ruledOutBy`, and it MUST equal `culprit`; each distractor MUST be ruled out by a clue kind distinct from every other distractor's; no clue kind MUST rule out more than one option in the same case.

#### Scenario: Culprit is the only option with no verdict
- GIVEN any case in `DETECTIVE_CASES`
- WHEN its `options` are checked against its `ruledOutBy` map
- THEN exactly one option MUST be absent from `ruledOutBy`, and it MUST equal `case.culprit`

#### Scenario: Same animal, different verdicts across cases
- GIVEN the hen appears as an option in the duck case and as `culprit` in the hen case
- WHEN each case's `ruledOutBy` is read independently
- THEN the duck case MUST rule her out by a clue kind, and the hen case MUST carry no `ruledOutBy` entry for her

#### Scenario: No clue kind double-rules within a case
- GIVEN one case's `ruledOutBy` map
- WHEN its values are collected
- THEN no clue kind MUST appear more than once

### Requirement: Duck Case

`DETECTIVE_CASES[0]` SHALL be the duck case: culprit `pato`, options `[pato, vaca, gato]` (no `gallina`), four trail ids clued `webfoot`, `breadcrumb`, `bubble`, `feather` in that order. `vaca` MUST be ruled out by `feather`; `gato` MUST be ruled out by `bubble`; `webfoot` and `breadcrumb` MUST rule out no option.

#### Scenario: Duck deduction renders exactly three captioned options
- GIVEN the duck case's deduction rendered
- WHEN the option list is inspected
- THEN exactly three options MUST render, each with its animal's picture and the animal's word beneath it, and `gallina` MUST NOT appear

### Requirement: Captioned Art Invariant

A word MAY appear on screen only accompanying an image, and MUST NOT ever be the sole carrier of meaning (supersedes D6's text ban). The captioned-art component's `label` prop MUST be required, with no default value and no branch rendering the image without it, so omitting `label` at any call site MUST be a type error.

#### Scenario: A caption cannot compile without its image
- GIVEN a call site of the captioned-art component with `label` omitted
- WHEN the project is type-checked
- THEN it MUST fail to compile

#### Scenario: Every rendered word has an image
- GIVEN any screen using the captioned-art component, rendered via `renderToString`
- WHEN the HTML string's text nodes are enumerated
- THEN every text node MUST come from an instance that also rendered an `<image>`/picture sibling — never bare text with no accompanying picture

### Requirement: Per-Case Clue Colour Distinctness

Earned clue colours MUST be pairwise distinct within one case; two different cases MAY reuse the same token (`webfoot` and `footprint` both render black — a print in the earth has no colour of its own).

#### Scenario: Duck case's four earned colours are pairwise distinct
- GIVEN the duck case's four clue kinds' earned tokens
- WHEN compared pairwise
- THEN no two MUST be equal

#### Scenario: Two cases may share a token
- GIVEN `webfoot`'s earned token and `footprint`'s earned token
- WHEN compared
- THEN they MAY be equal, since distinctness is scoped per case, not global

### Requirement: Case-Solved Persistence

Closing a case's deduction on its culprit MUST leave an observable record that survives a reload, written through the existing level-progress store under the pseudo-id `<caseId>-deduce` as a `LevelRecord` with `approvals: 1` — no new store key or method.

#### Scenario: Solving the duck case persists
- GIVEN `pickAnimal` closes the duck case
- WHEN the resulting record is written and a fresh store loads the same payload
- THEN `isFiled(records, 'duck-deduce')` MUST be `true`

#### Scenario: An unresolved case has no such record
- GIVEN a case whose deduction has not been closed
- WHEN the store is inspected for `<caseId>-deduce`
- THEN no record MUST exist for that pseudo-id

### Requirement: Case Routing Across Multiple Cases (REMOVED)

(Reason: deduction is paused per `docs/13` §4 decision 1; `home/caseState.ts`,
its sole implementer, is deleted along with `client/src/home/`.)
(Migration: the zoo map's sector registry (`zoo-map` capability) owns which
adventure opens next, via `nextAdventure(sector, records)`. Existing
`<caseId>-deduce` records written under Case-Solved Persistence stay readable
and inert — no sector claims them and `totalStars` excludes them.)

## ADDED Requirements

### Requirement: Case Trail vs Detective-World Predicates

The mode SHALL expose two derived, pure predicates over a `LevelConfig` —
`isCaseTrail` and `inDetectiveWorld` — replacing the single `isDetectiveTrail`
flag (`!!level.clue`). `isCaseTrail` MUST carry exactly the retired flag's
case semantics: clue marks, `PISTAS` rail entry, filing, and deduction
routing. `inDetectiveWorld` MUST be `true` whenever `isCaseTrail` is `true`
and MAY independently be `true` for a level with no `clue`. No level MUST be
able to report `isCaseTrail` `true` while `inDetectiveWorld` is `false`.

#### Scenario: A case trail is always in the world

- GIVEN any level for which `isCaseTrail(level)` is `true`
- WHEN `inDetectiveWorld(level)` is evaluated
- THEN it MUST also be `true`

#### Scenario: A world-only level reports no case membership

- GIVEN a level declared as detective-world with no `clue` config
- WHEN `isCaseTrail(level)` and `inDetectiveWorld(level)` are evaluated
- THEN `isCaseTrail` MUST be `false` and `inDetectiveWorld` MUST be `true`

### Requirement: Case-Only Behaviours Gate on isCaseTrail

Clue marks passed to the canvas, the `PISTAS` rail element, the trail-end
lamp latch that lights the rail, and any deduction routing MUST be present
only when `isCaseTrail(level)` is `true`, and MUST be absent for any level
where it is `false` — even when `inDetectiveWorld(level)` is `true`.

#### Scenario: A world-only level shows no PISTAS rail

- GIVEN a level with `inDetectiveWorld` true and `isCaseTrail` false, rendered
  via `renderToString`
- WHEN the HTML string is inspected
- THEN no `PISTAS` rail element MUST be present

#### Scenario: A world-only level passes no clue marks to the canvas

- GIVEN the same level rendered
- WHEN the canvas's received `clues` prop is inspected
- THEN it MUST be `undefined`

#### Scenario: A world-only level never latches the case's trail-end lamp

- GIVEN the same level, with its route completed
- WHEN the case-lamp latch state is read
- THEN it MUST remain unset for that level; any end-of-route art it shows
  comes from `goalArt` (level-engine), never from the case lamp

### Requirement: World Behaviours Gate on inDetectiveWorld, Not on the Clue

The following MUST render, or be suppressed, purely as a function of
`inDetectiveWorld(level)`, independent of `isCaseTrail(level)`: ink-only
mud-coloured rendering, the standing octopus start art, the carried
glass's rest offset onto the octopus, the wordless shell (no `<h1>` title,
no hint paragraph, no rotate-device paragraph, icon-only action buttons, no
direction arrow), and the suppressed result block (pillars, coach message,
three-star readout).

Ground scatter (grass and mud) MUST retire specifically for a level that
renders a sector backdrop underneath its corridor — that is,
`inDetectiveWorld(level) && backdropFor(level.id)` resolves an entry — and
MUST continue to render for every other `inDetectiveWorld` level,
including one that shares a sector with a backed adventure but belongs to
no backed adventure itself.

The gate is the ADVENTURE, never the sector and never `level.maze`.
`estanque.adventureIds` (`zoo/sectors.ts:319-328`) holds EIGHT ids — the
duck's four and the medusa's four — so a sector-keyed gate would hand the
lagoon to the medusa levels and strip their ground, breaking this change's
own out-of-scope guarantee. `level.maze` happens to separate them today
(ducks `maze: true`, medusa `maze: false`) but it is the wrong property:
`maze` describes the route's mechanism, not whether a backdrop is drawn,
and rows C-H will bring backed adventures that are not maze routes.
`backdropFor(levelId)` therefore resolves through `adventureFor(levelId)`
(`zoo/adventures.ts`), which returns an entry only for ids that belong to a
declared adventure.

This is scoped per adventure, explicitly NOT engine-wide (`docs/13` §4
decision 3): the four duck trails retire their ground once the lagoon
backdrop lands, while the four medusa levels (`catalog.ts:673, 693, 728,
780`) keep theirs unchanged — `docs/13` §4 marks the medusa "Hecha — Nada".

(Previously: ground scatter was gated purely on `inDetectiveWorld(level)`,
with no exception for a sector backdrop, because no sector carried one
yet.)

#### Scenario: Ground scatter renders for a world-only level with no backdrop

- GIVEN a level with `inDetectiveWorld` true and no sector backdrop
  resolved for it, rendered via `renderToString`
- WHEN the canvas's `ground` prop is inspected
- THEN it MUST be defined with grass and mud scatter marks

#### Scenario: The wordless shell suppresses text for a world-only level

- GIVEN the same level rendered
- WHEN the HTML string is inspected
- THEN no `<h1>` title, no hint paragraph text, and no "Girá el
  dispositivo" text MUST be present

#### Scenario: The result block and three stars stay suppressed for a world-only level

- GIVEN the same level with an attempt recorded
- WHEN the HTML string is inspected
- THEN no `Resultado del intento` section MUST be present

#### Scenario: A non-world level keeps every one of these behaviours

- GIVEN a level with `inDetectiveWorld` false
- WHEN rendered
- THEN the title, hint, rotate paragraph, result block, and text-labelled
  buttons MUST all render, and no ground scatter or octopus art MUST
  appear

#### Scenario: Ground retires for a duck level once its sector's backdrop exists

- GIVEN a duck trail (`inDetectiveWorld` true) whose adventure resolves a
  backdrop entry through `backdropFor(level.id)`
- WHEN the canvas's `ground` prop is inspected
- THEN it MUST be `undefined`

#### Scenario: Ground still renders for a medusa level sharing the ducks' sector

- GIVEN a medusa level (`inDetectiveWorld` true) that shares the
  `estanque` sector with the ducks but belongs to no backed adventure, so
  `backdropFor(level.id)` is `undefined`
- WHEN the canvas's `ground` prop is inspected
- THEN it MUST remain defined with grass and mud scatter marks, unchanged
  from before this change
