# Delta for reveal-grid

## ADDED Requirements

### Requirement: Fogged Glass States Are Testable

Fogged glass levels MUST expose stable start, partial, and success visual states that preserve reveal-grid semantics while improving MVP readability.

#### Scenario: Glass starts fogged
- GIVEN a fogged glass level at start
- WHEN the reveal layer renders
- THEN unrevealed tiles MUST visibly obscure the target without hiding required controls

#### Scenario: Partial glass reveal is stable
- GIVEN a seeded partial glass reveal
- WHEN the level renders for visual capture
- THEN revealed and unrevealed regions MUST be distinguishable
- AND completion MUST remain pending

#### Scenario: Success clears the intended glass area
- GIVEN the level reaches success
- WHEN the reveal layer renders
- THEN the completed reveal state MUST be visible without changing stored progress outside the level

### Requirement: Night Discovery States Are Testable

Night discovery levels MUST expose start, partial, error, and success states without changing the reveal-grid completion rules.

#### Scenario: Night error state is isolated
- GIVEN a night level in an error state
- WHEN the reveal layer and feedback render
- THEN the error feedback MUST be visible
- AND previously revealed tiles MUST remain intact

#### Scenario: Night success keeps discovery readable
- GIVEN a night level reaches success
- WHEN visual capture runs
- THEN the discovered subject and completion feedback MUST both be visible
