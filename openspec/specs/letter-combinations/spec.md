# Letter Combinations Specification

## Purpose

Ordered multi-letter sequences built from single-subpath registered letters, drawn as ONE continuous stroked path with no connector segment. A combination IS a `LetterConfig`, so guided/free trace consume it unchanged.

## Requirements

### Requirement: buildWord Invariants

The system MUST provide `buildWord(names)` returning a combined `LetterConfig` for any ordered word of length n≥1 composed of registered, word-eligible letters (letter-model `isWordEligible`). `buildWord` MUST NOT cap length at 2 and MUST NOT refuse multi-subpath members (single-`M` guard removed). Unregistered or word-ineligible members MUST be rejected. The stored `d` SHALL remain a SINGLE-`M` polyline, never split by `M`.

(Previously: `buildCombination` capped at 2 letters, single-subpath-only, zone-uniform.)

#### Scenario: Single letter passes through

- GIVEN one registered eligible letter
- WHEN `buildWord([c])` is called
- THEN the registry `LetterConfig` MUST be returned unchanged (n=1 passes config)

#### Scenario: Multi-subpath member accepted

- GIVEN a word containing `i` (multi-subpath `d`)
- WHEN `buildWord` is called
- THEN a combined config MUST be returned

#### Scenario: Longer words build

- GIVEN four registered eligible letters
- WHEN `buildWord` is called
- THEN a config MUST be returned with no length cap

#### Scenario: Word-ineligible member refused

- GIVEN a letter failing `isWordEligible` (e.g. a Kalam seed)
- WHEN `buildWord` is called
- THEN it MUST throw or skip that letter


### Requirement: Seam Continuity

Each subsequent letter's placement SHALL depend on the previous letter's exit kind (letter-model `Entry/Exit Anchor Metadata`).

For a `baseline-right` previous exit, the next letter SHALL be rigid-translated so its placed entry lands at `prevEffectiveExit − 20px·u`, where `u = normalize(prevEffectiveExit − entryNatural)` (chord direction from the letter's natural entry toward the previous effective exit); the same transform SHALL apply to `d`, every checkpoint, the `ideal` cloud, and the member anchors.

For a `mid-right` or `top-right` previous exit, the next letter SHALL be translated horizontally only: its placed entry SHALL stay at its own natural entry height (no vertical rigid shift); the connector Bézier SHALL absorb the full vertical travel between `prevEffectiveExit` and the placed entry.

In both cases, the seam SHALL be a cubic Bézier: P0 = previous effective exit, P3 = placed entry, tangents from the last/first ~3 polyline points of the joining strokes, control arms `|P3−P0|/3`, sampled into exactly 24 uniform `L` steps appended to `d`. `prevEffectiveExit` SHALL be the end of the last IMMEDIATE segment: `x` → second-diagonal end; `t/i/j/f` → main end (`anchors.exit`, deferred-secondary set); single-subpath → `d` end. `f` is included in the deferred-secondary set as forward-looking; while `f` remains single-subpath, its effective exit resolves identically to the single-subpath case. Combined anchors SHALL be the first member's `entry` and the last member's effective exit.

(Previously: rigid full-body translation applied uniformly to every seam regardless of exit kind, chasing the full vertical offset even for mid/top exits.)

#### Scenario: Baseline exit gap lands 20px along the chord

- GIVEN letters `a` then `c` (`a` exits `baseline-right`)
- WHEN the second is translated
- THEN its entry MUST sit exactly `prevExit − 20px·u`

#### Scenario: Mid/top exit keeps next letter at baseline

- GIVEN a word where the first letter exits `mid-right` or `top-right` (e.g. `b`, `o`)
- WHEN the second letter is placed
- THEN its placed entry height MUST equal its own natural entry height, and the connector Bézier MUST span the full vertical gap between `prevEffectiveExit` and the placed entry

#### Scenario: Seam is a 24-step Bézier

- GIVEN an assembled word
- WHEN the seam segment is inspected
- THEN it MUST use ~3-point end tangents, arms `|P3−P0|/3`, sampled to exactly 24 steps

#### Scenario: Effective exit differs by letter

- GIVEN words ending in `x` and in `t`
- WHEN effective exits are computed
- THEN `x` MUST end at its second diagonal, `t` at its main end

#### Scenario: Anchor metadata spans the word

- GIVEN a multi-letter word
- WHEN anchors are inspected
- THEN `entry` MUST be the first member's entry and `exit` the last member's effective exit
### Requirement: Global Checkpoint Renumbering

The combined `checkpoints` MUST concatenate member checkpoints renumbered strictly 1..N with no gaps or duplicates; deferred secondary checkpoints (`t/i/j`) SHALL be renumbered LAST, after every letter and connector. The combined `ideal` MUST concatenate the translated member clouds plus a perpendicular band of ±8px around each of the 24 connector samples.

(Previously: only translated member clouds were concatenated; secondaries numbered mid-word.)

#### Scenario: Orders stay strictly contiguous

- GIVEN a pair with 9 and 6 checkpoints
- WHEN combined
- THEN combined orders MUST be exactly 1..15

#### Scenario: Deferred checkpoints number last

- GIVEN word `ti`
- WHEN checkpoints are enumerated
- THEN the `t` cross and `i` dot orders MUST be the highest two, after every letter checkpoint

### Requirement: Demo Timeline

The combined `animationTimeline` MUST contain one `draw_path` step per segment with cumulative delays, the first at delay 1000; letter segments SHALL take 2600ms, connectors 500ms, secondaries 600ms; each step SHALL carry `properties: { d }` for its own segment. `slide_in`, `fade_out` at max(delay + duration) + 200, `family: 'enlazada'`, and the first member's `theme` SHALL be preserved.

(Previously: exactly ONE `draw_path` at 1000ms, duration 2600×n, drawing both letters end-to-end.)

#### Scenario: Segments draw sequentially

- GIVEN a 2-letter word with its connector
- WHEN the demo plays
- THEN segments MUST draw in writing order at 1000/2600/500ms without a seam jump

#### Scenario: Deferred secondaries scheduled last

- GIVEN a word containing `t`, `i`, or `j`
- WHEN the timeline is built
- THEN their secondary steps MUST start after all letter and connector steps, each 600ms

#### Scenario: `x` second diagonal is immediate

- GIVEN a word containing `x`
- WHEN the timeline is built
- THEN its second diagonal MUST be scheduled inside its letter block, before the following connector

#### Scenario: Single letter unchanged

- GIVEN `buildWord` with one letter
- WHEN the timeline is inspected
- THEN exactly ONE `draw_path` at delay 1000 over 2600ms remains

