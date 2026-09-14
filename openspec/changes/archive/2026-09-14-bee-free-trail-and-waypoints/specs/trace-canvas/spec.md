# Delta for Trace Canvas

## ADDED Requirements

### Requirement: Waypoint Layer Renders as Plain Images With No Fragment Reference

`TraceCanvas` SHALL accept an optional `waypoints?: TraceWaypoints` prop —
one entry per flower plus one for the hive, each carrying its live
lit/dormant state — and, when present, SHALL render one plain `<image>` per
entry via `placeArt` + `clampArtBox`, inside a single `<g
pointerEvents="none">`, mirroring `RevealLayer.tsx`'s exact contract: the
render precedent for authored-coordinate art. The layer MUST render in the
same slot the existing `{reveal && …}` block occupies (between the backdrop
group and the maze/corridor block). No `<mask>`, `<pattern>`, `<clipPath>`,
`<defs>`, `useId`, or `url(#…)` reference MAY be introduced.

#### Scenario: One image renders per flower plus one for the hive

- GIVEN `TraceCanvas` rendered via `renderToString` with `waypoints` set to
  a level with 3 flowers
- WHEN the HTML string is inspected
- THEN exactly 4 `<image>` elements attributable to the waypoint layer MUST
  appear (3 flowers plus the hive)

#### Scenario: No waypoints prop renders no waypoint layer

- GIVEN `TraceCanvas` rendered with no `waypoints` prop
- WHEN the HTML string is inspected
- THEN no waypoint-layer `<image>` MUST be present

#### Scenario: No forbidden reference is introduced

- GIVEN the same render with `waypoints` populated
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, or the
  substring `url(#`

### Requirement: Forest Backdrop Renders Beneath the Whole Play Area With No Channel and No Corridor Paint

The forest backdrop (declared with `corridorRows` but no `channel` field)
SHALL render exactly as the existing `Sector Backdrop Layer Beneath the Maze
Block` and `Channel Paint Follows the Backdrop Luma Law` requirements
already specify for a channel-less backdrop: it renders beneath the play
area with no full-sheet wall rect, and no channel stroke paints because a
bee level draws no corridor at all. The forest is the first backdrop to
combine "channel-less" with "no drawn corridor whatsoever" — no code change
to either existing requirement is needed for this to hold.

#### Scenario: The forest backdrop image renders beneath the play area with no wall rect

- GIVEN `TraceCanvas` rendered with the forest backdrop set
- WHEN the HTML string is inspected
- THEN the backdrop `<image>` MUST render and no full-sheet `<rect>` filled
  `MAZE_WALL` or `GROUND_FIELD` MUST be present

#### Scenario: No channel stroke is painted for a bee level

- GIVEN a bee level rendered with the forest backdrop
- WHEN the HTML string is scanned for a channel `<path>`
- THEN none MUST be present, because the forest backdrop declares no
  `channel` and the level draws no corridor
