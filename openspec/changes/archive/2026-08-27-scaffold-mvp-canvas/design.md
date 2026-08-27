# Design: scaffold-mvp-canvas

## Technical Approach

Validation slice (proposal "Approach"): Vite+React+TS under `client/`, npm-workspaces monorepo (`server/` later). Data-driven `LetterConfig` (docs/07), SVG `viewBox 0 0 1000 600` canvas, Pointer Events via `getScreenCTM().inverse()`, perfect-freehand ink (render-only), release-time evaluation over `Point[]` (docs/02 order/continuity/avg-distance, TOLERANT). Progress: localStorage behind interface.

## Resolved DESIGN-FIXED Values

| Open value | Decision | Rationale |
|---|---|---|
| `a` radii (orders 1–6) | 40, 40, 45, 40, 35, 45 | TOLERANT (risk #1): `c`-range 35–45. Cresta=cierre co-located → equal 40, order-gated; retorno/gancho 45 (sweeps); pie 35 (oval anchor). |
| TolPen/TolTouch/Approval | 12 / 18 / 70 | Corrected spec formula (×100): Σdist=320 → 100−100·320/1152 = 72.2 ≥ 70 (touch); → 100−100·320/768 = 58.3 < 70 (pen). Spec = arithmetic authority; 18 = 12×1.5. |
| K | 64 | 12–15px spacing ≪ min radius 35; runs once per release. |
| Progress % | Monotonic best-of: `max(stored, clamp(score))` | Mastery, not last attempt; bloom stable once achieved; spec scenarios unaffected. |
| Bloom threshold | 100 per family letter | Derived on load + on change. |
| `zonasValidas` | Dropped (confirmed) | docs/07 `baselineZone` supersedes docs/02; no contradiction. Both seeds `'media'`. |

## Architecture Decisions

| Decision | Choice / Rationale |
|---|---|
| Monorepo | npm workspaces, `client/` only; `server/` drops in later. |
| perfect-freehand | Render-only: `getStroke` never mutates captured `Point[]` (spec). |
| Evaluation model | `Point[]` index-paired after resample to K (paths can't drive order/score; docs/02 formula). |
| Ideal `a` path | Author `d` visiting all 6 points in order (350,420 → apex → 330,300 → apex → 480,420 → 550,400): docs/02 `pathBézier` never revisits apex yet `cierre_ovalo`(4)=cresta — literal reuse breaks ascending-indices scenario. **Flagged docs/02 deviation.** |
| Score registration | Translate `User[0]`→`Ideal[0]`; else start offset (~20px ≈ 0) defeats criterion 3. Spec formula unchanged — extension. |
| Demo | framer-motion `pathLength` 0→1; ready at max(delay+duration)+200ms. |
| Feedback | Web Audio tone + SVG star placeholder; `soundEffectUrl` deferred. |
| `a` timeline | Simplified analog of `c` (tint → draw_path → fade). |

## Module Structure (all Create — greenfield)

```
client/  package.json · vite.config.ts · tsconfig.json · index.html
└─ src/
   ├─ main.tsx · App.tsx
   ├─ letters/  types.ts · registry.ts · letra_a.ts · letra_c.ts
   ├─ canvas/   TraceCanvas.tsx · useTraceInput.ts · ink.ts · resample.ts
   │   └─ validation/  constants.ts · checkpoints.ts · continuity.ts · score.ts
   ├─ modes/    guidedTrace.tsx · freeTrace.tsx · tone.ts · StarFeedback.tsx
   ├─ progress/ ProgressStore.ts · LocalProgressStore.ts
   └─ screen/   MainScreen.tsx · Bloom.tsx
public/assets/themes/  mar_ola_a.svg · mar_ola_c.svg · star.svg
```

## Data Flow

```
pointer (primary, touch-action:none) → getScreenCTM().inverse() → Point[] ref
  guided: O(1) radius check/point → hint;  free: none during move
pointerup → resample(64) → order + continuity + score (pointerType tolerance)
  (no movement ⇒ skip; pointercancel ⇒ discard)
→ feedback (tone+star | rescue) → setProgress(max) → screen refresh → Bloom re-derives
```

Storage: `localStorage["cursiva.progress.v1"]` = `{"a":85,"c":40}`; corrupt ⇒ empty map, overwritten; unavailable ⇒ in-memory Map.

## Mode State Machine

`demo (input ignored) → ready → rail complete → free (drawing) → release → feedback → clear (next pointerdown)`; app-level `demo → rail → free → feedback → progress`. demo→ready at max(delay+duration)+200ms; ready→free only after all checkpoints activated in order; approval persists progress.

## 60fps Strategy

- Points in a ref, no setState per move; ink `<path d>` updated once per frame (rAF).
- No resample/validation during move (guided: only O(1) radius checks).
- `touch-action: none`; single path mutation; `getStroke` sub-ms on ≤ few-hundred points.
- Full evaluation exactly once per release — outside the frame loop.

## Interfaces / Contracts

```typescript
LetterCheckpoint {x;y;order;radius;name?} · LetterConfig {id;character;family;baselineZone;theme;
  pathDefinition{d;strokeWidth;checkpoints};animationTimeline} · TraceResult{points;resampled|null;pointerType}
EvaluationResult {orderPassed;isContinuous;score;approved;wrongDirection;activated[]} · ProgressStore{getProgress;setProgress}
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (vitest) | resample (64, equidistant, empty); checkpoints (order, clockwise fails, skip); score (100, clamp, 5px ≥70 / pen <70, empty); seeds/registry (verbatim `c`, keystone `a`, ascending); LocalProgressStore (round trip, clamp, isolation, monotonic, corrupt, fallback) | First vitest runner in repo (config note unchanged); `"test"` script in client/package.json; mocked localStorage |
| Device checklist (manual) | ~60fps ≤17ms avg frame; multi-pointer ignored; pointercancel clears; touch ergonomics | Verify-phase checklist (vitest can't measure device frame time) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

None (greenfield); rollback = delete `client/` + archive change.

## Open Questions

None — all DESIGN-FIXED values resolved.

## Design-vs-Spec Flags (Risks)

1. Authored `a` path deviates from docs/02 `pathBézier`; satisfies letter-model scenario — spec unchanged.
2. Start-point registration extends scoring input; droppable.
3. Monotonic progress extends `setProgress`; store scenarios hold.
4. `a` radii within spec's band.
5. docs/02 renders the formula without the ×100 factor; the spec now carries it. Decision: spec = arithmetic authority; score normalized to the 0–100 percentage scale.