# Design: Letter Combinations & Checkpoint Fix

## Technical Approach

Three coupled deltas: (1) `checkCheckpointOrder` switches to **containment activation** of the expected order with `wrongDirection` reset on full pass — fixes reentrant `c` with zero changes to the 10 existing tests (proposal verification table); (2) new `buildCombination` translates + concatenates two single-subpath `LetterConfig`s into one continuous `enlazada` config the existing modes consume unchanged; (3) `showCheckpoints` prop widens the overlay gate to production, threaded through both modes, with the `%` line kept dev-only.

## Architecture Decisions

| # | Decision | Alternatives | Rationale |
|---|----------|--------------|----------|
| 1 | Containment activation + reset (algorithm below, authoritative from proposal) | Synthetic re-entry injection (approach 2) | Reentrant head inside a pending zone never re-enters — only containment fires it. Proof: identical records on all 10 existing tests; co-located zones stay order-gated because only the expected order ever activates; reset fires only on a full strict pass, so genuine reversals still fail (never activate all N) |
| 2 | `while` loop runs BEFORE the early-continue guard; keep `sorted.length > 0` floor | Activate only on `entered.includes(expected)` | The head can sit inside the expected zone with zero fresh entries (c model P3–P6) — the entry guard would skip the needed activation. Floor keeps empty input `{false,false,[]}` |
| 3 | Seam = translated entry lands on previous exit; no connector | Connector Bézier | Single-subpath invariant: stored `d` starts at `entry` and ends at `exit` (`pathFromPoints` + `pointAtArcLength` over the full arc). Translate with `transformPathD(d,1,1,dx,dy)`, `dx,dy = round2(prevExit − entry)` → `entry' = entry + (exit − entry) = exit` exactly; concatenated `d` continuous. Modes/evaluate need zero changes |
| 4 | Guards: `M` count in stored `d` ≤ 1; equal `baselineZone`; length = 2 | Allow anything | Multi-subpath `d` ends at the dot/cross → seam jump; mixed zones misalign vertically; `2600·n` grows fast — cap 2 |
| 5 | One shared `(dx,dy)` applied to `d`, checkpoints, ideal, anchors | Per-field offsets | The visible checkpoint must sit on the drawn seam; identical offset, each field keeps its own rounding (d/anchors 2dp, checkpoints/ideal 1dp) |
| 6 | `COMBO_REGISTRY` exported from `registry.ts`, built from `svgLetters` only | Build from merged `LETTER_REGISTRY` | Kalam seeds (`letra_a`/`letra_c`) are closed contours, not ductus — rebuild `d` with them would break the seam; svg letters override them anyway. No SVGs → `{}`, single letters unaffected |
| 7 | Ordered pairs, registry order, `i ≠ j`, same zone | Self/mixed pairs | `a–f` zones: a,c,e `media`; b,d,f `alta` → 12 offerable pairs (`combo_ac`, `combo_ca`, …). Self-pairs add no new seam; mixed pairs violate the zone guard (spec "violating pair absent") |
| 8 | Score hiding: TraceCanvas passes `showScore={isDevMode()}` into `DevCheckpointOverlay` (default `true`) | `isDevMode()` inside the overlay | Overlay stays a pure prop function (renderToString-testable); TraceCanvas is the single dev-detection point. `showScore=false` renders only the `¡COMPLETO!` flash, never score/count text |
| 9 | MainScreen: `LETTER_REGISTRY[key] ?? COMBO_REGISTRY[key]`, separate combo nav (`aria-label="Combinaciones"`), toggle verbatim "Mostrar puntos del trazo" | Merged single nav | `combo_*` ids never collide with letter keys; Bloom untouched (`filter family === 'ola'`); ProgressStore is string-keyed so combo progress just works |

## Corrected Checkpoint Algorithm

```ts
const N = sorted.length                              // = sorted.length; reused below
for (const p of points) {
  const entered: number[] = []
  for (let i = 0; i < N; i++) { /* inside[] update; entered.push on fresh entry */ }
  const before = activated.length
  while (expectedOrder <= N && inside[expectedOrder - 1]) {   // containment
    activated.push(expectedOrder)
    maxActivated = Math.max(maxActivated, expectedOrder)
    expectedOrder += 1
  }
  if (activated.length > before) continue                     // early-continue guard
  if (entered.length === 0) continue
  const benignReentry = entered.some((o) => o <= maxActivated)
  if (!benignReentry && entered.some((o) => o > expectedOrder)) wrongDirection = true
}
const fullPass = activated.length === N
return { orderPassed: N > 0 && fullPass, wrongDirection: fullPass ? false : wrongDirection, activated }
```

`N = sorted.length`, so `N > 0 && activated.length === N` is exactly the spec formula `sorted.length > 0 && activated.length === sorted.length`. Return contract unchanged in shape: `{ orderPassed, wrongDirection, activated }`. Seam note: a's last checkpoint and c's renumbered first sit co-located at the handoff — a continuous stroke activates both in one sample (expected reaches 7 right after 6); intended, spec "no earlier than when expected reaches it".

## Data Flow

```
svgLetters {a..f} ─order, pairs→ buildCombination([x,y])
  d'₁ = transformPathD(d₁,1,1,dx,dy);  d = d₀ + " " + d'₁
  theme ← letters[0].theme (first member's theme keeps the room identity of the starting letter)
  checkpoints concat (offset + renumber 1..11, names kept) · ideal concat · anchors {entry₀, exit₁}
  one draw_path (1000, 2600·n) · slide_in from ₀ · fade_out (1000+2600n+200, 600) · family 'enlazada'
MainScreen ─showCheckpoints→ Guided/FreeTrace ─→ TraceCanvas
  overlayOn = (isDevMode() || showCheckpoints) && devCheckpoints && devIdeal
    ─rAF (10Hz throttle, length-change) → devState ─→ DevCheckpointOverlay(showScore=isDevMode())
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `client/src/canvas/validation/checkpoints.ts` | Modify | Containment `while` before the guard; latch unchanged; full-pass reset; `sorted.length > 0` floor |
| `client/src/letters/combinations.ts` | Create | `buildCombination` (guards, translate, renumber, timeline) + ordered-pairs builder |
| `client/src/letters/registry.ts` | Modify | `COMBO_REGISTRY` from `svgLetters` |
| `client/src/canvas/TraceCanvas.tsx` | Modify | `showCheckpoints` prop + widened gate; `showScore` to overlay |
| `client/src/canvas/devCheckpointOverlay.tsx` | Modify | `showScore` prop (default true) hides score/count text |
| `client/src/modes/guidedTrace.tsx`, `freeTrace.tsx` | Modify | Thread `showCheckpoints` |
| `client/src/screen/MainScreen.tsx` | Modify | Combo nav group, `??`-fallback lookup, toggle button + state |
| `client/src/canvas/validation/checkpoints.test.ts` | Modify | + `c`-backtrack case; existing 10 untouched |
| `client/src/letters/combinations.test.ts` | Create | Seam/renumber/guards/registry/timeline |

## Interfaces / Contracts

```ts
// combinations.ts (error strings Spanish, house style)
export function buildCombination(letters: [LetterConfig, LetterConfig]): LetterConfig // throws on guard violation
export function buildOrderedPairs(letters: Record<string, LetterConfig>): LetterConfig[] // registry order, i≠j

// registry.ts — key `combo_${chars}`, e.g. combo_ac; character: 'ac'
export const COMBO_REGISTRY: Record<string, LetterConfig>

// TraceCanvas.tsx — optional; default false (dev gate unchanged)
showCheckpoints?: boolean
// DevCheckpointOverlay.tsx — default true (dev behavior unchanged)
showScore?: boolean
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `c` backtrack | New case: cp1(400,405,r42)…cp4(505,403,r40), stroke (392,410)→(420,335)→(432,290)→(448,280)→(460,305)→(468,330)→(485,390) (exploration §1) → `{true, false, [1,2,3,4]}`; existing 10 byte-identical |
| Unit | Seam | First `M` of translated `d₁` equals exit₀ within 0.01; anchors span first.entry/last.exit |
| Unit | Renumber | Real a+c → exactly 1..11, names kept |
| Unit | Guards/timeline | Multi-subpath fixture, mixed zones, 3 letters → throw; exactly one draw_path (delay 1000, duration 2600n); fade_out delay 1000+2600n+200 |
| Unit | Registry | 12 ordered pairs for a–f; `combo_ac` ≠ `combo_ca`; no mixed-zone pair |
| Unit | Overlay | renderToString: `showScore=false` omits 'score'; default shows it |
| Integration | Combo rail | `referenceFlattenPath` over combined `d` → `evaluateTrace`/`guidedFollowState` complete on renumbered checkpoints |
| Smoke | App | `App.test.tsx` renderToString stays green (combo nav + toggle render) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary (pure frontend data pipeline + prop threading; no applicable rows).

## Migration / Rollout

No data migration. Algorithm change is behavior-contractual (trace-validation delta already authored); registry and toggle are additive. Rollback: revert `checkpoints.ts` alone (tests pin old semantics); removing `COMBO_REGISTRY`/toggle leaves single-letter flow untouched. Perf: the widened gate reuses the existing ~10Hz + length-change throttle inside the rAF block — `devCheckpointState` still computes only while the overlay is on; no per-frame change.

## Open Questions

- [ ] None blocking. Seam co-location (activation of a's last + c's first in one sample) is covered by the integration test; if geometry ever latches `wrongDirection` mid-trace on a correct stroke, the full-pass reset already heals it — no code change anticipated.