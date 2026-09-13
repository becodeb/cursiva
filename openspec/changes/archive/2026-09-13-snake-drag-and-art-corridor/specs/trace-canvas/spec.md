# Delta for Trace Canvas

## ADDED Requirements

### Requirement: Art Corridor Layer Renders as Plain Images With No Fragment Reference, Live Through Both the Arrange and Trace Phases

`TraceCanvas` SHALL accept an optional `artCorridor?: TraceArtCorridor`
prop — one entry per snake body — and, when present, SHALL render one
plain `<image>` per entry, positioned above the sector `backdrop`'s
channel stroke and below every ink layer (guide, demo, user stroke,
`endArt`). The SAME layer serves both phases the snake adventure has:
during the arrange phase (`object-arrange` capability), each piece's box
reflects its current scatter/held/snapped position; once arranged and
during the trace, each piece's box is the authored placement
`art-corridor`'s `placeArtCorridor` derives, coinciding with the scored
centreline. No `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, or
`url(#…)` reference MAY be introduced by this layer.

#### Scenario: The art corridor layer renders above the channel and below the ink

- GIVEN `TraceCanvas` rendered via `renderToString` with `backdrop` (a
  channel-bearing row) and `artCorridor` both set
- WHEN the backdrop image, the channel stroke, the corridor images, and
  the guide/ink paths are compared in document order
- THEN the corridor images MUST render after the channel stroke and
  before the ink layers

#### Scenario: No artCorridor prop renders no corridor image layer

- GIVEN `TraceCanvas` rendered with no `artCorridor` prop
- WHEN the HTML string is inspected
- THEN no corridor-layer `<image>` MUST be present

#### Scenario: Each piece's box reflects its live arrange position

- GIVEN `TraceCanvas` rendered mid-arrange with one piece held and
  offset from its scatter point
- WHEN that piece's rendered `<image>` box is inspected
- THEN it MUST reflect the held piece's live position, not its authored
  trace-phase placement

#### Scenario: No forbidden reference is introduced

- GIVEN the same render with `artCorridor` populated
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, or
  the substring `url(#`

### Requirement: inkHidden Suppresses the Ink Layer During the Arrange Phase, With No Other Layer Affected

`TraceCanvas` SHALL accept an optional `inkHidden?: boolean` prop.
`inkHidden === true` MUST suppress every ink layer (guide, demo, user
stroke, `endArt`) while leaving pointer capture, the backdrop, the
channel, and the `artCorridor` layer entirely unaffected — pointer
capture is exactly as it always is; only what is PAINTED as ink changes.
Absent or `false` renders exactly as before this change.

#### Scenario: inkHidden suppresses ink but not the corridor or backdrop

- GIVEN `TraceCanvas` rendered with `inkHidden: true`, a `backdrop`, and
  `artCorridor` all set
- WHEN the HTML string is inspected
- THEN no ink, guide, demo, or `endArt` element MUST be present, and the
  backdrop, channel, and corridor images MUST render exactly as with
  `inkHidden` absent

#### Scenario: No inkHidden prop renders ink exactly as before this change

- GIVEN `TraceCanvas` rendered with no `inkHidden` prop
- WHEN the HTML string is inspected
- THEN ink rendering MUST be byte-identical to before this change

### Requirement: The Snake Backdrop Declares a Channel That Doubles as the Corridor Hollow

The `snake` backdrop row (`zoo/backdrops.ts`) SHALL declare a `channel`
field — `SAND_HOLLOW` — rather than omitting one: omitting `channel`
would make the shipped channel-stroke logic (`backdrop?.channel ??
SHEET_PAPER`) fall back to `SHEET_PAPER`, which fails the pre-existing
"Channel Paint Follows the Backdrop Luma Law" requirement's 55-luma
assertion against the sand's `brightest` by 42.8 — the row cannot simply
have no channel. `SAND_HOLLOW` is re-read as the scooped hollow in the
sand each snake lies in: the SAME shipped channel stroke, at the level's
own `corridorWidth`, joins the existing "Channel Paint Follows the
Backdrop Luma Law" requirement's registry loop with no exemption. During
the arrange phase the hollows are the visible drop targets, sized and
shaped like the snake that belongs in each; during the trace, the animal
covers its own hollow exactly, because the art corridor's own
thickness-vs-corridor-width relationship keeps the drawn body wider than
the stroked channel beneath it.

(Superseded: an earlier draft of this row declared no `channel` field at
all, reasoning the drawn snake's own body already clears the sand's luma
law. `design.md` §0 A6/§2.3 found that reasoning correct about luma and
wrong about mechanism — the shipped code has no "no channel" branch, only
a fallback to `SHEET_PAPER`, which is exactly the case the pre-existing
law rejects.)

#### Scenario: The snake row declares SAND_HOLLOW as its channel

- GIVEN the snake backdrop registry entry
- WHEN its `channel` field is read
- THEN it MUST equal `SAND_HOLLOW`, not be absent

#### Scenario: SAND_HOLLOW joins the existing channel luma law with no exemption

- GIVEN `SAND_HOLLOW`'s luma and the sand backdrop's sampled `brightest`
- WHEN the pre-existing "Channel Paint Follows the Backdrop Luma Law"
  assertion is evaluated for the snake row
- THEN it MUST clear 55 with no special-cased exemption for this row

#### Scenario: The channel renders beneath the art corridor layer

- GIVEN `TraceCanvas` rendered with the snake backdrop and `artCorridor`
  set
- WHEN the channel stroke and the corridor images are compared in
  document order
- THEN the channel MUST render before (beneath) the corridor images

### Requirement: Corridor Art Paint Satisfies the 55-Luma Law in Two Directions

Because the snake row's corridor surface is a drawn cutout rather than a
painted band alone, the app's 55-luma legibility law (`docs/09` §4) is
asserted in TWO directions beyond the channel-vs-backdrop check above,
never waived: the child's ink against the art's own darkest and
brightest sampled body colours, and those same art extremes against the
sand backdrop's `brightest`. `zoo/backdrops.ts`'s `snake` row SHALL
declare a `corridorArt?: {brightest: string; darkest: string; headWhite:
string}` field alongside `ink`/`inkDim` overrides (`TORCH_CHALK`/
`TORCH_CHALK_DIM`, the exact two fields the night row already ships). A
pure test SHALL assert FOUR gaps clear 55, using the manifest-sampled
values: (L1) the art's darkest (author's spots, `#1a1a1a`, luma 26) vs.
the ink (`TORCH_CHALK`, luma 239) — gap 213; (L2) the art's brightest
sampled body (luma 140.3, the small snake) vs. the ink — gap 98.7; (L3)
the art's darkest vs. the sand's `brightest` (`#dad0c0`, luma 209.2) —
gap 183.2; (L4) the art's brightest body vs. the sand's `brightest` —
gap 68.9.

FOUR falsifiability rows, each measuring a gap BELOW 55 so none can pass
alongside L1–L4: (R1) `INK_COLOR` (luma 40) vs. the art's darkest (26) —
gap 14, proving a dark ink is undrawable over the spots, over 12–37% of
the traced columns depending on snake size; (R2) `SHEET_PAPER` (luma 252)
vs. the sand's `brightest` (209.2) — gap 42.8, the SAME shipped,
UNTOUCHED assertion the pre-existing law's falsifiability suite already
carries, proving no paper channel is admissible on sand; (R3)
`TORCH_CHALK` (239) vs. the art's `headWhite` (the eye-white colour,
measured off the drawing) — gap 6, which is why the traceable span MUST
end behind the snake's head; (R4) `TORCH_CHALK` (239) vs. `SHEET_PAPER`
(252) — gap 13, proving the chalk line is admissible ONLY because there
is no paper channel under it — R2 and R4 together are why the snake row
can never fall back to a default channel, each alone leaving one escape
open.

#### Scenario: All four corridor-art luma gaps clear 55

- GIVEN the snake row's `corridorArt.darkest`/`brightest`, its `ink`, and
  the sand backdrop's `brightest`
- WHEN the four pairwise absolute luma differences (L1–L4) are computed
- THEN all four MUST be at least 55: 213, 98.7, 183.2, and 68.9

#### Scenario: The four red rows all measure below 55

- GIVEN `INK_COLOR` vs. the art's darkest, `SHEET_PAPER` vs. the sand's
  `brightest`, `TORCH_CHALK` vs. the art's `headWhite`, and `TORCH_CHALK`
  vs. `SHEET_PAPER`
- WHEN each pair's luma difference is computed
- THEN all four MUST be less than 55: 14, 42.8, 6, and 13 — proving the
  law is sensitive rather than vacuously true

#### Scenario: R2 is the pre-existing assertion, unedited

- GIVEN the "SHEET_PAPER vs. sand's brightest" falsifiability row
- WHEN compared before and after this change
- THEN its code MUST be unedited — it is a shipped row the corridor-art
  law reuses, not a new one this change introduces

### Requirement: Backdrop Luma Law Coverage Is Asserted Over the Whole Registry, Not Hand-Listed Groups

The pre-existing `tile ?? channel ?? SHEET_PAPER` luma-law loop MUST
iterate a set of groups whose union provably equals
`Object.keys(ADVENTURE_BACKDROP)` — every registered backdrop row —
rather than trusting that each new group is remembered to be added by
hand. A completeness guard SHALL assert this union equality directly, so
a future backdrop row that joins no group fails loudly instead of
silently escaping the 55-luma law.

#### Scenario: The union of the loop's groups equals every registered backdrop

- GIVEN the luma-law loop's declared groups and `ADVENTURE_BACKDROP`'s
  own keys
- WHEN the union of the groups' keys is compared to the registry's keys
- THEN they MUST be equal

#### Scenario: A backdrop row added to no group fails the completeness guard

- GIVEN a hypothetical new `ADVENTURE_BACKDROP` row added to none of the
  loop's groups
- WHEN the completeness guard runs
- THEN it MUST fail, proving the guard is sensitive rather than
  vacuously true
