# Tasks: SVG Glyph Rendering Fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~500 (range 500–650), per design Review Budget table |
| 400-line budget risk | High (exceeds default 400 by 100–250 lines) |
| Session review_budget_lines | 800 — estimate fits with 150–300 lines headroom |
| Chained PRs recommended | No — fits the negotiated 800-line session budget |
| Suggested split | Single PR, five independently revertible commits |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| Foundation | `segments?` type + `f` deferred | PR1 commit 1 | `cd client && npx vitest run src/letters/registry.test.ts` | N/A — type/config only, no visual delta | `types.ts`, `anchors.ts` revert alone |
| P1 | Arc→cubic + fail-loud parser + `splitMainTail` export | PR1 commit 2 | `cd client && npx vitest run src/letters/svgLetter.test.ts` | `npm run dev`, inspect `i`/`j` dot render | `svgLetter.ts` parser sections revert alone |
| P4 | `segments`/timeline + guide render | PR1 commit 3 | `cd client && npx vitest run src/letters/svgLetter.test.ts registry.test.ts` | `npm run dev`, inspect `x t i j` guide/demo for pen-lift gap | `svgLetter.ts` config sections + `TraceCanvas.tsx`/modes revert alone |
| P2 | Hybrid seam | PR1 commit 4 | `cd client && npx vitest run src/letters/combinations.test.ts src/letters/wordBuilding.test.ts` | `npm run dev`, inspect `b e o v w` seams | `combinations.ts` revert restores prior seam goldens |
| P3 | Round joins | PR1 commit 5 | `cd client && npx vitest run src/canvas` (if present) or manual | `npm run dev`, inspect demo/guide cusps | `TraceCanvas.tsx` attribute lines revert alone |

## Phase 1: Foundation — Types & Deferred-Secondary Set

- [x] 1.1 `client/src/letters/types.ts`: add optional `pathDefinition.segments?: string[]`
- [x] 1.2 `client/src/letters/anchors.ts`: add `f` to `DEFERRED_SECONDARY_CHARS`; document the exit-vs-secondary rule (Decision 4)

## Phase 2: P1 — Arc Conversion & Fail-Loud Parser (`svgLetter.ts`)

- [x] 2.1 Widen tokenizer/`isCmd` to `[MmLlHhVvCcSsQqTtAaZz]` so every command reaches `setCmd`
- [x] 2.2 Implement SVG2 §B.2.4 endpoint→center arc parameterization (radii correction when `Λ > 1`; `rx==0||ry==0` degrades to `L`; equal endpoints skip)
- [x] 2.3 Split `Δθ` into `ceil(|Δθ|/(π/2))` cubics (`k=(4/3)tan(Δθᵢ/4)`); extract existing C sampler as `emitCubic` and reuse it
- [x] 2.4 Wire `A`/`a` into `setCmd` (7 params, only `x,y` relative under `a`, implicit continuation `A`)
- [x] 2.5 Make `S`/`T` throw `flattenPathD: unsupported path command "…"`; make `transformPathD`'s silent `default` throw
- [x] 2.6 Throw `flattenPathD: invalid numeric token "…"` on any non-finite token (covers glued flags like `1-2.75`)
- [x] 2.7 Extract and export `splitMainTail(points, mainEndArc, fallbackExit?)` from `combinations.ts`'s existing main/tail logic (not yet consumed)

## Phase 3: P4 — Segments & Pen-Lift Render (`svgLetter.ts`, `TraceCanvas.tsx`, modes)

- [x] 3.1 `buildLetterConfig`: when `mainEndArc` present, call `splitMainTail` to derive `pathDefinition.segments` (MAIN first, then SECONDARY)
- [x] 3.2 Emit one `draw_path` timeline step per segment (main 2600ms, tail 600ms, `fade_out` at `Σ+200`), each with `properties.d`
- [x] 3.3 `client/src/canvas/TraceCanvas.tsx`: widen `guide` prop to `string | string[]`
- [x] 3.4 `client/src/modes/guidedTrace.tsx`, `freeTrace.tsx`: render `segments ?? [d]` as the guide (no line across pen lifts)

## Phase 4: P2 — Hybrid Seam (`combinations.ts`)

- [x] 4.1 Refactor `buildWord`'s main/tail split to consume the shared `splitMainTail` (Phase 2.7)
- [x] 4.2 Add `exitKindFor(prevMember.character)` branch: `baseline-right` unchanged (byte-identical); `mid/top-right` → `placed.y = cfg.anchors.entry.y` (`dy===0`), reuse `SEAM_GAP` horizontally
- [x] 4.3 Confirm `prevEffectiveExit` per exit kind: `x` → second-diagonal end, `t/i/j/f` → main end, single-subpath → `d` end

## Phase 5: P3 — Round Joins (`TraceCanvas.tsx`)

- [x] 5.1 Add `strokeLinejoin="round"` to the animated demo `motion.path`(s)
- [x] 5.2 Add `strokeLinejoin="round"` to the guide path

## Phase 6: Tests & Goldens

- [x] 6.1 `svgLetter.test.ts`: arc fixtures vs. analytic circle; `i`/`j` dots parse to finite points; relative `a` equals absolute `A`; `k.svg`'s `h 58.5` resolves; `S` and non-finite tokens throw named errors
- [x] 6.2 `svgLetter.test.ts`: `splitMainTail` boundary equals `cutAtArc`; solo `segments` present for `t i j x`, absent for `a c f`
- [x] 6.3 `registry.test.ts`: sweep all 26 SVGs — load-time must not throw and no config may contain `NaN` (fail-loud guard)
- [x] 6.4 `combinations.test.ts`: baseline seam goldens stay byte-identical; absorbed seam asserts `dy===0` for `b e o v w`
- [x] 6.5 `combinations.test.ts`: add `f`'s `effectiveExit` golden assertion pinning today's single-subpath resolution (Decision 4)
- [x] 6.6 `wordBuilding.test.ts`: regenerate seam-dependent goldens for `b e o v w` combos deliberately, after visual QA — N/A: no PRE-EXISTING `b e o v w` seam goldens existed in `wordBuilding.test.ts` to regenerate (its only real-letter seam fixture was `a`/`c`, both baseline); the new absorbed-seam goldens were added fresh in `combinations.test.ts` (task 6.4) instead of overwriting stale ones. See "Deviations" below.
- [x] 6.7 New assertion: `i` config's `animationTimeline` has two `draw_path` steps (body, dot), each `properties.d` matching `pathDefinition.segments`
- [~] 6.8 Manual visual QA (`npm run dev`) before locking goldens: `i`/`j` dot renders, no cusps on demo/guide, no line across pen lifts (`x t i j f`), `b e o v w` seams look acceptable per exit kind — PENDING USER: requires a human running `npm run dev` and looking at the canvas; not executable by the apply agent.
