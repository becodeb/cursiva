# Proposal: Letter Combinations & Checkpoint Fix

## Intent

Three MVP gaps (exploration): (1) reentrant `c` fails checkpoint order on backtrack; the checkpoint past the bounce never activates (head already inside; no fresh entry) and `wrongDirection` latches; (2) no letter-to-letter demo flow; (3) overlay dev-only, needed in prod.

## User Stories

| # | Given | When | Then |
|---|---|---|---|
| 1 | ordered-pair picker | pair selected | one `draw_path` over the continuous seam (`exit_i` = translated `entry_{i+1}`); global renumber; cap 2 |
| 2 | non-dev user | "Mostrar puntos del trazo" on | overlay MUST render; % line MUST hide when `!isDevMode()` |
| 3 | head inside cp `n` before `n−1` | passes `n−1`, nears `n` | `n` MUST activate (containment); full pass SHALL succeed (reset) |

## Scope

In: containment fix + `c`-backtrack test (existing 10 untouched); `buildCombination` + registry (`a`–`f`); toggle threading; delta specs; combo tests.
Out: multi-subpath (`i,j,t,f,x`) and Kalam seeds in combos; connector Béziers; words/uppercase/new letters; tolerance changes; combos > 2.

## Capabilities

New: `letter-combinations`; seam translation, guards, renumbering, registry.
Modified: `trace-validation` (containment, reset, reentrant scenario); `trace-canvas` (overlay gate, `showCheckpoints`); `main-screen` (Combo Picker, toggle).

## Approach

- Backtrack (corrected algorithm): containment activation of expected order each sample; `while` runs before the early-continue guard; latch unchanged; reset only on full pass; keep `sorted.length > 0` floor.
- Combos: translate `[i+1]` by `prevExit − entry` via `transformPathD(d,1,1,dx,dy)`; same 2-decimal offset for all; renumber; concat; one `draw_path` (delay 1000, duration 2600×n), slide_in letter 0, fade_out 1000+2600n+200; family `'enlazada'`, theme letter 0, anchors first.entry/last.exit; guards ≤1 `M`, same `baselineZone`.
- Toggle: gate `(isDevMode() || showCheckpoints) && !!devCheckpoints && !!devIdeal`.
- Deps: `transformPathD` (M/L/C/Q); framer-motion `pathLength`; in use.

### Verification (vs checkpoints.test.ts)

| Existing test | Corrected | Same |
|---|---|---|
| natural `a` / ascending | pass `[1..6]` | ✓ |
| reversed / skipped / out-of-order | fail, wrong=true | ✓ |
| partial (1,2) | fail, wrong=false, `[1,2]` | ✓ |
| co-located loop / benign re-entry | pass | ✓ |
| ductus / empty inputs | unaffected / identical with `sorted.length > 0` floor (else orderPassed=true) | ✓ |
| `c`-backtrack model | pass `[1,2,3,4]`, wrong=false | fixed ✓ |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Overreach leniency | Med | Reset on full pass only; spec delta |
| Seam jump | Med | Single-subpath guard |
| Zone/rounding/duration | Low | Guards; same transform; cap 2 |

## Rollback Plan

Revert `checkpoints.ts` to entry semantics (old formula, drop `c` case); one file, tests pin it. Combo registry additive, removal leaves single letters untouched. Toggle: prop removal only.

## Success Criteria

- 10 tests identical; `c` case passes `[1,2,3,4]`; ordered pairs draw fluid exit→entry seams; toggle works non-dev (% hidden); ~270 lines < 800, single PR.