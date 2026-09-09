# Design: SVG Glyph Rendering Fixes

## Technical Approach

Fix each defect at its lowest correct layer, in four independently revertible units: parser (P1), placement formula (P2), config builder via a shared helper (P4), render attributes (P3). No new SVGs, no redrawn glyphs, no checkpoint-logic change.

## Architecture Decisions

### Decision 1 — P4 representation: derived `segments`, not multi-`M` `d`

**Choice**: add optional `pathDefinition.segments?: string[]` (one `M…L…` string per pen-lift segment), emitted **only** when `mainEndArc` is present. `animationTimeline` gains one `draw_path` per segment carrying `properties.d` (main 2600ms, tail 600ms, `fade_out` at `Σ + 200`). Both come from one shared helper.

**Contract reconciliation (explicit)**: there are two *different* single-`M` constraints and this design touches neither.

| Constraint | Owner | Status |
|---|---|---|
| Stored letter `pathDefinition.d` is single-`M` | `letter-model` (amended delta) | Unchanged — storage stays single-`M` |
| `buildWord`'s combined word `d` is single-`M` | `letter-combinations` | Untouched by this change |

The amended `letter-model` delta makes the pen-lift requirement **render-level**: storage stays a single-`M` arc-length-continuous polyline, `segments[]` is the **authoritative render form** for multi-subpath letters, and consumers (guide + demo) MUST render `segments` and MUST NOT render the concatenated `d` verbatim. My earlier rationale cited the pre-amendment `letter-model` line and conflated the word-level constraint with the letter-level one; that reasoning is retired and replaced by the storage/render split below.

| Option | Tradeoff | Decision |
|---|---|---|
| Multi-`M` `d` | Fixes the guide for free, but `d` is the arc-length domain that `mainEndArc`, `cutAtArc`, `projectArc`, `ideal` and `isWordEligible` all read; splitting it breaks those semantics | Rejected |
| Derived `segments` | Storage keeps its continuous arc-length meaning; render form is separate and explicit; `d` stays byte-identical → zero golden churn on `a`/`c` | **Chosen** |

**Rationale**: `properties.d` per step is the shape `buildWord` already emits and `guidedTrace.tsx:84` already consumes, so the demo needs no consumer change; only `TraceCanvas.guide` widens to `string | string[]`.

### Decision 2 — Hybrid seam: fixed full absorption, selected by the previous exit kind

**Choice**: the seam mode is chosen by `exitKindFor(prevMember.character)`. `baseline` keeps today's formula **verbatim** (byte-identical goldens). `mid`/`top` (`b e o v w`) use a horizontal chord:

```ts
placed = { x: round2(prevExit.x - SEAM_GAP), y: cfg.anchors.entry.y }  // dy === 0
```

**Fixed rule, no tunable factor and no new constant**: `dy === 0` — the placed entry keeps the next letter's own baseline Y, so the letter is not translated vertically at all, and the existing 24-step Bézier (arms `|P3−P0|/3`, now ≈40px) absorbs **100%** of the mid/top→baseline travel. The existing `SEAM_GAP` is reused as the horizontal seam magnitude. A tunable absorption factor was rejected: new config surface, per-letter tuning and tests for values nobody would change.

### Decision 3 — Arc conversion: endpoint→center, ≤90° cubics, reuse the C sampler

**Choice**: SVG 2 §B.2.4 endpoint-to-center parameterization (radii correction when `Λ > 1`; `rx==0 || ry==0` degrades to `L`; equal endpoints skip). Split `Δθ` into `ceil(|Δθ| / (π/2))` cubics with `k = (4/3)·tan(Δθᵢ/4)`, each fed to the **existing** 48-step cubic sampler (extracted as `emitCubic`). `A` takes 7 params; only `x,y` are relative under `a`; implicit continuation of `A` is `A`.

**Fail-loud contract**: the allowed command set is **`{M, L, H, V, Q, C, Z, A}` plus their lowercase relative forms**, matching the amended `letter-model` delta. `H`/`V` are supported because **`k.svg:90` uses `h 58.5`** — throwing on them would break `k` at load. The tokenizer and `isCmd` widen to the full alphabet `[MmLlHhVvCcSsQqTtAaZz]` so every command reaches `setCmd`; `S`/`T` throw `flattenPathD: unsupported path command "…"`. Any non-finite numeric token throws `flattenPathD: invalid numeric token "…"` (this also catches glued arc flags like `1-2.75`). `transformPathD`'s silent `default` becomes a throw.

**Sweep evidence**: across all 26 SVGs, `a/a` appears only in `i.svg:91` and `j.svg:91`; `h` only in `k.svg:90`; no `S`/`T` anywhere.

### Decision 4 — `f` is deferred (inert today)

**Evidence**: `f.svg:86` is a **single subpath** — f has no crossbar, so it has no pen lift and P4 does not apply to it today.

**Choice**: add `f` to `DEFERRED_SECONDARY_CHARS`. The governing rule is *defer when the secondary stroke is not the writing exit*: `x`'s second diagonal **is** the exit (immediate), `t`/`i`/`j`/`f` secondaries are not. Leaving `f` out would, the day a crossbar is authored, make the crossbar's right end the seam origin — geometrically wrong. Inertness is not asserted as self-evident: it is **pinned by a golden assertion on `f`'s `effectiveExit`** in `combinations.test.ts`, which will fail loudly if a future crossbar changes it.

## Data Flow

    d ──flattenPathD(M L H V C Q A Z)──→ points/starts ──reorderForWriting──→ resample ──adjustToRuledZone
                                                                                              │
                                                            splitMainTail(points, mainEndArc) ┤
                                                                    │                         │
                          buildLetterConfig ──→ segments[] + draw_path/segment ──→ TraceCanvas guide/demo
                          buildWord ─────────→ main/tail chunks ──→ seam (baseline | absorbed)

## File Changes

Rows marked † are **additions to the proposal's Affected Areas**, justified below the table.

| File | Action | Description |
|---|---|---|
| `client/src/letters/svgLetter.ts` | Modify | Arc→cubic, `H/V`, fail-loud, `emitCubic`, exported `splitMainTail`, `segments` + segmented timeline |
| `client/src/letters/combinations.ts` | Modify | Consume `splitMainTail`; absorbed seam branch |
| `client/src/letters/anchors.ts` † | Modify | `f` deferred; document the exit-vs-secondary rule |
| `client/src/letters/types.ts` † | Modify | `pathDefinition.segments?: string[]` |
| `client/src/canvas/TraceCanvas.tsx` | Modify | `guide?: string \| string[]`; `strokeLinejoin="round"` on demo + guide |
| `client/src/modes/{guidedTrace,freeTrace}.tsx` | Modify | Render `segments ?? [d]` as guide |
| `client/src/letters/*.test.ts` | Modify | Arc fixtures, gap assertions, seam goldens, `f` effectiveExit golden |

† `anchors.ts` is required by Decision 4 (the `f` deferral is a one-entry set change the proposal did not anticipate, because the proposal assumed `f` had a crossbar). `types.ts` is required by Decision 1 (the optional `segments` field must be declared on `LetterConfig.pathDefinition`). Both are small and inside the four existing work units — no new unit.

## Interfaces / Contracts

```ts
// svgLetter.ts — one segmentation source for solo and word rendering
export function splitMainTail(
  points: Point[], mainEndArc: number | undefined, fallbackExit?: Point,
): { main: Point[]; tail: Point[] }

// types.ts — present only when mainEndArc is present
segments?: string[]
```

## Review Budget

| Unit | Files | Est. changed lines |
|---|---|---|
| P1 arc + fail-loud | `svgLetter.ts` | ~90 |
| P2 hybrid seam | `combinations.ts` | ~30 |
| P3 round joins | `TraceCanvas.tsx` | ~10 |
| P4 segmentation | `svgLetter.ts`, `types.ts`, `anchors.ts`, modes, `TraceCanvas.tsx` | ~70 |
| Tests + regenerated goldens | `*.test.ts` | ~300 |
| **Total** | | **~500 (range 500–650)** |

Fits the 800-line budget with headroom. Golden regeneration for `b e o v w` seams is the dominant and least predictable term; if it overruns, P2 splits off as the natural chained slice.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Arc→cubic vs. analytic circle; `k`'s `h`; `S` and NaN tokens throw | `svgLetter.test.ts` fixtures |
| Unit | `splitMainTail` boundary equals `cutAtArc`; solo `segments` for `t i j x`, absent for `a c f` | New assertions |
| Unit | Baseline seam goldens byte-identical; absorbed seam `dy === 0`; `f` effectiveExit golden | `combinations.test.ts` |
| Integration | All 26 SVGs load with no throw and no `NaN` in any config | Registry sweep test |
| Manual | Visual QA per exit kind before locking goldens | `npm run dev` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration. `segments` is additive and optional; configs are rebuilt at Vite transform time.

## Open Questions

- [ ] `i`'s dot sits at y≈250 in a `media` zone, so the whole-bbox fit shrinks the body below x-height. Pre-existing normalization behavior, out of this change's scope — confirm at visual QA.
