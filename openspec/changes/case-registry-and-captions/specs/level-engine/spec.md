# Delta for Level Engine

## ADDED Requirements

### Requirement: Duck Trail Set Precedes trail1

Four new trail levels (`duck-trail1..4`) SHALL be inserted into `LEVELS` immediately before `trail1`, using generators `wave(140,1)`, `wave(170,2)`, `garland(3)`, `squareWave(140,200,3)` with corridor widths 100, 90, 80, 70 (strictly decreasing) and clues `webfoot`, `breadcrumb`, `bubble`, `feather` respectively. None of the four MUST carry a timed obstacle (D1). `duck-trail4` MUST satisfy the existing `cornerClearance` and `armClearance` guards. Level ids are persisted keys; none of the four MUST ever be removed once shipped.

#### Scenario: Corridor width strictly decreases across the duck trails
- GIVEN the four duck trail configs in catalog order
- WHEN their `corridorWidth` values are read
- THEN they MUST strictly decrease: 100, 90, 80, 70

#### Scenario: No duck trail carries a timed obstacle
- GIVEN any of the four duck trail configs
- WHEN its hazard/timing fields are inspected
- THEN none MUST configure a timed obstacle

#### Scenario: duck-trail4 clears the corner and arm guards
- GIVEN `duck-trail4`'s `run=200`, `amplitude=140`, `corridorWidth=70`
- WHEN `cornerClearance` and `armClearance` are applied
- THEN both MUST hold

### Requirement: Duck Case Positional-Unlock Migration

`game/migrateDuckCase.ts`, in `migratePhase1.ts`'s exact three-part shape (declarative table, per-field merge policy, pure function), SHALL seed the four duck trail ids and the duck case's `duck-deduce` pseudo-id when none of them has a record yet, guarded on the condition that used to grant `trail1` its unlock (`f1-libre.approvals >= APPROVALS_TO_UNLOCK`). The migration MUST be pure, copy-forward only, MUST NOT delete or mutate any existing record, and MUST return only the entries it changed.

#### Scenario: A mid-hen-campaign payload loses no unlock
- GIVEN a stored payload with `trail1..trail4` progress and no duck records
- WHEN the migration runs and its returned entries are merged into the store
- THEN `isUnlocked('trail1')` MUST remain `true` after the position shift

#### Scenario: Migration returns only changed entries
- GIVEN a payload where the duck ids already have records
- WHEN the migration runs
- THEN it MUST return an empty set of changes and MUST NOT touch any existing record

#### Scenario: Migration never deletes
- GIVEN any payload
- WHEN the migration's output is inspected
- THEN it MUST contain no instruction or value that removes a record
