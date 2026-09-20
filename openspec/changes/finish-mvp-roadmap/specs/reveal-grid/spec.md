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


## MODIFIED Requirements

### Requirement: Reveal Layer Renders as Plain Rects With No Fragment Reference

The reveal grid's default render contract SHALL remain one plain `<rect>` per tile, with opacity set from that tile's fold state, and no `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, `<filter>`, CSS filter, or `url(#...)` reference introduced anywhere in the layer markup. For fogged-glass erase levels only, those per-tile rects SHALL remain present as stable invisible state/counting sentinels while the visible fog is rendered by one direct continuous SVG silhouette computed from the union of remaining tile cells, plus direct reference-free condensation marks. This glass exception MUST NOT change reveal-grid fold semantics, completion, scoring, or persistence.

#### Scenario: One rect renders per tile
- GIVEN a non-glass reveal layer rendered via `renderToString` for a `cols x rows` grid
- WHEN the HTML string is inspected
- THEN exactly `cols * rows` `<rect>` elements attributable to the reveal layer MUST appear
- AND each rect's opacity MUST represent that tile's fold state

#### Scenario: Glass fog uses rect sentinels and one continuous visible silhouette
- GIVEN a fogged-glass erase reveal layer with remaining fog tiles
- WHEN the layer renders
- THEN one stable invisible `<rect>` sentinel MUST exist for each remaining fog tile
- AND visible fog MUST be rendered as one direct continuous SVG silhouette for the union of remaining fog cells
- AND the silhouette MAY contain even-odd interior holes for cleaned regions

#### Scenario: No forbidden reference is introduced
- GIVEN the same render
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, `<filter`, `filter:`, or the substring `url(#`
