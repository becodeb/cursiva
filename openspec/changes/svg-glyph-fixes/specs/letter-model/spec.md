# Delta for Letter Model

## ADDED Requirements

### Requirement: Elliptical Arc Ingestion

The path parser (`flattenPathD`) MUST support elliptical-arc commands `A`/`a` (absolute and relative), converting them into an equivalent sequence of cubic Bézier segments covering the arc parameterizations Inkscape emits (`rx ry x-axis-rotation large-arc-flag sweep-flag x y`). Converted points MUST be finite; arc conversion MUST NOT introduce `NaN` into the flattened point sequence.

#### Scenario: Dot letters parse cleanly

- GIVEN `i.svg`'s or `j.svg`'s arc-drawn dot
- WHEN `flattenPathD` parses it
- THEN every resulting point MUST be finite and approximate the closed ellipse

#### Scenario: Relative arc converts equivalently

- GIVEN a `d` string using a relative `a` command
- WHEN parsed
- THEN it MUST convert to the same points as its absolute `A` equivalent

### Requirement: Fail-Loud Unsupported Path Commands

`flattenPathD` MUST throw a descriptive `Error` naming the offending command letter for any command outside `{M,L,H,V,Q,C,Z,A,m,l,h,v,q,c,z,a}` (Inkscape's horizontal-line `H`/`h` and vertical-line `V`/`v` shorthands MUST be supported, not rejected). It MUST NOT silently coerce an unrecognized command letter into a numeric coordinate. It MUST also throw when any parsed numeric token is non-finite (`NaN`/`Infinity`), rather than propagating it into the point sequence.

#### Scenario: Unknown command throws by name

- GIVEN a `d` string containing an unsupported command (e.g. `S`)
- WHEN `flattenPathD` parses it
- THEN it MUST throw an `Error` whose message includes `"S"` and no point list MUST be returned

#### Scenario: Horizontal/vertical shorthand is supported

- GIVEN `k.svg`'s `d` containing `h 58.5`
- WHEN `flattenPathD` parses it
- THEN it MUST resolve to a horizontal line segment without throwing

#### Scenario: Non-finite token throws

- GIVEN a `d` string whose numeric token parses to `NaN` or `Infinity`
- WHEN `flattenPathD` parses it
- THEN it MUST throw an `Error` and no point list MUST be returned

#### Scenario: No NaN survives arc parsing

- GIVEN `i.svg` containing `a` commands, parsed after this fix
- WHEN the resulting config is built
- THEN no `NaN` MUST appear in the flattened points, bbox, or final `pathDefinition.d`

## MODIFIED Requirements

### Requirement: LetterConfig Shape

Every letter MUST be a `LetterConfig` exposing `id`, `character`, `family`, `baselineZone`, `theme`, `pathDefinition` (`d`, `guideD`, `ideal`, `strokeWidth`, `checkpoints`, optional `mainEndArc`, optional `segments`), and `animationTimeline`. All path and checkpoint coordinates MUST be expressed in viewBox `0 0 1000 600` space. Each checkpoint MUST define `x`, `y`, `order` (unique integer, strictly increasing from 1), `radius` (tolerance in virtual px), and MAY define `name`. `mainEndArc`, when present, SHALL be the arc length from path start to the MAIN segment end (multi-subpath letters); when absent, the path SHALL be treated as single-subpath with the cut at `d` end. Stored `d` SHALL remain a single-`M` polyline — never split by `M`.

`pathDefinition.segments`, when `mainEndArc` is present, SHALL be a derived `string[]` of one path-`d` string per subpath, MAIN first, then each SECONDARY in classification order. Any consumer rendering a multi-subpath letter (guide or demo) MUST render `segments` — never the concatenated `d` verbatim — so that no visible line crosses the MAIN→SECONDARY pen lift. For multi-subpath letters, `animationTimeline` MUST contain one `draw_path` step per element of `segments` (MAIN first), each carrying `properties: { d }` equal to that segment, rather than a single step covering the full un-lifted `d`.

(Previously: `mainEndArc` was the only multi-subpath cut signal and had no derived per-subpath representation; solo multi-subpath `animationTimeline` had exactly one `draw_path` step with no `properties.d`, so consumers fell back to rendering the concatenated `d`, drawing a visible line across the pen lift.)

#### Scenario: Seed `c` replicates docs/07 verbatim

- GIVEN the `c` seed
- WHEN inspected
- THEN `pathDefinition.d` MUST equal the "La Ola del Mar" path and its 5 checkpoints MUST carry orders 1–5 with radii 40/35/40/40/45

#### Scenario: Seed `a` is the keystone

- GIVEN the `a` seed
- WHEN inspected
- THEN its 6 checkpoints MUST map to docs/02 `puntosClave` in order: inicio_enganche, cresta_ola, retorno_curva, cierre_ovalo, bajada_pie (foot, 480,420), gancho_salida (hook, 550,400), with orders 1–6 and the counterclockwise oval apex (cresta/cierre) at 480,200

#### Scenario: Checkpoint ordering is strict

- GIVEN any seed letter
- WHEN checkpoints are enumerated
- THEN orders MUST be exactly 1..N with no gaps or duplicates

#### Scenario: Main-end arc recorded for multi-subpath letters

- GIVEN the `i` config
- WHEN `pathDefinition` is inspected
- THEN `mainEndArc` MUST equal the arc length to the body end and `d` MUST contain exactly one `M`

#### Scenario: Segments present only for multi-subpath letters

- GIVEN the single-subpath `a` config
- WHEN `pathDefinition` is inspected
- THEN `segments` MUST be absent (or `undefined`)

#### Scenario: No visible line across a solo pen lift when rendered via segments

- GIVEN the `i` config's `pathDefinition.segments`
- WHEN a consumer renders each segment as its own path element
- THEN no line segment MUST connect the body end to the dot start

#### Scenario: Solo animationTimeline mirrors segments

- GIVEN the `i` config's `animationTimeline`
- WHEN inspected
- THEN it MUST contain two `draw_path` steps (body, then dot), each `properties.d` equal to the corresponding entry in `pathDefinition.segments`
