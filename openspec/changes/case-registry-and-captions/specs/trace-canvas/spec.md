# Delta for Trace Canvas

## ADDED Requirements

### Requirement: Carrier Art Placement via placeArt()

`placeArt(art, height, center, grip?)` SHALL be the single pure exported function computing where carrier/lens art is drawn: given an optional grip point `[gx, gy]` in the art's own 0..1 box, it MUST return the `x`, `y`, `width`, `height` that place the grip point exactly at `center`. When no grip is declared, it MUST default to the box centre `(0.5, 0.5)`. Every call site (`TraceCanvas`, `home/modes.ts`) MUST use this function and MUST NOT compute its own centring offset.

#### Scenario: Declared grip lands on the target point
- GIVEN `CARRIER_LENS_ART`'s declared grip `(0.603, 0.391)` and a target center `C`
- WHEN `placeArt` is called with that grip
- THEN the returned box MUST place the art's `(0.603, 0.391)` point exactly at `C`, not the box's geometric centre

#### Scenario: No grip defaults to box centre
- GIVEN art with no declared grip
- WHEN `placeArt` is called
- THEN its result MUST equal calling it with grip `(0.5, 0.5)`

#### Scenario: TraceCanvas renders the carrier via placeArt's output
- GIVEN a trail rendered via `renderToString` with the carrier at a known position
- WHEN the carrier `<image>`'s `x`/`y` attributes are read from the HTML string
- THEN they MUST equal `placeArt`'s computed `x`/`y` for that art and grip, not the previous `(0.5, 0.5)` bounding-box formula
