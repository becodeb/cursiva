# Exploration: word-building (free letters, smoother seam, sequential demo, path order, toggle fix)

> Mode: openspec | execution: auto | delivery: single-pr | budget: ~800 lines
> Pre-state verified by orchestrator; refined with code evidence below.

## Current State (evidence-backed)

- **`client/src/letters/svgLetter.ts`** `buildLetterConfig` stores `d = pathFromPoints(fitted.points)` (line 757). `pathFromPoints` emits **exactly one `M` then `L`s** (lines 450–458), so the **stored `d` is ALWAYS a single-M concatenated polyline** — even for `i/j/t/f/x` whose raw SVG had multiple subpaths. `reorderForWriting` guarantees main-first in that concatenation (`svgLetter.ts:383`).
  - **Correction to the brief**: the plan's "split-by-M gives per-subpath segments (main first)" does NOT hold on the *stored* `d`. Segment cut must instead use `anchors.exit` (the fitted MAIN end, lines 725–728) — which lies on the polyline — or a stored arc-length.
- **`combinations.ts`** `buildCombination` translates member 1 so `entry₁` lands EXACTLY on `exit₀` (exact coincidence, no connector). Guard `isMultiSubpath` rejects `>1 M`, capping at 2 letters / same zone. `COMBO_REGISTRY` = 12 ordered pairs from `svgLetters` only (`registry.ts:24`).
- **`TraceCanvas.tsx:89`** `devOn = (isDevMode() || showCheckpoints) && devCheckpoints && devIdeal` → overlay shows in dev regardless of the toggle. **Fix: `showCheckpoints && devCheckpoints && devIdeal`** (drop `isDevMode()||`). `showScore={isDevMode()}` (line 198) stays dev-only. `demo` prop is a single `DrawDemo` (line 44); rendered as one `motion.path` (172–184).
- **`guidedTrace.tsx:77`** builds `draw` from `.find(type==='draw_path')` (FIRST only). `readyMs = max(delay+duration)+200` over ALL steps (line 85) — already multi-step safe.
- **`MainScreen.tsx`** picker → `start(key)` sets selected + guided; `LETTER_REGISTRY[key] ?? COMBO_REGISTRY[key]` (line 36); toggle button wires `showCheckpoints` (108–123). No keyboard, no word state.
- **`anchors.ts`** `SECONDARY_STROKE_CHARS = {i,j,t,f,x}`. Deferred set is NEW smaller `{t,i,j}` (user said `t`; `i/j` share; `x` explicit NOT deferred; `f` single-path typically).
- **`letra_a.ts`** `d` has 2 `M` commands → Kalam seeds fail an entry-match guard (intended). With `a.svg`–`f.svg` present, SVG overrides Kalam for a,c, so a,c are single-M entry-matched at runtime.

## Affected Areas

- `client/src/letters/svgLetter.ts` — add `mainEndArc` to `pathDefinition`; expose `isWordEligible`.
- `client/src/letters/types.ts` — optional `pathDefinition.mainEndArc?: number`; add `DEFERRED_SECONDARY_CHARS` set.
- `client/src/letters/combinations.ts` — add `buildWord(names): LetterConfig` (generalizes `buildCombination`; removes ≤1-M guard, supports n≥1); deprecate/remove `buildOrderedPairs`.
- `client/src/letters/registry.ts` — drop `COMBO_REGISTRY` (or empty `{}`); keep `LETTER_REGISTRY`.
- `client/src/screen/MainScreen.tsx` — word state, keyboard listener, append/clear, label, remount key `word.join('')`; drop combo picker; progress only when `length===1`.
- `client/src/modes/guidedTrace.tsx` — map ALL `draw_path` steps → `DrawDemo[]`; read `properties.d` per step.
- `client/src/canvas/TraceCanvas.tsx` — `demo: DrawDemo | DrawDemo[]`; render array of `motion.path`; gate fix.
- Tests: `combinations.test.ts` (remove co-location + registry-12; add seam/order/deferral/keyboard), `registry.test.ts`, `App.test.tsx`; add `wordBuilding.test.ts`.

## Decisions (1–8)

### 1. Seam smoothing — connector approach (RECOMMENDED)
- **Gap**: translate letter `i+1` so its entry lands at `prevEffectiveExit − g·u`, where `u` = normalized entry tangent of letter `i+1` (the direction its stroke moves away from entry). `g` = **20px** (in 16–24 band; ≈1.4× strokeWidth 14). This is the user's "modificar un poquito el primero y el último" — no point distortion, just a gap bridged by a smooth Bézier.
- **Connector geometry**: cubic Bézier `P0 = prevEffectiveExit`, `P3 = newEntry_placed`; entry/exit tangents from last/first ~3 polyline points (trivial since `d` is a polyline — `flattenPathD` returns dense `L` points); control arms `|P3−P0|/3`. Sampled to **24 `L` steps** → uniform polyline so it joins the ideal-cloud model.
- **Effective exit** = end of the letter's LAST IMMEDIATE segment: for `x` that's its second diagonal (end of `d`); for `t/i/j` it's `anchors.exit` (main end, secondary deferred); for single-subpath it's `d.end`.
- **Ideal cloud**: sample the connector at 24 steps + ±8px perpendicular band, concatenated into the word ideal so seam tracing scores fairly.
- **Connector demo duration**: **500ms** fixed.

### 2. Segment model (RECOMMENDED)
Stored `d` is single-M. Cut each translated letter at **`anchors.exit` (nearest vertex on flattened translated d)**; precise variant stores `mainEndArc` (arc length to main end) for an exact arc-walk cut (see §5). Word assembly order:
1. For each letter in order: **main segment** (translated), then its **immediate secondary** (if any, i.e. `x`), then **connector** to next letter.
2. After all letters: **deferred secondaries** in word order (`t,i,j` crosses/dots), each drawn at its translated home position.
- `DEFERRED_SECONDARY_CHARS = {t,i,j}`; everything else's secondary (only `x`) is immediate. `f` is single-path → no secondary to defer (flag if a future `f` SVG adds a cross — it would draw immediately, out of scope).

### 3. Demo timeline
`animationTimeline` = slide_in + **multiple `draw_path`** steps (one per segment, cumulative delays; first at 1000) + final fade_out.
- Durations: letters **2600ms**, connectors **500ms**, immediate secondary proportional to arc length (or fixed ~600ms), deferred secondary **~600ms** fixed.
- Each `draw_path` carries `properties: { d: '<polyline>' }`. `GuidedTrace` maps ALL `draw_path` steps → `DrawDemo[]` (fallback to `letter.pathDefinition.d` when `properties.d` absent, preserving single-letter behavior). `TraceCanvas` renders one `motion.path` per demo. `readyMs` math unchanged (already max over all steps).

### 4. Free word building UI (RECOMMENDED placement: `MainScreen`)
- `word: string[]` (letter keys). Picker buttons **append** (`start` keeps current mode). `window` keydown: `a–z` appends if `LETTER_REGISTRY[key]` exists AND `isWordEligible`; `Backspace` removes last + `preventDefault`; `?`/modifiers/space ignored. "Borrar" clears. Current-word label + canvas only when `word.length>0` (placeholder otherwise). Remount key = `word.join('')` (append keeps mode). Progress saved ONLY when `word.length===1`.
- `buildWord(names: string[]): LetterConfig` in `combinations.ts`: `n===1` returns the registry config as-is; throws/skips unknown or non-word-eligible letters. Returns full `LetterConfig` (d, ideal, checkpoints renumbered 1..N in writing order, anchors) so guided/free/evaluate consume it unchanged — `buildCombination` becomes the 2-letter case of `buildWord`.

### 5. Guards — replace ≤1-M (RECOMMENDED `isWordEligible`)
Word-eligible when: (a) registered; (b) `flattenPathD(d).points[0] ≈ anchors.entry` (within ~15px). **Drop the `d.end===exit` requirement** — false for multi-subpath letters (whose end is a secondary). Main-end found via `anchors.exit` (or stored `mainEndArc`). **Add `pathDefinition.mainEndArc?: number`** (arc length to main end = `reordered.mainEndArc * fitted.scaleX`) for an exact cut; undefined ⇒ single-subpath ⇒ cut = end. Kalam seeds fail (closed contour, first point ≠ entry).

### 6. Toggle fix (CONFIRMED minimal)
`TraceCanvas.tsx:89` → `devOn = showCheckpoints && !!devCheckpoints && !!devIdeal`. `showScore` stays `{isDevMode()}`. No test pins the old gate (`grep` on `*.test.*` found zero `showCheckpoints`/`isDevMode` refs). `MainScreen` toggle needs no other change. `devCheckpointOverlay.test.tsx` renders the overlay directly with explicit `showScore` and is unaffected.

### 7. Spec / test impact
- **Delta specs to add** under `openspec/changes/word-building/specs/`: `letter-combinations` (supersede fixed pairs → free word building + seam connector + sequential + path order), `main-screen` (picker append + keyboard + toggle), `trace-canvas` (overlay gate), `guided-trace-mode` (multi-step demo), `letter-model` (add `mainEndArc`, word-eligibility). `free-trace-mode` unaffected (evaluate works on the word config).
- **Tests that break**: `combinations.test.ts` (co-location at exact seam `toBeLessThanOrEqual(0.01)` and `COMBO_REGISTRY` 12-assertions) → replace with: connector endpoints `≈ prevExit − g·u`, sequential order, deferral with a **synthetic 2-subpath letter** (`d:'M0 0 L10 10 M20 20 L30 30'` style, but using a word-eligible single-M with a secondary flagged deferred), keyboard-append. `registry.test.ts` combo assertions removed. New `wordBuilding.test.ts` for `buildWord` + `isWordEligible`.

### 8. Scope & estimate
- **In scope (~800 LoC)**: files listed above + tests.
- **Risks**: keyboard capture (Backspace page-nav / focus on buttons / uppercase / space) — handle with `preventDefault` only on consumed keys, ignore when modifier held or an input/textarea focused; single-M `d` cut precision (mitigated by `mainEndArc`); removing `COMBO_REGISTRY` breaks `combinations.test.ts`/`registry.test.ts` (must update); `demo` array change touches `TraceCanvas`+`GuidedTrace`+`modes.test.tsx`/`App.test.tsx`.
- **Out of scope**: word persistence/progress across words, spaces, uppercase, mid-word editing beyond Backspace, connectors branching off secondary strokes beyond immediate/deferred.

## Approaches (summary)

1. **Single-M + `anchors.exit` cut (recommended)** — minimal, no new infra; exact cut via optional `mainEndArc`.
2. **Persist `pathSegments: string[]`** — cleaner decomposition but larger type change and guide/ideal consumers must adapt; more invasive than needed for current letter set.

## Recommendation
Adopt Approach 1: generalist `buildWord` over `buildCombination`; segment cut at `anchors.exit` backed by `mainEndArc`; tangent-matched cubic connector (g=20px, 500ms); `DrawDemo[]` in `TraceCanvas`; gate fix dropping `isDevMode()||`; deferred `{t,i,j}`. This satisfies all 5 user requirements with the smallest, lowest-risk diff and keeps `evaluateTrace`/guided-rail unchanged in shape.

## Risks
- Keyboard capture conflicts (Backspace nav, focused buttons, uppercase, space) — must scope the listener carefully.
- Stored `d` is single-M (not multi-M) — segment split MUST use `anchors.exit`/`mainEndArc`, not `flattenPathD` starts.
- Removing `COMBO_REGISTRY` invalidates 2 existing test files — update in the same change.
- Deferred-secondary rail ordering must renumber those checkpoints LAST so the user "crosses t's after the word."
- `f` secondary (if any future SVG adds a cross) would draw immediately, not deferred — flagged, out of scope.

## Ready for Proposal
Yes — all five requirements have a concrete, code-grounded design. Orchestrator should tell the user: (a) fixed 12-pair combos are being removed in favor of free building; (b) `t/i/j` crosses/dots draw after the word, `x` second diagonal is immediate; (c) the dev-mode default that forced the overlay on is being removed so the toggle is authoritative.
