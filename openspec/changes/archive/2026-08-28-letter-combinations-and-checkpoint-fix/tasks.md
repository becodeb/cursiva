# Tasks: Letter Combinations & Checkpoint Fix

## Review Workload Forecast

Estimated changed lines: ~400 (design ~270 + combo tests)

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium
800-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Focused test | Runtime harness | Rollback |
|------|------|--------------|-----------------|----------|
| 1 | Containment + `c`-backtrack test | `npx vitest run src/canvas/validation/checkpoints.test.ts` | N/A: pure | Revert checkpoints.ts+case; 10 tests pin semantics |
| 2 | buildCombination + registry + tests | `npx vitest run src/letters` | N/A: pure data (rail 4.5) | Delete combinations.ts + registry; letters intact |
| 3 | Overlay gate + toggle | `npx vitest run src/App.test.tsx src/canvas` | `npm run preview`: toggle ON → overlay, no score | Revert TraceCanvas/overlay/MainScreen; default keeps dev gate |

## Phase 1: Checkpoint Containment Fix

- [x] 1.1 `checkpoints.test.ts`: ADD `c`-backtrack — cp1(400,405,r42), cp2(442,265,r42), cp3(450,330,r60), cp4(505,403,r40); stroke (392,410)→(420,335)→(432,290)→(448,280)→(460,305)→(468,330)→(485,390); expect `{true, false, [1,2,3,4]}`; existing 10 untouched.
- [x] 1.2 `checkpoints.ts`: design.md corrected algorithm VERBATIM — containment `while` BEFORE early-continue guard; `N = sorted.length`; floor `N > 0 && activated.length === N`; full-pass reset of `wrongDirection`.
- [x] 1.3 `npx vitest run src/canvas/validation/checkpoints.test.ts` → 11 green, 10 identical.

## Phase 2: Combination Builder

- [x] 2.1 Create `combinations.ts` `buildCombination`: guard throws (Spanish) — multi-subpath `d`, mixed `baselineZone`, length≠2; round2 (dx,dy) = prev.exit − next.entry via `transformPathD(d,1,1,dx,dy)`; concat `d`; checkpoints 1..N names kept; ideal concat; anchors {first.entry, last.exit}.
- [x] 2.2 `combinations.ts`: family 'enlazada', theme/strokeWidth from letters[0]; one draw_path (1000, 2600n); slide_in letters[0]; fade_out (1000+2600n+200, 600); export `buildOrderedPairs` (order, i≠j, same zone).
- [x] 2.3 `registry.ts`: `COMBO_REGISTRY` from svgLetters only (media a,c,e→6; alta b,d,f→6; 12 total), keys combo_ac/combo_ca, character 'ac'; Kalam seeds excluded.

## Phase 3: Overlay Gate & Main Screen

- [x] 3.1 `devCheckpointOverlay.tsx`: `showScore?` (default true); false → only ¡COMPLETO!, no score/count.
- [x] 3.2 `TraceCanvas.tsx`: `showCheckpoints?` (default false); gate `(isDevMode() || showCheckpoints) && devCheckpoints && devIdeal`; pass showScore={isDevMode()}.
- [x] 3.3 `guidedTrace.tsx` + `freeTrace.tsx`: thread `showCheckpoints` into TraceCanvas.
- [x] 3.4 `MainScreen.tsx`: toggle "Mostrar puntos del trazo"; combo nav (`aria-label="Combinaciones"`); lookup `LETTER_REGISTRY[key] ?? COMBO_REGISTRY[key]`; combo → guided→free; thread toggle to both modes.

## Phase 4: Tests

- [x] 4.1 `combinations.test.ts`: seam — translated `d₁` first M == exit₀ within 0.01; anchors span first.entry/last.exit.
- [x] 4.2 `combinations.test.ts`: renumber a+c → exactly 1..N, names kept; ideal concat.
- [x] 4.3 `combinations.test.ts`: guards — multi-subpath, mixed-zone, wrong length → throw.
- [x] 4.4 `combinations.test.ts`: one draw_path (1000, 2600n); fade_out 1000+2600n+200; family/theme/strokeWidth.
- [x] 4.5 `combinations.test.ts`: 12 pairs; combo_ac ≠ combo_ca; no mixed pair; rail: flattened `d` → evaluateTrace/guidedFollowState complete (seam handoff).
- [x] 4.6 Create `devCheckpointOverlay.test.tsx` (renderToString: showScore=false omits score; default shows); extend `App.test.tsx` smoke — combo nav + toggle render.

## Phase 5: Verification

- [x] 5.1 `cd client && npm test` — suite green (156 passed / 16 files).
- [x] 5.2 `cd client && npm run build` — tsc --noEmit && vite build clean.
- [x] 5.3 Note (no action here): sdd-archive promotes letter-combinations to NEW main spec.