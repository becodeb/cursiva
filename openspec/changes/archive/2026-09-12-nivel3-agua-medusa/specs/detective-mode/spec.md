# Delta for Detective Mode

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
`inDetectiveWorld(level)`, independent of `isCaseTrail(level)`: ground
scatter (grass and mud), ink-only mud-coloured rendering, the standing
octopus start art, the carried glass's rest offset onto the octopus, the
wordless shell (no `<h1>` title, no hint paragraph, no rotate-device
paragraph, icon-only action buttons, no direction arrow), and the suppressed
result block (pillars, coach message, three-star readout).

#### Scenario: Ground scatter renders for a world-only level

- GIVEN a level with `inDetectiveWorld` true and `isCaseTrail` false, rendered
  via `renderToString`
- WHEN the canvas's `ground` prop is inspected
- THEN it MUST be defined with grass and mud scatter marks

#### Scenario: The wordless shell suppresses text for a world-only level

- GIVEN the same level rendered
- WHEN the HTML string is inspected
- THEN no `<h1>` title, no hint paragraph text, and no "Girá el dispositivo"
  text MUST be present

#### Scenario: The result block and three stars stay suppressed for a world-only level

- GIVEN the same level with an attempt recorded
- WHEN the HTML string is inspected
- THEN no `Resultado del intento` section MUST be present — for the
  wordless-shell reason, never because of the level's phase number

#### Scenario: A non-world level keeps every one of these behaviours

- GIVEN a level with `inDetectiveWorld` false
- WHEN rendered
- THEN the title, hint, rotate paragraph, result block, and text-labelled
  buttons MUST all render, and no ground scatter or octopus art MUST appear
