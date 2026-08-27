# Tasks: Cursive Letter Paths

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (sdd-apply scope; SVGs user-authored, excluded) | ~450–550 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Pipeline (anchors, classification, anchor-aware diagnostics, t→alta) + tests + README | PR 1 | `npm test -- src/letters src/modes src/canvas && npm run build` (from `client/`) | `npm run dev` → letters list shows demo + checkpoints for an authored letter | `git revert` of `client/src/letters/` + svg/README.md; SVGs removable — eager glob falls back to seeds |

## Phase 1: Pipeline Core

- [x] T1.1 Create `client/src/letters/anchors.ts`: `ExitKind`, `EXIT_BY_CHAR` (o r v w→top, e→mid, default baseline), `SECONDARY_STROKE_CHARS` (i j t f x), `exitKindFor(char)`.
- [x] T1.2 `client/src/letters/types.ts`: add `LetterAnchors { entry, exit }`; make `anchors` REQUIRED on `LetterConfig`.
- [x] T1.3 `client/src/letters/svgLetter.ts`: move t media→alta — `MEDIA_CHARS` (line 28) drops t, `ALTA_CHARS` (line 29) gains t.
- [x] T1.4 `svgLetter.ts`: export pure `classifySubpaths(points, starts)` — main = subpath starting nearest bbox bottom-left; ties → longer polyline, then file order; returns `[mainIdx, ...rest]`.
- [x] T1.5 `svgLetter.ts`: `ReorderedPath` gains `mainEndArc`; `reorderForWriting` concatenates classified order (main first, secondaries after), keeps `hasGaps`.
- [x] T1.6 `svgLetter.ts`: anchor-aware diagnostics — start vs entry anchor; end vs exit corner per kind (baseline/top/mid, 80px tolerance) on MAIN part; suppress gap-warn for `SECONDARY_STROKE_CHARS`.
- [x] T1.7 `svgLetter.ts` `buildLetterConfig`: populate `anchors` — entry = fitted main start; exit = `pointAtArcLength(fitted, mainEndArc * fit.scaleX)`.

## Phase 2: Tests

- [x] T2.1 Fix `client/src/letters/svgLetter.test.ts:127` media union loop (drop t).
- [x] T2.2 Fix `client/src/letters/registry.test.ts:5` exact-keys `toEqual(['a','c'])` → presence (`toContain`) for 26 letters.
- [x] T2.3 Add `anchors` to seeds `letra_a.ts`, `letra_c.ts` and fixtures `modes/modes.test.ts` (line 22), `canvas/devCheckpointState.test.ts` (line 9).
- [x] T2.4 Classification suite (svgLetter.test.ts): dot-first i → body MAIN, dot after; tie → longer main; equal → file order (spec scenarios).
- [x] T2.5 Diagnostics suite (console.warn spy): o/r/v/w/e at anchors → no warn; a ending top-right → warn; wrong start → warn; i dot jump → no gap-warn; existing 2-subpath gap-warn test (line 473) stays green.
- [x] T2.6 Zones/anchors suite: `resolveBaselineZone('t')` = 'alta'; media set unchanged; a/o/e exit ≈ bottom-right/top-right/mid-right of MAIN bbox; entry ≈ baseline-left.

## Phase 3: README

- [x] T3.1 Rewrite `client/src/letters/svg/README.md`: 26-letter entry/exit anchor table (from proposal), zone map (t→alta), multi-subpath rules (one `<path>` element, Ctrl+K/Figma flatten, secondary strokes after main, x first-diagonal rule), "only the `d` matters" note.

## Phase 4: Letter Authoring Handoff (USER — NOT sdd-apply)

- [ ] T4.1 USER authors 25 SVGs (`client/src/letters/svg/b…z.svg`; `a.svg` exists) per README. Acceptance per letter: entry starts ≈ baseline-left (Y≈420); exit per table (default baseline-right; o r v w top-right; e mid-right); ONE `<path>` element; i/j dot, t/f cross, x second diagonal combined as subpaths drawn after main.
- [ ] T4.2 Verify-phase cross-check: `x.svg` second-diagonal ductus vs first real SVG; `f.svg` exit vs Zaner-Bloser reference; `a.svg` compliance reconfirmed.

## Notes

- Threat matrix all rows N/A → no RED-test tasks; spec scenarios fold into T2.4–T2.6.
- Spec delta staging (merge into `openspec/specs/letter-model/spec.md`) happens at sdd-archive, not apply.