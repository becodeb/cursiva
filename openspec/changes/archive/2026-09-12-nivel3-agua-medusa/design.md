# Design: Nivel 3 — Water, Jellyfish and U Movements

Binding inputs: `proposal.md` §Decisions (D1–D7) and `explore.md`. Neither is reopened.
Every file:line below was re-verified against the working tree; where `explore.md` was off by a
fact, the correction is marked **[corrected]**.

## Technical Approach

Nothing in the trace engine changes shape. The change is one split, two new pure generators,
two optional `LevelConfig` fields, one optional canvas prop, one migration and four level
literals:

1. `isDetectiveTrail` splits into two exported predicates in a new module, `levels/world.ts`,
   where the world flag can only WIDEN — never subtract from — case membership;
2. `paths.ts` gains `garlandVaried()` (per-cycle `{width, depth}`) and `uTurnRadius()`, the
   arithmetic that makes the ideal band's one real constraint assertable;
3. `LevelConfig` gains `detectiveWorld?`, `goalArt?`, `hazardArt?` — all optional, all
   absent-means-today's-behaviour;
4. `TraceHazards` gains an optional `art`, with the bare `<circle>` kept as a **separate,
   untouched** JSX branch so `trail1` renders byte-identically;
5. `game/migrateNivel3.ts` in `migrateDuckCase.ts`'s exact three-part shape, shipped first;
6. four `LevelConfig`s between `f2-guirnalda` and `f2-colinas`, one of which IS `f2-guirnalda`.

The governing constraint is the harness: vitest 4 on the **node** environment, no jsdom. A
decision inside a handler or a `setState` updater cannot be observed. So every decision this
change introduces is a **named exported pure function** — `isCaseTrail`, `inDetectiveWorld`,
`garlandVaried`, `uTurnRadius`, `hazardGapFraction`, `migrateNivel3`. No `url(#…)`. No new
dependency.

---

## 1. The world / case split

### Decision: two predicates, one new field, and the field can only widen

**Choice**: a new module whose entire content is the seam.

```ts
// client/src/levels/world.ts — pure, no React, no `detective/` import
import type { LevelConfig } from './types'

/** This level belongs to a DetectiveCase: it carries a clue mark, files into
 *  the PISTAS rail, and can route to a deduction. `!!level.clue` under its
 *  real name — `LevelPlay.tsx:633`'s old `isDetectiveTrail`, unchanged. */
export function isCaseTrail(level: Pick<LevelConfig, 'clue'>): boolean {
  return !!level.clue
}

/** This level is DRAWN IN the detective world: grass and trodden earth, the
 *  octopus standing at the start with the glass on its tentacle, mud ink, the
 *  wordless shell, no result block and therefore no three stars (D6).
 *
 *  A case trail is ALWAYS in the world; the reverse is not true, and Nivel 3
 *  is the first thing in the app that needs it that way (D1). `detectiveWorld`
 *  can only WIDEN this: `detectiveWorld: false` on a level that carries a clue
 *  still returns true, so the flag can never accidentally strip a case trail
 *  of the world it lives in. That is the type-level half of what makes the
 *  split safe to roll back. */
export function inDetectiveWorld(
  level: Pick<LevelConfig, 'clue' | 'detectiveWorld'>,
): boolean {
  return isCaseTrail(level) || level.detectiveWorld === true
}
```

`LevelConfig` gains `detectiveWorld?: boolean`.

**Alternatives considered**: deriving the world from `goalArt`'s presence; an id list in
`LevelPlay`; a `world: 'plain' | 'detective'` union.

**Rationale**: `level.clue` is already the SOLE discriminator (`LevelPlay.tsx:633`), and the
whole point of D1 is that the two ideas stop being one field — so the second idea needs a
second field, not a second reading of the first. Deriving from `goalArt` would make "the
medusa is drawn here" and "the ground is grass here" the same statement, which is exactly the
bundling this change exists to undo; an id list puts the catalog's content inside the screen.
The boolean beats the union because there is only one world and `docs/11` describes it as one
continuous place across Niveles 2–4 — a union with one member is a promise nothing has
made.

### Every consumer, enumerated before conversion

`isDetectiveTrail` is read in exactly one module (`rg isDetectiveTrail client/src` →
`LevelPlay.tsx` only, plus two stale comments and one doc line). All 24 sites:

| `LevelPlay.tsx` | Gated behaviour | Owner |
|---|---|---|
| `:633` | the definition | **deleted**, replaced by the two calls |
| `:949`, `:977` (dep) | trail-end lamp latch (`setTrailLampOn`) | `isCaseTrail` |
| `:1162` | `<PistasRail>` mount | `isCaseTrail` |
| `:1234` | `endArt` lamp on/off | `isCaseTrail` (now under §5's `goalArt` branch) |
| `:1097`, `:1112` (dep) | grass/mud ground scatter | `inDetectiveWorld` |
| `:1133`, `:1135` | back control: icon + `aria-label` | `inDetectiveWorld` |
| `:1141` | the `<h1>` title | `inDetectiveWorld` |
| `:1150` | the `cv-hint` sentence | `inDetectiveWorld` |
| `:1155` | the rotate prompt | `inDetectiveWorld` |
| `:1222` | `startArt` — the standing octopus | `inDetectiveWorld` |
| `:1243` | direction-arrow suppression | `inDetectiveWorld` |
| `:1259` | carrier rest offset (`GLASS_REST_DX/DY`) | `inDetectiveWorld` |
| `:1270` | `carrierArt` — the fingertip glass | `inDetectiveWorld` |
| `:1271` | `inkOnly` | `inDetectiveWorld` |
| `:1275`, `:1276` | `MUD_INK` / `MUD_INK_DIM` | `inDetectiveWorld` |
| `:1295` | the whole `.cv-result` block — pillars, coach, **and the three stars** (D6) | `inDetectiveWorld` |
| `:1338`, `:1340` | "Borrar" icon + name | `inDetectiveWorld` |
| `:1347`, `:1349` | "Ver de nuevo" icon + name | `inDetectiveWorld` |
| `:1356` | "Ver la guía" suppression | `inDetectiveWorld` |
| `:1366`, `:1368` | "Siguiente" icon + name | `inDetectiveWorld` |

Three case, seventeen world. **Six more consumers need no change at all**, because they were
never on the flag: `:635` (`trailClueMarks`), `:862` (clue-state reset), `:1004`
(`shouldFileClue`), `:1065` (`traceClueMarks`), `:1119` (`railSlots`) and `:1281` (the `clues`
prop) all read `clueDef` directly. That is the audit: 24 renamed sites + 6 already-correct
sites = every branch that `!!level.clue` reaches.

Three stale references also change, and none is code: `catalog.ts:162`, `palette.test.ts:260`
and `docs/03:131` all name `isDetectiveTrail` in prose.

---

## 2. Per-cycle geometry, and the `buildLevel.ts` question the explore left open

### Decision: a NEW generator, not a widened `garland`

**Choice**:

```ts
/** One cycle of a varied garland. */
export interface GarlandCycle {
  /** Horizontal span of this U, in viewBox units. */
  width: number
  /** How far below `yTop` this U dips, in viewBox units. */
  depth: number
}

/**
 * Nivel 3 desafío 3 — a garland whose U's differ in SIZE and in SPACING
 * ("variación de tamaño y distancia entre las U", docs/11 Nivel 3).
 *
 * Identical rounded-U cubic to {@link garland}: the control points go to
 * `(4·yBottom − yTop)/3`, the exact value that puts the symmetric cubic's
 * midpoint on `yBottom`, and sit at 15% / 85% of the cycle's own width. A
 * uniform `cycles` list reproduces `garland`'s `d` string exactly, asserted
 * in `paths.test.ts` — that equality is what proves nothing was re-derived.
 *
 * Emits ONLY absolute `M` and `C`: `transformPath` (`paths.ts:172-174`) throws
 * on any other command, and `buildLevel.ts`'s `layOutPaths` runs every level
 * through it.
 */
export function garlandVaried(
  o: { x0?: number; yTop?: number; cycles?: readonly GarlandCycle[] } = {},
): string {
  const x0 = o.x0 ?? 140
  const yTop = o.yTop ?? 285
  const cycles = o.cycles?.length ? o.cycles : [{ width: 180, depth: 150 }]
  let x = x0
  let d = move(x, yTop)
  for (const c of cycles) {
    const w = Math.max(1, c.width)
    const cy = (4 * (yTop + c.depth) - yTop) / 3
    d += cubic(x + w * 0.15, cy, x + w * 0.85, cy, x + w, yTop)
    x += w
  }
  return d
}
```

**Alternatives considered**: widening `garland`'s `cycles` to
`number | readonly GarlandCycle[]`.

**Rationale**: with per-cycle widths, `x1` and `yBottom` stop meaning anything — the span is
the SUM of the widths and the depth is per cycle. A union parameter would leave three of
`garland`'s five options silently inert on half of its inputs, and would widen the type of a
function two shipped levels already call (`f2-guirnalda`, and `hills` is its literal mirror)
for a case neither uses. A separate generator has a coherent parameter set and leaves
`garland` byte-identical.

### The open question, answered: `buildLevel.ts` needs no change

**Checkpoints HOLD, unconditionally.** `generateCheckpoints`
(`letters/svgLetter.ts:701-718`) places `N = clamp(round(L/90), 6, 12)` points at uniform
fractions of ARC LENGTH over a 400-sample resample, with
`radius = clamp(round(L/(N-1) · 0.55), 35, 60)`. Both depend on the TOTAL length only; neither
reads amplitude, curvature or cycle count. A non-uniform path changes nothing about them.

One consequence, recorded rather than discovered later: on desafío 3's narrowest cycle (130
units wide) a single 60-unit checkpoint disk spans most of the U, so the ORDER pillar is
coarser there than the drawn shape. That is acceptable because order is not what enforces a
dip — the ACCURACY pillar is, and `pushBand` samples the centreline 600 times per path
(`buildLevel.ts:30, 194`), so a skipped dip fails on accuracy. It is not a new weakness
either: it is true of any short cycle, `f2-bucles` included.

**The ideal band HOLDS, with one arithmetic constraint the AUTHOR must respect.**
`pushBand` (`buildLevel.ts:55-82`) offsets every sample by a fixed `±half` along the local
normal. On the concave side of a turn that offset folds through itself when `half` exceeds the
local radius of curvature. For the symmetric cubic both garland generators emit, at the bottom
of a U (`t = ½`): `x'=1.275·w`, `x''=0`, `y'=0`, `y''=−8·depth`, so
`κ = 8·depth / (1.275·w)²`. Hence a new exported pure function beside `cornerClearance` and
`armClearance` (`paths.ts:353-374`):

```ts
/** Radius of curvature at the BOTTOM of a garland/hills U, in viewBox units.
 *  Derived from the generators' own symmetric cubic, not measured. */
export function uTurnRadius(width: number, depth: number): number {
  return (1.275 * width) ** 2 / (8 * depth)   // ≈ 0.2032·w²/depth
}
```

The authoring predicate, asserted in `catalog.test.ts` for every garland/hills level at its
AUTHORED width, with `BAND_INSET` newly exported from `buildLevel.ts:38`:

> `uTurnRadius(width, depth) > corridorWidth / 2 − BAND_INSET`

Measured on what ships and what this change adds:

| level | w | depth | `uTurnRadius` | band (`W/2 − 6`) | margin |
|---|---|---|---|---|---|
| `f2-guirnalda` (today, 85) | 180 | 150 | 43.9 | 36.5 | 7.4 |
| `f2-colinas` (85) | 180 | 150 | 43.9 | 36.5 | 7.4 |
| desafío 1 (100) | 253.3 | 240 | 54.3 | 44.0 | 10.3 |
| desafío 2 (80) | 190 | 140 | 52.4 | 34.0 | 18.4 |
| desafío 3 (68), worst cycle | 165 | 170 | 32.5 | 28.0 | 4.5 |
| desafío 4 (90) | 253.3 | 240 | 54.3 | 39.0 | 15.3 |

**Accepted and out of scope, said plainly**: `widthFactor` reaches 2 (`adaptiveTolerance.ts:22`),
and at that multiplier EVERY garland level folds — including the two shipped today. It has
never been a visible defect because the fold is benign: `evaluateLevel:137` scores accuracy as
distance to the NEAREST cloud point (`validation/score.ts`), so a folded band is a union that
is slightly generous at a U bottom, never smaller, never a hole and never `NaN`. The predicate
is authored-width only, and widening it to the adaptive width would be a change to four
shipped levels this proposal does not scope.

---

## 3. The four levels

All four: `phase: 2`, `kind: 'path'`, `surface: 'blank'`, `maze: false`, `showGuide: true`,
`letters: []`, `rules(2, true, true, …)`, **`demo: true`**, **`carrier: true`**,
**`detectiveWorld: true`**, **`goalArt: GOAL_MEDUSA_ART`**, no `clue`, no `taper`
(`catalog.test.ts:270` pins the tapered set to three ids and must stay green — that is the
guard proving no Nivel 3 level grew one).

| id | title | paths | `corridorWidth` | bpm | `minFluency` |
|---|---|---|---|---|---|
| `f2-guirnalda` | Las olas de la medusa | `garland({ x0: 120, x1: 880, yTop: 190, yBottom: 430, cycles: 3 })` | 100 | 54 | 35 |
| `f2-agua2` | La medusa se apura | `garland({ x0: 120, x1: 880, yTop: 290, yBottom: 430, cycles: 4 })` | 80 | 64 | 38 |
| `f2-agua3` | Las olas cambian | `garlandVaried({ x0: 95, yTop: 220, cycles: [{180,180},{130,95},{195,200},{140,110},{165,170}] })` | 68 | 68 | 40 |
| `f2-agua4` | La estrella de mar | same `garland(…)` as desafío 1 | 90 | **0** | **0** |

`hint` (spoken-style, suppressed on screen by the wordless shell, read by the adult, and
length-capped at 80 by `catalog.test.ts:89`): `'Seguí a la medusa: bajá y subí, bien
despacio.'` · `'Ahora las olas son más chiquitas y más juntas. Seguila sin frenar.'` ·
`'Algunas olas son grandes y otras chicas: seguilas todas de corrido.'` · `'Esperá a que la
estrella se vaya y seguí a la medusa.'`

### The microprogression axis, and the numbers that carry it

Amplitude and proximity move together and in opposite directions, which is what makes four
levels a progression instead of four repetitions:

- **cycle width** 253 → 190 → 130…195 (varied) → 253
- **dip depth** 240 → 140 → 95…200 (varied) → 240
- **corridor** 100 → 80 → 68 → 90
- **beat** 54 → 64 → 68 → silent

Desafío 4 deliberately RETURNS to desafío 1's geometry and widens the corridor back to 90.
That is the reasoning `f1-pelotas` recorded for its own route (`catalog.ts:522-524`: "the route
is deliberately EASY to read — a shape that also had to be solved would hide what the child is
actually learning"). The new demand on desafío 4 is timing, not precision.

### Decision: `f2-guirnalda`'s beat goes DOWN, and that obeys the rule rather than bending it

**Choice**: 66 → 54, and `catalog.test.ts:244`'s `bpm('f2-guirnalda') > bpm('f2-crestas')`
is deleted.

**Alternatives considered**: keeping `cycles: 4` at 66 and expressing "amplias y lentas"
through the corridor alone.

**Rationale**: **[corrected]** `explore.md:60` says the shipped 66 "is already near the
catalog's slowest". It is the catalog's FASTEST (66 > 63 > 56 > 52). `catalog.ts:630-635`
states the rule: one beat = one cycle, so the bpm falls as the cycle gets longer. The retheme
takes the cycle from 180×150 to 253×240 — by that rule it MUST beat slower, and 54 sits just
under `f2-crestas`'s 56 for exactly the same reason `f2-crestas` sits under `f2-colinas`.
Deleting the pair assertion is obeying the rule the assertion was a sample of; the replacement
sample is `bpm('f2-agua2') > bpm('f2-guirnalda')` (64 > 54), which is the same rule pointed at
the new pair.

### Decision: desafío 4 carries NO beat and NO fluency threshold

**Choice**: `feedback(0, false)` and `rules(2, true, true, 0)` on `f2-agua4` alone.

**Alternatives considered**: a beat in the legal 50–70 band, and `minFluency: 40` like its
neighbours.

**Rationale**: both metrics measure the opposite of the lesson. Fluency is
`1 − CV(speed)` (`validation/fluency.ts:1-6`); a real child's stop is a deceleration, not a
freeze, and a deceleration is precisely what inflates the coefficient of variation — so a
fluency bar would fail a child for doing the thing the level asks. A metronome that keeps
ticking while the child must hold still is an instruction to fail. `mustBeContinuous: true`
stays, and is not in tension: a pause is not a pen lift, and `fluencyScore` counts strokes, not
stillness — "detener el movimiento, esperar y continuar **sin levantar el dedo**" is exactly
what the pair expresses.

This turns `catalog.test.ts:229-238` from a blanket rule into a rule plus one named exemption,
and the exemption gets its own guard so it cannot become a hole:

```ts
it('silences the beat and the fluency bar on exactly the level that asks the child to STOP', () => {
  const silent = levelsByPhase(2).filter((l) => l.feedback.metronomeBpm === 0)
  expect(silent.map((l) => l.id)).toEqual(['f2-agua4'])
  expect(silent[0].obstacles).toHaveLength(1)
  expect(silent[0].rules.minFluency).toBe(0)
})
```

### Decision: `f2-guirnalda` gains `demo: true`

**Choice**: the demonstration replaces the sentence.

**Rationale**: the level's only rhythm instruction today is its hint, "Hacé las hamacas de
corrido, al ritmo", and the wordless shell suppresses it (`LevelPlay.tsx:1150`). `demo` is what
the duck case already uses for exactly this (`catalog.ts:161-164`: "shown, not written"), and
the metronome survives the split untouched — `beatPulse` at `LevelPlay.tsx:1204-1208` is gated
on `metronomeBpm > 0 && phase === 'ready' && startMarker` and on nothing detective. Phase 2
always resolves `guideLevel` to `'full'` (`WITHDRAWAL_FROM_PHASE = 3`), so `playDemo` is true
for every child on every visit, and the "Ver de nuevo" control is always there.

### `catalog.test.ts`, exactly

- `EXPECTED_IDS` (`:35-57`): `'f2-agua2', 'f2-agua3', 'f2-agua4'` inserted **between
  `'f2-guirnalda'` and `'f2-colinas'`**, in that order; the comment at `:32-34` gains
  "+ 3 desafíos del agua".
- `CORRIDORS` (`:97-119`): `'f2-guirnalda'` **85 → 100**; `+ 'f2-agua2': 80, 'f2-agua3': 68,
  'f2-agua4': 90`.
- `FLUENCY` (`:120-142`): `+ 'f2-agua2': 38, 'f2-agua3': 40, 'f2-agua4': 0`.
- `:229-238` metronome: re-scoped to "…between 50 and 70 **where it beats at all**", plus the
  new exemption guard above.
- `:240-247` bpm ordering: the `f2-guirnalda` > `f2-crestas` pair replaced by
  `f2-agua2` > `f2-guirnalda`.
- `:282-292` reset list: gains `'f2-agua4'`, and the title "…and nowhere else" becomes
  "…on every case trail and on the one level with a hazard".
- `:307-315` hazard list: `['trail1']` → `['trail1', 'f2-agua4']`.
- `:317-331`: generalised from `getLevel('trail1')` to every hazardous level; `periodMs` band
  widened to 2200–3200 and `radius` to 26–36 to admit §4's numbers.
- **new**: the `uTurnRadius`/`BAND_INSET` band assertion (§2) and the `hazardGapFraction`
  assertion (§4).
- Untouched and now load-bearing: `:71-77` (phases ascending — all four are `phase: 2`),
  `:221-227` (`maze === (phase 1 && path)`), `:268-274` (the tapered set), `:369-377` (phase 2
  stays inside y ∈ [149, 451] — every geometry above does: 190…430, 290…430, 220…420).

---

## 4. The starfish hazard

### Decision: the `<circle>` branch is KEPT VERBATIM and the art is a second branch

**Choice**: `TraceHazards` gains an optional art; the ref array becomes a union; the rAF loop
branches on the prop it already holds.

```ts
export interface TraceHazards {
  radii: readonly number[]
  at: (index: number, timeMs: number) => { x: number; y: number }
  /** Draw every hazard of this level as this picture instead of the plain
   *  circle. Absent = the shipped circle, so every existing caller is
   *  untouched. Same contract as `carrierArt`: WHICH picture is entirely the
   *  caller's decision and this component imports nothing from `detective/`.
   *  No `size` — see the decision below. */
  art?: { href: string; w: number; h: number }
}
```

```tsx
// markup
{hazards.radii.map((r, idx) =>
  hazards.art ? (
    <g key={idx} ref={(el) => setHazardEl(idx, el)}
       pointerEvents="none"
       transform={`translate(${hazardHome[idx]?.x ?? 0} ${hazardHome[idx]?.y ?? 0})`}>
      {/* The <image> carries its own placement and NO transform: the rAF loop
          rewrites this GROUP's transform every frame, exactly as it does for
          the carrier (`TraceCanvas.tsx:1267-1280`). */}
      <image href={hazards.art.href}
             {...placeArt(hazards.art, 2 * r, { x: 0, y: 0 })}
             preserveAspectRatio="xMidYMid meet" opacity={HAZARD_OPACITY} />
    </g>
  ) : (
    <circle key={idx} ref={(el) => setHazardEl(idx, el)} /* …:1243-1253 verbatim… */ />
  ),
)}
```

```ts
// hazardEls: useRef<Array<SVGCircleElement | SVGGElement | null>>([])
// setHazardEl(index, el: SVGCircleElement | SVGGElement | null)   (:787-789)
const hz = hazardsRef.current
if (hz) {
  const byTransform = !!hz.art            // read once per frame, not per hazard
  for (let i = 0; i < hz.radii.length; i++) {
    const el = hazardEls.current[i]
    if (!el) continue
    const p = hz.at(i, now)
    if (byTransform) el.setAttribute('transform', `translate(${p.x} ${p.y})`)
    else { el.setAttribute('cx', String(p.x)); el.setAttribute('cy', String(p.y)) }
  }
}
```

**Alternatives considered**: `explore.md:92`'s and the proposal's `hazardEls` becoming
`SVGGElement[]` with every hazard wrapped in a `<g>`; an `instanceof SVGGElement` test in the
loop.

**Rationale**: **[corrected]** wrapping EVERY hazard in a translated `<g>` would move
`trail1`'s circle from `cx="…" cy="…"` to `cx="0" cy="0"` inside a `transform`ed group — its
rendered attributes would change, and the proposal's own success criterion ("`trail1`'s circle
hazard is byte-identical in rendered attributes before and after") would become unmeetable by
construction. Keeping the circle branch verbatim makes that criterion literally true and makes
the rollback (delete the art branch, narrow the ref type) provably a no-op. `!!hz.art` beats
`instanceof` because it is the SAME expression the JSX branches on, read from a ref the loop
already holds, so the two cannot disagree; `instanceof` would be a second, independent source
of truth for the same question.

### Decision: the drawn size is `2 × radius`, never authored

**Rationale**: `obstacles.ts:7-13` states the rule this change must not break — "a hazard that
hits where it is not drawn is unplayable". `hitObstacle` tests against
`radius + OBSTACLE_INK_ALLOWANCE`, so binding the picture's rendered height to the same
`radius` makes the picture and the hit circle incapable of drifting. An authored `size` would
be a second number for one fact.

### The numbers, derived from `f1-pelotas`'s reasoning and not from its literals (D3)

New exported pure function in `obstacles.ts`, which is what makes the success criterion
assertable:

```ts
/** Fraction of each cycle during which the hazard is FULLY clear of the
 *  corridor — |offset| > corridorWidth/2 + radius + OBSTACLE_INK_ALLOWANCE.
 *  The closed form of the comment `catalog.ts:506-509` worked by hand. */
export function hazardGapFraction(o: Obstacle, corridorWidth: number): number {
  const amplitude = o.travel / 2
  const clearance = corridorWidth / 2 + o.radius + OBSTACLE_INK_ALLOWANCE
  return amplitude <= clearance ? 0 : 1 - (2 / Math.PI) * Math.asin(clearance / amplitude)
}
```

It reproduces the two recorded values, which is its own falsifiability check: retired
`f1-pelotas` (travel 260, r 32, W 84) → **0.540**, matching `catalog.ts:507-509`'s "54% of each
cycle"; live `trail1` (220 / 30 / 90) → **0.420**.

`f2-agua4`: `obstacles: [{ at: 0.5, travel: 280, periodMs: 3000, phase: 0, radius: 34 }]`.

- **travel 280 against a 90-unit corridor is 3.1× the channel** — `f1-pelotas`'s ratio, which
  is the reasoning; `A − radius = 106 ≥ 45`, so the starfish's near rim clears the far wall at
  each extreme and there is no safe lane to hug.
- `hazardGapFraction` = **0.550** — a real gap for a majority of every cycle, in two windows of
  ≈824 ms at `periodMs: 3000`. Longer than `f1-pelotas`'s ~0.7 s on purpose: this is a
  `mustBeContinuous` phase-2 level, where stopping mid-garland without lifting is harder than
  stopping on a phase-1 maze.
- Not one literal is `trail1`'s: 280 ≠ 220, 3000 ≠ 2400, 34 ≠ 30, and a single hazard against
  `f1-pelotas`'s pair. Asserted directly, so D3 cannot quietly decay.
- `at: 0.5` on a symmetric 3-cycle garland is the bottom of the MIDDLE U, where the tangent is
  exactly horizontal — so `obstacleAt`'s local normal (`obstacles.ts:100-108`) is exactly
  vertical and the sweep is a clean vertical crossing, not a diagonal one. At the low extreme
  the rim reaches y ≈ 604, 4 units past the sheet edge; the retired `f1-pelotas` already ran
  its hazard off the TOP edge the same way (apex ≈ 140, A = 130), and it happens exactly when
  the corridor is clear.
- `resetOnContact: true` is forced by `catalog.test.ts:311-314` ("a hazard without the reset
  rule is an animation"). **Accepted cost, stated**: on a `maze: false` level that also couples
  corridor EXIT to the reset (`LevelPlay.tsx:914, 960-967`), so drifting out of the soft channel
  restarts the run — which no shipped phase-2 level does. It is why desafío 4's corridor widens
  back to 90 and its guide is full: at 45 units of half-width plus the two-sample debounce
  (`resetOnContact.ts:27`), leaving is a departure, not a wobble. Decoupling the two would be a
  change to `LevelConfig.resetOnContact`'s documented meaning (`types.ts:91-99`) and is not
  scoped here.

### The verification, numeric and not a screenshot

`TraceCanvas.test.tsx` gains, in S4 and before the change lands:

```ts
const target = buildLevelTarget(getLevel('trail1'))
const o = getLevel('trail1').obstacles![0]
const home = obstacleAt(o, target, 0)
const html = renderToString(<TraceCanvas hazards={{ radii: [o.radius], at: (_, t) => obstacleAt(o, target, t) }} />)
expect(html).toContain(`cx="${home.x}"`)
expect(html).toContain(`cy="${home.y}"`)
expect(html).toContain('r="30"')
expect(html).not.toMatch(/<g[^>]*transform="translate[^"]*"[^>]*>\s*<circle/)
```

The last line is the load-bearing one: it fails if the circle ever acquires a translated
wrapper. A parallel case with `art` present asserts the group's `transform`, the `<image
href>`, and `width`/`height` equal to `placeArt(art, 2 · 34, {x:0,y:0})`.

---

## 5. `LevelConfig.goalArt` and `hazardArt`

```ts
// levels/types.ts — both optional, both absent-means-today's-behaviour
/** Stand THIS picture where the route ends, instead of the engine's two
 *  hollow diamonds and instead of the case lamp. The medusa is Nivel 3's
 *  content, not a side effect of case membership (D4), and Nivel 4's sheep
 *  takes the same seam. */
goalArt?: ArtImage
/** Draw this level's hazards as this picture instead of the plain circle. */
hazardArt?: ArtImage
```

```tsx
// LevelPlay: goalArt WINS over the case lamp — a level's own content beats a
// default it did not ask for.
const GOAL_ART_SIZE = 96          // a creature, peer of OCTOPUS_SIZE — not LAMP_SIZE's 84
const endArt = level.goalArt
  ? { ...level.goalArt, size: GOAL_ART_SIZE }
  : isCaseTrail
    ? { ...(trailLampOn ? LAMP_ART.on : LAMP_ART.off), size: LAMP_SIZE }
    : undefined
```

### Proof that this is orthogonal to the case lamp

- `LAMP_ART` (`assets.ts:202-205`) is read in exactly two places: `LevelPlay.tsx:1235`'s
  `endArt`, which is now the ELSE of the branch above, and the office/play rail via
  `PistasRail`. Nothing here touches either.
- `home/caseState.ts:106-108`'s `lampOn(records, kase)` is
  `kase.trailIds.every((id) => isFiled(records, id))` — a pure boolean over a case's own trail
  ids, with no art in it at all. A Nivel 3 id is in no case's `trailIds`
  (`detective/cases.ts`'s `DETECTIVE_CASES` lists `DUCK_TRAIL_IDS` and `DETECTIVE_TRAIL_IDS`),
  so it cannot move the office lamp by construction.
- `trailLampOn` (`LevelPlay.tsx:716, 948-955`) stays gated on `isCaseTrail` (§1), so a Nivel 3
  level never latches it and `goalArt` never has an on/off state to resolve.
- Deduction routing: `resolveNextAction` (`GameScreen.tsx:140-150`) asks `caseOf(levelId)`,
  which returns `undefined` for an id no case lists, so it always resolves to
  `{ type: 'next' }`. That is the structural proof behind the success criterion "no deduction
  route reachable from it" — no new guard needed.

---

## 6. Art: exactly two files

`build_art.py` `SINGLES` gains two rows, beside the animals and the octopus:

```python
('medusa.png',          'goal-medusa.png',     384, None, True),
('estrella de mar.png', 'hazard-starfish.png', 320, None, True),
```

### Decision: both keep their authored colour, and no new palette tuple is added

**Choice**: `fill=None`, a fourth exception in `docs/09` §4.

**Alternatives considered**: recolouring both to a token like the lamp does.

**Rationale**: §4's rule protects CLUE marks — "el color es la recompensa" — and Nivel 3 has no
clue for a coloured creature to be confused with (D1). The medusa and the starfish are living
things in the world, which is §4 exception 2's own reasoning for the octopus and the glass
("la presencia del chico en el mundo, lo único vivo en pantalla"), and a recoloured jellyfish
is a flat silhouette. With `fill=None`, `build_art.py:384-385` never calls `recolour`, so the
`keep_ink` column is inert for these two rows and **no contour token is referenced at all** —
which is the precise, verifiable form of the "point at `ART_OUTLINE`, never `INK_COLOR`"
requirement here: the change adds no palette tuple, and `INK` (`build_art.py:48-59`) already
mirrors `ART_OUTLINE`, guarded by `artManifest.test.ts:154`. The mistake `palette.ts:29-46`
records twice cannot recur in this change because this change never names a contour colour.

The cost of that is real and must be looked at, not asserted: because these two are not
recoloured, their AUTHORED contour ships as drawn. If it is not near-achromatic, the drawn
world grows a third coloured contour — the exact `#19241c` grass failure `docs/09` §7 records.
That is a screenshot check on S7, not a test.

### Exactly which assertions gain new numbers

**`artHierarchy.test.ts` gains NONE, and that is a naming constraint, not luck.** Its three
globs are `ground-grass-*.png`, `ground-mud-*.png` and `clue-*-drained.png` (`:201-215`);
`goal-medusa.png` and `hazard-starfish.png` match none of them, so `:271-273`'s counts (12, 8,
≥ 7) stay exactly as written and `:276`'s hierarchy comparison never sees a non-clue. The
prefix rule is load-bearing: a file named `clue-*-drained.png` would be absorbed by `:273`'s
`toBeGreaterThanOrEqual` and then measured against ground decoration as if it were something
a child hunts for.

**`artManifest.test.ts` gains exactly three edits.**
- `:68-82` `REGISTERED` gains `['GOAL_MEDUSA_ART', GOAL_MEDUSA_ART]` and
  `['HAZARD_STARFISH_ART', HAZARD_STARFISH_ART]`, plus the two imports at `:26-37`.
- `:122` `expect(REGISTERED.length).toBe(44)` → **`46`**.
- `:117-118` the arithmetic comment gains "+ 1 goal (medusa) + 1 hazard (estrella de mar)".
- `:91-114` (per-entry) and `:127-131` (no orphan manifest entry) need NO edit and pick both up
  for free — and `:127` is what forces the two PNGs and their two registry entries into the
  SAME slice.

`assets.ts` gains two `ArtImage` constants with `w`/`h` **copied from the freshly emitted
`manifest.json`, never guessed** — the emitted size is `target_h / 2` after `main()`'s final
`box_resize` and the alpha-bbox crop, so it cannot be predicted here. They live in
`detective/assets.ts` because that module is the registry for the whole DRAWN WORLD (it already
holds `GROUND_*` and `HOME_*`), not for the case — which is D1's point restated at the
module level.

---

## 7. `client/src/game/migrateNivel3.ts`

`migrateDuckCase.ts`'s exact three parts, minus the pseudo-id (Nivel 3 is not a case).

```ts
import { EMPTY_RECORD, APPROVALS_TO_UNLOCK, NIVEL3_TRAIL_IDS } from './types'
import type { LevelRecord } from './types'

/** The id whose approvals used to grant `f2-colinas` its positional unlock,
 *  and which the three new water levels now sit between. */
export const NIVEL3_PREDECESSOR_ID = 'f2-guirnalda'

/** Identical to `migrateDuckCase.ts:38-48`, for identical reasons. */
function seedFrom(source: LevelRecord): LevelRecord { /* …verbatim… */ }

export function migrateNivel3(
  records: Readonly<Record<string, LevelRecord>>,
): Record<string, LevelRecord> {
  const source = records[NIVEL3_PREDECESSOR_ID]
  if (!source || source.approvals < APPROVALS_TO_UNLOCK) return {}
  if (NIVEL3_TRAIL_IDS.some((id) => records[id])) return {}
  const changed: Record<string, LevelRecord> = {}
  for (const id of NIVEL3_TRAIL_IDS) changed[id] = seedFrom(source)
  return changed
}
```

**Guard condition**: `f2-guirnalda.approvals >= APPROVALS_TO_UNLOCK` — the exact condition that
used to grant `f2-colinas` its unlock (`LevelProgressStore.ts:123-129` reads `LEVELS[index-1]`),
quoted rather than re-decided.

**`NIVEL3_TRAIL_IDS` is the THREE NEW ids and MUST NOT include `f2-guirnalda`.** The source id
is in `records` by the first guard, so putting it in the destination set would make the second
guard true on the very first run and the migration would never write anything. That is the one
place this file differs structurally from the duck's, where source and destinations were
disjoint by accident rather than by rule.

**Idempotency**: structural, not flagged. The second guard is "none of the three destinations
has a record yet" and the function's own writes create those records, so a second run returns
`{}`. That is what makes calling it from `openProgressStore` — invoked in a `useState` lazy
initialiser and double-invoked under StrictMode — harmless. It never mutates, never deletes,
and never touches `f2-guirnalda`'s own entry, which is what keeps rollback item 4 real.

**Wiring** (`openProgressStore.ts:30`): a third entry in the existing array. Order is
irrelevant — the three migrations share no id (`f1-*`/`duck-*`/`f2-*`).

**The one broken link, and its cost said plainly.** `isUnlocked` never reads an absolute index,
only the immediately preceding id, so inserting three ids after `f2-guirnalda` breaks exactly
one predecessor link: `f2-colinas`'s, which moves from `f2-guirnalda` to `f2-agua4`. The
migration copies `approvals ≥ 2` forward onto the three new ids, so `f2-colinas` stays
unlocked — and, exactly as `migrateDuckCase`'s D4 cost, that child **never meets the three new
water levels**: they arrive pre-approved. It is not a side effect, it is the price of the
no-demotion rule `migratePhase1.ts:1-10` exists by name to enforce, and the alternative is
relocking a level the child already earned. There is no production user base
(`config.yaml:8` records the backend as not scaffolded), and "Reiniciar progreso" stays
reachable on the dev-gated map. Desafío 1 is unaffected either way: `f2-guirnalda` keeps its
id, so a returning child's record follows the retheme.

---

## Data Flow

```
docs/11 Nivel 3 ──▶ catalog.ts (4 LevelConfig)
                         │  detectiveWorld / goalArt / hazardArt / obstacles
                         ▼
     levels/world.ts ──▶ LevelPlay ──┬── inDetectiveWorld ─▶ ground, mud ink, octopus,
   isCaseTrail / inDetectiveWorld    │                       glass, wordless shell,
             ▲                       │                       NO result block (D6)
             │                       ├── isCaseTrail ──────▶ PistasRail, clue filing,
     types.ts (LevelConfig)          │                       trail lamp   [none in Nivel 3]
                                     ├── goalArt ──────────▶ TraceCanvas endArt  (medusa)
                                     └── hazardArt ────────▶ TraceHazards.art
                                                                   │
 paths.garlandVaried ─▶ buildLevelTarget ─▶ polyline ─▶ obstacleAt ─┴─▶ rAF: <g transform>
        │                    (checkpoints, ideal band)                   or <circle cx/cy>
        └─ uTurnRadius ─▶ catalog.test.ts: band < R at every U bottom

build_art.py (fill=None) ─▶ goal-medusa.png / hazard-starfish.png ─▶ assets.ts ─▶ catalog.ts
                                        └─▶ manifest.json ─▶ artManifest.test.ts (46)

cursiva.levels.v1 ─▶ openProgressStore ─▶ migrateNivel3(f2-guirnalda ⇒ 3 new ids)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `client/src/levels/world.ts` (+`.test.ts`) | Create | `isCaseTrail`, `inDetectiveWorld`. |
| `client/src/levels/types.ts` | Modify | `detectiveWorld?`, `goalArt?`, `hazardArt?`. |
| `client/src/screen/LevelPlay.tsx` | Modify | 24 sites converted per §1; `endArt` from `goalArt`; `hazards.art`; `GOAL_ART_SIZE`. |
| `client/src/screen/LevelPlay.test.tsx` | Modify | A world-not-case fixture added to eight suites (§Testing). |
| `client/src/levels/paths.ts` (+`.test.ts`) | Modify | `GarlandCycle`, `garlandVaried`, `uTurnRadius`. |
| `client/src/levels/buildLevel.ts` | Modify | Export `BAND_INSET`. Nothing else — see §2. |
| `client/src/canvas/TraceCanvas.tsx` | Modify | `TraceHazards.art`; union ref; loop branch; art branch in markup. |
| `client/src/canvas/TraceCanvas.test.tsx` | Modify | The numeric before/after of `trail1`'s circle; the art branch. |
| `client/src/levels/obstacles.ts` (+`.test.ts`) | Modify | `hazardGapFraction`. |
| `client/src/levels/catalog.ts` | Modify | `f2-guirnalda` rethemed; three ids before `f2-colinas`. |
| `client/src/levels/catalog.test.ts` | Modify | The eleven edits listed in §3. |
| `client/src/game/types.ts` | Modify | `NIVEL3_TRAIL_IDS` beside `DUCK_TRAIL_IDS`. |
| `client/src/game/migrateNivel3.ts` (+`.test.ts`) | Create | The positional-unlock migration. |
| `client/src/game/openProgressStore.ts` | Modify | Third migration in the existing loop. |
| `client/src/detective/assets.ts` | Modify | `GOAL_MEDUSA_ART`, `HAZARD_STARFISH_ART`. |
| `client/src/detective/artManifest.test.ts` | Modify | `REGISTERED` +2; `:122` 44 → 46; comment. |
| `scripts/art/build_art.py` | Modify | Two `SINGLES` rows, `fill=None`. |
| `client/public/art/*` | Generated | Two PNGs + `manifest.json`, by running the script. |
| `client/src/levels/catalog.ts:162`, `detective/palette.test.ts:260` | Modify | Stale `isDetectiveTrail` comments. |
| `docs/04`, `docs/09` | Modify | Nivel 3 inventory; §4 fourth exception; §7 sheet-as-a-place note. |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (pure) | `isCaseTrail` / `inDetectiveWorld` | Four fixtures: clue-only, world-only, both, neither. Plus the widening invariant: `detectiveWorld: false` + a clue is still in the world. |
| Unit (data) | the split reaches every consumer | For every level in `LEVELS`, `isCaseTrail(l)` implies `inDetectiveWorld(l)`, and today's set is unchanged — the regression guard that makes S1 provably behaviour-neutral. |
| Unit (geometry) | `garlandVaried` | A uniform cycle list reproduces `garland`'s exact `d`; only `M`/`C` are emitted; `transformPathD` does not throw; the `t=½` point of each cycle sits on `yTop + depth`. |
| Unit (geometry) | `uTurnRadius` | Reproduces the shipped `f2-guirnalda` (43.9); the band predicate holds for every garland/hills level at its authored width (§2's table). |
| Unit (geometry) | `hazardGapFraction` | Reproduces `f1-pelotas`'s recorded 0.54 and `trail1`'s 0.42 — falsifiable against two numbers already on the record; `f2-agua4` > 0.5; `f2-agua4`'s triple ≠ `trail1`'s (D3). |
| Unit (engine) | non-uniform path through `buildLevelTarget` | `f2-agua3`: checkpoints ordered 1..N, N ≥ 6, `ideal` non-empty, `length` > 100 — the existing `:397-407` sweep covers it for free once it is in `LEVELS`. |
| Unit (pure) | `migrateNivel3` | Idempotent on re-run; no write below the threshold; no write when any destination exists; never deletes; `f2-guirnalda` itself never written; a captured `cursiva.levels.v1` payload with `f2-guirnalda` approved keeps `f2-colinas` unlocked and demotes nothing. |
| Component | the world without the case | A `detectiveWorld: true, clue: undefined` fixture added to `LevelPlay.test.tsx`'s suites at `:95`, `:173`, `:209`, `:249`, `:365`, `:391`, `:477`, `:564`. It must show ground, mud ink, octopus, glass and NO chrome text; and it must show **no rail** (`:250`), **no `clues` prop** (`:365`), **no result block and no star glyph** (D6). The rail and clue cases are the ones that prove `isCaseTrail` did not widen. |
| Component | `goalArt` | `endArt.href` is the medusa on a Nivel 3 level and the lamp on a case trail; `goalArt` wins when both are present; absent on an ordinary level (`:526` stays green). |
| Component | hazard rendering | §4's numeric before/after; `trail1` keeps `cx`/`cy` and grows no translated wrapper. |
| Data | catalog | The eleven `catalog.test.ts` edits of §3, including the beat-and-fluency exemption guard. |
| Screenshot (human) | `scripts/shot.sh` | Three checks, all on S7 (§Slice Plan). Non-negotiable: this repo's three big defects were all found by screenshots and none by the suite. |
| E2E | N/A | No browser harness in this repo. |

## Threat Matrix

N/A — no routing (in the HTTP/shell sense), shell command, subprocess, VCS/PR automation,
executable-file classification, or process-integration boundary. `build_art.py` is an
author-run, dependency-free, network-free local script over files already in the repo, not a
process this change integrates with at runtime. The change is client-side rendering, pure
geometry, and one `localStorage` copy-forward.

## Migration / Rollout

One-time, copy-forward, positional-unlock safe; §7 in full. No feature flag, no phased
rollout, no stored version flag — idempotency is "the destination already has a record".
`migrateNivel3` must ship in a slice **before** the catalog insertion (D7).

## Slice Plan

Per-PR guard 400 authored ±; generated PNGs and `manifest.json` are excluded from the authored
count (Section E) but stay in the snapshot. Every slice ends green on `npm test` and
`npm run build`.

| # | Slice | Files | ± |
|---|---|---|---|
| S1 | `refactor(level-engine)` the world/case split, before any Nivel 3 level exists | `levels/world.ts` +`.test.ts`, `levels/types.ts`, `LevelPlay.tsx`, `LevelPlay.test.tsx`, two comments | 270 |
| S2 | `fix(progress)` seed the water levels before they exist | `game/types.ts`, `migrateNivel3.ts` +`.test.ts`, `openProgressStore.ts` | 150 |
| S3 | `feat(level-engine)` per-cycle garland and the U-radius arithmetic | `paths.ts`, `paths.test.ts`, `buildLevel.ts` | 180 |
| S4 | `feat(canvas)` hazard art as a second branch, circle untouched | `TraceCanvas.tsx`, `TraceCanvas.test.tsx` | 150 |
| S5 | `feat(art)` medusa and estrella de mar | `build_art.py`, `public/art/*`, `assets.ts`, `artManifest.test.ts` | 70 |
| S6 | `feat(level-engine)` `goalArt` / `hazardArt` on the config and the screen | `levels/types.ts`, `LevelPlay.tsx`, `LevelPlay.test.tsx` | 130 |
| S7 | `feat(level-engine)` the four Nivel 3 levels | `catalog.ts`, `catalog.test.ts`, `obstacles.ts` +`.test.ts` | 340 |
| S8 | `docs` Nivel 3 inventory, §4's fourth exception, §7's note | `docs/04`, `docs/09` | 50 |

**Total ≈ 1,340 authored ±.** `auto-chain`, chained PRs. No slice exceeds the 400-line guard.

**Ordering is load-bearing in three places.** S1 first and alone: with no Nivel 3 level in the
catalog, `inDetectiveWorld ≡ isCaseTrail` for every shipped level, so the slice is provably
behaviour-neutral and its rollback is collapsing two calls back into one — which stops being
true the moment a level sets the flag (rollback item 1). S2 before S7, or the insertion relocks
`f2-colinas` for a returning child (D7). S3–S6 before S7, which consumes all four.

**Screenshot checks (human-reviewed, `scripts/shot.sh`), all on S7:**

- **Desafío 1 mid-trace** — the detective world with ZERO clue marks, no title, no hint, no
  stars, and the medusa standing where the route ends. The question to answer by eye is the one
  the proposal raises: with the sentence gone, does the metronome pulse still read as a rhythm
  instruction?
- **Desafío 4** — the starfish occupying the corridor at `t = 0` and clear of it at the
  extreme; and whether its authored contour reads as the world's marker line or as a third
  coloured contour (§6's stated cost).
- **Desafío 3** — do five varied U's read as intended variation rather than as a mistake, and
  does the ideal band visibly bulge at the shallowest U's bottom (§2's 4.5-unit margin)?

## Open Questions

- [ ] Whether the authored contours of `medusa.png` and `estrella de mar.png` are near-achromatic.
      Resolvable only by emitting the two PNGs and looking (§6). If either is coloured, the fix is
      one `SINGLES` row moving to a two-tone recolour, not a palette token.
- [ ] Desafío 3's band margin is 4.5 units against a 28-unit half-band — the tightest of the
      four, and the one number the screenshot pass should confirm. Widening `{130, 95}` to
      `{140, 95}` buys 5.4 more units if it reads wrong.
- [ ] A Nivel 3 level is not reachable from the office: `nextCaseStep` (`caseState.ts`) only
      routes into cases, so after the hen case the resume control has nowhere to send a child.
      **Pre-existing and not introduced here** — `f2-colinas`, `f2-bucles` and `f2-crestas` are
      equally unreachable today. It is step 5's persisted-narrative work; flagged so it is not
      filed as a regression of this change.
- [ ] Nothing blocking. No decision above is waiting on input.

### Accepted deviation

This document exceeds the skill's 800-word cap. `openspec/config.yaml:22-23` requires every
architecture decision to carry its rationale, this change carries eight design units with real
signatures and a 24-site enumeration that is only useful if it is complete, and no decision
could be shortened without dropping its reason — the same deviation
`archive/2026-09-12-case-registry-and-captions/design.md:950-955` recorded.
