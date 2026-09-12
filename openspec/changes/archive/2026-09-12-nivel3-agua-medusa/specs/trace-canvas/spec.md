# Delta for Trace Canvas

## ADDED Requirements

### Requirement: Hazard Rendering via Optional Art

`TraceHazards` SHALL accept an optional per-hazard art declaration. When a
hazard declares art, its element SHALL render as a `<g>` carrying a
`transform="translate(x,y)"` written by the same rAF loop that currently
mutates `cx`/`cy`, holding a static `<image>` placed by `placeArt`. When a
hazard declares no art, it MUST render exactly as today: a `<circle>` with
mutated `cx`/`cy`. `trail1`'s hazard MUST NOT change: its rendered
attributes before and after this change MUST be numerically identical.

#### Scenario: An art-bearing hazard renders as a transformed group with an image

- GIVEN a hazard configured with art, rendered via `renderToString`
- WHEN the hazard's element is inspected
- THEN it MUST be a `<g>` with a `transform` attribute containing
  `translate(`, holding an `<image>` child, and MUST NOT be a `<circle>`

#### Scenario: A hazard with no art keeps the circle default

- GIVEN a hazard configured with no art
- WHEN rendered
- THEN it MUST be a `<circle>` with `cx`/`cy` attributes, exactly as before
  this change

#### Scenario: trail1's hazard is byte-identical

- GIVEN `trail1`'s hazard configuration, unchanged by this proposal
- WHEN its rendered attributes are compared before and after this change at
  the same `timeMs`
- THEN every numeric attribute MUST be equal

### Requirement: Level-Sourced Goal Art

`TraceCanvas`'s existing `endArt` prop, when the caller supplies a level's
`goalArt` (level-engine), SHALL render that art at the end of the route in
place of any other end-of-route art. This adds no new prop to `TraceCanvas`:
`endArt` already accepts any `TraceStandingArt` (the existing carrier/lens
art placement behaviour); the caller decides which art value to pass.

#### Scenario: endArt renders the supplied goal art

- GIVEN `TraceCanvas` rendered with `endArt` set to the medusa's
  `TraceStandingArt`
- WHEN the HTML string is inspected
- THEN the medusa's `href` MUST appear as an `<image>`'s
  `href`/`xlink:href` at the route's end position
