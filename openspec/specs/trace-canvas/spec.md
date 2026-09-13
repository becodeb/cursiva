# Trace Canvas Specification

## Purpose

The drawing surface: fixed normalized SVG viewBox `0 0 1000 600`, three-zone ruled lines, Pointer Events capture into normalized `Point[]`, perfect-freehand ink, and arc-length resampling to K points.

## Requirements

### Requirement: Viewport and Ruled Lines

The canvas MUST render as an SVG with `viewBox="0 0 1000 600"` and MUST draw full-width guide lines at Y=180 (upper guide), Y=300 (middle guide), Y=420 (baseline), and Y=540 (descender guide), dividing sky (0–180), grass (180–420), and roots (420–600) zones with the descender line marking the bottom of the roots zone. Rendering SHALL be responsive across touch screen sizes while coordinates stay normalized.

(Previously: only Y=180 and Y=420 were drawn — the descender line at Y=540 did not exist on the canvas.)

#### Scenario: Guides sit on the viewBox grid

- GIVEN the canvas rendered at any device size
- WHEN the SVG is inspected
- THEN the viewBox MUST be `0 0 1000 600` and the guide lines MUST lie at Y=180, Y=300, Y=420, and Y=540 in viewBox space

#### Scenario: Descender letter visible below the baseline

- GIVEN a `mixta`-zone letter (e.g. `f`) whose stroke descends below the baseline
- WHEN the canvas renders
- THEN the stroke MUST be visible below Y=420 and the descender guide MUST render at Y=540

### Requirement: Pointer Capture and Normalization

The canvas SHALL capture `pointerdown`, `pointermove`, `pointerup`, and `pointercancel`. Raw pointer coordinates MUST be mapped into viewBox space via `getScreenCTM().inverse()`; naive scaling from `clientX`/`clientY` is FORBIDDEN. Pressure (`e.pressure`) MAY be captured when available.

#### Scenario: Correct normalization

- GIVEN a pointer event at screen point p on a scaled canvas
- WHEN p is converted
- THEN the result MUST equal p transformed by the inverse screen CTM (within float epsilon) and fall inside `0..1000` × `0..600`

### Requirement: Primary Pointer Only

The canvas SHALL track exactly one active stroke. A second `pointerdown` while a stroke is active MUST be ignored (multi-pointer deferred beyond this slice). `pointercancel` MUST discard the active stroke and its ink.

#### Scenario: Second finger ignored

- GIVEN an active stroke from pointer 1
- WHEN pointer 2 fires `pointerdown`/`pointermove`
- THEN its points MUST NOT be appended to the stroke

#### Scenario: pointercancel clears

- GIVEN an active stroke with ink on screen
- WHEN `pointercancel` fires
- THEN the stroke and its ink MUST be discarded

### Requirement: Ink Rendering

Captured points MUST be rendered as fluid ink computed with perfect-freehand `getStroke`. Rendering is display-only and MUST NOT mutate captured data.

#### Scenario: Stroke polygon generated

- GIVEN a captured stroke of at least 3 points
- WHEN ink is computed
- THEN a closed polygon outlining the input centerline MUST be produced

### Requirement: Arc-Length Resampling

Captured strokes MUST be resampled to exactly K equidistant points along their arc length, with K = 64 (constant; design MAY tune). Strokes with fewer than 2 distinct captured points MUST yield an empty resample.

#### Scenario: Fixed cardinality

- GIVEN a raw stroke of 400 points
- WHEN resampled
- THEN exactly 64 points MUST be produced, spaced `totalLength / 64` apart

#### Scenario: Degenerate input

- GIVEN a stroke with fewer than 2 distinct points
- WHEN resampling is requested
- THEN it MUST return an empty result and downstream evaluation MUST NOT run

### Requirement: Real-Time Responsiveness

The capture→ink pipeline SHALL sustain ~60fps on touch with no perceptible lag (docs/04 criterion 2), demonstrated by device checklist plus vitest on the pure capture/resample/ink modules. Average frame time during continuous `pointermove` MUST be ≤ 17ms on the reference touch device.

#### Scenario: Frame budget holds

- GIVEN continuous pointer movement on the reference touch device
- WHEN frame times are measured across capture, resample, and ink render
- THEN average frame time MUST be ≤ 17ms (60fps target)

### Requirement: Checkpoint Overlay Gate

The canvas SHALL accept an optional `showCheckpoints` prop and SHALL render the checkpoint overlay exactly when `showCheckpoints && devCheckpoints && devIdeal`; dev mode alone MUST NOT enable the overlay. The live score line SHALL render only in dev mode (`showScore = isDevMode()`), independently of the overlay gate.

(Previously: gate was `(isDevMode() || showCheckpoints) && devCheckpoints && devIdeal` — dev forced the overlay regardless of the toggle.)

#### Scenario: Toggle reveals overlay in production

- GIVEN a non-dev session with `showCheckpoints` true and dev checkpoint data loaded
- WHEN the canvas renders
- THEN the checkpoint overlay MUST render and the live score line MUST NOT render

#### Scenario: Overlay stays hidden when toggle is off

- GIVEN a non-dev session with `showCheckpoints` false
- WHEN the canvas renders
- THEN the overlay MUST NOT render

#### Scenario: Dev mode no longer forces the overlay

- GIVEN a dev session with `showCheckpoints` false and dev checkpoint data loaded
- WHEN the canvas renders
- THEN the overlay MUST NOT render

#### Scenario: Dev toggle ON shows overlay with score

- GIVEN a dev session with `showCheckpoints` true and dev checkpoint data loaded
- WHEN the canvas renders
- THEN the overlay MUST render and the live score line MUST render (score stays dev-only)

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
`backdrop.channel ?? SHEET_PAPER` — the channel is now a per-backdrop
choice, not a hardcoded constant — regardless of the `ground` prop's value.
`SHEET_PAPER` (`#fdfcf7`) remains the default whenever a backdrop declares
no `channel` field, which is what keeps the lagoon backdrop byte-identical
to before this change. A pure test SHALL assert
`|luma(backdrop.channel ?? SHEET_PAPER) − luma(backdrop.brightest)| >= 55`
(`docs/09:158`'s law) for all three registered backdrops: the lagoon
(`SHEET_PAPER` vs `#b4c5d0`), the ladera (`CHANNEL_STONE` `#606569` vs
`#9da396`), and the cordillera (`CHANNEL_STONE` vs `#f5f5f5`). FIVE
falsifiability rows MUST assert FAILURE, encoding why `CHANNEL_STONE` is
forced rather than chosen: `SHEET_PAPER` against the cordillera's
brightest (gap 7); `MUD_INK` against `CHANNEL_STONE` (gap 12); `GOAL_COLOR`
against `CHANNEL_STONE` (gap 4); the green start dot/arrow against
`CHANNEL_STONE` (gap 37); the demo stroke `#0284c7` against
`CHANNEL_STONE` (gap 1).

(An earlier draft of this requirement said "four" and named only four of the
five, while `design.md` §2.1's own arithmetic table named a different four —
the two disagreed on whether the green start dot/arrow or the
`SHEET_PAPER`-vs-cordillera row was the fourth. The implementation asserts
all five; this text now names all five, so spec, design and code agree.
The ladera's `brightest` is `#9da396` (luma 159.7), the rebuilt manifest's
real measurement, not `design.md`'s pre-freeze draft `#b4bec5`.)

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

#### Scenario: The five falsifiability rows all fail the law

- GIVEN `SHEET_PAPER` vs the cordillera's `brightest`, `MUD_INK` vs
  `CHANNEL_STONE`, `GOAL_COLOR` vs `CHANNEL_STONE`, the green start
  dot/arrow vs `CHANNEL_STONE`, and the demo stroke vs `CHANNEL_STONE`
- WHEN each pair's luma difference is computed
- THEN all five MUST be less than 55, proving the law is sensitive rather
  than vacuously true


### Requirement: Multi-Step Demo Rendering

The `demo` prop SHALL accept a single `DrawDemo` or an array `DrawDemo[]`; the canvas SHALL render one animated `motion.path` per demo entry, each drawing its own `d` via framer-motion `pathLength` at that entry's delay and duration. Timeline completion SHALL consider every entry. The single-object form SHALL preserve the previous single-path behavior.

#### Scenario: Array renders one path per demo

- GIVEN a demo array of 3 segments
- WHEN the demo plays
- THEN 3 `motion.path` entries MUST animate with their own `d`, delay, and duration

#### Scenario: Single object unchanged

- GIVEN a single `DrawDemo` object
- WHEN the demo plays
- THEN exactly one path MUST animate as before

### Requirement: Demo and Guide Stroke Joins

The animated demo path(s) (`motion.path`, single or array per `Multi-Step Demo Rendering`) and the static guide path MUST render with `stroke-linejoin="round"`, matching the existing `stroke-linecap="round"`, to prevent sharp miter cusps at interior direction reversals.

#### Scenario: Demo path has round joins

- GIVEN a demo config with an interior reversal (e.g. letter `a`)
- WHEN the animated path renders
- THEN its `stroke-linejoin` attribute MUST equal `"round"`

#### Scenario: Guide path has round joins

- GIVEN any letter's guide path
- WHEN rendered
- THEN its `stroke-linejoin` attribute MUST equal `"round"`

### Requirement: Guide Path Pen-Lift Fidelity

The static guide path SHALL render every subpath of a letter's `pathDefinition` (MAIN and any SECONDARY) without drawing a connecting line between the end of one subpath and the start of the next, consuming the pen-lift boundary already encoded in the letter's data (letter-model `LetterConfig Shape`).

#### Scenario: No line across the dot gap

- GIVEN letter `i`'s guide is rendered
- WHEN inspected
- THEN no line segment MUST connect the body end to the dot start

#### Scenario: Multi-letter words unaffected

- GIVEN a multi-letter word's guide (already pen-lift-safe via `buildWord`)
- WHEN rendered
- THEN its rendering behavior MUST remain unchanged

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

### Requirement: Carrier Art Placement via placeArt()

`placeArt(art, height, center, grip?)` SHALL be the single pure exported
function computing where carrier/lens art is drawn: given an optional grip
point `[gx, gy]` in the art's own 0..1 box, it MUST return the `x`, `y`,
`width`, `height` that place the grip point exactly at `center`. When no grip
is declared, it MUST default to the box centre `(0.5, 0.5)`. Every call site
MUST use this function and MUST NOT compute its own centring offset. The call
sites after this change are `client/src/canvas/TraceCanvas.tsx`,
`client/src/screen/ZooMap.tsx` and `client/src/zoo/sectors.ts`.

(Previously the call-site list read `TraceCanvas`, `home/modes.ts`. Two
corrections, not one. First, that second entry was a misattribution: the
actual call was `HomeScreen.tsx:180`, and `HomeScreen.tsx` and all of
`client/src/home/` are retired by this change. Second — and this is the point
of the requirement — the list is **not** shrinking to `TraceCanvas` alone.
The zoo map places its fog patches, its recovered animals and its octopus
through this same function rather than writing a second placer, which is
exactly what the requirement asks for. The invariant was never "one caller";
it is "one FORMULA". A requirement phrased as a caller count punishes the
reuse it exists to mandate, and would have gone stale inside the very change
that obeyed it.)

#### Scenario: Declared grip lands on the target point
- GIVEN `CARRIER_LENS_ART`'s declared grip `(0.603, 0.391)` and a target center `C`
- WHEN `placeArt` is called with that grip
- THEN the returned box MUST place the art's `(0.603, 0.391)` point exactly
  at `C`, not the box's geometric centre

#### Scenario: No grip defaults to box centre
- GIVEN art with no declared grip
- WHEN `placeArt` is called
- THEN its result MUST equal calling it with grip `(0.5, 0.5)`

#### Scenario: TraceCanvas renders the carrier via placeArt's output
- GIVEN a trail rendered via `renderToString` with the carrier at a known position
- WHEN the carrier `<image>`'s `x`/`y` attributes are read from the HTML string
- THEN they MUST equal `placeArt`'s computed `x`/`y` for that art and grip,
  not the previous `(0.5, 0.5)` bounding-box formula

#### Scenario: No caller computes its own centring offset
- GIVEN the codebase after this change
- WHEN every import of `placeArt` is enumerated
- THEN each call site MUST obtain its box from `placeArt` and MUST NOT
  reimplement the `center − grip × size` arithmetic locally
- AND `home/modes.ts` and `HomeScreen.tsx` MUST no longer exist
- AND the retired office MUST NOT be replaced by a second placer: the zoo map
  MUST reuse this one

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