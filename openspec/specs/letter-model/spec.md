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

The letter paths SHALL be hand-drawn single-stroke ductus: the pen-trajectory centerline normalized into the ruled zone; font extraction SHALL NOT be used. `d` = authored centerline (demo + guide); `guideD` MUST NOT be produced; `ideal` = dense centerline cloud plus perpendicular band per sample (scoring target); `checkpoints` = uniform arc length, writing order (1..N).

(Previously: paths extracted from Kalam-Regular glyph outlines: `guideD` contour fill, `ideal` glyph-body cloud. Kalam extraction REMOVED.)

#### Scenario: Sampled ductus preserves order

- GIVEN any lowercase config
- WHEN centerline is arc-length sampled and each checkpoint's nearest sample computed
- THEN indices MUST be strictly ascending

#### Scenario: Area cloud drives scoring

- GIVEN the `ideal` centerline-plus-band cloud
- WHEN a trace covers the stroke
- THEN scoring SHALL use MIN distance to the cloud

### Requirement: Entry/Exit Anchor Metadata

Every `LetterConfig` MUST expose `entry`/`exit` anchors in viewBox space. `entry` SHALL be `baseline-left` for all lowercase letters; `exit` SHALL be `baseline-right` by default, `top-right` for `o r v w`, `mid-right` for `e`. Anchors SHALL drive writing-order diagnostics.

#### Scenario: Default baseline-right exit

- GIVEN config for `a`
- WHEN its exit is inspected
- THEN it MUST be `baseline-right`

#### Scenario: Top and mid exits

- GIVEN configs for `o r v w` and `e`
- WHEN each exit is inspected
- THEN `o r v w` MUST exit `top-right`; `e` MUST exit `mid-right`

### Requirement: Multi-Subpath Classification

An SVG MAY contain multiple subpaths in one `<path>` (several `M`). MAIN SHALL be the subpath starting nearest the entry anchor (bbox bottom-left); ties SHALL break to longest, then file order. SECONDARY (`i`/`j` dot, `t`/`f` cross, `x` second diagonal) SHALL draw AFTER the main path. Only the FIRST `<path>` SHALL be read (authoring constraint).

#### Scenario: Pen-lift stroke drawn after the body

- GIVEN `i` with body bottom-left, dot above
- WHEN the path is classified
- THEN the body MUST come first and the dot AFTER it

#### Scenario: Tie-break by length, then file order

- GIVEN two subpaths equidistant from the entry anchor
- WHEN classified
- THEN the longer MUST be main; equal length, file order

#### Scenario: Only the first `<path>` element is read

- GIVEN an SVG with extra decoration `<path>`s
- WHEN the SVG is ingested
- THEN only the first `<path>` `d` MUST be used

### Requirement: Anchor-Aware Diagnostics

The pipeline MUST NOT warn on end placement when the stroke ends near its declared exit anchor, and MUST warn when the end is over 80px away. Start diagnostics SHALL check against the entry anchor.

#### Scenario: No false warning for top/mid exits

- GIVEN `o r v w e` ending at their exit anchors
- WHEN their configs are built
- THEN no end-corner warning MUST be emitted

#### Scenario: Genuinely wrong end still warns

- GIVEN `a` ending far from the baseline-right exit
- WHEN the config is built
- THEN an end-corner warning MUST be emitted

### Requirement: Ruled-Line Zone Map

The pipeline SHALL resolve each lowercase letter to one zone: `alta` for `b d f h k l t`; `media` for `a c e i m n o r s u v w x z`; `baja` for `g p q y`; `mixta` for `j`. (Previously: `t` → `media`.)

#### Scenario: `t` is an ascender

- GIVEN `resolveBaselineZone('t')`
- WHEN called
- THEN it SHALL return `'alta'`

#### Scenario: Media set unchanged

- GIVEN any of `a c e i m n o r s u v w x z`
- WHEN `resolveBaselineZone` is called
- THEN it SHALL return `'media'`

### Requirement: Lowercase-Only Scope

The pipeline SHALL support lowercase `a`–`z` only; uppercase/digits SHALL be out of scope.

#### Scenario: Uppercase imposes no contract

- GIVEN no uppercase SVGs or anchors
- WHEN run on lowercase only
- THEN no uppercase/digit requirement exists

## Open Values (design phase)

- Seed `a` checkpoint radii: docs/07 radii cover `c` only (proposal risk #1). Design MUST assign positive `a` radii per the TOLERANT ruling; candidates: reuse `c`-range (35–45).