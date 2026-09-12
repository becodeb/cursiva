# Delta for Detective Mode

## ADDED Requirements

### Requirement: Case Registry Data Shape

The mode SHALL expose `DetectiveCase` (`id`, `culprit`, ordered `options`, per-case `ruledOutBy`, `trailIds`) and an ordered `DETECTIVE_CASES: readonly DetectiveCase[]`, duck first, hen second. `ruledOutBy` MUST NOT be a property of `ANIMAL_ART` or any other global animal record — it lives only on the case, since the hen is a cleared distractor in one case and the culprit in another. Within one case, exactly one option MUST be absent from `ruledOutBy`, and it MUST equal `culprit`; each distractor MUST be ruled out by a clue kind distinct from every other distractor's; no clue kind MUST rule out more than one option in the same case.

#### Scenario: Culprit is the only option with no verdict
- GIVEN any case in `DETECTIVE_CASES`
- WHEN its `options` are checked against its `ruledOutBy` map
- THEN exactly one option MUST be absent from `ruledOutBy`, and it MUST equal `case.culprit`

#### Scenario: Same animal, different verdicts across cases
- GIVEN the hen appears as an option in the duck case and as `culprit` in the hen case
- WHEN each case's `ruledOutBy` is read independently
- THEN the duck case MUST rule her out by a clue kind, and the hen case MUST carry no `ruledOutBy` entry for her

#### Scenario: No clue kind double-rules within a case
- GIVEN one case's `ruledOutBy` map
- WHEN its values are collected
- THEN no clue kind MUST appear more than once

### Requirement: Duck Case

`DETECTIVE_CASES[0]` SHALL be the duck case: culprit `pato`, options `[pato, vaca, gato]` (no `gallina`), four trail ids clued `webfoot`, `breadcrumb`, `bubble`, `feather` in that order. `vaca` MUST be ruled out by `feather`; `gato` MUST be ruled out by `bubble`; `webfoot` and `breadcrumb` MUST rule out no option.

#### Scenario: Duck deduction renders exactly three captioned options
- GIVEN the duck case's deduction rendered
- WHEN the option list is inspected
- THEN exactly three options MUST render, each with its animal's picture and the animal's word beneath it, and `gallina` MUST NOT appear

### Requirement: Captioned Art Invariant

A word MAY appear on screen only accompanying an image, and MUST NOT ever be the sole carrier of meaning (supersedes D6's text ban). The captioned-art component's `label` prop MUST be required, with no default value and no branch rendering the image without it, so omitting `label` at any call site MUST be a type error.

#### Scenario: A caption cannot compile without its image
- GIVEN a call site of the captioned-art component with `label` omitted
- WHEN the project is type-checked
- THEN it MUST fail to compile

#### Scenario: Every rendered word has an image
- GIVEN any screen using the captioned-art component, rendered via `renderToString`
- WHEN the HTML string's text nodes are enumerated
- THEN every text node MUST come from an instance that also rendered an `<image>`/picture sibling — never bare text with no accompanying picture

### Requirement: Per-Case Clue Colour Distinctness

Earned clue colours MUST be pairwise distinct within one case; two different cases MAY reuse the same token (`webfoot` and `footprint` both render black — a print in the earth has no colour of its own).

#### Scenario: Duck case's four earned colours are pairwise distinct
- GIVEN the duck case's four clue kinds' earned tokens
- WHEN compared pairwise
- THEN no two MUST be equal

#### Scenario: Two cases may share a token
- GIVEN `webfoot`'s earned token and `footprint`'s earned token
- WHEN compared
- THEN they MAY be equal, since distinctness is scoped per case, not global

### Requirement: Case-Solved Persistence

Closing a case's deduction on its culprit MUST leave an observable record that survives a reload, written through the existing level-progress store under the pseudo-id `<caseId>-deduce` as a `LevelRecord` with `approvals: 1` — no new store key or method.

#### Scenario: Solving the duck case persists
- GIVEN `pickAnimal` closes the duck case
- WHEN the resulting record is written and a fresh store loads the same payload
- THEN `isFiled(records, 'duck-deduce')` MUST be `true`

#### Scenario: An unresolved case has no such record
- GIVEN a case whose deduction has not been closed
- WHEN the store is inspected for `<caseId>-deduce`
- THEN no record MUST exist for that pseudo-id

### Requirement: Case Routing Across Multiple Cases

The mode SHALL route the child to the first case in `DETECTIVE_CASES` order that is not yet resolved. A case is resolved when all four of its trails are filed AND its deduction is solved (per Case-Solved Persistence).

#### Scenario: An open duck deduction is not skipped
- GIVEN the duck case's four trails filed and its deduction unsolved
- WHEN case routing is evaluated
- THEN it MUST return the duck case's deduction step, not the hen case's first trail

#### Scenario: A resolved case advances to the next
- GIVEN the duck case fully resolved and the hen case's first trail unfiled
- WHEN case routing is evaluated
- THEN it MUST return the hen case's first trail id

## MODIFIED Requirements

### Requirement: Deduction Screen

With all of the active case's trails filed, the mode SHALL present a deduction screen offering exactly `case.options.length` captioned animal choices, of which exactly one (`case.culprit`) is correct. Picking the culprit MUST close the case. Picking any other option MUST cost nothing: no score penalty, no lockout, and the child MUST be able to pick again immediately (D4). The screen MUST read its options, `ruledOutBy`, and culprit from the active `DetectiveCase`, never from a global constant.
(Previously: hardcoded to exactly four choices with a global `CULPRIT` always equal to the hen.)

#### Scenario: All of a case's clues collected reaches its deduction screen
- GIVEN all trails of the active case have clues `earned` and filed
- WHEN the mode evaluates its state
- THEN the deduction screen MUST become reachable, presenting `case.options.length` captioned choices

#### Scenario: Correct pick closes the case
- GIVEN the deduction screen for a case with its choices shown
- WHEN the child picks `case.culprit`
- THEN the mode MUST record that case as closed

#### Scenario: Wrong pick is free and immediately retryable
- GIVEN the deduction screen for a case with its choices shown
- WHEN the child picks a distractor
- THEN no penalty or score change MUST occur, the case MUST remain open, and the child MUST be able to pick again without any additional action
