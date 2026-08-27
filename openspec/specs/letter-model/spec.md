# Letter Model Specification

## Purpose

Canonical data model for letters, reconciling docs/02 (`puntosClave`/`pathBézier`, 6-point `a`) with docs/07 (`pathDefinition.d`/`checkpoints`, 5-point `c`) plus meta. Registry with seeds `a` and `c`. All coordinates are in normalized viewBox `0 0 1000 600` space.

## Requirements

### Requirement: LetterConfig Shape

Every letter MUST be a `LetterConfig` exposing `id`, `character`, `family`, `baselineZone`, `theme`, `pathDefinition` (`d`, `guideD`, `ideal`, `strokeWidth`, `checkpoints`), and `animationTimeline`. All path and checkpoint coordinates MUST be expressed in viewBox `0 0 1000 600` space. Each checkpoint MUST define `x`, `y`, `order` (unique integer, strictly increasing from 1), `radius` (tolerance in virtual px), and MAY define `name`.

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

### Requirement: Registry Resolution

The registry MUST ship seeds `a` and `c` (both `family: 'ola'`, `baselineZone: 'media'`) and MUST be the single access point: `getLetterConfig(char)` SHALL return the config for registered lowercase chars, case-insensitively, and MUST throw a descriptive error for unregistered chars.

#### Scenario: Registered character

- GIVEN the registry with `a` and `c`
- WHEN `getLetterConfig('A')` is called
- THEN the `a` config MUST be returned

#### Scenario: Unknown character

- GIVEN the registry with `a` and `c`
- WHEN `getLetterConfig('z')` is called
- THEN an error MUST be thrown and no config returned

### Requirement: Path–Checkpoint Consistency

The letter paths SHALL be extracted from the Kalam-Regular font (OFL) glyph outlines, scaled into the middle ruled zone (Y 180–420) of viewBox `0 0 1000 600`:
- `d` — the exterior ductus (the natural single-pass stroke, now `Q`/`L` commands) used for the demo and as the visible guide line;
- `guideD` — the FULL glyph contour including counter-holes, rendered as an evenodd FILL so the child sees a real cursive letter;
- `ideal` — a dense AREA point cloud of the glyph body, the scoring target (distance-based, area-cloud model).

The ductus `d` SHALL pass through or near each checkpoint (as on-curve points reachable along the stroke). For seed `a` the entry (`inicio_enganche`, order 1) and cierre (`cierre_ovalo`, order 6) checkpoints are CO-LOCATED at the same point (467.8, 413.2); the order-gated activation resolves them by ENTRY order — the first visit activates 1, the re-entry (closing the loop) activates 6.

#### Scenario: Sampled ideal path preserves order

- GIVEN seed `c` and its ductus arc-length-sampled to K points
- WHEN the nearest sampled point to each checkpoint is computed
- THEN their indices MUST be strictly ascending

#### Scenario: Area cloud drives scoring, not the centerline
- GIVEN the `ideal` area cloud for a seed
- WHEN a user trace covers the letter body
- THEN scoring SHALL use MIN distance to the cloud (area-cloud model), not index pairing to a thin centerline

## Open Values (design phase)

- Seed `a` checkpoint radii: docs/07 radii cover `c` only (proposal risk #1). Design MUST assign positive `a` radii per the TOLERANT ruling; candidates: reuse `c`-range (35–45).