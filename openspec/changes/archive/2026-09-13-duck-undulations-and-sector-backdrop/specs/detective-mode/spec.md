# Delta for Detective Mode

## MODIFIED Requirements

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
