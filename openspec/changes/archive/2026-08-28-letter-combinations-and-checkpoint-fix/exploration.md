# Exploration: Letter Combinations & Checkpoint Fix (`letter-combinations-and-checkpoint-fix`)

> Research for three linked requests on the cursive-handwriting MVP: (1) a **backtrack
> checkpoint bug** on reentrant letters like `c`, (2) **letter combinations** for the demo
> animation to flow stroke-to-stroke, and (3) a **non-dev checkpoint toggle** on the canvas.
> Artifact store mode: **openspec** (filesystem only). All coordinates/behaviour verified
> against `client/src/...` as of this session.

Local ruled-line reference (viewBox `0 0 1000 600`, Y down): top 180 · middle 300 · baseline 420 ·
descender 540. `client/src/letters/svgLetter.ts` fits every hand-drawn single-subpath SVG onto a
ruled zone; `LETTER_REGISTRY` ships `a`–`f` as single-subpath Inkscape SVGs (override the Kalam
seeds `letra_a`/`letra_c`, which are closed contours and are NOT ductus). The MVP canvas runs one
`LetterConfig` at a time through `GuidedTrace`/`FreeTrace`.

---

## 1. Backtrack checkpoint fix — feasibility & algorithm

### Current algorithm (`client/src/canvas/validation/checkpoints.ts`)
Activation fires only on a **fresh outside→inside ENTRY** into the *expected* order. A checkpoint
whose zone the head is already inside (no fresh entry) never activates. `wrongDirection` latches
on any fresh entry into a still-pending, ahead-of-expected zone (with a `benignReentry` carve-out
for already-activated zones). `orderPassed = N>0 && !wrongDirection && activated.length === N`.
This is correct for the clockwise-`a` failure, but it **breaks reentrant paths**: if the head is
inside checkpoint *n*'s zone *before* it reaches checkpoint *n−1* (the backtrack/bounce case), no
fresh entry into *n* ever occurs, so *n* never activates and `wrongDirection` latches.

### Verified fix — Candidate A (containment activation + reset on full pass)
Switch activation from "fresh entry of expected order" to **containment of the expected order**
(activate the moment the head is *inside* the expected zone, fresh entry or not). Keep the
`wrongDirection` latch rule (fresh entry into a pending-ahead zone, `benignReentry` carve-out), but
make `orderPassed` depend **only** on strict-order full activation (`activated.length === N`), and
**reset `wrongDirection` to false when the full pass completes**.

Only the *expected* order ever activates, which **preserves co-located / overlapping-zone
semantics**: a simultaneously-entered future zone (the `letra_a` entry/cierre pair sharing
center `467.8,413.2`) is ignored — exactly the existing order-gated carve-out, now implicit and
more robust. Adjacent svgLetter-generated disks overlap by only ~9px (radius≈49.5, segment≈90),
so no mis-activation: only the expected order activates, and expected advances monotonically.

### Proof against the 10 existing `checkpoints.test.ts` cases (all return IDENTICAL results)
| Test | Old result | New result | Same? |
|------|-----------|-----------|-------|
| natural `a` (1→6) | pass, `[1..6]` | pass, `[1..6]` | ✓ |
| ascending centers | pass, `[1..6]` | pass, `[1..6]` | ✓ |
| reversed (clockwise) | fail, `wrong=true` | fail, `wrong=true` (activated `[1,2]`≠6 → no reset) | ✓ |
| skipped cresta | fail, `wrong=true` | fail, `wrong=true` | ✓ |
| partial (1,2) | fail, `wrong=false`, `[1,2]` | fail, `wrong=false`, `[1,2]` | ✓ |
| out-of-order start | fail, `wrong=true` | fail, `wrong=true` (activated `[1,2]`≠6) | ✓ |
| co-located loop | pass, `[1..6]` | pass, `[1..6]` | ✓ |
| real `a` ductus coverage (geometry) | — | unaffected | ✓ |
| benign re-entry | pass, `wrong=false`, `[1..6]` | pass, `wrong=false`, `[1..6]` | ✓ |
| empty inputs | `{false,false,[]}` | `{false,false,[]}` | ✓ |

Key reasoning for the tricky ones: reversed (1) starts inside the co-located entry+cierre zone →
activates 1 (expected) and skips wrong-direction at that point; later only `[1,2]` activate so the
reset never fires → still fails. Benign re-entry re-enters already-activated zones (`≤maxActivated`)
→ never sets `wrongDirection`. **No existing test changes.**

### Proof of the `c` backtrack scenario (concrete model)
Checkpoints: `cp1(400,405,r42)[o1] cp2(442,265,r42)[o2] cp3(450,330,r60)[o3] cp4(505,403,r40)[o4]`.
Stroke: `(392,410)→(420,335)→(432,290)→(448,280)→(460,305)→(468,330)→(485,390)`.
- **Old code**: P0 activates cp1. At P1 the head enters cp3 (r60 overlaps the up-stroke) while
  expected=2 → `wrongDirection=true` latches. cp2 activates at P2 (expected=2, co-located with cp3).
  cp3 and cp4 are *already inside their zones* by the time expected reaches them, so **no fresh
  entry → they never activate**. Result: `activated=[1,2]`, `orderPassed=false`, `wrongDirection=true`.
  (Matches the reported bug: cp3 never registers, latch set.)
- **New code**: P0 activates cp1. P1 sets `wrongDirection` (cp3 entered ahead) but does **not** block.
  P2 activates cp2. P3 (head inside cp3, expected=3) → **activates cp3 by containment**. P6 (head
  inside cp4, expected=4) → activates cp4. `activated=[1,2,3,4]` = all N → `orderPassed=true`,
  `wrongDirection` **reset to false**. ✅ Fixed.

### Edge checks
- **Stroke starts inside zone 1** (expected=1): first point is a fresh entry (inside[ ] init false),
  so containment activates 1 immediately — correct.
- **Co-located `letra_a` entry/cierre (same center, r50)**: natural loop activates 1 at start, 6
  only when expected reaches 6 at the end. No premature 6. Containment does **not** break
  entry-order semantics — it removes the fragile explicit carve-out.
- **Overlapping adjacent disks** (svgLetter): only the expected order activates, so overlap never
  causes a too-early activation.
- `wrongDirection` is **latched-then-reset-on-full-pass** (not live): it reads as the latched value
  during a partial trace, and is cleared only when every checkpoint activated in order.

### Recommended algorithm (code sketch)
```ts
export function checkCheckpointOrder(points, checkpoints): CheckpointOrderResult {
  const sorted = byOrder(checkpoints)        // ascending; orders contiguous 1..N
  const N = sorted.length
  const activated: number[] = []
  const inside = new Array<boolean>(N).fill(false)
  let expectedOrder = 1
  let maxActivated = 0
  let wrongDirection = false
  for (const p of points) {
    const entered: number[] = []
    for (let i = 0; i < N; i++) {
      const cp = sorted[i]
      const nowInside = dist(p, cp) <= cp.radius
      if (nowInside && !inside[i]) entered.push(cp.order)
      inside[i] = nowInside
    }
    if (entered.length === 0) continue
    // CONTAINMENT activation: head inside the expected zone, fresh entry or not.
    // Only the expected order activates → co-located/overlap pairs stay order-gated.
    const expIdx = expectedOrder - 1
    if (expectedOrder <= N && inside[expIdx]) {
      activated.push(expectedOrder)
      maxActivated = Math.max(maxActivated, expectedOrder)
      expectedOrder += 1
      continue
    }
    // Wrong-direction latch: fresh entry into a pending, ahead-of-expected zone.
    const benignReentry = entered.some((o) => o <= maxActivated)
    if (!benignReentry && entered.some((o) => o > expectedOrder)) wrongDirection = true
  }
  const allInOrder = activated.length === N   // strictly 1..N by construction
  return {
    orderPassed: allInOrder,
    wrongDirection: allInOrder ? false : wrongDirection, // reset on full pass
    activated,
  }
}
```
**Existing tests changed: NONE** (add one new `c`-backtrack case — does not alter existing ones).

---

## 2. Letter combinations design

### Invariant (verified in `svgLetter.ts::buildLetterConfig`)
For **single-subpath** letters the stored `d = pathFromPoints(fitted.points)` (open polyline) and
`anchors.exit = pointAtArcLength(fitted, mainEndArc)` = the **last fitted point**, `anchors.entry =
fitted.points[0]`. Hence `d`'s first point == `entry` and `d`'s last point == `exit`. (Registry `a`–`f`
are svg-generated single-subpath ductus, so this holds for them; the Kalam seed `letra_a`/`letra_c`
are closed contours and must NOT be used for combination.)

### `buildCombination(letters: LetterConfig[]): LetterConfig`
1. Guard: every input MUST be single-subpath (count `M` commands in its `d` ≤ 1) and share one
   `baselineZone`; otherwise throw / fall back to single-letter (multi-subpath letters
   `i,j,t,f,x` are **out of scope** — see Risks).
2. For `i = 1..n-1`, translate letter *i* by `dx = prevExit.x − entry_i.x`, `dy = prevExit.y −
   entry_i.y` where `prevExit` is letter *i−1*'s exit. Apply the same `(dx,dy)` to: `d` (use
   `transformPathD(d,1,1,dx,dy)` — handles `M/L/C/Q`, robust for any future curve d), every
   `checkpoint` `{x,y}`, every `ideal` tuple `[x,y]`, and `anchors.entry/exit`.
3. Concatenate: `d = d₀ + " " + d₁ + …`; renumber checkpoints globally by offsetting each letter's
   `order` by the running cumulative count; `ideal` = concat of translated clouds; `checkpoints` =
   concat (renumbered); `anchors` = `{ entry: letter₀.entry, exit: letterₙ₋₁.exit }`.
4. **One** `draw_path` step: `delay: 1000, duration: 2600 * n`. `slide_in` from letter 0; `fade_out`
   `delay: 1000 + 2600*n + 200, duration: 600`. `family: 'enlazada'`, `baselineZone` = shared zone,
   `theme` = letter 0's.
5. Seam continuity proof: end of letter *i* `d` = `exit_i`; start of translated letter *i+1* `d` =
   `entry_{i+1} + (exit_i − entry_{i+1}) = exit_i`. The two endpoints coincide → the concatenated
   `d` is a **continuous stroke through the seam with NO connector segment needed**. The demo
   `motion.path` `pathLength 0→1` then fluidly draws letter→letter.

### Integration with existing modes (no mode changes for combo shape)
`GuidedTrace`/`FreeTrace` consume a `LetterConfig` and read `animationTimeline`'s first `draw_path`
step + `checkpoints` + `ideal`. A combo *is* a `LetterConfig`, so the demo and evaluation work
unchanged. `freeTrace.evaluateTrace` ANDs `checkCheckpointOrder` (now over the globally-renumbered
combo checkpoints) + `checkContinuity` + score against the combo `ideal` cloud → naturally correct.

### Caveats / guards
- **Multi-subpath letters** (`i,j,t,f,x`): `exit` is the main end but `d` ends at the dot → seam
  would **jump**. Guard: refuse combo membership for any letter whose `d` has >1 `M`. (Initial MVP
  scope = `a`–`f`, all single-subpath.)
- **Zone alignment**: combos assume identical `baselineZone`; mixing `alta`/`baja`/`media` misaligns
  vertically — guard or extend per-letter fit.
- **Duration growth**: `2600*n` for large `n` is long; cap combo length (MVP: 2 letters, maybe 3).

---

## 3. Checkpoint toggle design

Minimal prop threading, dev overlay reused for non-dev display:
- `TraceCanvas` gains `showCheckpoints?: boolean`. Overlay gate becomes
  `overlayOn = (isDevMode() || showCheckpoints) && !!devCheckpoints && !!devIdeal`.
- `GuidedTrace` and `FreeTrace` accept `showCheckpoints` and pass it to `TraceCanvas` (they already
  pass `devCheckpoints`/`devIdeal`, which the overlay needs).
- `MainScreen` holds `showCheckpoints` state and renders a toggle button. Spanish UI label per the
  existing copy language, e.g. **"Mostrar puntos del trazo"** (or "Ver puntos clave"). The button
  sits in the nav/header area; its state is threaded into `start()` / both mode mounts.
- The existing `DevCheckpointOverlay` already renders lit circles + order numbers; for a non-dev
  child view it is sufficient. Optional sub-decision: hide the live `%` score line when not dev
  (keep it dev-only) so the child sees only the checkpoints.

No new validation logic — purely a presentation gate reusing `devCheckpointState`/`DevCheckpointOverlay`.

---

## 4. Scope, risks, out-of-scope

### File list (estimated changed/added lines; review budget 800, single PR)
| File | Change | ~Lines |
|------|--------|-------|
| `client/src/canvas/validation/checkpoints.ts` | rewrite activation block (containment + reset) | ~15 |
| `client/src/letters/combinations.ts` (**NEW**) | `buildCombination` + subpath/zone guards | ~100 |
| `client/src/letters/registry.ts` | `COMBO_REGISTRY` built from `a`–`f` (e.g. `combo_ac`) | ~30 |
| `client/src/canvas/TraceCanvas.tsx` | `showCheckpoints` prop + overlay gate | ~6 |
| `client/src/modes/guidedTrace.tsx` | thread `showCheckpoints` | ~3 |
| `client/src/modes/freeTrace.tsx` | thread `showCheckpoints` | ~3 |
| `client/src/screen/MainScreen.tsx` | toggle button (ES label) + combo nav group + threading | ~30 |
| `client/src/canvas/validation/checkpoints.test.ts` | **add** `c`-backtrack case (existing untouched) | ~20 |
| `client/src/letters/combinations.test.ts` (**NEW**) | seam continuity + renumber + single-subpath guard | ~50 |
| `openspec/specs/trace-validation/spec.md` | delta: reentrant scenario + `wrongDirection` reset note | ~15 |
| **Total** | | **~270** |

### Risks
1. **Leniency from `wrongDirection` reset**: a trace that briefly overshoots a future zone but still
   hits every checkpoint in order now PASSES. Pedagogically acceptable (it is exactly the reentrant
   `c` case), but it softens criterion-1 "mechanical fail". Mitigation: reset only on full strict
   pass; a genuine reversal still fails (never activates all in order). **Spec delta required.**
2. **Combo seam on multi-subpath letters** would jump — must enforce the single-subpath guard; MVP
   scope limited to `a`–`f`.
3. **Zone mixing** in future combos misaligns vertically — guard same `baselineZone` (or extend fit).
4. **Combo demo duration** `2600*n` grows fast — cap `n` (MVP: 2).
5. **`transformPathD` rounding** (2 decimals) must match the `ideal`/`checkpoints` offset rounding so
   the visible checkpoint sits exactly on the drawn seam.
6. **Non-dev overlay cosmetic**: the overlay's live `%` score line may be undesirable for children —
   hide when `!isDevMode()`.

### Explicitly OUT of scope
- New letters beyond `a`–`f`; connector **Bézier curves** between letters (we use the direct seam,
  no connector segment); **chained PRs** (single PR per budget); word mode / uppercase / digits;
  combos of multi-subpath letters (`i,j,t,f,x`); stroke-width blending at seams; changes to
  `continuity`/`score` tolerances for combos.

---

## Structured Analysis (return format)

**Current State**: `checkCheckpointOrder` activates only on fresh outside→inside entry of the
expected order, so reentrant letters (`c`) fail at a backtrack checkpoint and latch `wrongDirection`.
Combinations are unimplemented; `d` endpoints equal entry/exit only for svg-generated single-subpath
letters. The checkpoint overlay is dev-only (`isDevMode() && devCheckpoints && devIdeal`).

**Affected Areas**:
- `client/src/canvas/validation/checkpoints.ts` — activation algorithm (backtrack fix).
- `client/src/letters/combinations.ts` (new) — `buildCombination`.
- `client/src/letters/registry.ts` — combo registry entries.
- `client/src/canvas/TraceCanvas.tsx` — `showCheckpoints` prop + overlay gate.
- `client/src/modes/guidedTrace.tsx`, `client/src/modes/freeTrace.tsx` — thread `showCheckpoints`.
- `client/src/screen/MainScreen.tsx` — toggle button (ES) + combo nav + threading.
- `openspec/specs/trace-validation/spec.md` — reentrant scenario delta.

**Approaches**:
1. *(Recommended — backtrack)* Containment activation (activate expected order while head is inside
   its zone) + `orderPassed` from full strict-order activation + `wrongDirection` reset on full pass.
   Pros: fixes `c` backtrack, **zero existing tests change**, simpler co-located handling. Cons:
   slightly more lenient on transient overshoots (spec delta needed). Effort: Low.
2. *(Backtrack alt)* Keep entry semantics but inject a synthetic "re-entry" when head approaches a
   pending checkpoint center. Pros: preserves strict wrongDirection. Cons: ad-hoc, more code, still
   risks the co-located pair, harder to verify. Effort: Med. → rejected in favour of Approach 1.
3. *(Combinations)* Translate + concatenate single-subpath ductus `d`/`checkpoints`/`ideal`/`anchors`
   with global renumber + one `draw_path`. Pros: no connector needed, reuses all mode logic. Cons:
   needs single-subpath guard. Effort: Med.
4. *(Toggle)* Reuse `DevCheckpointOverlay` behind `(isDevMode() || showCheckpoints)`. Pros: tiny
   change, no new rendering. Cons: optional score-line cleanup. Effort: Low.

**Recommendation**: Adopt Approach 1 (backtrack), Approach 3 (combinations), Approach 4 (toggle) as
one change. The backtrack fix is containment + reset; combinations build a `LetterConfig` the modes
already consume; the toggle is a pure presentation gate.

**Risks**: (1) leniency/spec delta; (2) multi-subpath seam jumps → guard; (3) zone mixing; (4) demo
duration; (5) rounding match; (6) overlay score-line cosmetic. None blocking.

**Ready for Proposal**: Yes — one decision for the orchestrator to surface: **combo length cap for
the MVP (recommend 2 letters, e.g. `ac`, `ca`)** and confirm the Spanish toggle label
("Mostrar puntos del trazo").

---

## Sources
- Local: `client/src/canvas/validation/checkpoints.ts`, `checkpoints.test.ts`, `devCheckpointState.ts`,
  `devCheckpointState.test.ts`, `devCheckpointOverlay.tsx`, `devMode.ts`,
  `client/src/letters/svgLetter.ts`, `types.ts`, `anchors.ts`, `registry.ts`, `letra_a.ts`,
  `letra_c.ts`, `svg/{a,c}.svg`, `client/src/modes/guidedTrace.tsx`, `freeTrace.tsx`,
  `client/src/screen/MainScreen.tsx`, `client/src/canvas/TraceCanvas.tsx`,
  `openspec/specs/trace-validation/spec.md`, `openspec/changes/archive/2026-08-27-cursive-letter-paths/exploration.md`.
