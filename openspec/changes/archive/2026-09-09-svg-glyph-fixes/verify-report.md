# Verify Report: svg-glyph-fixes

**Commits verified**: `8ed5283..9f6aa9c` on `feat/svg-letters` (5 commits)
**Date**: 2026-08-30

## Suite / Build Re-run

- `cd client && npx vitest run` → **18 files, 216/216 tests passing**, 0 failures.
- `cd client && npm run build` (`tsc --noEmit && vite build`) → **clean**, no type errors, build succeeds (469 modules, no errors, only an unrelated chunk-size advisory).

Both match the counts reported in apply-progress exactly.

## Requirement-by-Requirement Verdict

### letter-model/spec.md

| Requirement | Verdict | Evidence |
|---|---|---|
| Elliptical Arc Ingestion (A/a → cubics, finite) | **PASS** | `svgLetter.ts:153-248` `emitArc` — full SVG2 §B.2.4 endpoint→center parameterization, radii correction (`Λ>1`), split into `ceil(|Δθ|/(π/2))` cubics via shared `emitCubic`. Verified against real `i.svg`/`j.svg` (`m ... a 2.75,2.75 ...`, relative arc dot), not synthetic fixtures — `registry.test.ts` sweeps all 26 real SVG files via `loadSvgLetters()` → `import.meta.glob('./svg/*.svg', ...)`. |
| Fail-Loud Unsupported Path Commands (allowed set `{M,L,H,V,Q,C,Z,A}`+lowercase, non-finite throw) | **PASS** | `svgLetter.ts:111-122` tokenizer/`isCmd` widened to full alphabet so S/T reach `setCmd`'s `default` throw (`svgLetter.ts:330-335`); `H`/`V` explicitly supported (needed by `k.svg`'s `h 58.5`, confirmed present at `k.svg` real content); non-finite token throw at `svgLetter.ts:417-420`; `transformPathD`'s silent `default` now throws too (`svgLetter.ts:833-839`). |
| LetterConfig Shape — `segments` derived, one `draw_path`/segment, stored `d` single-M | **PASS** | `types.ts:83` `segments?: string[]`; `svgLetter.ts:1004-1010` derives `segments` via `splitMainTail` only when `mainEndArc` present; `svgLetter.ts:1082-1099` emits one `draw_path` per segment (main 2600ms, tail 600ms, `properties.d`); stored `dNorm` (`svgLetter.ts:995`) built from the single reordered polyline, never split — `pathFromPoints` always emits exactly one leading `M`. Consumers (`guidedTrace.tsx:127`, `freeTrace.tsx:68`) pass `segments ?? [d]` into `TraceCanvas`'s widened `guide` prop, never the concatenated `d`. |

### letter-combinations/spec.md

| Requirement | Verdict | Evidence |
|---|---|---|
| Seam Continuity — hybrid: baseline byte-identical, mid/top dy===0 | **PASS** | `combinations.ts:180-196` branches on `exitKindFor(prev.character)`; baseline branch is the original unmodified chord formula; mid/top branch sets `placed.y = cfg.anchors.entry.y` (`dy===0`) and reuses `SEAM_GAP` horizontally. Tested: `combinations.test.ts:218-228` cross-checks a→c byte-identical (`<1e-6` diff vs. pre-hybrid golden); `combinations.test.ts:197-216` `it.each(['b','e','o','v','w'])` asserts `placed.y ≈ next.anchors.entry.y` and `placed.x ≈ prev.exit.x - SEAM_GAP`. |
| Deferred set `t/i/j/f`, effectiveExit resolution | **PASS** | `anchors.ts:53` `DEFERRED_SECONDARY_CHARS = {t,i,j,f}`; `combinations.ts:209-211` effectiveExit = translated `d` end for deferred, main end otherwise; `f`'s inertness pinned by golden in `combinations.test.ts:231-249` (single-subpath today, effective exit === `d` end, no separate deferred step). |

### trace-canvas/spec.md

| Requirement | Verdict | Evidence |
|---|---|---|
| Demo and Guide Stroke Joins — `strokeLinejoin="round"` | **PASS** | `TraceCanvas.tsx:182` (guide path) and `TraceCanvas.tsx:199` (demo `motion.path`, inside the `.map` covering both single and array demo). |
| Guide Path Pen-Lift Fidelity — segments render as separate `<path>`s | **PASS** | `TraceCanvas.tsx:173-188` renders one `<path>` per `guide` array entry when `guide` is `string[]`; `guidedTrace.tsx:127` / `freeTrace.tsx:68` pass `segments ?? [d]`. |

## i.svg / j.svg Arc-Dot Registry Load

**PASS.** `registry.test.ts:43-79` sweeps all 26 lowercase letters through `getLetterConfig(ch)`, which resolves through `LETTER_REGISTRY` populated by `loadSvgLetters()` reading the real `src/letters/svg/*.svg` files via Vite's eager glob — not synthetic fixtures. Manually confirmed `i.svg`'s single `<path>` contains both the body (`c` commands) and the arc dot (`M 435.00001,252.75 a 2.75,2.75 ...`), and `j.svg` similarly. `assertFiniteDeep` walks anchors/checkpoints/ideal/`mainEndArc` for every letter and asserts `d`/`segments` strings never contain the literal substrings `NaN`/`Infinity`.

## Tasks Confirmation

25/26 marked `[x]`, exactly 1 marked `[~]` (task 6.8, manual visual QA), 0 unmarked. Task 6.8 is correctly pending-user — it requires a human running `npm run dev` and visually inspecting the canvas, which cannot be executed by an agent. This matches apply-progress exactly.

## Known Accepted Facts (not flagged)

- **866 changed lines** (759 insertions + 107 deletions across 11 files) — confirmed via `git diff --stat 8ed5283^..9f6aa9c`, exceeding the design's ~500-650 estimate by ~8%. Accepted by maintainer decision per orchestrator instructions; not flagged as a failure. Root cause transparently documented in apply-progress (arc-math algorithm + test coverage came in denser than the terse estimate assumed).
- **Golden changes for b/e/o/v/w seams** are deliberate (Decision 2, hybrid seam) — not flagged.

## Gaps / Issues Found

None CRITICAL. None WARNING. One SUGGESTION (non-blocking):

- **SUGGESTION**: `combinations.ts`'s hybrid-seam mid/top branch (`combinations.ts:192`) computes `placed = { x: round2(prevExit.x - SEAM_GAP), y: cfg.anchors.entry.y }` — this reads `prevExit.x` (the previous member's *actual* exit position, already translated) rather than deriving a chord direction; this is exactly per Decision 2 ("no tunable factor, no new constant") and is correctly tested, so no action needed. Noted only because it's the one place the two seam branches diverge structurally (chord-vector vs. fixed horizontal) — worth a comment cross-reference if this file is touched again, but not a defect.

## Verdict Summary

- **CRITICAL: 0**
- **WARNING: 0**
- **SUGGESTION: 1** (non-blocking, documentation-only observation)

All three delta specs are fully implemented and test-covered against real production SVG assets. Suite and build are green. Tasks are accurately tracked. The change is ready for archive; task 6.8 (manual visual QA) remains the sole human-gated item and does not block archive per the task's own pending-user classification.

## Result Contract

- **status**: done
- **executive_summary**: 0 CRITICAL, 0 WARNING, 1 SUGGESTION — all delta-spec requirements pass against real code and real SVG assets; suite (216/216) and build are green.
- **artifacts**: `sdd/svg-glyph-fixes/verify-report` (Engram), `/home/opencode/projects/cursiva/openspec/changes/svg-glyph-fixes/verify-report.md`
- **next_recommended**: sdd-archive
- **risks**: none blocking archive; task 6.8 (manual visual QA) remains pending-user by design, does not block archive
- **skill_resolution**: paths-injected
