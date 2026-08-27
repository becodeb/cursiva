# Tasks: scaffold-mvp-canvas

## Workload Forecast

Estimated changed lines: ~1800 (tests/configs/assets incl.)
Chain strategy: stacked-to-main (orchestrator decision, auto-chain)

Decision needed before apply: Yes — resolved: `auto-chain`, `stacked-to-main`
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Work Units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback |
|------|------|----|--------------|-----------------|----------|
| 1 | Scaffold | PR 1 | `npm test` | dev: serves | delete `client/`+root |
| 2 | Letters | PR 2 | `npx vitest run src/letters` | N/A: no UI yet | remove `src/letters/` |
| 3 | Score math | PR 3 | `npx vitest run src/canvas/validation` | N/A: pure | remove files |
| 4 | Order+continuity | PR 4 | `npx vitest run src/canvas/validation` | N/A: pure | remove files |
| 5 | Canvas UI | PR 5 | `npx vitest run src/canvas` | dev: ink+no lag | remove `src/canvas/` |
| 6 | Modes | PR 6 | `npm test` regression | dev: demo→rail→feedback | remove `src/modes/`+assets |
| 7 | Progress+screen | PR 7 | `npx vitest run src/progress` | dev: live%,persist,bloom | remove dirs |

> Unit 6 split into two stacked PRs (auto-chain budget rule — authored diff 523 > 400): PR 6a = T5.1 guided
> (gh #7, `feat/modes`); PR 6b = T5.2+T5.3 free trace + feedback (gh #8, `feat/modes-free`, stacked on 6a).
> Unit 7 shipped as the FINAL PR (gh #9, `feat/progress`, authored diff 393 ≤ 400 — no split needed). CHAIN COMPLETE: 9 PRs total.

Unit mapping: U1=T1.1–1.3,T7.2, U2=T2.1–2.2, U3=T3.1,3.2,4.3, U4=T4.1–4.2, U5=T3.3–3.5, U6=T5.1–5.3 (6a+6b), U7=T6.1–6.2.
stacked-to-main: every PR targets `main` in order (PR 1 = gh #2 open); no tracker branch. Threat matrix N/A → no RED tests.

## Phase 1: Scaffold

- [x] **T1.1** Root `package.json`: npm workspaces `["client"]`, private. Dep: none. ~20 — DONE in PR 1 (gh #2): commit `chore(root): add npm workspaces manifest and gitignore`
- [x] **T1.2** `client/` Vite+React+TS: react/react-dom/perfect-freehand/framer-motion; vite/plugin-react/typescript/vitest/types; tsconfig, vite.config.ts (vitest=first runner), `"test":"vitest run"`. Dep T1.1. ~130 — DONE in PR 1 (gh #2): commit `build(client): scaffold vite react ts workspace with vitest`; latest majors (vite 8.2.2, vitest 4.1.11, react 19.2.8, TS 7.0.2); `npm test` 1/1 pass; `npm run build` green
- [x] **T1.3** `index.html`, `src/main.tsx`, `App.tsx` placeholder + smoke test + README. Dep T1.2. ~70 — DONE in PR 1 (gh #2): commit `feat(client): add placeholder app shell, smoke test, and readme`; SSR smoke test; dev server serves placeholder (HTTP 200)

## Phase 2: Letters

- [x] **T2.1** `src/letters/types.ts`: `LetterCheckpoint`, `LetterConfig`, `TraceResult`, `EvaluationResult`. Dep T1.2. ~40 — DONE in PR 2 (gh #3): commit `feat(client): add letter model types contract` (2a2c62c); types.ts 73 lines (incl. supporting Point/AnimationStep/unions required by exact shapes); typechecked by `tsc --noEmit` and exercised by T2.2 tests
- [x] **T2.2** `letra_c.ts` (verbatim docs/07: radii 40/35/40/40/45, orders 1–5), `letra_a.ts` (authored d: apex 480,200/foot 480,420/hook 550,400; radii 40,40,45,40,35,45, ascending 1–6), `registry.ts` (case-insensitive, throws unknown); +tests. Dep T2.1. ~220 — DONE in PR 2 (gh #3): commit `feat(client): add letter seeds and registry with tests` (06aaf3f); `npx vitest run src/letters` 3 files/16 tests passed; authored PR diff ≈392 lines (under 400)

## Phase 3: Canvas

- [x] **T3.1** `src/canvas/validation/constants.ts`: K=64, TolPen=12, TolTouch=18, Approval=70. Dep: none. ~10 — DONE in PR 3 (gh #4): commit `feat(client): add trace validation constants for scoring` (6546711)
- [x] **T3.2** `src/canvas/resample.ts` + tests: arc-length K=64 equidistant; <2 distinct → empty; ideal-path `d`→K sampler. Dep T3.1. ~125 — DONE in PR 3 (gh #4): commit `feat(client): add arc-length resampler and ideal path sampler with tests` (e05149f); interval spacing totalLength/(K−1) endpoint-inclusive (arc-uniform, verified via independent reference walk; chord distances shrink across bends); samplePath anchors letter end checkpoints + preserves ductus order; 7 tests
- [x] **T3.3** `src/canvas/ink.ts` + test: getStroke closed polygon; never mutates points. Dep: none. ~45 — DONE in PR 5 (gh #6): commit `feat(canvas): add ink stroke polygon module with tests` (12edaeb); `traceInk` wraps perfect-freehand (render-only contract, streamline 0 so the ink faithfully reproduces the captured path) + `inkPath` Z-closed d; 6 tests: non-mutation, enclosure via independent point-in-polygon, bounded tap dot, 2-point stroke, empty/rounded d
- [x] **T3.4** `src/canvas/useTraceInput.ts`: pointerdown/move/up/cancel; primary only; `getScreenCTM().inverse()` (naive scaling forbidden); ref points; no-move up → no eval; cancel discards. Dep T1.2. ~75 — DONE in PR 5 (gh #6): commit `feat(canvas): add pointer capture hook with CTM viewBox mapping` (18505e0); primary-only (2nd finger ignored), inverse-CTM affine extracted as pure `canvasPoint` (3 normalization tests, no jsdom); tap leaves nothing; a moved stroke persists after release (bug found+fixed by the browser harness: ink was erased on pointerup)
- [x] **T3.5** `src/canvas/TraceCanvas.tsx`: SVG `viewBox 0 0 1000 600`, guides Y=180/420 (sky/grass/roots), rAF ink path, `touch-action:none`. Dep T3.3, T3.4. ~80 — DONE in PR 5 (gh #6): commit `feat(canvas): add TraceCanvas SVG surface with rAF ink path` (b6775c5); App mounts it; browser harness (headless Chromium+CDP): 40-move burst → 40 rAF ink updates avg 16.67ms/max 18.7ms, stroke persists after release, pointercancel discards, tap leaves no ink, 0 page exceptions; authored diff 390+9

## Phase 4: Validation

- [x] **T4.1** `checkpoints.ts` + tests: strict order; clockwise `a` fails + wrongDirection; skipped fails. Dep T3.1. ~110 — DONE in PR 4 (gh #5): commit `feat(client): add strict checkpoint order validation with tests` (9e8d728); entry-based activation in strict order 1→N; co-located `a` apex pair (cresta order 2 / cierre order 4 at 480,200) order-gated by entry — first apex visit activates 2, re-entry activates 4; counterclockwise via sampled ideal path passes with `activated=[1..6]`, clockwise/out-of-order/skip fail; 7 tests
- [x] **T4.2** `continuity.ts` + test: isContinuous=false on lift before final checkpoint. Dep T3.1. ~50 — DONE in PR 4 (gh #5): commit `feat(client): add trace continuity check with tests` (1307e73); continuous iff the highest-order checkpoint's radius was entered before the lift; order deliberately not judged (approval ANDs order + continuity + score); spec early-lift scenario asserted false; 6 tests
- [x] **T4.3** `score.ts` + tests: `max(0, 100 − 100·Σdist/(K·Tol))`, clamp; assert ×100: 5px→72.2/58.3 (touch≥70, pen<70); perfect→100; empty. Dep T3.1, T3.2. ~125 — DONE in PR 3 (gh #4): commit `feat(client): add geometric trace score with touch-pen tolerance` (8e1e982); ×100 asserted numerically: touch 5px 72.2 ≥ 70 approved, pen 5px 58.3 < 70 rejected, perfect → 100; `npx vitest run src/canvas/validation src/canvas/resample.test.ts` 2 files/15 tests passed (305ms); full `npm test` 6 files/32; build green; authored PR diff 397 lines (under 400)

## Phase 5: Modes

- [x] **T5.1** `modes/guidedTrace.tsx`: framer-motion pathLength 0→1 (delay/duration); demo input ignored; ready at max(delay+duration)+200ms; radius rail + rescue incl. wrong-direction; handoff. Dep T4.1, T3.5, T2.2. ~140 — DONE in PR 6a (gh #7, `feat/modes`): commits `feat(canvas): add mode hooks for the guided demo and rail feed` (136cc73) + `feat(modes): add guided demo and checkpoint rail with rescue hints` (8d0479a). `guidedFollowState` (pure, reuses checkCheckpointOrder) + corridor rescue (widest radius + 10px slack — a passable trace never nags); demo input gated via a new `enabled` capture option; ready measured at 3296/3301ms vs 3200 expected in the browser harness; rail completion in 6a replays the demo, 6b wires it to hand off to free. Tests: 4 (modes.test.ts). Authored diff 248+11 (259).
- [x] **T5.2** `modes/freeTrace.tsx`: faint ideal guide; ink only pre-release; single release evaluation (pointerType tolerance); exactly-once feedback; clean retry. Dep T4.3, T3.5. ~100 — DONE in PR 6b (gh #8, `feat/modes-free`, stacked on #7): commits `feat(canvas): expose start and release callbacks to the free mode` (7943146) + `feat(modes): add free trace with single-release evaluation and tone feedback` (a9e0e71). Pure `evaluateTrace` (resample → order + continuity + score; TolTouch 18 vs TolPen 12 — ±5px jitter: touch 72.2 approved / pen 58.3 rejected); exactly-once by construction (hook `onEnd` fires per moved release; verified 1 status element + 1 tone play in the harness); `onStart` clears feedback for clean retry.
- [x] **T5.3** `tone.ts`+`StarFeedback.tsx`+assets: approval tone only; star per `public/assets/themes/star.svg`; else rescue; `mar_ola_a/c.svg`. Dep T5.2. ~110 — DONE in PR 6b (gh #8): `playApprovalTone` = soft C5 sine + exponential envelope through a LAZY shared AudioContext (created on the first approval inside the release gesture; best-effort, headless-safe with `--autoplay-policy=no-user-gesture-required`); star placeholder SVG + rescue text (RescueHint shared with guided); `mar_ola_a.svg`/`mar_ola_c.svg`/`star.svg` added. Tone unit tests via injected fake AudioContext (oscillator/connect/start/envelope asserted; null/throwing ctx safe no-op).

## Phase 6: Progress + Screen

- [x] **T6.1** `progress/ProgressStore.ts`+`LocalProgressStore.ts` (key `cursiva.progress.v1`): clamp 0–100, isolation, monotonic best-of `max(stored,score)`; corrupt → empty+overwrite; unavailable → in-memory no-throw; +scenario tests. Dep T1.2. ~185 — DONE in PR 7 (gh #9, `feat/progress`): `ProgressStore` interface + `LocalProgressStore` (JSON map `{"a":85,"c":40}` under `cursiva.progress.v1`), clamp 0–100, per-letter isolation, monotonic best-of `max(stored, norm(value))`, corrupt → empty + overwritten on next write, throwing storage → in-memory fallback never throws; 9 scenario tests (round trip, clamp, isolation, reload, unavailable, corrupt, monotonic, rounding, unknown). EXTENSION (design flag 3 pattern): values round to whole percentages so a runtime-perfect trace (99.99x after float CTM noise) persists as exactly 100 — otherwise the family bloom could never trigger. Harness-proven.
- [x] **T6.2** `screen/MainScreen.tsx`+`Bloom.tsx`: picker → guided→free; per-letter % refreshes; bloom when all ola=100, on-load derived, replayable. Dep T6.1, T5.3, T2.2. ~145 — DONE in PR 7 (gh #9): `MainScreen` (registry picker `a`/`c` with stored %, live refresh via `FreeTrace.onEvaluate` hook, letter switch restarts guided flow via `key={selected}`), `Bloom` (dormant bud → interactive flower, petals replay on click, derived from stored progress on load and on change), `App.tsx` rewired (smoke test still passes). RUNTIME FIX surfaced by CDP harness: perfect traces could never score exactly 100 (64-pt arc ideal bias ~0.5px + float noise) → ideal flatten density 24→96 steps in `resample.ts` + matching `testUtils.ts` reference (score formula untouched); dense on-curve strokes now score 99.99x → round → 100, bloom reachable end-to-end. Harness: picker→guided→free→approval → `a · 100%` live; reload persists; worse ~78 attempt keeps 100; bloom on-load + replayable; second finger/cancel clean; 0 exceptions.

## Phase 7: Verify/Docs

- [ ] **T7.1** Device checklist (manual): avg frame ≤17ms pointermove; 2nd finger ignored; cancel clears; ergonomics. Dep T5.3, T6.2. ~15 — REMAINS MANUAL — verify phase (device checklist, not automatable in CI; CDP harness covered second-finger/cancel regressions headlessly in PR 7).
- [x] **T7.2** README note in T1.3 — no separate task. — DONE: folded into T1.3; `client/README.md` carries docs/02-04-07 pointers + delivery plan