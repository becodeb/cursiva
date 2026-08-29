# Design: Free Word Building

## Technical Approach

Generalize `buildCombination` → `buildWord(names: string[])` (letter-combinations spec): each registered, word-eligible letter is translated so its placed entry lands at `prevEffectiveExit − 20·u`; its main segment is cut exactly (arc-walk at `mainEndArc`, else nearest vertex to `anchors.exit`); `x`'s second diagonal is appended immediately; a cubic-Bézier connector (24 `L` steps) bridges every seam; `t/i/j` secondaries append after ALL letters. Output stays a single-`M` `LetterConfig` (checkpoints renumbered, multi-step `draw_path` timeline) consumed unchanged by guided/free/evaluate. `COMBO_REGISTRY` + combo picker are removed; keyboard append + `isWordEligible` replace them; the overlay gate drops dev-mode forcing (trace-canvas).

## Architecture Decisions

| # | Decision | Alternatives | Rationale |
|---|----------|--------------|----------|
| 1 | `buildWord` replaces `buildCombination`/`buildOrderedPairs`; n=1 returns the registry config object unchanged | Keep both | One entry point; free building is the 2-letter case; passthrough preserves single-letter demo (no `properties.d`) |
| 2 | Store `pathDefinition.mainEndArc?` (types.ts) = `round2(reordered.mainEndArc × fitted.scaleX)` **only when multi-subpath**; absent ⇒ single-subpath ⇒ cut at d end | Always store; persist `pathSegments` | Reuses existing `reorderForWriting` value; spec: absent = single-subpath convention; `pathSegments` (Approach 2) is invasive, no current consumer |
| 3 | Cut: exact arc-walk (accumulate chords over flattened *translated* `d` until `mainEndArc`) when present; nearest vertex to translated `anchors.exit` otherwise | `flattenPathD` starts | Stored `d` is single-`M`; subpath boundaries don't survive normalization — only arc length does |
| 4 | Seam `u = normalize(prevEffectiveExit − entryNatural)` (proposal D3); placed entry = `round2(prevExit − 20·u)`; tangents from first/last ~3 polyline points; arms `|P3−P0|/3`; 24 uniform steps; ±8px band into ideal | Entry-tangent `u` (delta-spec wording) | Proposal is binding; **flag**: letter-combinations delta words `u` as "incoming letter's normalized entry tangent" — same formula, conflicting definition text; resolve toward proposal at verify |
| 5 | `DEFERRED_SECONDARY_CHARS = {t,i,j}` in anchors.ts (beside `SECONDARY_STROKE_CHARS`); effective exit = last immediate end: `x` → d end, else `anchors.exit` | types.ts | Stroke metadata is anchors.ts's concern; x's diagonal is authored as the tail after `mainEndArc` |
| 6 | `isWordEligible(letter)` in svgLetter.ts: `dist(flattenPathD(d).points[0], anchors.entry) ≤ 15` (+ registry lookup by caller) | Seed-eligibility hack | Kalam closed contours fail (first point ≠ entry); `d.end===exit` dropped (false for secondaries); no live letter breaks (a–f entry-matched) |
| 7 | Demo: one `draw_path` per segment — cumulative delays, first 1000; letters 2600ms, connectors 500ms, secondaries 600ms; each `properties:{d}` | Single step | Spec sequential scenario; single-letter steps carry no `properties.d` → GuidedTrace fallback preserves behavior |
| 8 | UI: `word: string[]` + window keydown; pure exported `nextWord` helper (node-testable) | Inline handler | Vitest env is `node` — keyboard dispatch needs extraction |

## buildWord Algorithm

Per letter (word order): resolve `LETTER_REGISTRY[name]` else throw; `isWordEligible` else throw. `n=1` → return config as-is.

1. `flat = flattenPathD(transformPathD(d, 1, 1, dx, dy))` (first letter `dx=dy=0`).
2. **Cut**: if `mainEndArc` → walk chords → cut index (else nearest vertex to translated `anchors.exit`). `main = flat.points[0..cut]`, `tail = flat.points[cut..]`.
3. **Placement**: entryNatural = own `anchors.entry`; `u = normalize(prevEffectiveExit − entryNatural)` (fallback `(1,0)`); `dx = round2(prevExit − 20·u − entryNatural)`. Recompute flat with final `dx,dy`.
4. **Effective exit** (for next seam): `x` → flat end; else translated `anchors.exit`.
5. **Connector** (i < n−1): `P3 = placedEntry`; `t0` from last 3 pts of prev immediate chunk, `t3` from first 3 pts of next main; `C1 = P0 + arm·t0`, `C2 = P3 − arm·t3`, `arm = |P3−P0|/3`; 24 sampled steps → `L`s; skip when `|P3−P0| < 1px` (exact placement).
6. Concatenate in order: `main₁, [tail₁ if x], conn₁, main₂, [tail₂ if x], conn₂, …, mainₙ, [tailₙ if x]` then **deferred tails** (`t/i/j`) in word order. One `pathFromPoints` → single-`M` `d`.
7. **Checkpoints**: split each member's list by arc position ≤ `mainEndArc` (project each cp onto translated flat, compare acc arc); renumber main/immediate 1..N in writing order, then deferred chunks (word order) LAST, names kept. **Ideal**: translated member clouds (incl. secondaries) + connector ±8px bands.
8. Anchors: `entry` = first member's, `exit` = last effective exit. `family 'enlazada'`, theme/strokeWidth/zone from first member, `id: 'palabra_'+chars`.
9. Timeline: `slide_in`(member 0) → per-segment `draw_path` (above) → `fade_out` at `max(delay+duration)+200`.

## Data Flow

```
MainScreen (word: string[]) ─keydown/picker/Borrar→ nextWord → word
  └─ useMemo(wordKey) buildWord(names) → LetterConfig (d, checkpoints 1..N, ideal, anchors, timeline)
       └─ GuidedTrace: ALL draw_path steps → DrawDemo[] (d = properties.d ?? pathDefinition.d)
            └─ TraceCanvas: demo: DrawDemo | DrawDemo[] → one motion.path each (delay/duration per entry)
                 └─ devOn = showCheckpoints && !!devCheckpoints && !!devIdeal (showScore = isDevMode())
word.length === 1 → onEvaluate persists store.setProgress(word[0], score); remount key = wordKey; mode kept
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `client/src/letters/types.ts` | Modify | `pathDefinition.mainEndArc?: number` |
| `client/src/letters/anchors.ts` | Modify | `DEFERRED_SECONDARY_CHARS` (next to `SECONDARY_STROKE_CHARS`) |
| `client/src/letters/svgLetter.ts` | Modify | Store `mainEndArc` (multi-subpath only); export `isWordEligible` |
| `client/src/letters/combinations.ts` | Modify | `buildWord` replaces `buildCombination`/`buildOrderedPairs` (delete both) |
| `client/src/letters/registry.ts` | Modify | Drop `COMBO_REGISTRY` + import |
| `client/src/screen/MainScreen.tsx` | Modify | Word state, keydown listener, Borrar, `nextWord` export, remount `wordKey`, progress guard; delete combo picker |
| `client/src/modes/guidedTrace.tsx` | Modify | Map all `draw_path` → `DrawDemo[]` |
| `client/src/canvas/TraceCanvas.tsx` | Modify | `demo: DrawDemo \| DrawDemo[]`; gate expression |
| `client/src/letters/combinations.test.ts` | Modify | Replace seam/registry/guard tests (below) |
| `client/src/letters/wordBuilding.test.ts` | Create | `buildWord` + `isWordEligible` |
| `client/src/letters/svgLetter.test.ts` | Modify | `mainEndArc` scenario (synthetic multi-subpath) |
| `client/src/canvas/TraceCanvas.test.tsx` | Create | Demo-array SSR rendering |
| `client/src/App.test.tsx` | Modify | Drop combo-nav assertions; assert Borrar/placeholder |

## Interfaces / Contracts

```ts
// types.ts
pathDefinition: { d; guideD?; ideal; strokeWidth; checkpoints; mainEndArc?: number }
// anchors.ts
export const DEFERRED_SECONDARY_CHARS: ReadonlySet<string> = new Set(['t', 'i', 'j'])
// svgLetter.ts
export function isWordEligible(letter: LetterConfig): boolean // dist(flat[0], entry) ≤ 15
// combinations.ts
export function buildWord(names: string[]): LetterConfig // throws unknown/ineligible; n=1 passthrough
// MainScreen.tsx
export function nextWord(word: string[], key: string): string[] | null // null = ignored (mods/space/Backspace handled separately)
// TraceCanvas.tsx
demo?: DrawDemo | DrawDemo[]
const devOn = showCheckpoints && !!devCheckpoints && !!devIdeal
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Seam placement | `buildWord(['a','c'])`: flatten translated `c` — first point equals `round2(exit_a − 20·u)` within 0.01 (`u = normalize(exit_a − entry_c)`) |
| Unit | Connector | Parse combined `d`: exactly 24 connector steps; step₁ dir ≈ last-3-pts tangent of `a`; step₂₄ ≈ first-3-pts tangent of `c` |
| Unit | Cut/deferral | Synthetic `t`/`i` (multi-subpath + `mainEndArc`): `buildWord(['t','i'])` `d` ends with cross then dot, after all mains + connector; their checkpoint orders are the highest two |
| Unit | x immediate | Synthetic `x`: second diagonal precedes connector and next main, in `d` AND timeline (`1000/2600/600/500…`) |
| Unit | Renumber | `a`(9 cps)+`c`(6) → exactly 1..15, names kept |
| Unit | n=1 / refusal | `buildWord(['a'])` `toBe` registry config; `['z']` throws; seed `letraA` ineligible via `isWordEligible` |
| Unit | Eligibility | svg `a` true; Kalam seeds false; entry-matched synthetic multi-subpath true |
| Unit | Registry | `COMBO_REGISTRY`/`buildOrderedPairs` gone; `registry.test.ts` unchanged (no combo refs) |
| Unit | Timeline | `ac`: 3 steps (1000/2600, 3600/500, 4100/2600), each with `properties.d`; single letter: one step, no `properties.d`; `fade_out` at max+200 |
| Unit | Keyboard | `nextWord('ca','b') = 'cab'`; Backspace pop; uppercase/modifier/space/unknown → null |
| Integration | Rail | `referenceFlattenPath(ac.d)` → `guidedFollowState` complete + `evaluateTrace` approved (existing shape) |
| SSR | Demo array | `renderToString(<TraceCanvas demo={[d1,d2]} />)` → 2 `stroke="#0284c7"` paths; single object → 1 |
| SSR | App shell | Combo nav absent; Borrar, toggle, placeholder present |
| E2E | Gate | Browser harness: toggle off hides overlay in dev (no vitest — rAF-driven, no jsdom) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary (pure frontend data pipeline + prop threading).

## Migration / Rollout

No data migration. `mainEndArc` optional — no breakage. Rollback: re-add `COMBO_REGISTRY` + picker (additive; single-letter flow untouched); gate = one-line revert; keyboard removal is deletion-only.

## Remediation Addendum (manual browser feedback, post-verify)

1. **Descender guide line**: TraceCanvas gains a 4th full-width guide at Y=540 (`ROOTS_GUIDE_Y`) so descender letters show their lower band; `DESCENDER_LINE_Y` already exists in svgLetter.ts (`zoneBounds` `baja`/`mixta` bottomY).
2. **`f` zone → mixta**: school-cursive `f` spans ascender + descender; `LETTER_ZONES` moves `f` from the alta group (`bdfhklt`) to `mixta` (`fj`), fitting 180–540. `f.svg` is re-authored by the user (entry hook at the baseline); the pipeline consumes the redraw unchanged.
3. **Append replays the demo**: MainScreen `append` and the `a–z` keydown path reset the mode to `guided`, so every append restarts the full sequential word demo (letters in order, connectors after, deferred secondaries last) — replacing the previous "keep mode across appends" behavior (main-screen delta amended).

Affected spec deltas: letter-model (Ruled-Line Zone Map), trace-canvas (Viewport and Ruled Lines), main-screen (Letter Picker + Keyboard Word Building). tests: svgLetter.test.ts (zones), TraceCanvas.test.tsx (540 line), App.test.tsx + wordBuilding.test.ts (append → guided restart).

## Open Questions

- [ ] Delta-spec vs proposal `u` wording: spec calls `u` the "incoming letter's normalized entry tangent"; proposal/this design use `normalize(prevEffectiveExit − entryNatural)`. Formula (`prevExit − 20·u`) is identical; resolve at verify, assert with the proposal's `u`.
- [ ] No registered letter is multi-subpath today (a–f are single-`M`, no `t/i/j` SVGs) — deferral/`mainEndArc` paths are covered by synthetic fixtures until those SVGs land (pipeline emits them automatically when they do).