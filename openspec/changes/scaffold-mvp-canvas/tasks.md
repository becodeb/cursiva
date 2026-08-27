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

Unit mapping: U1=T1.1–1.3,T7.2, U2=T2.1–2.2, U3=T3.1,3.2,4.3, U4=T4.1–4.2, U5=T3.3–3.5, U6=T5.1–5.3, U7=T6.1–6.2.
stacked-to-main: every PR targets `main` in order (PR 1 = gh #2 open); no tracker branch. Threat matrix N/A → no RED tests.

## Phase 1: Scaffold

- [x] **T1.1** Root `package.json`: npm workspaces `["client"]`, private. Dep: none. ~20 — DONE in PR 1 (gh #2): commit `chore(root): add npm workspaces manifest and gitignore`
- [x] **T1.2** `client/` Vite+React+TS: react/react-dom/perfect-freehand/framer-motion; vite/plugin-react/typescript/vitest/types; tsconfig, vite.config.ts (vitest=first runner), `"test":"vitest run"`. Dep T1.1. ~130 — DONE in PR 1 (gh #2): commit `build(client): scaffold vite react ts workspace with vitest`; latest majors (vite 8.2.2, vitest 4.1.11, react 19.2.8, TS 7.0.2); `npm test` 1/1 pass; `npm run build` green
- [x] **T1.3** `index.html`, `src/main.tsx`, `App.tsx` placeholder + smoke test + README. Dep T1.2. ~70 — DONE in PR 1 (gh #2): commit `feat(client): add placeholder app shell, smoke test, and readme`; SSR smoke test; dev server serves placeholder (HTTP 200)

## Phase 2: Letters

- [x] **T2.1** `src/letters/types.ts`: `LetterCheckpoint`, `LetterConfig`, `TraceResult`, `EvaluationResult`. Dep T1.2. ~40 — DONE in PR 2 (gh #3): commit `feat(client): add letter model types contract` (2a2c62c); types.ts 73 lines (incl. supporting Point/AnimationStep/unions required by exact shapes); typechecked by `tsc --noEmit` and exercised by T2.2 tests
- [x] **T2.2** `letra_c.ts` (verbatim docs/07: radii 40/35/40/40/45, orders 1–5), `letra_a.ts` (authored d: apex 480,200/foot 480,420/hook 550,400; radii 40,40,45,40,35,45, ascending 1–6), `registry.ts` (case-insensitive, throws unknown); +tests. Dep T2.1. ~220 — DONE in PR 2 (gh #3): commit `feat(client): add letter seeds and registry with tests` (06aaf3f); `npx vitest run src/letters` 3 files/16 tests passed; authored PR diff ≈392 lines (under 400)

## Phase 3: Canvas

- [ ] **T3.1** `src/canvas/validation/constants.ts`: K=64, TolPen=12, TolTouch=18, Approval=70. Dep: none. ~10
- [ ] **T3.2** `src/canvas/resample.ts` + tests: arc-length K=64 equidistant; <2 distinct → empty; ideal-path `d`→K sampler. Dep T3.1. ~125
- [ ] **T3.3** `src/canvas/ink.ts` + test: getStroke closed polygon; never mutates points. Dep: none. ~45
- [ ] **T3.4** `src/canvas/useTraceInput.ts`: pointerdown/move/up/cancel; primary only; `getScreenCTM().inverse()` (naive scaling forbidden); ref points; no-move up → no eval; cancel discards. Dep T1.2. ~75
- [ ] **T3.5** `src/canvas/TraceCanvas.tsx`: SVG `viewBox 0 0 1000 600`, guides Y=180/420 (sky/grass/roots), rAF ink path, `touch-action:none`. Dep T3.3, T3.4. ~80

## Phase 4: Validation

- [ ] **T4.1** `checkpoints.ts` + tests: strict order; clockwise `a` fails + wrongDirection; skipped fails. Dep T3.1. ~110
- [ ] **T4.2** `continuity.ts` + test: isContinuous=false on lift before final checkpoint. Dep T3.1. ~50
- [ ] **T4.3** `score.ts` + tests: `max(0, 100 − 100·Σdist/(K·Tol))`, clamp; assert ×100: 5px→72.2/58.3 (touch≥70, pen<70); perfect→100; empty. Dep T3.1, T3.2. ~125

## Phase 5: Modes

- [ ] **T5.1** `modes/guidedTrace.tsx`: framer-motion pathLength 0→1 (delay/duration); demo input ignored; ready at max(delay+duration)+200ms; radius rail + rescue incl. wrong-direction; handoff. Dep T4.1, T3.5, T2.2. ~140
- [ ] **T5.2** `modes/freeTrace.tsx`: faint ideal guide; ink only pre-release; single release evaluation (pointerType tolerance); exactly-once feedback; clean retry. Dep T4.3, T3.5. ~100
- [ ] **T5.3** `tone.ts`+`StarFeedback.tsx`+assets: approval tone only; star per `public/assets/themes/star.svg`; else rescue; `mar_ola_a/c.svg`. Dep T5.2. ~110

## Phase 6: Progress + Screen

- [ ] **T6.1** `progress/ProgressStore.ts`+`LocalProgressStore.ts` (key `cursiva.progress.v1`): clamp 0–100, isolation, monotonic best-of `max(stored,score)`; corrupt → empty+overwrite; unavailable → in-memory no-throw; +scenario tests. Dep T1.2. ~185
- [ ] **T6.2** `screen/MainScreen.tsx`+`Bloom.tsx`: picker → guided→free; per-letter % refreshes; bloom when all ola=100, on-load derived, replayable. Dep T6.1, T5.3, T2.2. ~145

## Phase 7: Verify/Docs

- [ ] **T7.1** Device checklist (manual): avg frame ≤17ms pointermove; 2nd finger ignored; cancel clears; ergonomics. Dep T5.3, T6.2. ~15
- [x] **T7.2** README note in T1.3 — no separate task. — DONE: folded into T1.3; `client/README.md` carries docs/02-04-07 pointers + delivery plan