# Delta for trace-canvas

## ADDED Requirements

### Requirement: MVP Ink Policy Is Explicit and Stable

Trace ink MUST remain visible, high-contrast, and level-appropriate on every MVP drawing surface by using the existing trace/canvas ink seams rather than adding per-level ad hoc drawing behavior.

#### Scenario: Ink token is selected by level surface
- GIVEN a glass, night, art-corridor, or standard trace level
- WHEN the trace canvas resolves the ink style
- THEN the style MUST come from the approved ink policy for that surface
- AND it MUST NOT be hardcoded inside individual level components

#### Scenario: Ink remains visible across required states
- GIVEN start, partial, error, and success states for an MVP trace level
- WHEN the player trace and guide are rendered
- THEN ink, guide, and feedback MUST remain distinguishable from the backdrop and reveal layer

#### Scenario: Ink policy does not change scoring
- GIVEN the same pointer path before and after an ink-policy change
- WHEN validation runs
- THEN pass/fail scoring MUST be unchanged