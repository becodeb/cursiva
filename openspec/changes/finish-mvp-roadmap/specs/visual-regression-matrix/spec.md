# Delta for visual-regression-matrix

## ADDED Requirements

### Requirement: Visual Units Capture Real Product Scenes Across the Full Matrix

Each applicable visual work unit MUST capture its affected real product scene across start, partial, error, success, and map-return at `1280x720`, `844x390`, and `390x844` (15 cells per applicable visual unit), with screenshots and stable visible-state assertions.

#### Scenario: Per-unit matrix is complete
- GIVEN a visual unit affects map, glass, night, PISTAS, narrative closing, renewed backgrounds, or U14 signage
- WHEN that unit is validated
- THEN all 15 state×viewport cells for its affected real product scene MUST have screenshot evidence and visible-state assertions

#### Scenario: Overall MVP matrix covers every visual theme
- GIVEN U4 through U15 visual validation is complete
- WHEN the evidence set is reviewed
- THEN it MUST cover map, fogged glass, night discovery, PISTAS, approved narrative closing, renewed backgrounds, and the U14 wooden sign frame

### Requirement: Portrait Guidance Does Not Trap Navigation

Portrait gameplay MUST show accessible rotate guidance while keeping map return reachable.

#### Scenario: Portrait guidance preserves exit
- GIVEN `390x844` portrait gameplay
- WHEN the level opens
- THEN rotate guidance MUST be visible
- AND the map-return control MUST remain reachable by pointer and keyboard

### Requirement: Capture Failures Are Isolated

Missing assets or one failed state MUST be recorded without preventing unrelated captures from running.

#### Scenario: Isolated blocker allows remaining captures
- GIVEN one state lacks an approved asset
- WHEN the matrix runs
- THEN the blocker MUST be recorded for that state
- AND unrelated state/viewport captures MUST continue