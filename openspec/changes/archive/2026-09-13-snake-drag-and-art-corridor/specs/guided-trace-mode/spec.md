# Delta for Guided Trace Mode

## MODIFIED Requirements

### Requirement: Completion Handoff

On activating every checkpoint in order within tolerance, the mode SHALL
emit a completion signal so the app can advance that letter to free-trace
(Mode 2). When the completed level's `LevelConfig` carries an `arrange`
field (`level-engine` capability), the checkpoint-follow evaluation this
requirement rests on MUST NOT run at all while `isArranged`
(`object-arrange` capability) reports `false` for the level's live
arrange state: the level screen suppresses stroke evaluation entirely
during the arrange phase (no ink is drawn, and a release is never scored)
rather than computing a separate arrangement score to AND against trace
completion. `docs/13` §6's completion criterion is therefore a
conjunction enforced by SEQUENCING, not by a second pillar alongside
accuracy/fluency: the arrangement must complete before a single stroke is
ever captured as ink, and once it has, this requirement's own
checkpoint-follow evaluation runs exactly as it does on any level with no
`arrange` field. A level with no `arrange` field completes exactly as
before this change.

(Previously: completion was checkpoint-follow alone, with no dependency
on any prior phase. `docs/13` §2's víbora adventure is the first to
require ordering objects before the trace itself can begin —
`design.md` §0 A4/§5.2 of `snake-drag-and-art-corridor`, which resolved
the proposal's own "conjunction" framing into a sequencing gate rather
than a simultaneous second score.)

#### Scenario: Advances to free trace on a level with no arrange field

- GIVEN completed guided follow on `a`, a level carrying no `arrange`
  field
- WHEN the completion signal fires
- THEN the app SHALL switch to free-trace mode for `a`, unchanged from
  before this change

#### Scenario: An arrange-gated level's stroke evaluation is suppressed until arranged

- GIVEN `snake2` with `isArranged` reporting `false` for its live arrange
  state
- WHEN a pointer release is attempted on the canvas
- THEN no ink MUST be drawn and no checkpoint-follow evaluation MUST run
  — the completion signal MUST NOT fire

#### Scenario: An arrange-gated level completes once arranged and traced

- GIVEN `snake2` with `isArranged` reporting `true`, then traced correctly
  (every checkpoint activated in order, all three snakes within
  tolerance)
- WHEN the checkpoint-follow evaluation runs
- THEN the completion signal MUST fire, exactly as on a level with no
  `arrange` field

#### Scenario: The arrange requirement never affects the twelve pre-existing reveal levels

- GIVEN any of the twelve `reveal`-bearing levels, which carry no
  `arrange` field
- WHEN their own completion criterion (`reveal-grid` capability) is
  evaluated
- THEN it MUST be unaffected by this requirement
