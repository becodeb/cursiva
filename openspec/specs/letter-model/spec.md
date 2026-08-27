# Letter Model Specification

## Purpose

Canonical data model for letters, reconciling docs/02 (`puntosClave`/`pathBézier`, 6-point `a`) with docs/07 (`pathDefinition.d`/`checkpoints`, 5-point `c`) plus meta. Registry with seeds `a` and `c`. All coordinates are in normalized viewBox `0 0 1000 600` space.

## Requirements

### Requirement: LetterConfig Shape

Every letter MUST be a `LetterConfig` exposing `id`, `character`, `family`, `baselineZone`, `theme`, `pathDefinition` (`d`, `strokeWidth`, `checkpoints`), and `animationTimeline`. All path and checkpoint coordinates MUST be expressed in viewBox `0 0 1000 600` space. Each checkpoint MUST define `x`, `y`, `order` (unique integer, strictly increasing from 1), `radius` (tolerance in virtual px), and MAY define `name`.

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

The `pathDefinition.d` ideal path SHALL pass through or near each checkpoint in ascending order; the ideal curve used for scoring is sampled from `d`, not from checkpoints.

#### Scenario: Sampled ideal path preserves order

- GIVEN seed `c` and its ideal path arc-length-sampled to K points
- WHEN nearest sampled point to each checkpoint is computed
- THEN their indices MUST be strictly ascending

## Open Values (design phase)

- Seed `a` checkpoint radii: docs/07 radii cover `c` only (proposal risk #1). Design MUST assign positive `a` radii per the TOLERANT ruling; candidates: reuse `c`-range (35–45).