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

Placeholder tooling MUST NOT overwrite approved authored placeholder-family sources in `art-source/`.

#### Scenario: Placeholder generation skips authored assets
- GIVEN an approved asset already exists
- WHEN `make_placeholders` runs, including dry-run mode
- THEN the approved source MUST remain byte-preserved
- AND dry-run MUST perform no filesystem mutation

#### Scenario: Build integration blocker is deferred
- GIVEN a required renewed background is missing
- WHEN U3 is complete
- THEN build/export failure atomicity MUST remain unclaimed
- AND missing-source/export validation MUST be handled by the later U12 background integration work unit
