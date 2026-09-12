# Delta for Detective Mode

## MODIFIED Requirements

### Requirement: Deduction Screen

The mode SHALL present a deduction screen only when reached through the
deep-link routes `?nivel=deduccion` (the first unresolved case) or
`?nivel=deduccion-<caseId>` (a specific case), offering exactly
`case.options.length` captioned animal choices, of which exactly one
(`case.culprit`) is correct. Picking the culprit MUST close the case. Picking
any other option MUST cost nothing: no score penalty, no lockout, and the
child MUST be able to pick again immediately (D4). The screen MUST read its
options, `ruledOutBy`, and culprit from the active `DetectiveCase`, never from
a global constant. Filing all of a case's trail clues MUST NOT, by itself,
route to this screen — finishing a sector's adventure exits to the zoo map
instead (`main-screen` "Exit Returns to the Zoo Map").
(Previously: hardcoded to exactly four choices with a global `CULPRIT` always
equal to the hen; then automatically reachable once all of the active case's
trails were filed, with no deep-link path.)

#### Scenario: A deep link reaches the deduction screen
- GIVEN the URL carries `?nivel=deduccion-duck`
- WHEN `initialView` resolves the shell
- THEN the deduction screen MUST render for the duck case

#### Scenario: Filing all trail clues alone does not route there
- GIVEN all of a case's trails filed by finishing its last adventure
- WHEN the child exits that adventure
- THEN the resulting view MUST be the zoo map, not the deduction screen

#### Scenario: Correct pick closes the case
- GIVEN the deduction screen for a case with its choices shown
- WHEN the child picks `case.culprit`
- THEN the mode MUST record that case as closed

#### Scenario: Wrong pick is free and immediately retryable
- GIVEN the deduction screen for a case with its choices shown
- WHEN the child picks a distractor
- THEN no penalty or score change MUST occur, the case MUST remain open, and
  the child MUST be able to pick again without any additional action

## REMOVED Requirements

### Requirement: Case Routing Across Multiple Cases

(Reason: deduction is paused per `docs/13` §4 decision 1; `home/caseState.ts`,
its sole implementer, is deleted along with `client/src/home/`.)
(Migration: the zoo map's sector registry (`zoo-map` capability) owns which
adventure opens next, via `nextAdventure(sector, records)`. Existing
`<caseId>-deduce` records written under Case-Solved Persistence stay readable
and inert — no sector claims them and `totalStars` excludes them.)
