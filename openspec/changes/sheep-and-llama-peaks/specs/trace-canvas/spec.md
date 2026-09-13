# Delta for Trace Canvas

## MODIFIED Requirements

### Requirement: Channel Paint Follows the Backdrop Luma Law

When `backdrop` is present, the corridor channel MUST stroke in
`backdrop.channel ?? SHEET_PAPER` — the channel is now a per-backdrop
choice, not a hardcoded constant — regardless of the `ground` prop's value.
`SHEET_PAPER` (`#fdfcf7`) remains the default whenever a backdrop declares
no `channel` field, which is what keeps the lagoon backdrop byte-identical
to before this change. A pure test SHALL assert
`|luma(backdrop.channel ?? SHEET_PAPER) − luma(backdrop.brightest)| >= 55`
(`docs/09:158`'s law) for all three registered backdrops: the lagoon
(`SHEET_PAPER` vs `#b4c5d0`), the ladera (`CHANNEL_STONE` `#606569` vs
`#b4bec5`), and the cordillera (`CHANNEL_STONE` vs `#f5f5f5`). Four
falsifiability rows MUST assert FAILURE, encoding why `CHANNEL_STONE` is
forced rather than chosen: `SHEET_PAPER` against the cordillera's
brightest (gap 7); `MUD_INK` against `CHANNEL_STONE` (gap 12); `GOAL_COLOR`
against `CHANNEL_STONE` (gap 4); the demo stroke `#0284c7` against
`CHANNEL_STONE` (gap 1).

(Previously: the channel always stroked `SHEET_PAPER` whenever a backdrop
was present, asserted only against the lagoon's single sampled colour.)

#### Scenario: SHEET_PAPER clears the lagoon's luma law

- GIVEN `SHEET_PAPER`'s luma and the lagoon quiet-band sample's luma
- WHEN their absolute difference is computed
- THEN it MUST be at least 55 (measured: 57.7)

#### Scenario: CORRIDOR_EARTH fails the same law

- GIVEN `CORRIDOR_EARTH`'s luma and the same lagoon sample's luma
- WHEN their absolute difference is computed
- THEN it MUST be less than 55 (measured: 4.0)

#### Scenario: The channel selects the backdrop's own channel when declared

- GIVEN `TraceCanvas` rendered with a backdrop whose `channel` field is
  `CHANNEL_STONE`
- WHEN the channel `<path>`'s `stroke` attribute is read
- THEN it MUST equal `CHANNEL_STONE`, not `SHEET_PAPER`

#### Scenario: No backdrop keeps today's ground-keyed paint

- GIVEN `TraceCanvas` rendered with no `backdrop`
- WHEN the channel's `stroke` attribute is read for `ground` true and
  `ground` false
- THEN it MUST follow the existing `ground ? CORRIDOR_EARTH : SHEET_PAPER`
  rule, unchanged from before this change

#### Scenario: A backdrop with no channel field renders exactly as before

- GIVEN `TraceCanvas` rendered with the lagoon backdrop (no `channel`
  field)
- WHEN the channel's `stroke` attribute is read
- THEN it MUST equal `SHEET_PAPER`, byte-identical to before this change

#### Scenario: CHANNEL_STONE clears the luma law against both mountain backdrops

- GIVEN `CHANNEL_STONE`'s luma and each mountain backdrop's sampled
  `brightest`
- WHEN their absolute differences are computed
- THEN both MUST be at least 55

#### Scenario: The four falsifiability rows all fail the law

- GIVEN `SHEET_PAPER` vs the cordillera's `brightest`, `MUD_INK` vs
  `CHANNEL_STONE`, `GOAL_COLOR` vs `CHANNEL_STONE`, and the demo stroke vs
  `CHANNEL_STONE`
- WHEN each pair's luma difference is computed
- THEN all four MUST be less than 55, proving the law is sensitive rather
  than vacuously true

## ADDED Requirements

### Requirement: Vertex Art Rendering Layer

`TraceCanvas` SHALL accept an optional `vertexArt?: TraceVertexArt`
(`href`/`w`/`h`/`size` plus `at: {x,y}[]`) and, when present, SHALL render
one `<image>` per entry in `at`, each placed via `placeArt({..., grip:
STANDING_GRIP})` and `clampArtBox(..., sheetBounds)` — the same formula the
carrier and standing animals already use. This layer MUST render
immediately before the `endMarker && endArt` block, so vertex art joins the
standing-character band under every ink layer. No `<mask>`, `<pattern>`,
`<clipPath>`, `<defs>`, `useId`, or `url(#…)` reference MAY be introduced.

#### Scenario: One image renders per apex

- GIVEN `TraceCanvas` rendered with `vertexArt.at` holding 3 points
- WHEN the HTML string is inspected
- THEN exactly 3 `<image>` elements attributable to `vertexArt` MUST appear,
  each placed by `placeArt`'s formula for that point

#### Scenario: Vertex art renders under the ink layers

- GIVEN the same render
- WHEN the vertex-art images and the `endArt` block are compared in
  document order
- THEN the vertex-art images MUST render before (under) the `endArt` block

#### Scenario: No vertexArt prop renders no vertex-art layer

- GIVEN `TraceCanvas` rendered with no `vertexArt` prop
- WHEN the HTML string is inspected
- THEN no vertex-art `<image>` MUST be present

#### Scenario: No forbidden reference is introduced

- GIVEN the same render with `vertexArt` populated
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, or the
  substring `url(#`

### Requirement: Demo Stroke Contrasts With the Channel

The animated demo `motion.path`'s stroke MUST be `SHEET_PAPER` when the
active backdrop declares a `channel`, and MUST remain the existing literal
(`DEMO_STROKE`, `#0284c7`) otherwise — chalk on a dark channel reads where
blue-on-blue would not.

#### Scenario: Demo stroke becomes SHEET_PAPER over a channelled backdrop

- GIVEN `TraceCanvas` rendered with `demo` set and a backdrop declaring
  `channel: CHANNEL_STONE`
- WHEN the demo path's `stroke` attribute is read
- THEN it MUST equal `SHEET_PAPER`

#### Scenario: Demo stroke stays DEMO_STROKE with no channel

- GIVEN `TraceCanvas` rendered with `demo` set and no backdrop, or a
  backdrop with no `channel` field
- WHEN the demo path's `stroke` attribute is read
- THEN it MUST equal `DEMO_STROKE` (`#0284c7`), unchanged from before this
  change
