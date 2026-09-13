# Reveal Grid Specification

## Purpose

A covering layer of independent tiles over a routeless level's backdrop
(`docs/13` §4, §8 row D). The layer has two persistence modes — `erase`,
whose cleared tiles stay gone, and `light`, whose opacity follows the live
point and persists nothing — a completion criterion per mode, and a render
contract that stays inside the app's `url(#)` ban (`docs/09` §3,
`TraceCanvas.tsx:78-93`).

## Requirements

### Requirement: Tile Grid Geometry and Index Convention

`levels/revealGrid.ts` SHALL model a reveal level's covering layer as
`cols × rows` tiles spanning the level's drawable band, each indexed
`row * cols + col` — the same convention `coverageScore` already uses
(`coverage.ts:59`), so a tile index and a coverage cell index name the same
kind of number. `cols` and `rows` MUST come from the level's own
`reveal.cols`/`reveal.rows`, never a fixed constant.

#### Scenario: Index convention matches coverageScore's own

- GIVEN the same `cols`/`rows` grid passed to both a reveal tile index and a
  coverage cell index for the same row/col
- WHEN the two indices are compared
- THEN they MUST be equal

#### Scenario: Grid dimensions come from the level, not a shared constant

- GIVEN two reveal levels with different `reveal.cols`/`reveal.rows`
- WHEN each level's tile grid is built
- THEN the two grids MUST differ in tile count exactly as their configs differ

### Requirement: Erase Mode Persists a Cleared Tile Set

When `reveal.mode === 'erase'`, the fold SHALL persist a `Set<number>` of
cleared tile indices across frames for the current attempt: once a tile's
index enters the set it MUST NOT leave it before a restart. A tile MUST be
added to the set when a sample point lands within `reveal.radius` of that
tile's centre.

#### Scenario: A cleared tile never returns during the same attempt

- GIVEN a tile cleared by an earlier sample
- WHEN later samples land far from that tile
- THEN the tile's index MUST remain in the cleared set

#### Scenario: Restart is the only way to empty the cleared set

- GIVEN a non-empty cleared set
- WHEN the attempt is restarted
- THEN the cleared set MUST become empty, and no other operation MUST empty it

### Requirement: Light Mode Computes Live Opacity and Persists No Grid State

When `reveal.mode === 'light'`, each tile's opacity SHALL be a pure function
of the current point's distance to that tile's centre, recomputed every
frame; the fold MUST discard the previous frame's opacities — no `Set` or
per-tile accumulator SHALL carry forward. Tiles farther than `reveal.radius`
from the current point MUST render at full covering opacity (`1`).

#### Scenario: Opacity depends only on the current frame's point

- GIVEN the point moved away and then back to its original position
- WHEN opacity is recomputed at the original position
- THEN it MUST reproduce the original frame's opacities exactly

#### Scenario: No opacity state survives with no active point

- GIVEN a frame with no current point
- WHEN opacities are computed
- THEN every tile MUST render at full covering opacity

### Requirement: Object Latch Turns a Non-Persistent Light Into a Completable Level

For `mode: 'light'` levels, the fold SHALL separately track, across frames,
whether each hidden object has EVER been lit — a boolean per object that,
once set, MUST NOT unset before a restart. An object counts as lit whenever
the live point's distance to its position is within `reveal.radius`. This
latch is the only state a `light` level persists.

#### Scenario: An object stays found after the light moves away

- GIVEN an object lit by an earlier frame's point
- WHEN the point moves elsewhere
- THEN the object's latch MUST remain `true`

#### Scenario: Restart clears every object's latch

- GIVEN one or more objects latched as found
- WHEN the attempt restarts
- THEN every latch MUST reset to unfound

### Requirement: Completion Criteria Per Mode

An `erase` level SHALL be complete when `clearedSet.size / (cols*rows)` is at
least the level's `rules.minAccuracy` — the SAME accuracy pillar and gating
field every other free level already uses. `RevealConfig` introduces NO
separate `threshold` field of its own. A `light` level SHALL be complete when
every one of its hidden objects has been latched as found. A `light` level's
completion MUST NOT be expressed as a coverage fraction — no coverage figure
accumulates when nothing persists.

#### Scenario: An erase level at its minAccuracy is complete

- GIVEN a cleared fraction exactly equal to the level's `rules.minAccuracy`
- WHEN completion is evaluated
- THEN it MUST report complete

#### Scenario: An erase level below its minAccuracy is not complete

- GIVEN a cleared fraction one tile below the level's `rules.minAccuracy`
- WHEN completion is evaluated
- THEN it MUST report incomplete

#### Scenario: A light level with every object latched is complete

- GIVEN all hidden objects latched as found
- WHEN completion is evaluated
- THEN it MUST report complete

#### Scenario: A light level with one object never lit is not complete

- GIVEN one hidden object never within `reveal.radius` of the point
- WHEN completion is evaluated
- THEN it MUST report incomplete

### Requirement: Finger Radius Widens the Cleared Set Beyond a Point-in-Cell Test

A tile SHALL clear (erase mode) or count as approached (light mode) whenever
a sample lands within `reveal.radius` of the tile's centre, not only when it
lands inside the tile's own cell boundary. `reveal.radius` MUST be a
per-level authored value, not derived from `cols`/`rows`.

#### Scenario: A sample outside a tile's own cell still clears it within radius

- GIVEN a sample point outside a tile's cell boundary but within
  `reveal.radius` of its centre
- WHEN the fold runs
- THEN that tile MUST clear

#### Scenario: Radius is independent of grid resolution

- GIVEN two levels sharing the same grid but different `reveal.radius`
- WHEN the same stroke is folded against both
- THEN their cleared-set sizes MUST differ

### Requirement: Incremental and Whole-Stroke Folds Agree

`levels/revealGrid.ts` SHALL export one pure fold function, called
incrementally from the play-time `onFrame` channel and once over the
finished stroke set at release/evaluation time. For any stroke set, folding
it incrementally and folding it in one call over the whole set MUST produce
the same cleared tile set.

#### Scenario: Incremental and whole-stroke folds agree

- GIVEN a stroke set folded one sample at a time and the same set folded in
  a single call
- WHEN the two resulting cleared sets are compared
- THEN they MUST be identical

### Requirement: Reveal Layer Renders as Plain Rects With No Fragment Reference

The reveal grid's render contract SHALL be: one plain `<rect>` per tile, its
opacity attribute set from that tile's fold state, and no `<mask>`,
`<pattern>`, `<clipPath>`, `<defs>`, `useId`, or `url(#…)` reference
introduced anywhere in the layer's markup.

#### Scenario: One rect renders per tile

- GIVEN a reveal layer rendered via `renderToString` for a `cols × rows` grid
- WHEN the HTML string is inspected
- THEN exactly `cols * rows` `<rect>` elements attributable to the reveal
  layer MUST appear

#### Scenario: No forbidden reference is introduced

- GIVEN the same render
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, or the
  substring `url(#`

### Requirement: Screenshot Seeding Flags for Render State

`?debug=revelado:<pct>` and `?debug=linterna:<x>,<y>`, each parsed by a pure
exported function in `canvas/devMode.ts`, SHALL NOT be dev-gated — following
`isSectorDebug`'s own stated reason (`devMode.ts:11-19`): they paint render
state, add no control, and must work against the exact build being
screenshotted. `revelado:<pct>` MUST pre-clear a deterministic tile pattern
reaching approximately that cleared percentage on an erase-mode level.
`linterna:<x>,<y>` MUST pin the light-mode fold's current point at that fixed
viewBox coordinate, replacing live pointer input.

#### Scenario: revelado pre-clears a deterministic pattern near the given percentage

- GIVEN `?debug=revelado:60` applied to an erase-mode level
- WHEN the pre-cleared set's fraction is measured
- THEN it MUST be close to 0.6

#### Scenario: linterna pins the light point at the given coordinate

- GIVEN `?debug=linterna:500,300`
- WHEN the light fold runs with no pointer input
- THEN the current point MUST equal `(500, 300)`

#### Scenario: Both parsers are pure and DOM-free

- GIVEN either parser called directly with a query string
- WHEN inspected
- THEN neither MUST require `window` access or component context
