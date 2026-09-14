# Delta for Trace Canvas

## ADDED Requirements

### Requirement: Spine Layer Renders as Plain Images and Marks Between the Backdrop and the Ink, With No Fragment Reference

`TraceCanvas` SHALL accept an optional `spines?: TraceSpines` prop (the
body art plus one entry per anchor, each carrying its live filled/unfilled
state) and, when present, SHALL render one `<image>` for the body and one
mark per anchor, all inside a single `<g pointerEvents="none">`,
positioned above the sector `backdrop` image and below every ink layer
(guide, demo, user stroke, `endArt`) — the same slot the reveal layer
already occupies. No `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`,
`useId`, or `url(#…)` reference MAY be introduced by this layer.

#### Scenario: The body image and anchor marks render between the backdrop and the ink

- GIVEN `TraceCanvas` rendered via `renderToString` with both `backdrop`
  and `spines` set
- WHEN the backdrop image, the spine layer, and the guide/ink paths are
  compared in document order
- THEN the spine layer's elements MUST render after the backdrop image and
  before the ink layers

#### Scenario: One mark renders per anchor plus one body image

- GIVEN `spines` set to a level with `n` anchors
- WHEN the HTML string is inspected
- THEN exactly one body `<image>` and `n` anchor marks attributable to the
  spine layer MUST appear

#### Scenario: No spines prop renders no spine layer

- GIVEN `TraceCanvas` rendered with no `spines` prop
- WHEN the HTML string is inspected
- THEN no spine-layer element MUST be present

#### Scenario: No forbidden reference is introduced

- GIVEN the same render with `spines` populated
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, or the
  substring `url(#`

### Requirement: The Hedgehog Row Inherits TORCH_CHALK With No New Ink Token, Asserted Against the Night Band's Luma Law

`zoo/backdrops.ts`'s `hedgehog` row SHALL declare `ink: TORCH_CHALK` and
`inkDim: TORCH_CHALK_DIM`, inherited verbatim from the `night` row rather
than declaring a new token. A pure test SHALL assert `|luma(TORCH_CHALK) −
luma(night band)| >= 55` (measured: 239 vs 67.1, gap 172), and a
falsifiability row SHALL assert `INK_COLOR` (luma 39.8) fails the same gap
against the night band (measured: 27.3, short by 27.7), proving no dark ink
is admissible on this backdrop.

#### Scenario: TORCH_CHALK clears the night band's luma law

- GIVEN `TORCH_CHALK`'s luma and the night band's sampled luma
- WHEN their absolute difference is computed
- THEN it MUST be at least 55

#### Scenario: INK_COLOR fails the same law

- GIVEN `INK_COLOR`'s luma and the night band's sampled luma
- WHEN their absolute difference is computed
- THEN it MUST be less than 55, proving the law is sensitive rather than
  vacuously true

#### Scenario: The hedgehog row declares no new ink token

- GIVEN the `hedgehog` backdrop registry row
- WHEN `ink` and `inkDim` are read
- THEN they MUST equal `TORCH_CHALK` and `TORCH_CHALK_DIM` exactly, the
  same values the `night` row already declares

### Requirement: The Body Interior Is Undrawable Under the Ink Law, Which Is Why Measure 5 Excludes It

`TORCH_CHALK` (luma 239) against the hedgehog body's brightest sampled
opaque pixel (luma 213.3, the pale belly/snout) MUST fail the 55-luma law
(measured gap: 25.7, short by 29.3) — a pure test SHALL assert this
failure directly, so the no-body-crossing rule (`radial-spines` measure 5)
cannot be silently relaxed later into "ink is fine over the body." The
assertion MUST be against a floor: the body's `brightest` would need to
fall to ≤ 184.0 for chalk to clear it, and the test MUST confirm today's
measured value (213.3) exceeds that floor.

#### Scenario: TORCH_CHALK fails the body-crossing luma law

- GIVEN `TORCH_CHALK`'s luma and the body's sampled `brightest` (213.3)
- WHEN their absolute difference is computed
- THEN it MUST be less than 55 (measured: 25.7), proving chalk over the
  body is undrawable

#### Scenario: Lowering the body's brightest below the floor would flip the assertion

- GIVEN a hypothetical body `brightest` of 184.0 or below
- WHEN the same luma-law check is evaluated
- THEN it MUST pass, proving the floor is exact and the current art
  (213.3) sits above it

---

**Accepted deviation:** this delta exceeds the skill's 650-word cap, the
same deviation this project's other capability specs already record under
`delivery_strategy: exception-ok`.
