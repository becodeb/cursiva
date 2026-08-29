# Letter Combinations Specification

## Purpose

Ordered multi-letter sequences built from single-subpath registered letters, drawn as ONE continuous stroked path with no connector segment. A combination IS a `LetterConfig`, so guided/free trace consume it unchanged.

## Requirements

### Requirement: buildCombination Invariants

The system MUST provide `buildCombination(letters)` returning a combined `LetterConfig` for an ordered combination, and MUST NOT offer a combination when any member is multi-subpath (more than one `M` command in `d`) or when members differ in `baselineZone`. Combination length SHALL be capped at 2 letters; longer combinations MUST NOT be offered.

#### Scenario: Homogeneous pair builds

- GIVEN two single-subpath registry letters sharing one `baselineZone`
- WHEN `buildCombination` is called with them
- THEN a combined `LetterConfig` MUST be returned

#### Scenario: Multi-subpath member refused

- GIVEN a letter whose `d` contains two `M` commands (e.g. `i`)
- WHEN it is a combination member
- THEN the combination MUST NOT be offered

#### Scenario: Mixed zones refused

- GIVEN two letters with different `baselineZone` values
- WHEN `buildCombination` is called
- THEN the combination MUST NOT be offered

#### Scenario: Three-letter combo out of scope

- GIVEN three eligible letters
- WHEN a combination of them is requested
- THEN it MUST NOT be offered

### Requirement: Seam Continuity

Each subsequent member SHALL be translated by `prevExit − entry` via one shared transform applied to `d`, every checkpoint, the `ideal` cloud, and the member anchors; the translated start of member *i+1* MUST coincide with the exit of member *i* within 2-decimal rounding, so the concatenated `d` is continuous with NO connector segment. Combined anchors MUST be `entry` of the first member and `exit` of the last member.

#### Scenario: Translated entry lands on previous exit

- GIVEN members `a` then `c`
- WHEN the second `d` is translated by `exit_a − entry_c`
- THEN its start point MUST equal `exit_a` within 2-decimal rounding

#### Scenario: Anchor metadata spans the combo

- GIVEN a two-letter combination
- WHEN anchors are inspected
- THEN `entry` MUST be the first member's entry and `exit` MUST be the last member's exit

### Requirement: Global Checkpoint Renumbering

The combined `checkpoints` MUST concatenate member checkpoints renumbered strictly 1..N with no gaps or duplicates, and the combined `ideal` MUST concatenate the translated member clouds.

#### Scenario: Orders stay strictly contiguous

- GIVEN a pair with 6 and 5 checkpoints
- WHEN combined
- THEN combined orders MUST be exactly 1..11

### Requirement: Demo Timeline

The combined `animationTimeline` MUST contain exactly ONE `draw_path` step (delay 1000, duration 2600×n), plus `slide_in` from the first letter and `fade_out` at 1000 + 2600·n + 200. The combined config MUST expose `family: 'enlazada'` and the first member's `theme`.

#### Scenario: Single draw path over the seam

- GIVEN a 2-letter combination loaded into guided trace
- WHEN the demo plays
- THEN ONE `draw_path` MUST draw both letters end-to-end without a seam jump

### Requirement: Ordered-Pair Registry

The system MUST offer combinations for ALL ordered pairs of currently-registered hand-drawn single-subpath letters (`a`–`f` at MVP), reversed pairs included (`ac`, `ca`), and MUST NOT offer any pair violating the invariants above.

#### Scenario: All ordered pairs listed

- GIVEN registry letters `a`–`f`
- WHEN combo candidates are enumerated
- THEN every ordered pair (`a c`, `c a`, …) MUST be offerable

#### Scenario: Violating pair absent

- GIVEN a pair whose member is multi-subpath or zone-mismatched
- WHEN the combo list renders
- THEN that pair MUST NOT appear