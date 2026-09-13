# Delta for Free Trace Mode

## ADDED Requirements

### Requirement: coverageScore Generalizes to Cols/Rows With Defaults That Reproduce f1-libre

`coverageScore(strokes, viewBoxWidth, cols = COVERAGE_COLUMNS, rows =
COVERAGE_ROWS)` SHALL replace the two-argument signature
`coverageScore(strokes, viewBoxWidth)`. Calling it with only the first two
arguments MUST reproduce, value for value, the score `f1-libre` produces
under the previous two-argument signature. A reveal-grid erase level's
`accuracy` pillar SHALL be `coverageScore(strokes, viewBoxWidth,
reveal.cols, reveal.rows)`, forwarded into the SAME `rules.minAccuracy`
threshold every other free level already uses — no new pillar or sibling
field is introduced.

#### Scenario: Default arguments reproduce f1-libre's score exactly

- GIVEN `f1-libre`'s recorded stroke set
- WHEN scored with `coverageScore`'s default `cols`/`rows` and with the
  pre-existing two-argument call
- THEN both MUST produce the identical score

#### Scenario: A reveal level's own grid changes the score

- GIVEN the same stroke set scored against the default grid and against a
  reveal level's own `reveal.cols`/`reveal.rows`
- WHEN the two scores are compared
- THEN they MUST differ whenever the grids differ

#### Scenario: evaluateLevel's free branch forwards cols/rows with no new field

- GIVEN a reveal level's free-branch evaluation
- WHEN `accuracy` is computed
- THEN it MUST equal `coverageScore(strokes, viewBoxWidth, reveal.cols,
  reveal.rows)`, and `LevelRules` MUST gain no new field for it

### Requirement: Half-Cell Interpolation Applies to Both the Live Fold and the Release-Time Score

`coverage.ts`'s existing half-cell interpolation (a fast swipe reports few
points far apart, `coverage.ts:53`) MUST be applied identically inside the
reveal fold's incremental accumulation and inside `coverageScore`'s
whole-stroke computation, so the two never diverge on the same stroke set
and grid.

#### Scenario: The live fold and the release-time score agree on a sparse stroke

- GIVEN a fast, sparsely-sampled stroke folded incrementally by the reveal
  grid and scored once by `coverageScore` for the same grid
- WHEN the two results are compared
- THEN the reveal fold's cleared fraction MUST equal `coverageScore`'s
  result within the same tolerance
