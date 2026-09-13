# Delta for Trace Canvas

## ADDED Requirements

### Requirement: Reveal Layer Renders as Plain Rects Between Backdrop and Ink

`TraceCanvas` SHALL accept an optional `reveal?: TraceRevealLayer` prop
describing the covering layer's tiles (position, size, and opacity, one
entry per tile) and, when present, SHALL render one `<rect>` per entry,
positioned above the sector `backdrop` image (`Sector Backdrop Layer
Beneath the Maze Block`) and below every ink layer (guide, demo, user
stroke, vertex art, `endArt`). No `<mask>`, `<pattern>`, `<clipPath>`,
`<defs>`, `useId`, or `url(#…)` reference MAY be introduced by this layer
(`TraceCanvas.tsx:70-84`).

#### Scenario: The reveal layer renders above the backdrop and below the ink

- GIVEN `TraceCanvas` rendered via `renderToString` with both `backdrop` and
  `reveal` set
- WHEN the backdrop image, the reveal rects, and the guide/ink paths are
  compared in document order
- THEN the reveal rects MUST render after the backdrop image and before the
  ink layers

#### Scenario: No reveal prop renders no reveal layer

- GIVEN `TraceCanvas` rendered with no `reveal` prop
- WHEN the HTML string is inspected
- THEN no reveal-layer `<rect>` MUST be present

#### Scenario: No forbidden reference is introduced

- GIVEN the same render with `reveal` populated
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, or the
  substring `url(#`

### Requirement: Reveal Tile Paint Satisfies the Backdrop Luma Law

Each of the three reveal-grid backdrops registered in `zoo/backdrops.ts`
(aquarium/glass, sand, night) SHALL declare its own tile-paint colour — the
reveal-grid sibling of the corridor `channel` — and a pure test SHALL assert
`|luma(tile) − luma(backdrop.brightest)| >= 55` (`docs/09:158`'s law,
restated for a covering layer instead of a corridor channel) for all three,
using the measured values (`design.md` §2.3, §3.2): the aquarium's sampled
`brightest` is luma **212** (`GLASS_GRIME`, luma **109**, gap 103); the
sand's sampled `brightest` is luma **209** (`SAND_DRIFT`, luma **109**, gap
100); the night backdrop's derived `brightest` is luma **96** (`NIGHT_VEIL`,
luma **22**, gap 74). Both entrance tile paints are DARK by construction,
not by taste: the measured `brightest` values leave no admissible LIGHT
paint on either backdrop (`design.md` §2.2, §2.3).

For the night backdrop specifically, the constraint on its OWN derived
`brightest` is a FLOOR against the fixed `NIGHT_VEIL`, not a ceiling: it
MUST be at least `luma(NIGHT_VEIL) + 55 = 77`, because a cap alone is
satisfied by a black rectangle, which fails the law outright. The measured
derivation lands at luma 96, a margin of 19 over that floor.

#### Scenario: Each reveal backdrop's tile paint clears the 55-luma law

- GIVEN each of the three reveal backdrops' `tile` colour and sampled
  `brightest`
- WHEN their absolute luma differences are computed
- THEN all three MUST be at least 55, matching the measured values: 103,
  100, and 74

#### Scenario: The sand backdrop's brightest is a real sampled value

- GIVEN the sand backdrop's registry entry after this change
- WHEN `brightest` is read
- THEN it MUST be a real measured colour (luma 209), not the pre-existing
  `corridor_rows = None` absence

#### Scenario: The night backdrop's brightest satisfies a floor, not merely a low value

- GIVEN the night backdrop's derived `brightest` (luma 96)
- WHEN compared against `luma(NIGHT_VEIL) + 55` (77)
- THEN it MUST be greater than or equal to that floor, and a hypothetical
  derivation returning a `brightest` below 77 MUST fail the law

#### Scenario: A light-coloured paint is measurably inadmissible on both entrance backdrops

- GIVEN a near-white paint (`#f2efe6`, luma ≈239, or any tile paint above
  `brightest − 55`) tested against the aquarium's and the sand's sampled
  `brightest`
- WHEN the luma law is evaluated
- THEN it MUST fail on both — by 40 on the aquarium and by 43 on the sand —
  proving the law is sensitive rather than vacuously true, the same
  falsifiability discipline `backdrops.test.ts` already keeps for the
  corridor channel
