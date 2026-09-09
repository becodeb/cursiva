# Exploration: svg-glyph-fixes

Four hand-drawn SVG letter bugs reported after authoring all 26 lowercase letters in Inkscape (branch `feat/svg-letters`).

## Current State

Pipeline: `client/src/letters/svg/{a..z}.svg` → `extractPathD` → `flattenPathD` (M/L/C/Q/Z only) → `reorderForWriting` (multi-subpath: main-first classification) → `resample` → `adjustToRuledZone` → `buildLetterConfig` → `LetterConfig.pathDefinition.d` is a single concatenated `M…L…` polyline for the whole letter (main + any secondary subpaths), with a scalar `mainEndArc` recording where the main body ends. `buildWord` (`combinations.ts`) independently re-derives main/tail slices from `mainEndArc` and emits them as separate animation segments. `TraceCanvas.tsx` renders a `guide` path (always visible, faint) and a `demo` array (animated).

## Problem 1 — i/j break (confirmed root cause)

`i.svg`/`j.svg` draw the dot as an Inkscape ellipse, exported as elliptical-arc (`a`) commands (`i.svg:91`, `j.svg:91`). `flattenPathD`'s tokenizer (`svgLetter.ts:110`) and `isCmd()` (`svgLetter.ts:117-119`) both use `/^[MLQCZmlqcz]$/`, which excludes `A`/`a`. Because `isCmd("a")` is `false`, the arc letter never reaches `setCmd()` (which would throw a clear error) — instead it is treated as a stray numeric token: `Number("a") === NaN`, silently injected as an implicit-continuation coordinate (`svgLetter.ts:258-289`). NaN then poisons the bbox, `adjustToRuledZone`'s scale/translate, and the final `d` — the letter renders as garbage/nothing, with no thrown error. This is a parser coverage gap (no A/a support), not a drawing mistake — Inkscape circles always export as arcs.

## Problem 2 — mid-height connections (product decision)

`LetterAnchors.entry` is contractually fixed at baseline-left for every letter (`types.ts:45-46`). `buildWord` (`combinations.ts:160-182`) does not need per-letter mid-entry variants — it already rigid-translates the whole next letter so its natural entry lands 20px from `prevExit`, then bridges the gap with a 24-step cubic-Bézier connector. So the connector mechanism already exists and is general. The open question is whether rigid-translating the entire next letter's body (not just its entry point) to chase a mid/top exit (b/e/o/v/w) is the right visual behavior, vs. keeping the next letter anchored to baseline and letting the connector absorb more of the vertical travel.

### Options

1. **Connector-only, retune placement formula** (no new SVGs) — Effort: Medium. Reuses tested connector code; requires re-deriving the dx/dy formula and updating `combinations.test.ts`/`wordBuilding.test.ts` expectations plus visual QA.
2. **Per-letter "starts-at-mid" entry variants** — Effort: High. Most faithful but 2x+ authoring burden, new variant-selection logic, contradicts the current single-baseline-entry contract.
3. **Hybrid** (rigid translate for baseline seams, partial decouple for mid/top exits) — Effort: Medium. Incremental but adds a special case to maintain.

Leaning toward Option 1, pending an explicit design decision + visual QA before locking the formula.

## Problem 3 — sharp "bounce" cusps (confirmed root cause, render-only fix)

`TraceCanvas.tsx`: the user-ink path (lines 197-204) has both `strokeLinecap="round"` and `strokeLinejoin="round"`. The animated demo `motion.path` (lines 179-194) has only `strokeLinecap="round"` — `strokeLinejoin` is unset (defaults to SVG `miter`). `stroke-linecap` only affects open path ends; interior cusps/reversals need `stroke-linejoin`, which is missing. The background `guide` path (lines 169-178) sets neither. This is purely a rendering-attribute gap — no path geometry changes needed.

## Problem 4 — straight line across pen-lifts (confirmed root cause, pre-existing bug newly exposed)

`pathFromPoints()` (`svgLetter.ts:450-459`) concatenates the entire reordered polyline (main + secondary subpaths) into one `M x y L x y L x y …` sequence, discarding the subpath boundary tracked by `starts[]`/`reorderForWriting` (only the scalar `mainEndArc` survives). This draws an actual `L` segment from the main stroke's end straight to the secondary subpath's start (dot, crossbar, second diagonal). Affects: (1) the always-visible `guide` path in both `guidedTrace.tsx:127` and `freeTrace.tsx:68` (static render); (2) the solo-letter animated demo, since `buildLetterConfig`'s `animationTimeline` has one `draw_path` step with no `properties.d`, so `guidedTrace.tsx:84,89` falls back to the same un-lifted `pathDefinition.d`. `combinations.ts` (`buildWord`) already does this correctly for multi-letter words — it re-derives main/tail from `mainEndArc` and pushes them as separate segments/paths. The bug is isolated to the solo-letter path. It was not hit before because only single-subpath Kalam seeds (`a`, `c`) existed in the registry until this branch added multi-subpath `t/i/j/f/x`; no existing test asserts against it.

## Affected Files

- `client/src/letters/svgLetter.ts` — arc parsing gap (P1), un-lifted concatenation (P4)
- `client/src/letters/svg/i.svg`, `j.svg` — arc dot geometry (P1)
- `client/src/letters/svg/x.svg`, `t.svg` — multi-subpath examples exercising P4
- `client/src/letters/combinations.ts` — correct segmentation reference (P4 fix pattern) + seam formula (P2)
- `client/src/letters/anchors.ts` — exit-kind/secondary-stroke metadata
- `client/src/canvas/TraceCanvas.tsx` — missing `strokeLinejoin` on demo path (P3); consumes un-lifted `d` (P4)
- `client/src/modes/guidedTrace.tsx`, `freeTrace.tsx` — pass `pathDefinition.d` as guide; solo demo fallback (P4)
- `client/src/letters/wordBuilding.test.ts`, `combinations.test.ts`, `svgLetter.test.ts` — synthetic L/C-only fixtures, no arc coverage, no solo gap-render assertion

## Recommendation

1. Make `flattenPathD` fail loudly on unsupported commands (incl. A/a) instead of silently producing NaN.
2. Decide arc support (arc-to-Bézier flattening) vs. redrawing i/j dots without arcs.
3. Extract `combinations.ts`'s main/tail segmentation into a shared helper; apply it to `buildLetterConfig`'s solo `d`/`animationTimeline`.
4. Add `strokeLinejoin="round"` to the demo and guide paths in `TraceCanvas.tsx`.
5. Treat Problem 2's seam-formula change as a design decision in `sdd-design` (touches existing test goldens).

## Risks

- Arc-to-Bézier flattening (if chosen) is nontrivial and scope-creep prone.
- Changing the seam formula (P2) will break existing golden values in `combinations.test.ts`/`wordBuilding.test.ts` — must be deliberate.
- Only `a-f` were reviewed by the user; `g-z` are untracked and may hide other per-letter issues not covered by this spot-check (only `i, j, t, x` inspected directly).
