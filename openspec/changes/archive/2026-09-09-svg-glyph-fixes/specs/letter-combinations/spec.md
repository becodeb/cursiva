# Delta for Letter Combinations

## MODIFIED Requirements

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
