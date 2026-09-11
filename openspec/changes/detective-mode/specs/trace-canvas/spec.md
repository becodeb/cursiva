# Delta for Trace Canvas

## ADDED Requirements

### Requirement: Clue Layer Rendering

The canvas SHALL accept an optional `clues` prop, following the `hazards`
prop precedent (`TraceCanvas.tsx:166-177`), and render each clue mark as its
own `<g>` layer. A mark's rendered colour MUST reflect its reducer state:
grey while `drained`, and its trail's registered earned colour (or, for
footprints, black) once `earned` — the colour change MUST be a discrete
attribute swap, not an animated transition. The clue layer, and every other
element this change adds to the canvas, MUST NOT introduce any `url(#…)`
reference (gradient, mask, or filter), because such references hydrate blank
on real devices (`TraceCanvas.tsx:70-84`).

#### Scenario: Drained mark renders grey

- GIVEN a clue mark in `drained` state passed via the `clues` prop
- WHEN the canvas renders
- THEN the mark's fill or stroke colour MUST be the shared grey token

#### Scenario: Earned mark renders its trail colour

- GIVEN a clue mark in `earned` state whose trail owns colour `X`
- WHEN the canvas renders
- THEN the mark's fill or stroke colour MUST equal `X`

#### Scenario: Earned footprint renders black, never chromatic

- GIVEN a footprints clue mark in `earned` state
- WHEN the canvas renders
- THEN the mark's colour MUST be black (or a grey-to-black value) and MUST
  NOT be any chromatic colour

#### Scenario: No url() reference is introduced

- GIVEN the canvas rendered with `clues` populated via `renderToString`
- WHEN the resulting HTML string is scanned
- THEN it MUST NOT contain the substring `url(#`
