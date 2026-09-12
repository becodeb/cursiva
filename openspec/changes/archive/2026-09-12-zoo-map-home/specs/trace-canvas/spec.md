# Delta for Trace Canvas

## MODIFIED Requirements

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
