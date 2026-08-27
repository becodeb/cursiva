# Delta for `letter-model`

## ADDED Requirements

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

## MODIFIED Requirements

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