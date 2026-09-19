# Delta for art-corridor

## ADDED Requirements

### Requirement: docs/09 Background Families Use Full 3:2 Compositions With Calm Gameplay Zones

Final MVP background families MUST follow `docs/09_GUIA_DE_ESTILO_VISUAL.md`: full 3:2 compositions, calm central gameplay zones, and no generated clutter that competes with trace paths, clue marks, or controls.

#### Scenario: Background family declares complete 3:2 art
- GIVEN a renewed background family in `art-source/` and `client/public/art/`
- WHEN its manifest entry is inspected
- THEN the source and exported assets MUST represent a full 3:2 composition
- AND the gameplay zone MUST be documented or measurable as calm enough for tracing

#### Scenario: Calm zone protects gameplay readability
- GIVEN a renewed background behind a trace, reveal, or detective level
- WHEN the required viewport captures run
- THEN paths, ink, reveal feedback, clue marks, and controls MUST remain readable

### Requirement: Authored Assets Are Protected From Placeholder Regeneration

Placeholder tooling MUST NOT overwrite approved authored backgrounds, sign art, or exported MVP assets.

#### Scenario: Placeholder generation skips authored assets
- GIVEN an approved asset already exists
- WHEN `make_placeholders` or the art build pipeline runs
- THEN the approved asset MUST remain byte-preserved or the command MUST fail safely

#### Scenario: Missing art blocker is explicit
- GIVEN a required renewed background is missing
- WHEN validation runs
- THEN the missing asset MUST be reported as an isolated art blocker
- AND unrelated art families MUST still validate
