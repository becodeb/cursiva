# Design: Cursive Letter Paths

## Technical Approach

Extend the pure `svgLetter.ts` pipeline (flatten → reorder → resample → fit → checkpoints/ideal) with: (1) multi-subpath classification (main = subpath nearest the entry anchor; secondaries after), (2) anchor metadata driving anchor-aware diagnostics, (3) `t` → `alta`. Pipeline-internal — TraceCanvas untouched (fixed guide lines).

## Architecture Decisions

| # | Option vs alternative | Tradeoff | Decision |
|---|-----------------------|----------|----------|
| 1 | type fields vs sidecar map | type field meets delta spec; seeds + 2 fixtures | `LetterConfig.anchors: LetterAnchors` REQUIRED, built from fitted main start/end |
| 2 | new `anchors.ts` vs inline | separate module testable; inline grows a 743-line file | new `client/src/letters/anchors.ts` |
| 3 | inside `reorderForWriting` vs separate pass | classification IS the writing-order decision | inside `reorderForWriting`; exported pure `classifySubpaths` for direct tests |
| 4 | bbox bottom-left vs real anchor coords | proxy is char-independent, pre-fit; body owns minX/maxY | proxy = (minX, maxY) of all points; `mainEndArc` survives resample+fit (`endArc = mainEndArc * scaleX`) |
| 5 | warn all multi-subpath vs suppress declared | dot/cross jumps are intentional pen lifts | `hasGaps` computed; warn only if `!SECONDARY_STROKE_CHARS.has(character)` |
| 6 | full-path bbox vs MAIN bbox + exit kind | a dot must not shift the exit corner | start: main start vs MAIN bbox (minX,maxY); end vs corner per kind: baseline (maxX,maxY), top (maxX,minY), mid (maxX,midY); tolerance 80px |
| 7 | full concat vs main-only | dot/cross belong to the letter; child traces the pen-lift | full concatenation; no marker info (escape hatch: `penLiftAfter` flag) |
| 8 | const change vs refactor | all consumers key off the zone already | `MEDIA_CHARS` drops t, `ALTA_CHARS` gains it |

## Classification Algorithm

```ts
entryRef = { x: min(all x), y: max(all y) }     // bbox bottom-left
mainIdx  = argmin dist(subpath[i][0], entryRef) // ties: longer polyline, then file order
return [mainIdx, ...remaining]                   // main first, secondaries after
// reorderForWriting concatenates in that order; mainEndArc = arc length to main's
// last point. Post-fit main end = pointAtArcLength(fitted, mainEndArc * fit.scaleX).
```

## Data Flow

```
b.svg…z.svg ─(glob)→ loadSvgLetters ─extractPathD (1st <path>)→ d
d ─flattenPathD→ {points, starts} ─reorderForWriting (⊇ classifySubpaths)→ ordered, hasGaps, mainEndArc
  ─resample→ ─adjustToRuledZone(zone)→ fitted
  ─anchor-aware diagnostics (main span, per-letter exit corner)→ warn?
  ├─ anchors ← main start / pointAtArcLength(mainEndArc·scale)
  └─ pathFromPoints → d · checkpoints · ideal → LetterConfig
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `client/src/letters/anchors.ts` | Create | `ExitKind`, `EXIT_BY_CHAR` (o r v w→top, e→mid, default baseline), `SECONDARY_STROKE_CHARS` (i j t f x), `exitKindFor` |
| `client/src/letters/types.ts` | Modify | `LetterAnchors`; required `anchors` on `LetterConfig` |
| `client/src/letters/svgLetter.ts` | Modify | zones (t→alta); `classifySubpaths`; `reorderForWriting` returns `mainEndArc`; anchor-aware diagnostics; gap-warn suppression; populates `anchors` |
| `client/src/letters/svgLetter.test.ts` | Modify | t-zone (line 127); new classification / diagnostics / anchors suites |
| `client/src/letters/registry.test.ts` | Modify | exact-keys assertion → presence (26 SVGs land) |
| `client/src/letters/letra_a.ts`, `letra_c.ts`; `modes/modes.test.ts`, `canvas/devCheckpointState.test.ts` | Modify | seeds + synthetic fixtures gain `anchors` |
| `client/src/letters/svg/README.md` | Modify | rewrite guide: 26-letter table, zone map (t alta), secondary strokes, "only the `d` matters" |
| `client/src/letters/svg/{b…z}.svg` | Create | 25 user-authored letters (`a.svg` exists, complies) |

## Interfaces / Contracts

```ts
// types.ts — viewBox space
export interface LetterAnchors { entry: Point; exit: Point }
// LetterConfig gains: anchors: LetterAnchors

// anchors.ts
export type ExitKind = 'baseline' | 'top' | 'mid'
export const SECONDARY_STROKE_CHARS: ReadonlySet<string>
export function exitKindFor(char: string): ExitKind

// svgLetter.ts
export function classifySubpaths(points: Point[], starts: number[]): number[]
export interface ReorderedPath { points: Point[]; hasGaps: boolean; mainEndArc: number }
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Classification | dot-first 'i' fixture → body MAIN, dot after; tie → longer main; equal → file order |
| Unit | Diagnostics | spy `console.warn`: o/r/v/w/e at anchors → no warn; 'a' ending top-right → warn; wrong start → warn; 'i' dot jump → no gap warn; 'a' 2-subpath → gap warn (existing test stays green) |
| Unit | Zones / Anchors | `resolveBaselineZone('t')` = 'alta'; media loop drops t; 'a' exit ≈ bottom-right of main bbox, 'o' ≈ top-right, 'e' ≈ mid-right, entry ≈ baseline-left |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary (pure frontend data pipeline; no applicable rows).

## Migration / Rollout

No data migration. `t` resolves `alta` via the const move; no `t.svg` exists yet. `registry.test.ts` lands with the SVGs. Delta merges at archive (destructive Kalam removal → archive warns).

## Open Questions

- [ ] Seed `anchors` values for `letra_a`/`letra_c` — derive from ductus bbox in apply; check vs `pathEndpoints`.
- [ ] `x` second diagonal ductus validated against the first real `x.svg` in verify.