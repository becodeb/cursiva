# Art Corridor Specification

## Purpose

A corridor whose walkable surface is a DRAWN CUTOUT — a snake's body —
rather than a painted band under the child's finger (`docs/13` §4, §8 row
E). Owns the centreline generator FITTED to the drawn spine
(`spineWave`), the manifest-sourced fit parameters (`DRAWN_SPINE`), the
placement function shared by renderer and test (`placeArtCorridor`), the
build-time proof that the generated centreline coincides with the drawn
spine, and the 55-luma legibility law an art surface must satisfy
(restated in full by the `trace-canvas` capability's own requirements,
which this capability's `corridorArt` field feeds).

## Requirements

### Requirement: The Centreline Is Fitted to the Drawing, Not Authored Beside It and Checked for Drift

`spineWave`'s parameters (per half-arch: `width`, signed `rise`) MUST be
DERIVED from the drawn cutout's own sampled spine at build time, not
authored independently and then compared against the drawing for drift.
`scripts/art/build_art.py`'s `sample_spine` SHALL sample each cutout's
spine — the vertical midpoint of the opaque body, column by column —
and fit it EXACTLY at three interpolation points per half-arch (the two
zero crossings of `spine − mid` and the extremum between them), using
the closed form the shipped `alternatingArches` cubic already
satisfies at those same three points. No numerical solver or
least-squares fit MAY be introduced: the fit MUST be closed-form.
Introducing a centreline generator that is authored independently and
only checked against the drawing afterward — leaving open the
possibility that the two disagree — is explicitly declined; a design
that can name its own worst failure removes it rather than budgeting for
it.

#### Scenario: The fitted parameters satisfy the three interpolation conditions

- GIVEN a drawn spine's measured zero crossings and extremum for one
  half-arch
- WHEN `spineWave`'s reconstructed cubic for that half is evaluated at
  those same three points
- THEN it MUST equal the measured spine value at each, exactly (within
  float epsilon)

#### Scenario: No independent generator is authored and checked for drift

- GIVEN the diff this capability's implementation introduces
- WHEN scanned for a centreline whose parameters are hand-authored rather
  than derived from `sample_spine`'s fit
- THEN none MUST be found

### Requirement: spineWave Emits Only the Shared Path Alphabet and Reproduces waveVaried on a Uniform Input

`levels/paths.ts` SHALL provide `spineWave({x0?, y?, halves?})`, the
per-half sibling of `waveVaried` (itself the per-cycle sibling of
`wave`): same accumulate-`x` loop, same cubic, same alphabet. Its output
MUST be built only from absolute `M` and `C` commands. A `halves` list
that alternates `-amplitude, +amplitude` at a uniform width MUST
reproduce `waveVaried`'s `d` string byte for byte, and `waveVaried`'s own
uniform list MUST reproduce `wave`'s — the same three-generation
byte-identity proof `garlandVaried` already carries. Its output MUST
compose with `transformPath` (rotation for `snake3`'s vertical
orientation) without throwing.

#### Scenario: spineWave emits only M/C

- GIVEN `spineWave`'s output for any authored `halves` list
- WHEN the `d` string is scanned for path commands
- THEN only `M` and `C` MUST appear

#### Scenario: A uniform halves list reproduces waveVaried's output exactly

- GIVEN a `halves` list whose entries alternate a uniform `-amplitude,
  +amplitude` at a uniform `width`, matching a `waveVaried` call with the
  equivalent cycles
- WHEN both `d` strings are compared
- THEN they MUST be byte-identical

#### Scenario: spineWave composes with transformPath

- GIVEN `spineWave`'s output rotated via `transformPath` for `snake3`'s
  vertical orientation
- WHEN `transformPath` is applied
- THEN it MUST NOT throw and MUST return a valid path string

### Requirement: Each Snake's Fit Parameters, Thickness, Traceable Span and Luma Extremes Are Sampled Into manifest.json at Build Time

`scripts/art/build_art.py` SHALL sample, for each of the three snake
cutouts (`sector-snake-{small,medium,large}.png`): the fitted spine
(`mid`, `halves`), the fit `residual` (maximum `|Δy|` between the
measured spine and the reconstructed cubics, in shipped pixels), the
median opaque-column `thickness`, the traceable span (`traceFrom`,
`traceTo` — `traceTo` the leftmost column whose spine pixel reaches the
eye-white luma threshold, minus one half-thickness), and the luma
extremes over the opaque body excluding `x > traceTo` (`bodyBrightest`,
`bodyDarkest`) plus the head's own brightest pixel (`headWhite`). All
values MUST be normalized to the cutout's own box, and all MUST be
emitted into `manifest.json` alongside `quiet`/`brightest`, the same
shape `sample_corridor_band` already produces. Every literal
`spineWave`/`placeArtCorridor` callers use in `catalog.ts`/`backdrops.ts`
MUST be hand-copied from the rebuilt manifest, never invented.

#### Scenario: manifest.json gains the fit, thickness, span and luma fields for all three sizes

- GIVEN the rebuilt `manifest.json`
- WHEN `sector-snake-small`, `-medium`, and `-large`'s entries are
  inspected
- THEN each MUST carry `mid`, `halves`, `residual`, `thickness`,
  `traceFrom`, `traceTo`, `bodyBrightest`, `bodyDarkest`, and `headWhite`

#### Scenario: artManifest.test.ts guards the new fields against drift

- GIVEN a hand-edited manifest field that no longer matches a rebuilt
  sample
- WHEN `artManifest.test.ts` runs
- THEN it MUST fail, the same guard it already holds for `quiet`/
  `brightest`

### Requirement: One Shared Placement Function Computes the Rendered Box, the Scored Path, and the Test's Own Assertion

`levels/artCorridor.ts` SHALL export ONE pure function,
`placeArtCorridor(piece: ArtCorridorPiece, tx: number):
ArtCorridorPlacement`, returning the `<image>`'s box, its rotation and
pivot, the `spineWave`-emitted `d` string (already rotated and
translated), the drawn body's median thickness in viewBox units, and the
fit residual in viewBox units. `TraceCanvas`'s art corridor layer
(`trace-canvas` capability), `buildLevelTarget`'s derivation of
`LevelTarget.artCorridor` (`level-engine` capability), and
`artCorridor.test.ts`'s coincidence assertion MUST all call this SAME
function; none of the three MUST recompute placement independently — a
test that recomputed placement on its own would prove nothing about what
is actually drawn and scored.

#### Scenario: The renderer's image box equals placeArtCorridor's output

- GIVEN a snake level rendered via `renderToString`
- WHEN the rendered `<image>`'s box is compared to `placeArtCorridor`'s
  output for the same piece and `tx`
- THEN they MUST be equal

#### Scenario: The coincidence test uses the same function, not an independent one

- GIVEN `artCorridor.test.ts`'s source
- WHEN scanned for placement computation
- THEN the only call MUST be to `placeArtCorridor`; no parallel
  reimplementation of the placement formula MUST exist in the test file

### Requirement: The Generated Centreline Coincides With the Manifest-Fitted Spine Within a Tight, Falsifiable Tolerance

For every snake level and every piece, walking `target.artCorridor[i]`'s
box at 33 fractions of its width, offset by that spine's fitted `mid`,
MUST land within **0.5 viewBox units** of `flattenPathD(target.paths[i])`
at the same fraction. 0.5 is the path-rounding module's own rounding
precision (2 decimal places) with three orders of magnitude to spare —
anything larger is a genuine disagreement, not rounding noise. Each
level's `|tx|` (the horizontal centring translation `layOutPaths`
computed) MUST also measure under 0.5, so the authored coordinates in
the catalog are provably the shipped ones.

#### Scenario: Every probe lies within 0.5 units of the generated centreline

- GIVEN each of `snake1..4`'s three pieces, each walked at 33 probe
  fractions
- WHEN each probe's distance to `flattenPathD(target.paths[i])` at the
  same fraction is measured
- THEN every distance MUST be less than 0.5 viewBox units

#### Scenario: tx measures under 0.5 for every snake level

- GIVEN each of `snake1..4`'s `layOutPaths`-derived `tx`
- WHEN its absolute value is measured
- THEN it MUST be less than 0.5

#### Scenario: An artificially shifted centreline fails the assertion

- GIVEN a generated centreline offset by more than 0.5 units from the
  fitted spine at some probe
- WHEN the coincidence assertion is evaluated against that shifted
  centreline
- THEN it MUST fail — proving the assertion is sensitive, not vacuously
  true

### Requirement: No Alpha Sampling Is Introduced

No `<canvas>` element, no `getImageData` call, and no runtime raster
sampling of any kind MAY appear anywhere in the diff this capability's
implementation introduces. Every value the coincidence proof above rests
on is derived entirely from `manifest.json`'s build-time samples and the
shared placement function, never from reading pixels at runtime —
raster sampling in this pure-geometry engine is explicitly declined.

#### Scenario: The diff introduces no runtime raster sampling

- GIVEN the full diff this capability's implementation introduces
- WHEN scanned for `getImageData` calls and `<canvas>` elements
- THEN none MUST be found

### Requirement: The Sizing Constraint Set Is Asserted Directly Over Authored Literals

`catalog.test.ts` SHALL assert six named constraints (C1–C6) directly
over each snake level's authored literals, so the geometry can be
retuned without any design document going stale: (C1) `corridorWidth + 2
· residual ≤ thickness` for the level's narrowest piece — the ink stays
on the body and the channel hollow stays under it; (C2) each piece's
wave-crest radius of curvature exceeds `corridorWidth/2 −
BAND_INSET` — the tolerance band's folded boundary stays inside the
stroked channel on every crest; (C3) the minimum centreline separation
between any two of a level's three pieces exceeds `2 · corridorWidth` —
the nearest-route wall check is unambiguous; (C4) that same minimum
separation exceeds `2 · 60` — no point on one snake falls inside
another's checkpoint radius; (C5) the traceable span's start and end
inset by at least half the body thickness on both ends; (C6) every
`<image>` box and every centreline union stays inside `[0, 600]` and
clears the phase-1 span guard.

#### Scenario: All six constraints hold for every snake level

- GIVEN `snake1..4`'s authored literals
- WHEN C1 through C6 are each evaluated
- THEN all six MUST hold for all four levels

#### Scenario: A constraint violation is detectable

- GIVEN a hypothetical level whose two nearest pieces are separated by
  less than `2 · corridorWidth` (violating C3)
- WHEN C3 is evaluated
- THEN it MUST fail, proving the constraint is checked rather than
  assumed

### Requirement: Art Corridor Layer Render Contract — No Fragment Reference

The art corridor's render contract SHALL be: one plain `<image>` per
snake piece, its box set from `placeArtCorridor`'s output (during the
trace phase) or from the live arrange state (during the arrange phase,
`object-arrange` capability), and no `<mask>`, `<pattern>`, `<clipPath>`,
`<defs>`, `useId`, or `url(#…)` reference introduced anywhere in the
layer's markup.

#### Scenario: One image renders per snake piece

- GIVEN a snake level rendered via `renderToString`
- WHEN the HTML string is inspected
- THEN exactly 3 `<image>` elements attributable to the art corridor
  layer MUST appear

#### Scenario: No forbidden reference is introduced

- GIVEN the same render
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, or
  the substring `url(#`
