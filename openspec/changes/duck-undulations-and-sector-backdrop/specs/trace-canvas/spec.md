# Delta for Trace Canvas

## ADDED Requirements

### Requirement: Sector Backdrop Layer Beneath the Maze Block

`TraceCanvas` SHALL accept an optional `backdrop` prop shaped like
`SECTOR_BACKGROUND_ART`'s entries, and, when present, SHALL render it as a
plain `<image href>` with `preserveAspectRatio="xMidYMid slice"` set on the
`<image>` element itself — never on the root `<svg>` — positioned beneath
the maze block (`corridor && (mazeOn || ground)`, `TraceCanvas.tsx:865-934`)
and above the base sheet rect, following the exact layering
`screen/ZooMap.tsx:198-211` already uses for the map's own background. No
`<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, or any `url(#…)`
reference MAY be introduced by this layer (`TraceCanvas.tsx:70-84`).

#### Scenario: A backdrop renders as a plain image with slice on the image

- GIVEN `TraceCanvas` rendered via `renderToString` with `backdrop` set to
  the lagoon art
- WHEN the HTML string is inspected
- THEN an `<image>` element with `href` equal to the lagoon art's `href`
  and `preserveAspectRatio="xMidYMid slice"` MUST appear, and the root
  `<svg>` element's own `preserveAspectRatio` attribute MUST NOT be
  `"xMidYMid slice"`

#### Scenario: No forbidden reference is introduced

- GIVEN the same render
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, or
  the substring `url(#`

#### Scenario: No backdrop prop renders no backdrop image layer

- GIVEN `TraceCanvas` rendered with no `backdrop` prop
- WHEN the HTML string is inspected
- THEN no backdrop `<image>` element MUST be present

### Requirement: Wall Rect Yields to the Backdrop

When `backdrop` is present, the maze block's full-sheet solid `<rect>`
(`TraceCanvas.tsx:900-909`, filled `MAZE_WALL` or `GROUND_FIELD`) MUST NOT
render — the backdrop image supplies the visual context the rect otherwise
would, and a rect painted after the backdrop would hide it everywhere
except inside the channel stroke. The corridor channel MUST still stroke
above the backdrop. `maze: true` on the `LevelConfig` MUST remain
unaffected in every other respect: it still gates
`guide={showShapeLine && !level.maze}` and the corridor-is-a-channel
reading; only the solid paint yields.

#### Scenario: The wall rect is absent over a backdrop

- GIVEN `TraceCanvas` rendered with `backdrop` set and `mazeOn` true
- WHEN the HTML string is inspected
- THEN no full-sheet `<rect>` filled `MAZE_WALL` or `GROUND_FIELD` MUST be
  present

#### Scenario: The channel still strokes above the backdrop

- GIVEN the same render
- WHEN the corridor `<path>` elements and the backdrop `<image>` are
  compared in document order
- THEN the channel path(s) MUST render after (above) the backdrop image

#### Scenario: No backdrop keeps the wall rect exactly as before

- GIVEN `TraceCanvas` rendered with no `backdrop` and `mazeOn` true
- WHEN the HTML string is inspected
- THEN the full-sheet `<rect>` MUST render, unchanged from before this
  change

### Requirement: Channel Paint Follows the Backdrop Luma Law

When `backdrop` is present, the corridor channel MUST stroke in
`SHEET_PAPER` (`#fdfcf7`), never `CORRIDOR_EARTH`, regardless of the
`ground` prop's value. A pure test SHALL assert
`|luma(SHEET_PAPER) − luma(backdrop quiet-band sample)| >= 55`
(`docs/09:158`'s law: "separa al menos 55 de luma del suelo que tiene
abajo") against the lagoon's sampled quiet-band constant, a single flat
colour `(180, 197, 208)` (`#b4c5d0`, luma 194.2), and MUST fail if either
value moves. `CORRIDOR_EARTH` (`#d9c3ae`, luma 198.2) MUST be asserted as
FAILING that same law against the lagoon sample (separation 4.0), proving
the guard is sensitive rather than vacuously true.

#### Scenario: SHEET_PAPER clears the lagoon's luma law

- GIVEN `SHEET_PAPER`'s luma and the lagoon quiet-band sample's luma
- WHEN their absolute difference is computed
- THEN it MUST be at least 55 (measured: 57.7)

#### Scenario: CORRIDOR_EARTH fails the same law

- GIVEN `CORRIDOR_EARTH`'s luma and the same lagoon sample's luma
- WHEN their absolute difference is computed
- THEN it MUST be less than 55 (measured: 4.0), proving the guard would
  catch this paint if it were ever selected over a backdrop

#### Scenario: The channel selects SHEET_PAPER whenever a backdrop is present

- GIVEN `TraceCanvas` rendered with `backdrop` set and `ground` true
- WHEN the channel `<path>`'s `stroke` attribute is read
- THEN it MUST equal `SHEET_PAPER`, not `CORRIDOR_EARTH`

#### Scenario: No backdrop keeps today's ground-keyed paint

- GIVEN `TraceCanvas` rendered with no `backdrop`
- WHEN the channel's `stroke` attribute is read for `ground` true and
  `ground` false
- THEN it MUST follow the existing `ground ? CORRIDOR_EARTH : SHEET_PAPER`
  rule, unchanged from before this change
