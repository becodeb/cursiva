# Delta for Level Engine

## MODIFIED Requirements

### Requirement: Deduction View Reachable from nextView

The `nextView` reducer (`GameScreen.tsx:33`) MUST NOT route to a deduction
view state under any input; filing a case's fourth clue MUST NOT change what
`nextView` returns for the trail that filed it. The deduction view remains
reachable only through the deep-link routes handled by `initialView`
(`detective-mode` "Deduction Screen"), outside `nextView`. The after-level
decision (`resolveNextAction`) MUST instead resolve to an outcome that exits
the game shell — distinct from any `GameAction` — whenever the finished level
belongs to a zoo sector (`sectorOf(levelId)` is non-null); for a level no
sector owns, it MUST return today's `{type:'next'}` behavior unchanged, and
`nextView`'s own switch stays exhaustive over exactly the states it could
already express.
(Previously: `nextView` gained a deduction view state, distinct from any
catalog level, reachable once all four detective trails' clues were filed;
it MUST NOT be represented as a 5th catalog level.)

#### Scenario: Filing the fourth clue does not route to deduction via nextView
- GIVEN three of four trails' clues filed and the fourth trail just completed
- WHEN `nextView` is evaluated
- THEN it MUST NOT return the deduction view state

#### Scenario: Deduction stays reachable only through the deep link
- GIVEN a case fully filed
- WHEN the child's `nextView`/after-level flow is exercised with no
  `?nivel=deduccion` deep link present
- THEN no deduction view MUST become reachable through that flow

#### Scenario: A sector adventure's completion exits the shell
- GIVEN a finished level id owned by a zoo sector
- WHEN `resolveNextAction` is evaluated
- THEN it MUST return the shell-exit outcome, not a `GameAction`

#### Scenario: A non-sector level keeps today's next behavior
- GIVEN a finished level id owned by no sector
- WHEN `resolveNextAction` is evaluated
- THEN it MUST return `{type:'next', levelId: nextLevelId(finishedLevelId)}`,
  unchanged from before this change
