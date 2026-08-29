# Delta for `letter-model`

## ADDED Requirements

### Requirement: Secondary Deferral Set

The system SHALL define a deferral set `DEFERRED_SECONDARY_CHARS = {t, i, j}`. The secondary of a deferred char (the `i`/`j` dot, the `t` cross) SHALL be drawn AFTER all word letters and connectors; the `x` second diagonal SHALL be drawn immediately after its main segment. `f` SHALL NOT be deferred (single-path; a future `f` cross draws immediately — flagged, out of scope).

#### Scenario: t/i/j deferred to word end

- GIVEN word `ti` assembled by `buildWord`
- WHEN the combined `d` is built
- THEN both secondaries MUST appear after both letter mains, in word order

#### Scenario: x secondary is immediate

- GIVEN word `xa` assembled by `buildWord`
- WHEN the combined `d` is built
- THEN the second diagonal MUST precede the connector and `a`'s main

### Requirement: Word Eligibility

The system MUST provide `isWordEligible(letter)`: SHALL pass when the letter is registered AND `flattenPathD(d).points[0]` lies within 15px of `anchors.entry`; SHALL NOT require `d.end === exit` (false for multi-subpath letters); main end SHALL resolve via `anchors.exit` or stored `mainEndArc`. Kalam-seed glyphs (closed contour, first point ≠ entry) MUST fail.

#### Scenario: Entry-matched letter passes

- GIVEN a registered letter whose first point sits ≤15px from `anchors.entry`
- WHEN `isWordEligible` is called
- THEN it MUST pass even when `d.end` is a secondary

#### Scenario: Kalam seed rejected

- GIVEN a Kalam glyph whose first curve point differs from `anchors.entry`
- WHEN `isWordEligible` is called
- THEN it MUST fail

## MODIFIED Requirements

### Requirement: LetterConfig Shape

Every letter MUST be a `LetterConfig` exposing `id`, `character`, `family`, `baselineZone`, `theme`, `pathDefinition` (`d`, `guideD`, `ideal`, `strokeWidth`, `checkpoints`, optional `mainEndArc`), and `animationTimeline`. All path and checkpoint coordinates MUST be expressed in viewBox `0 0 1000 600` space. Each checkpoint MUST define `x`, `y`, `order` (unique integer, strictly increasing from 1), `radius` (tolerance in virtual px), and MAY define `name`. `mainEndArc`, when present, SHALL be the arc length from path start to the MAIN segment end (multi-subpath letters); when absent, the path SHALL be treated as single-subpath with the cut at `d` end. Stored `d` SHALL remain a single-`M` polyline — never split by `M`.

(Previously: `pathDefinition` had no `mainEndArc`; cuts had to approximate via `anchors.exit` on flattened points.)

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

### Requirement: Ruled-Line Zone Map

The pipeline SHALL resolve each lowercase letter to one zone: `alta` for `b d h k l t`; `media` for `a c e i m n o r s u v w x z`; `baja` for `g p q y`; `mixta` for `f j`. (Previously: `alta` for `b d f h k l t`; `mixta` for `j` — the `f` moves to `mixta` because its school-cursive ductus spans the ascender zone AND descends below the baseline, remediated after manual browser feedback.)

#### Scenario: `t` is an ascender

- GIVEN `resolveBaselineZone('t')`
- WHEN called
- THEN it SHALL return `'alta'`

#### Scenario: `f` spans ascender and descender

- GIVEN `resolveBaselineZone('f')`
- WHEN called
- THEN it SHALL return `'mixta'` and the fitted stroke SHALL span from the top line (Y=180) down to the descender line (Y=540)

#### Scenario: Media set unchanged

- GIVEN any of `a c e i m n o r s u v w x z`
- WHEN `resolveBaselineZone` is called
- THEN it SHALL return `'media'`