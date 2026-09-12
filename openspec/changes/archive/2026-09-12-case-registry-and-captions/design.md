# Design: Case Registry and Captioned Art

Binding inputs: `proposal.md` §Decisions (D1–D5) and `explore.md`. Neither is reopened.
Every file:line below was re-verified against the working tree; where `explore.md` or
`/tmp/map.md` was off by a line or a name, the correction is marked **[corrected]**.

## Technical Approach

Nothing in the trace engine or the level engine changes shape. The change is six additive
seams plus one deletion:

1. a new pure data module, `detective/cases.ts`, that the old global `CULPRIT` and
   `ANIMAL_ART[...].ruledOutBy` collapse into;
2. a new leaf component, `detective/CaptionedArt.tsx`, whose **required** `label` prop is
   the type-level guarantee that a word never ships without its picture;
3. four `LevelConfig` objects and three `ClueKind`s, entering through the existing
   `build_art.py` → `assets.ts` pipeline;
4. one pure migration module in `migratePhase1.ts`'s exact shape;
5. one pure placement function, `placeArt()`, replacing two copies of the same arithmetic;
6. one prop, `onExit`, threaded from `App` through `GameScreen`.

The governing constraint is the harness: vitest 4 on the **node** environment, no jsdom, no
testing-library. A decision taken inside a click handler or a `setState` updater cannot be
observed. So every decision this change introduces is a **named exported pure function** —
`clueKindsOf`, `activeCase`, `nextCaseStep`, `solvesCase`, `caseSolvedId`, `auditCaptions`,
`placeArt`, `migrateDuckCase`, `initialView`, `resolveNextAction` — and the component only
dispatches it. No `url(#…)`. No new dependency.

---

## 1. The case registry

### Decision: a case derives its clue kinds from the catalog; it does not restate them

**Choice**: `DetectiveCase` holds `trailIds`; the kinds come from `getLevel(id).clue`
through one exported helper.

```ts
// client/src/detective/cases.ts
import { getLevel } from '../levels/catalog'
import { DETECTIVE_TRAIL_IDS, DUCK_TRAIL_IDS } from '../game/types'
import type { AnimalId, ClueKind } from './assets'

export interface DetectiveCase {
  id: string
  culprit: AnimalId
  /** Lineup order, explicit so it never depends on key iteration order. */
  options: readonly AnimalId[]
  /** Which clue clears which animal — a fact about THIS case. */
  ruledOutBy: Readonly<Partial<Record<AnimalId, ClueKind>>>
  trailIds: readonly string[]
}

export const DETECTIVE_CASES: readonly DetectiveCase[] = [
  {
    id: 'duck',
    culprit: 'pato',
    options: ['pato', 'vaca', 'gato'],
    ruledOutBy: { vaca: 'feather', gato: 'bubble' },
    trailIds: DUCK_TRAIL_IDS,
  },
  {
    id: 'hen',
    culprit: 'gallina',
    options: ['gallina', 'pato', 'vaca', 'gato'],
    ruledOutBy: { pato: 'footprint', vaca: 'feather', gato: 'corn' },
    trailIds: DETECTIVE_TRAIL_IDS,
  },
]

/** The case's clue kinds, in play order. Throws on a trail authored without a
 *  clue — the same failure `caseState.railSlots` already raises by name. */
export function clueKindsOf(kase: DetectiveCase): readonly ClueKind[] {
  return kase.trailIds.map((id) => {
    const clue = getLevel(id).clue
    if (!clue) throw new Error(`Rastro sin pista: ${id}`)
    return clue.kind
  })
}

/** The persisted pseudo-id that records "this case was solved" (D2). */
export function caseSolvedId(caseId: string): string { return `${caseId}-deduce` }

export function caseOf(levelId: string): DetectiveCase | undefined {
  return DETECTIVE_CASES.find((k) => k.trailIds.includes(levelId))
}
```

**Alternatives considered**: a `clues: readonly ClueKind[]` field on the case.

**Rationale**: `LevelConfig.clue` is already the *sole* discriminator that makes a level a
detective trail — `LevelPlay.tsx:633` is literally `const isDetectiveTrail = !!level.clue`,
and `caseState.railSlots` (`caseState.ts:60-66`) already derives the rail's kinds this way
rather than keeping a second list. A `clues` field would be a second list that can disagree
with the catalog, and nothing would notice: the rail would show a bubble while the trail
scattered breadcrumbs. Deriving also buys the strongest new structural test for free — that
every kind a case rules out is a kind the case's own trails actually carry (§9).

**Accepted cost, stated rather than hidden**: this makes `cases.ts` depend on
`levels/catalog.ts`, which means the duck's four `LevelConfig`s and `cases.ts` cannot be
sliced apart — `clueKindsOf(DETECTIVE_CASES[0])` throws until the levels exist. That is why
slice S2 is the one over-budget slice (§10). The alternative buys a smaller slice by paying
in a second source of truth, which is the trade this whole change exists to refuse.

### The lookups the consumers need

| Question | Function | Consumer |
|---|---|---|
| which case owns this trail id | `caseOf(levelId)` | `GameScreen.resolveNextAction` |
| which case is the child working | `activeCase(records)` (`home/caseState.ts`) | `HomeScreen`, `App` |
| is this case resolved | `isFiled(records, caseSolvedId(id))` | `activeCase`, `nextCaseStep`, `Deduction` |
| what clues does it carry | `clueKindsOf(kase)` | `palette.test.ts`, `railSlots`, `Deduction`'s filed slots |

`caseState.ts` becomes case-aware without changing its character (pure over `Records`):

```ts
export type CaseStep =
  | { kind: 'trail'; levelId: string }
  | { kind: 'deduce'; caseId: string }          // [changed] carries the case

export function activeCase(records: Records): DetectiveCase {
  return DETECTIVE_CASES.find((k) =>
    k.trailIds.some((id) => !isFiled(records, id)) ||
    !isFiled(records, caseSolvedId(k.id)),
  ) ?? DETECTIVE_CASES[DETECTIVE_CASES.length - 1]
}

export function nextCaseStep(records: Records): CaseStep {
  const kase = activeCase(records)
  const pending = kase.trailIds.find((id) => !isFiled(records, id))
  return pending === undefined
    ? { kind: 'deduce', caseId: kase.id }
    : { kind: 'trail', levelId: pending }
}

export function railSlots(records: Records, kase: DetectiveCase): readonly RailSlot[]
export function lampOn(records: Records, kase: DetectiveCase): boolean
```

Every case solved ⇒ `activeCase` falls back to the **last** case and `nextCaseStep` returns
its (already-solved) deduction, which renders closed. A real "the case is closed" end state
is step 5's persisted narrative flag, not this step's.

---

## 2. Captioned art

### Decision: the caption is HTML beside the `<svg>`, and the component is the only way to make one

**Choice**: `client/src/detective/CaptionedArt.tsx`.

```tsx
export interface CaptionedArtProps {
  art: ArtImage
  /** The word under the picture. REQUIRED: no `?`, no default, no `''` sentinel,
   *  no conditional render. A picture with no word is representable; a word with
   *  no picture is not. */
  label: string
  /** Rendered height of the picture, in CSS px. */
  size: number
  className?: string
}

export default function CaptionedArt({ art, label, size, className }: CaptionedArtProps) {
  const width = (size * art.w) / art.h
  return (
    <span className={className ? `cv-captioned ${className}` : 'cv-captioned'}>
      <svg viewBox={`${-width / 2} ${-size / 2} ${width} ${size}`} width={width} height={size}
           aria-hidden="true" focusable="false">
        <image href={art.href} x={-width / 2} y={-size / 2} width={width} height={size}
               preserveAspectRatio="xMidYMid meet" />
      </svg>
      <span className="cv-caption">{label}</span>
    </span>
  )
}
```

**Alternatives**: an SVG `<text>` inside the animal's `viewBox="-20 -20 40 40"`; a `label?`
prop with a default.

**Rationale**: `PistasRail.tsx:157` is the shipped precedent — `<div className="pistas-word">
PISTAS</div>` is real HTML, and `LevelPlay.tsx:301,330,371` drives its font size across three
height breakpoints. A `<text>` in a 40-unit local viewBox cannot reach that scale, and
`PistasRail.test.tsx:83` already asserts the word is *not* six polylines. Nunito inherits
from `client/index.html:41-44`'s `:root, body`, so a new HTML text node gets it regardless of
which component mounted which stylesheet — which matters because `LevelMap`, `MainScreen` and
`HomeScreen` never mount `LAYOUT_CSS`.

### Why omitting `label` is a compile error, precisely

Four things make the claim true, and all four are design content, not wishful thinking:

1. `label: string` is a **required** property of `CaptionedArtProps`. TypeScript checks a JSX
   attributes object against the props type, so omitting it is `TS2741: Property 'label' is
   missing`. It must never become `label?`, and it must never be given a default in the
   destructuring — a destructuring default makes the property optional in the inferred type.
2. `client/tsconfig.json:9` sets `"strict": true`, so the check is on.
3. `client/tsconfig.json:20` is `"include": ["src", "vite.config.ts"]`, so **`tsc --noEmit`
   typechecks the test files too**, and `npm run build` runs it. That is the only gate that
   sees types at all: vitest transpiles without typechecking, so *a runtime test can never
   prove this*. The proof is therefore a `@ts-expect-error` line in
   `CaptionedArt.test.tsx` — if omitting `label` ever stops being an error, `tsc` fails on the
   unused suppression and the **build** goes red:
   ```tsx
   // @ts-expect-error — a caption-less picture is representable; a picture-less
   // caption is not. If this line ever stops erroring, the invariant is gone.
   const _proof = <CaptionedArt art={ANIMAL_ART.pato} size={36} />
   ```
4. The type says nothing about a caller writing `<span className="cv-caption">pato</span>` by
   hand. That half is a *test* guarantee, not a type one, and it is what §9's audit covers.

### The rewritten text-absence tests, and how they can fail

Today five suites assert "there is no text" (`HomeScreen.test.tsx:27,32`;
`App.test.tsx:26`; `PistasRail.test.tsx:62,67,83`; `LevelPlay.test.tsx:113,143`;
`Deduction.test.tsx:124,137,266,276`). They are replaced by one invariant — **every visible
word sits inside a container that also carries an `<image href>`** — implemented as a
production module so every screen's test can call it:

```ts
// client/src/detective/captionAudit.ts   (no DOM, string in / strings out)

/** Containers licensed to hold a word. Each must itself contain an <image href>,
 *  which is what stops this list from becoming an exemption list.
 *  - `cv-captioned`: one picture, one word (CaptionedArt).
 *  - `pistas-bar`  : the rail — PISTAS labels a COLUMN of clue sockets, and the
 *                    sockets are the images. [corrected] the class is
 *                    `pistas-bar` (`PistasRail.tsx:153`), not `pistas-rail`. */
export const CAPTION_CONTAINERS = ['cv-captioned', 'pistas-bar'] as const

export interface CaptionAudit {
  /** Words inside a licensed container that really does carry an image. */
  captioned: readonly string[]
  /** Words that do not. The invariant is that this is empty. */
  uncaptioned: readonly string[]
  /** A licensed container that carries no image at all — a failing licence. */
  imagelessContainers: readonly string[]
}
export function auditCaptions(html: string): CaptionAudit
```

Per screen: `expect(auditCaptions(render()).uncaptioned).toEqual([])` and
`expect(audit.imagelessContainers).toEqual([])`.

**Proof that it can fail** — its own suite feeds it hand-built strings, because
`openspec/changes/detective-mode/verify-report.md:156` records five assertions that could not
fail, and this repo does not get to make that mistake twice:

| Input | Expected |
|---|---|
| `<h1>cursiva</h1>` | `uncaptioned: ['cursiva']` |
| `<span class="cv-captioned"><span class="cv-caption">pato</span></span>` | `uncaptioned: ['pato']`, `imagelessContainers: ['cv-captioned']` |
| `<aside class="pistas-bar"><div class="pistas-word">PISTAS</div></aside>` | `imagelessContainers: ['pistas-bar']` |
| a real `renderToString(<CaptionedArt art={…} label="pato" size={36}/>)` | `captioned: ['pato']`, both others empty |

Rows 2 and 3 are the load-bearing ones: they prove the licence is checked, not granted.
`HomeScreen.test.tsx:27`'s `expect(text).toBe('')` stays exactly as it is — the office still
carries no words at all, and weakening it would be a regression, not a rewrite.

---

## 3. The duck case's four levels

Inserted contiguously **before** `trail1` in `catalog.ts`'s private `PHASE_1` array, after
`f1-libre`. All four: `phase: 1`, `kind: 'path'`, `surface: 'blank'`, `maze: true`,
`resetOnContact: true`, `carrier: true`, `showGuide: true`, `letters: []`, `demo: true`,
`rules: rules(1, …)`, `clue.spacing: 60` (the shipped density across every trail),
**no `obstacles`** (D1).

| id | title (Spanish, user-facing) | generator | `corridorWidth` | `taper` | `rules(…)` | `feedback(…)` | clue |
|---|---|---|---|---|---|---|---|
| `duck-trail1` | El charco del pato | `wave({ x0: 90, x1: 910, y: 300, amplitude: 140, cycles: 1 })` | 100 | — | `rules(1, false, true, 0)` | `feedback(0, true)` | `webfoot` |
| `duck-trail2` | El sendero de migas | `wave({ x0: 90, x1: 910, y: 300, amplitude: 170, cycles: 2 })` | 90 | — | `rules(1, false, true, 0)` | `feedback(0, false)` | `breadcrumb` |
| `duck-trail3` | La vuelta de las burbujas | `switchback({ x0: 120, x1: 880, yTop: 140, yBottom: 480 })` | 80 | — | `rules(1, true, true, 0)` | `feedback(0, false)` | `bubble` |

**Corrected after apply (orchestrator, post-S2 screenshot review).** This row first read `garland({ cycles: 3 })`. A garland IS the row of U's, and the row of U's is the signature of the directive's Nivel 3 — spending it on a Nivel 2 case trail flattens that level before it ships. That is proposal D1's ruling applied to the shape instead of to the obstacle. Two render defects fell out with it: the garland's cusps merged consecutive bubble marks into one blob, and the `yTop` the blank-sheet guard forced clipped the octopus and its glass at the top of the sheet. See `apply-progress.md`.
| `duck-trail4` | El rastro de plumas | `squareWave({ x0: 100, mid: 300, amplitude: 140, run: 200, cycles: 3 })` | 70 | `{ from: 1.15, to: 0.9 }` | `rules(1, false, true, 0)` | `feedback(0, false)` | `feather` |

`hint` (spoken-style, suppressed on screen by C1 but read by the adult and asserted absent by
`LevelPlay.test.tsx:113`): `'Seguí el charco de punta a punta.'`,
`'Seguí las migas sin salirte.'`, `'Bajá y subí por cada burbuja, sin levantar el dedo.'`,
`'Seguí el rastro, esquina por esquina.'`

`feedback(0, true)` on `duck-trail1` only — first contact with a routed trail turns the rail
on, the same convention `trail1` carries (`catalog.ts:219-222`). `rules(1, true, …)` on
`duck-trail3` only: the reversal is the one duck trail whose whole point is one unbroken
stroke, exactly as `trail2`'s spiral is.

### `duck-trail4` clearance arithmetic

`cornerClearance(legLength, interiorDeg, w)` = `legLength − 2·(w/2)/tan(interiorDeg/2) ≥ w`
(`paths.ts:353-357`); `armClearance(amplitude, w)` = `2·amplitude − w ≥ 0.7·w`
(`paths.ts:372-374`).

- **Flat runs**, interior 90°, `w = 70`: consumed per corner `= (70/2)/tan(45°) = 35`, so the
  readable flat is `200 − 70 = 130 ≥ 70` ✓. Equivalently `run ≥ 2·w`: **200 ≥ 140** ✓.
- **Vertical transitions**, length `2·amplitude = 280`, same 90° corners:
  `280 − 70 = 210 ≥ 70` ✓.
- **Arm to arm**: `2·140 − 70 = 210 ≥ 0.7·70 = 49` ✓, i.e. 210 units of wall against a 49
  threshold.
- Extrema at `mid ∓ amplitude` = 160 / 440; with a half-corridor of 35 and the 1.15 taper
  head, the band spans ≈ 119…480 inside the fixed 600-unit height ✓.
- Span: `x0 + 2·run·cycles = 100 + 1200 = 1300`, so `buildLevelTarget` widens
  `viewBoxWidth` to `max(1000, ceil(span + 160))` — the shipped `trail4` already runs to 1420
  the same way (`catalog.ts:307`), so this is the existing behaviour, not a new one.
- The other three have no corner predicate to satisfy; all four widths sit inside
  `MIN_CORRIDOR`/`MAX_CORRIDOR` = 30/260 (`buildLevel.ts:26-27`).

### `catalog.test.ts`

`EXPECTED_IDS` (`catalog.test.ts:33-51`) gains the four ids **between `'f1-libre'` and
`'trail1'`**, in that order, and the comment at `:31-32` gains "+ 4 rastros del pato". The
phase-ascending assertion (`:65`) is unaffected — all four are `phase: 1`. The clearance
assertion at `:579` gains a `duck-trail4` case measured from the shipped path, the same way
`trail4`'s is. `catalog.test.ts:284` ("hazards on exactly trail 1, and exactly one") is
**already the guard for D1** and must stay green unchanged — that is what proves no duck
trail grew an obstacle.

---

## 4. New clue kinds, tokens and art

```ts
export type ClueKind =
  | 'droplet' | 'corn' | 'footprint' | 'feather'
  | 'webfoot' | 'breadcrumb' | 'bubble'
```

### Tokens (`detective/palette.ts`)

`webfoot` reuses `PRINT '#000000'` (D5). Two new values:

| Token | Hex | HSL | Why exactly this value |
|---|---|---|---|
| `BREADCRUMB` | `#994138` | h 5.6°, s 0.46, l 0.41 | A baked crust. The hue was **derived, not picked**: `palette.test.ts:95-107` requires `hueDistance(h, 26.0°) > 15` against `GOAL_COLOR`, so the whole interval `(11°, 41°)` is closed — and that interval is where a golden crumb naturally sits. Above 41° lands on `KERNEL` (42.9°) and `LAMP` (44.9°), which is worse: the lamp renders in *every* case's rail, so a pale-gold crumb would sit next to a pale-gold lamp. Below 11° is a dark crust. 5.6° leaves 4.4° of margin to the warm-clay band floor (10°) and 5.4° to the collision threshold, rather than scraping either. |
| `BUBBLE` | `#4fb3d9` | h 196.5°, s 0.64, l 0.58 | Water, sampled from `art-source/burbuja.png`'s cyan body and lifted out of `POND`'s slate. 170.5° from `GOAL_COLOR`, 66.5° from `HAZARD_COLOR`, outside the warm-clay band. It sits 7.5° from `POND '#3f6f8f'` (204.0°) and that is deliberate and legal: the two are in different cases and never co-occur, and they separate on the two axes that survive a small screen — lightness (0.58 vs 0.40) and chroma (0.64 vs 0.39). |

### Decision: `EARNED` is widened to six, and distinctness is re-scoped per case

**Choice**: `palette.test.ts:66`'s `EARNED` becomes
`{ POND, KERNEL, PRINT, PLUME, BREADCRUMB, BUBBLE }`, and `:121-127`'s registry assertion is
re-scoped:

```ts
it("keeps a CASE's earned clue colours pairwise distinct, and no clue earns the drained grey", () => {
  for (const art of Object.values(CLUE_ART)) expect(art.earned).not.toBe(CLUE_DRAINED)
  for (const kase of DETECTIVE_CASES) {
    const earned = clueKindsOf(kase).map((k) => CLUE_ART[k].earned)
    expect(new Set(earned).size, `${kase.id}: two clues share an earned colour`).toBe(earned.length)
  }
})
```

**Alternatives**: leave `:125-126` global and give `webfoot` its own colour; leave `EARNED`
at four so the new tokens escape the band and collision checks.

**Rationale**: the global assertion is now *false of the design*, not of the implementation —
`webfoot` and `footprint` are both `PRINT` by D5's material argument, and they live in
different cases. Per-case is the real invariant, and it is the same move the change already
makes for `ruledOutBy`. It is also still falsifiable: duck is
`[PRINT, BREADCRUMB, BUBBLE, PLUME]` and hen is `[POND, KERNEL, PRINT, PLUME]`, four distinct
each; making `breadcrumb` reuse `PLUME` fails it. D5's note that `:66-72` is *unaffected* is
about breakage, not about scope — widening it is strictly stronger and it is what pins
`#994138` and `#4fb3d9` to a derivation instead of to taste. Both values pass every one of
the eight assertions as written; none of the thresholds moves.

### `build_art.py`

Mirror the two tokens beside the existing block at `:52-58`
(`BREADCRUMB`, `BUBBLE`), then six `SINGLES` rows
(`:184-222`):

```python
('huella palmeada.png', 'clue-webfoot-earned.png',     256, PRINT,        False),
('huella palmeada.png', 'clue-webfoot-drained.png',    256, CLUE_DRAINED, False),
('miga de pan.png',     'clue-breadcrumb-earned.png',  256, BREADCRUMB,   True),
('miga de pan.png',     'clue-breadcrumb-drained.png', 256, CLUE_DRAINED, True),
('burbuja.png',         'clue-bubble-earned.png',      256, BUBBLE,       True),
('burbuja.png',         'clue-bubble-drained.png',     256, CLUE_DRAINED, True),
```

`keep_ink` is not a style preference, it is forced by `recolour` (`:79-100`): with
`keep_ink=True` any pixel of luma `< INK_LUMA (90)` becomes `INK`. `huella palmeada.png` is
**entirely** dark — black web, navy outline, both under 90 — so `keep_ink=True` would emit a
solid ink blob for *both* states. `False` sends every opaque pixel to the fill, which is
exactly how the shipped `huella negra.png` earned print is made (`:189`). The crumb and the
bubble both have a bright body over a navy contour, so they take the two-tone `True` path
like every other clue.

**Two things must be checked by eye before this slice closes**, because the pipeline fails
silently on both:

- `clue-webfoot-drained.png` is a flat `CLUE_DRAINED` silhouette with no contour, on
  `CORRIDOR_EARTH '#d9c3ae'`. That is the *exact* configuration `build_art.py:194-201`
  records as "measured on a screenshot as very nearly invisible" for the unlit lamp. If it
  measures invisible here too, the recorded fallback is the same one the lamp took: author a
  grey companion source (`huella palmeada gris.png`) and drive `drained` off it.

  **Resolved, and by a different route than either option above.** The screenshot check
  (task 2.15) passed at the time on hue contrast alone: the then-current `CLUE_DRAINED`
  `#c8cdd2` is a cool grey on warm tan, legible despite a luma gap of only 5. That was a
  thin argument and a later pass overturned the premise behind it — an unfound clue is what
  the child is hunting for, so it should be the most findable thing on the path, not the
  least. `CLUE_DRAINED` is now `#838383` and `palette.test.ts` requires the drained grey to
  clear the ground by luma rather than merely differ in hue. No grey companion source was
  needed. This paragraph is kept rather than rewritten because the risk it names is real and
  the next piece of contourless art will meet it again.
- `prepare()` (`:168-175`) crops to `png.alpha_bbox`. A source with an **opaque** background
  produces a full-canvas crop and `recolour` repaints the background. Detection needs no new
  tool: the emitted `w`/`h` in `manifest.json` must be a tight silhouette box (tall-narrow for
  the webfoot, near-square for the bubble, wide for the crumb), not the source canvas, and
  `artManifest.test.ts` copies those numbers into `assets.ts`. Check the manifest line before
  copying it.

### `assets.ts` and `artManifest.test.ts`

`CLUE_ART` gains three entries (`earned: PRINT | BREADCRUMB | BUBBLE`, both art states),
with `w`/`h` copied from the fresh manifest. `ANIMAL_ART` loses `ruledOutBy` and collapses to
`Readonly<Record<AnimalId, ArtImage>>`.

Exact `artManifest.test.ts` changes:
- `:72` — `Object.entries(ANIMAL_ART).map(([id, a]) => [\`ANIMAL_ART.${id}\`, a])`, the wrapper gone.
- `:121` — `expect(REGISTERED.length).toBe(38)` → **44** (three clue kinds × two states).
- `:116-117` — the arithmetic comment `8 clue + 4 animal + …` → `14 clue + 4 animal + …`.
- `:115`, `:132` (`it.each` per-entry, and the earned≠drained pair check) need no edit: they
  iterate `CLUE_ART` and pick the new kinds up for free.

---

## 5. Case-solved persistence (D2)

**Writer**: `GameScreen`'s `deduce` branch, through the store it already owns. No new key, no
new schema, no new store method.

```tsx
if (state.view === 'deduce') {
  const kase = DETECTIVE_CASES.find((k) => k.id === state.caseId) ?? DETECTIVE_CASES[0]
  const solvedId = caseSolvedId(kase.id)
  return (
    <Deduction
      kase={kase}
      solved={store.get(solvedId).approvals >= 1}
      onSolved={() => {
        store.save(solvedId, { ...EMPTY_RECORD, approvals: 1 })
        setVersion((n) => n + 1)
      }}
      onExit={onExit}
    />
  )
}
```

**When**: the moment the pick closes the case. The decision is lifted out of the `setState`
updater into a pure predicate, because the harness cannot see inside one:

```ts
/** Does this pick transition an open case to closed? The exported form of the
 *  `animal === culprit` branch inside `pickAnimal`, so the write that follows it
 *  is observable by a node test. */
export function solvesCase(state: DeductionState, animal: AnimalId, culprit: AnimalId): boolean {
  return !state.closed && animal === culprit
}

// Deduction (stateful default export)
onPick={(animal) => {
  if (solvesCase(state, animal, kase.culprit)) onSolved()
  setState((s) => pickAnimal(s, animal, kase.culprit))
}}
```

`pickAnimal` gains a third parameter (`culprit`) and stops importing the deleted `CULPRIT`.
`initialDeductionState(solved = false)` lets a returning child land on the closed lineup
instead of being asked again.

**Proof that the pseudo-id is inert.**

- `isUnlocked('duck-deduce')`: `LEVELS.findIndex` returns `-1`, and `LevelProgressStore.ts:125`
  is `if (index < 0) return false` — before `testMode`, before any array index. No throw, and
  the doc comment at `:121` already promises it ("An unknown id is not unlocked, and never
  throws").
- `LevelMap`: it renders `phases()` (`LevelMap.tsx:36-40`, built from `LEVELS`) and inside
  each section `levelsByPhase(phase).map(…)` (`:79`). Every card comes from `LEVELS`; a store
  key that is not a `LevelConfig.id` is never looked up, so it cannot render a card, a phase
  section, or a title.
- Storage: `LevelProgressStore` keys by arbitrary string, tolerates unknown ids on read
  (`:75-77`) and re-serialises them untouched on write (`:93`) — the same tolerance that keeps
  `f1-ondas`/`f1-espiral` alive as readable orphans today.

---

## 6. `client/src/game/migrateDuckCase.ts`

Same three parts as `migratePhase1.ts`, plus its single application site.

**[Corrected 2026-09-12 — orchestrator ruling 4]** The version of this section
originally shipped seeded only the four duck trail ids. That was WRONG, and
`level-engine/spec.md`'s "Duck Case Positional-Unlock Migration" requirement
was right to say otherwise: it also seeds the duck case's own
`<caseId>-deduce` pseudo-id (`DUCK_CASE_SOLVED_ID` in `game/types.ts`,
matching `detective/cases.ts`'s `caseSolvedId('duck')`). The reasoning this
correction fixes: once Phase 6 makes routing per-case (`home/caseState.ts`'s
`activeCase`), a case counts as resolved only when its trails are ALL filed
**and** its deduction is solved. A migrated child's `f1-libre` approvals
predate the duck case's existence entirely, so leaving `duck-deduce` unseeded
would route that exact child straight into the duck DEDUCTION — asking them
to solve a case whose trails they never walked, a strictly worse outcome than
the cost already accepted below (never meeting the duck case at all).

```ts
// (a) the declarative table — what the seed protects, and what it seeds
import { EMPTY_RECORD, APPROVALS_TO_UNLOCK, DUCK_TRAIL_IDS, DUCK_CASE_SOLVED_ID } from './types'
import type { LevelRecord } from './types'

/** The id whose approvals used to grant `trail1` its positional unlock, and
 *  which the four duck trails now sit between. */
export const DUCK_PREDECESSOR_ID = 'f1-libre'

// (b) the per-field merge policy — identical to migratePhase1's seedFrom, and
//     identical for the same reasons (max on the forgiving fields, attempts
//     summed, streakFail deliberately not carried). Used ONLY for the four
//     trail ids — the deduction pseudo-record below carries no accuracy or
//     fluency of its own to copy forward.
function seedFrom(source: LevelRecord): LevelRecord { /* …as migratePhase1.ts:64-74… */ }

// (c) the pure function, returning only changed entries
export function migrateDuckCase(
  records: Readonly<Record<string, LevelRecord>>,
): Record<string, LevelRecord> {
  const source = records[DUCK_PREDECESSOR_ID]
  // Nothing earned before the insertion: there is no unlock to protect and the
  // child meets the duck case normally. This is the branch that keeps the
  // migration invisible to every new player.
  if (!source || source.approvals < APPROVALS_TO_UNLOCK) return {}
  // Any duck record — a trail OR the deduction pseudo-id — means the
  // insertion has already been lived through: migrated earlier, or
  // genuinely played. Never re-seed.
  if ([...DUCK_TRAIL_IDS, DUCK_CASE_SOLVED_ID].some((id) => records[id])) return {}
  const changed: Record<string, LevelRecord> = {}
  for (const id of DUCK_TRAIL_IDS) changed[id] = seedFrom(source)
  // The exact literal shape §5's real writer uses (`{...EMPTY_RECORD,
  // approvals: 1}`, spec "Case-Solved Persistence") — the case is being
  // marked resolved, not scored.
  changed[DUCK_CASE_SOLVED_ID] = { ...EMPTY_RECORD, approvals: 1 }
  return changed
}
```

**Guard condition**: `f1-libre.approvals >= APPROVALS_TO_UNLOCK` — the exact condition that
used to grant `trail1` its unlock, quoted rather than re-decided, so the migration protects
precisely the children it needs to and nobody else.

**Idempotency argument**: structural, not flagged. The second guard is "none of the four duck
trail ids OR `DUCK_CASE_SOLVED_ID` has a record yet", and the function's own writes create
those records, so a second run returns `{}` and performs no write. That is what makes calling
it from `openProgressStore` — which `GameScreen.tsx:157` invokes inside a `useState` lazy
initialiser, double-invoked under StrictMode — harmless. It never mutates `records`, never
deletes, and never touches `f1-libre`'s own entry, which is what keeps the rollback plan real.

**Wiring** (`openProgressStore.ts:23-30`) — one more loop, ordering irrelevant because the two
migrations share no id:

```ts
export function openProgressStore(): LevelProgressStore {
  const store = new LevelProgressStore()
  for (const migrated of [migratePhase1(store.all()), migrateDuckCase(store.all())]) {
    for (const [levelId, record] of Object.entries(migrated)) store.save(levelId, record)
  }
  return store
}
```

**D4's accepted cost, said plainly**: `seedFrom` copies `approvals ≥ 2` onto all four duck
ids, so `isFiled` is true for them, so `nextCaseStep` skips the duck case entirely and that
child **never meets the duck**. It is not a side effect and it is not a bug — it is the price
of the no-demotion rule that `migratePhase1.ts:1-10` exists by name to enforce, and the
alternative is locking a child out of `trail1`..`trail4` they already earned. This claim is
only TRUE end to end because `DUCK_CASE_SOLVED_ID` is seeded alongside the four trails (the
2026-09-12 correction above): without it, `activeCase` would find the duck's trails filed but
its deduction unsolved, and route the child INTO the duck deduction instead of past it —
"never meets the duck" would become "is asked to solve the duck case blind". There is no
production user base (`openspec/config.yaml:8` records the backend as not scaffolded).
Mitigation: "Reiniciar progreso" stays reachable on the dev-gated map (§8). `migrateDuckCase`
must land **before** the catalog insertion (slice S1 before S2) — the same ordering rule
`detective-mode/design.md` recorded for units 8 and 10; shipping the levels first locks a
returning child out for however long the gap lasts.

---

## 7. Lens centring

### Decision: `placeArt()` lives in `canvas/`, takes a structural shape, and reads one grip

```ts
// client/src/canvas/placeArt.ts — pure, no React, no detective import
/** A grip that was never declared: the middle of the picture. */
export const DEFAULT_GRIP: readonly [number, number] = [0.5, 0.5]

/**
 * The `<image>` box that puts `art`'s grip point exactly on `center`, at a
 * rendered height of `height` and the file's own aspect ratio.
 */
export function placeArt(
  art: { w: number; h: number; grip?: readonly [number, number] },
  height: number,
  center: { x: number; y: number },
): { x: number; y: number; width: number; height: number } {
  const width = (height * art.w) / art.h
  const [gx, gy] = art.grip ?? DEFAULT_GRIP
  return { x: center.x - gx * width, y: center.y - gy * height, width, height }
}
```

**Where it lives, and why not `detective/assets.ts`**: `TraceCanvas` deliberately imports
nothing from `detective/` — the carrier art arrives as a `TraceCarrierArt` prop
(`TraceCanvas.tsx:489`) precisely so the canvas holds no token and no registry. Putting
`placeArt` in `detective/` would break that. The parameter is therefore structural
(`{ w, h, grip? }`), so `canvas/` imports no type from `detective/` either, and `ArtImage`
satisfies it by shape. `screen/` already imports from `canvas/`; the reverse never happens.

**The grip becomes a field of the art.** `ArtImage` gains
`grip?: readonly [number, number]`, and `CARRIER_LENS_ART` declares `grip: [0.603, 0.391]`
with the measurement narrative moved from `modes.ts:44-55` onto it. `HomeMode.grip`
(`modes.ts:56`) and the duplicate literal at `modes.ts:113` are **deleted** — that is the
whole point of the deliverable, and `modes.ts`'s own comment already concedes the number is a
fact about the picture, not about the arm. No test reads `grip` or `0.603` today, so the
removal breaks nothing.

**Call site 1 — `TraceCanvas.tsx:1257-1264`**:

```tsx
<image href={carrierArt.href}
       {...placeArt(carrierArt, CARRIER_ART_SIZE, { x: 0, y: 0 })}
       preserveAspectRatio="xMidYMid meet" />
```

**No interaction with the rAF loop, and this was checked rather than assumed.** The loop at
`TraceCanvas.tsx:709-716` writes `transform` on the carrier **group** (`carrierEl`) every
frame; the `<image>` is a child and carries `x`/`y`/`width`/`height`, which the loop never
touches. The existing comment at `:1251-1256` already records exactly this and is the reason
the centring is on the child rather than a `translate(-w/2 -h/2)` on the group. `placeArt`
writes the same four attributes, so the seam is unchanged — the lens simply moves from the
bbox centre to the grip. That is also why the fix is observable by a unit test on `placeArt`
even though the canvas itself is unobservable.

**Call site 2 — `HomeScreen.tsx:162-186`'s `Hung`** [corrected: `Hung` is in
`screen/HomeScreen.tsx`, not `home/modes.ts`]. Its body becomes
`<image href={art.href} {...placeArt(art, height, { x: cx, y: cy })} preserveAspectRatio="xMidYMid meet" />`,
the `at` prop and the `DEFAULT_GRIP` import (`HomeScreen.tsx:32`) both go, and
`HomeScreen.tsx:296`'s `at={mode.grip}` goes with them — the glass now carries its own grip,
so lamp, clue sockets and mode objects all take the same path.

`placeArt.test.ts`: a default grip centres the box; `[0.603, 0.391]` puts the grip on the
centre and **not** the bbox centre (asserting the ~11-unit offset is present, so the test
fails if the fix is reverted); aspect ratio is held for a non-square `w`/`h`; a zero height
does not produce `NaN`.

---

## 8. Return to the office

**`onExit`, a prop, not a `GameAction`.** `GameScreenProps` (`GameScreen.tsx:139-149`) gains
`onExit: () => void` — required, like `label`, so no caller can silently keep landing on the
map. `App.tsx:108` passes `goHome` (`App.tsx:60-63`), which is the only function that can
reach `{ at: 'home' }`. It replaces `dispatch({ type: 'back' })` at both wiring sites:
`GameScreen.tsx:179` (`LevelPlay`'s `onBack`) and `:185` (`Deduction`'s `onBack`).

A `GameAction` variant was rejected for the reason `nextView`'s own comments insist on: the
reducer is shell-independent (`GameScreen.tsx:44-47`) and `{ at: 'home' }` lives one level up
in `App`'s `Shell` (`App.tsx:26`). An action would force `nextView` to know that type. The
prop mirrors the existing `footer`/`initial` props.

**`nextView`'s `back` branch stays.** It becomes unreachable through the UI but is still
reached by `{ type: 'reset' }` (`GameScreen.tsx:198`, the map's "Reiniciar progreso"), which
shares the same `case` (`:59-61`). Deleting it would break reset and would delete the
rollback: restoring `dispatch({type:'back'})` is the whole revert.

**Dev gate on the map route (D3).** `initialView` is the gate, because it is the only thing
that can produce `{ view: 'map' }` from a URL:

```ts
export function initialView(search: string, dev = false): GameView | null {
  try {
    const id = new URLSearchParams(search).get('nivel')
    if (id === 'deduccion') return { view: 'deduce', caseId: DETECTIVE_CASES[0].id }
    if (id?.startsWith('deduccion-')) {
      const caseId = id.slice('deduccion-'.length)
      if (DETECTIVE_CASES.some((k) => k.id === caseId)) return { view: 'deduce', caseId }
    }
    if (id === 'mapa' && dev) return { view: 'map', finished: false }   // dev surface only
    if (id && LEVELS.some((l) => l.id === id)) return { view: 'play', levelId: id }
  } catch { /* malformed query string */ }
  return null   // nothing routable was asked for — the office is the default landing
}
```

`App.initialShell` becomes
`const v = initialView(search, isDevMode()); return v ? { at: 'game', initial: v } : { at: 'home' }`.
Returning `null` instead of the map is what keeps the dev-server case honest:
`isDevMode()` is true under `import.meta.env.DEV`, so a map *fallback* would open the map on
every dev load and on every vitest run. Only the explicit `?nivel=mapa` reaches it.
`GameScreen` keeps `{ view: 'map', finished: false }` as its own defensive default when
mounted bare, and the catalog-finished route (`{ type: 'next', levelId: null }`) is untouched.

### Every test that must change

| Test | Becomes |
|---|---|
| `levelFlow.test.ts:26` `'‹ Volver returns to a plain map, never the finished banner'` | Retitled to `'reset returns to a plain map, never the finished banner'`, driving `{type:'reset'}`; the exit-to-office path is asserted on the prop instead. |
| `levelFlow.test.ts:30,35,40,44` | Unchanged — they already drive `reset` or assert the bail-out identity. |
| `GameScreen.test.tsx:49` `'back/reset from the deduction view returns to a plain map'` | Split: `reset` still returns to the map; a new case asserts `GameScreen` wires `Deduction.onExit` to the `onExit` prop, never to `dispatch`. |
| `GameScreen.test.tsx:44` `'the deduce action reaches the deduction view from any state'` | `{ type: 'deduce', caseId: 'duck' }` → `{ view: 'deduce', caseId: 'duck' }`. |
| `GameScreen.test.tsx:57` `initialView('?nivel=deduccion')` | Same shape plus `caseId: 'duck'`; a new case for `?nivel=deduccion-hen` and for `?nivel=mapa` with `dev` true and false. |
| `App.test.tsx:40` `expect(initialView('')).toEqual({view:'map',finished:false})` | `expect(initialView('')).toBeNull()`. |
| `App.test.tsx:39` `initialView('?nivel=trail1')` | Unchanged (`dev` defaults to `false`). |
| `App.test.tsx:20` `'opens on the office…'` | Unchanged, and now load-bearing: it is what proves the dev gate did not turn the dev server into a map. |
| `GameScreen.test.tsx` mount cases | Every `<GameScreen />` gains `onExit={() => {}}`; the required prop is the point. |

---

## 9. Structural tests the registry replaces

`Deduction.test.tsx:40`'s describe (`'ANIMAL_ART / CULPRIT registry'`) and its three tests at
`:44`, `:51`, `:60` become per-case, iterating `DETECTIVE_CASES` — strictly stronger, because
they now also catch a clue kind meaning one thing in one case and another elsewhere:

1. `'every case's culprit is among its own options and is ruled out by nothing'`
   (replaces `:44`).
2. `'every case rules out every non-culprit option, by pairwise DISTINCT clue kinds'`
   (replaces `:51`). Duck: 2 distractors, `feather`/`bubble`. Hen: 3,
   `footprint`/`feather`/`corn`.
3. `'no clue kind rules out more than one animal within a case'` (replaces `:60`).
4. **new** `'every clue kind a case rules out is one its own trails actually carry'` —
   `Object.values(kase.ruledOutBy) ⊆ clueKindsOf(kase)`. This is the assertion the old global
   registry made trivially true and the one that now has teeth: `bubble` in the hen case, or
   `corn` in the duck case, fails it.
5. **new** `'webfoot and breadcrumb rule nobody out'` — the structural role `droplet` plays in
   the hen case, asserted rather than left to a comment.

`Deduction.test.tsx:116` (`'presents exactly four animal choices'`) becomes "presents exactly
`kase.options.length` choices", driven per case, which is what proves the duck lineup is
three and the hen's is four. `:137` and `:276`'s `expect(textOf(html)).toBe('PISTAS')` are
replaced by the §2 audit; `:124` ("no accessible name is visible text") **inverts** for the
animals — the name is now visible *and* captioned — and `:266` (the back control) stays as
written, because an icon button is still not a caption.

---

## Data Flow

```
build_art.py ──▶ public/art/*.png + manifest.json ──▶ assets.ts (w/h copied)
                                                          │  artManifest.test.ts guards the copy
catalog.ts (LevelConfig.clue) ───┐                        │
                                 ▼                        ▼
              cases.ts: clueKindsOf(kase) ──▶ CLUE_ART[kind].earned  (palette, per-case distinct)
                                 │
  cursiva.levels.v1 ─▶ Records ──┴─▶ activeCase / nextCaseStep ──▶ App.viewFor ──▶ GameView
        ▲                                    (home = resume control)                  │
        │                                                                             ▼
        │                                              GameScreen ── play ──▶ LevelPlay
        │                                                     └── deduce ──▶ Deduction(kase)
        │                                                                       │
        └────── store.save(caseSolvedId(kase.id), approvals:1) ◀── solvesCase ──┘
                                    (inert for isUnlocked and LevelMap)

CARRIER_LENS_ART.grip ──▶ placeArt(art, height, centre) ──▶ TraceCanvas <image x/y>
                                    └────────────────────▶ HomeScreen Hung <image x/y>
```

## File Changes

| File | Action | Description |
|---|---|---|
| `client/src/detective/cases.ts` | Create | `DetectiveCase`, `DETECTIVE_CASES`, `clueKindsOf`, `caseOf`, `caseSolvedId`. |
| `client/src/detective/cases.test.ts` | Create | The five structural tests of §9, iterating the registry. |
| `client/src/detective/CaptionedArt.tsx` | Create | Required-`label` picture+word leaf; `.cv-captioned` / `.cv-caption`. |
| `client/src/detective/captionAudit.ts` | Create | `auditCaptions`, `CAPTION_CONTAINERS`. |
| `client/src/detective/assets.ts` | Modify | `ClueKind` +3, `CLUE_ART` +3, `grip` on `ArtImage`/`CARRIER_LENS_ART`; `CULPRIT` and `ANIMAL_ART.ruledOutBy` deleted. |
| `client/src/detective/palette.ts` | Modify | `BREADCRUMB`, `BUBBLE`. |
| `client/src/detective/palette.test.ts` | Modify | `EARNED` → six; `:121-127` re-scoped per case. |
| `client/src/detective/artManifest.test.ts` | Modify | `:72` unwrap, `:116-117` comment, `:121` 38 → 44. |
| `client/src/detective/PistasRail.tsx` | Modify | Module header's stale D6 "never typeset" claim corrected. |
| `client/src/canvas/placeArt.ts` (+`.test.ts`) | Create | `placeArt`, `DEFAULT_GRIP`. |
| `client/src/canvas/TraceCanvas.tsx` | Modify | `:1257-1264` uses `placeArt`; `TraceCarrierArt` gains `grip?`. |
| `client/src/home/modes.ts` | Modify | `HomeMode.grip` and `DEFAULT_GRIP` removed; the narrative moves to `assets.ts`. |
| `client/src/home/caseState.ts` | Modify | `activeCase`; `nextCaseStep`/`railSlots`/`lampOn` per case; `CaseStep.deduce` carries `caseId`. |
| `client/src/screen/Deduction.tsx` | Modify | `kase`/`solved`/`onSolved`/`onExit` props; captioned lineup; `solvesCase`; `pickAnimal(state, animal, culprit)`; dead `.pistas-rail` CSS (`:217,:224`) removed. |
| `client/src/screen/GameScreen.tsx` | Modify | `GameView`/`GameAction` carry `caseId`; `initialView` returns `null` + `?nivel=mapa` dev gate; `resolveNextAction` per case; `onExit` prop; `DETECTIVE_TRAIL_IDS` re-export (`:95`) dropped. |
| `client/src/screen/HomeScreen.tsx` | Modify | `Hung` uses `placeArt`; per-case rail. |
| `client/src/App.tsx` | Modify | `initialShell` null-handling; `onExit={goHome}`. |
| `client/src/levels/catalog.ts` | Modify | Four duck configs between `f1-libre` and `trail1`. |
| `client/src/levels/catalog.test.ts` | Modify | `EXPECTED_IDS` +4; `duck-trail4` clearance case. |
| `client/src/game/types.ts` | Modify | `DUCK_TRAIL_IDS` beside `DETECTIVE_TRAIL_IDS` (`game/` cannot import `detective/cases.ts` without dragging the catalog in). |
| `client/src/game/migrateDuckCase.ts` (+`.test.ts`) | Create | The positional-unlock migration. |
| `client/src/game/openProgressStore.ts` | Modify | Second migration loop. |
| `scripts/art/build_art.py` | Modify | Two palette tuples, six `SINGLES` rows. |
| `client/public/art/*` | Generated | Six PNGs + `manifest.json`, by running the script. |
| `docs/01`..`docs/05` | Modify | Fase → Nivel reterm (§Docs). |
| `docs/09_GUIA_DE_ESTILO_VISUAL.md` | Modify | `:228-230`'s D6 "never typeset" claim corrected. |
| `docs/11_PULPITO_DETECTIVE_DIRECTIVA.md` | Create | Faithful Spanish transcription beside the unreadable PDF. |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (data) | `DETECTIVE_CASES` structure | §9's five per-case assertions, iterating the registry. |
| Unit (data) | palette | Existing eight assertions over a six-token `EARNED`; distinctness re-scoped per case and still falsifiable. |
| Unit (data) | art registry vs pipeline | `artManifest.test.ts` at 44 entries; no orphan manifest key. |
| Unit (pure) | `clueKindsOf`, `caseOf`, `activeCase`, `nextCaseStep` | Hand-built `Records`; the `-deduce` pseudo-id drives the case-to-case transition. |
| Unit (pure) | `solvesCase`, `pickAnimal(…, culprit)` | Per case; a wrong pick is still free and still reference-stable. |
| Unit (pure) | `migrateDuckCase` | Idempotent on re-run; no write below the approval threshold; no write when any duck record exists; never deletes; a mid-hen-campaign `cursiva.levels.v1` payload keeps every unlock and demotes nothing. |
| Unit (pure) | `placeArt` | Default grip centres; `[0.603, 0.391]` lands off the bbox centre (fails if reverted); aspect held; no `NaN`. |
| Unit (pure) | `initialView`, `resolveNextAction`, `nextView` | Node, existing `GameScreen` test pattern; `?nivel=mapa` under `dev` true and false. |
| Unit (geometry) | `duck-trail4` | `cornerClearance`/`armClearance` measured from the shipped path, as `catalog.test.ts:579` does for `trail4`. |
| Type | `label` is required | `@ts-expect-error` in `CaptionedArt.test.tsx`, enforced by `npm run build` (`tsc --noEmit`, `tsconfig.json:20` includes `src`). Vitest cannot prove this. |
| Component | caption invariant | `auditCaptions` over `renderToString` of HomeScreen / LevelPlay(detective) / Deduction; plus the four hand-built falsifiability rows of §2. |
| Component | lineup | Duck renders three captioned animals, hen four; zero `url(#` in either. |
| Screenshot (human) | `scripts/shot.sh` | Three checks, assigned per slice in §10. Non-negotiable: this repo's three big defects were all found by screenshots and none by the suite. |
| E2E | N/A | No browser harness in this repo. |

## Threat Matrix

N/A — no routing (in the HTTP/shell sense), shell command, subprocess, VCS/PR automation,
executable-file classification, or process-integration boundary. `build_art.py` is an
author-run, dependency-free, network-free local script over files already in the repo, not a
process this change integrates with at runtime. The change is client-side rendering, pure
geometry, and one `localStorage` copy-forward.

## Migration / Rollout

One-time, copy-forward, positional-unlock safe; §6 in full. No feature flag, no phased
rollout, no stored version flag — idempotency is "the destination already has a record".
`migrateDuckCase` must ship in a slice **before** the catalog insertion.

---

## Docs: the Fase → Nivel reterm

### Decision: `Nivel` is a narrative grouping over `Fase`, not a rename of it

**Choice**: the docs adopt the directive's `Nivel` vocabulary and, at every code-enforced
boundary, write it as **`Nivel N (Fase M en el código)`**. `levels/types.ts:8`'s
`export type Phase = 1 | 2 | 3 | 4 | 5` **stays exactly as it is**, and so does the `phase`
field on every `LevelConfig`. This step is vocabulary in prose only; `LevelMap.tsx:76` and
`LevelPlay`'s `<h1>` keep emitting "Fase N", and that mismatch is intentional and temporary
(proposal §Out of Scope).

**Alternatives**: rename the `Phase` type to `Nivel` and renumber it.

**Rationale**: the mapping is **not** one-to-one. The directive defines seven levels' worth of
content over five phases — Fase 1 splits into Nivel 1 (exploración) and Nivel 2 (casos), and
Fase 2 splits into Nivel 3 (U/medusa) and Nivel 4 (montañas/ovejas). A rename would need
`Phase` to gain two members, which would renumber `WITHDRAWAL_FROM_PHASE` from 3 to 5 and move
the `'blank'`/`'ruled'` surface split with it — a real behaviour change dressed as a
vocabulary change. Writing both numbers at every boundary is also the thing that stops a later
reader from "fixing" the mismatch by renumbering.

| Directive Nivel | Content | Today's Fase | Levels it names |
|---|---|---|---|
| Nivel 1 — Exploración y descubrimiento | limpiar recintos, los carteles `PECES`/`TORTUGAS`/`PATOS` | Fase 1 (free part) | `f1-libre` (+ step 4's fog and signs) |
| Nivel 2 — Laberintos, rastros y casos | four trails per case, three-option deduction | Fase 1 (routed part) | `duck-trail1..4`, `trail1..4` |
| Nivel 3 — Agua, medusa y movimientos en U | U grandes → U sucesivas → amplitud variable → frenar y continuar | Fase 2 (first half) | `f2-guirnalda` (+ step 2) |
| Nivel 4 — Montañas y ovejas | picos, ascensos y descensos | Fase 2 (second half) | `f2-colinas`, `f2-crestas` (+ step 3) |
| Nivel 5 — Grafema aislado | la letra sola | Fase 3 | `f3-l`, `f3-a`, `f3-m`, `f3-o` |
| Nivel 6 — Enlace y ligadura | dos letras unidas | Fase 4 | `f4-la`, `f4-ma` |
| Nivel 7 — Palabra y automatización | palabra completa, guía retirada | Fase 5 | `f5-ala`, `f5-mama` |

`f2-bucles` ("Los rulos altos", `loops()` with a real self-crossing) is neither a U nor a
mountain. The docs record it inside Nivel 4 as an explicitly-flagged **transition** level, and
say so — it is the first movement that is already a letter (`l`). Inventing a directive
section for it would be worse than admitting the seam.

**The two boundaries that must relabel without renumbering:**

- `docs/03:48` `### 3.1 El retiro se aplica desde la Fase 3, nunca antes` →
  `### 3.1 El retiro se aplica desde el Nivel 5 (Fase 3 en el código), nunca antes`. Same
  levels: `f3-*` onward, exactly what `WITHDRAWAL_FROM_PHASE = 3` reaches
  (`LevelPlay.tsx:503`, used at `:507` as `level.phase < WITHDRAWAL_FROM_PHASE`).
- `docs/03:50,53` ("En las Fases 3 a 5…", "En las Fases 1 y 2 el canal **es** el nivel") →
  Niveles 5-7 and Niveles 1-4 respectively, same `surface: 'blank' | 'ruled'` split.
- `docs/01:33,52,57,62,66`'s five `### Fase N` headings keep their pedagogy verbatim and gain
  the Nivel label; `:25`'s phase diagram and `:98`'s "Familias de movimiento (Fase 3 en
  adelante)" follow the same both-numbers rule.
- `docs/04:30-34`'s inventory is already stale (it lists the six retired `f1-*` ids that now
  live only in `LEGACY_PHASE_1`) and is rewritten against the live catalog, duck trails
  included. `docs/04:60` quotes the rendered `"Fase 2 · Las hamacas"`, which the code still
  emits — it stays as a code quote and is marked as one.
- `docs/05:13-22`'s per-phase reward ladder is retermed and reconciled with what shipped.
- `docs/02:116,118`'s corridor-width contrast and narrow-channel floor are content: retermed,
  never dropped.

---

## Slice Plan

Session budget 800 lines; per-PR guard 400. Estimates are authored additions + deletions;
generated PNGs and `manifest.json` are excluded from the authored count (Section E) but stay
in the snapshot. Data before consumers, consumers before navigation, docs last. Every slice
ends green on `npm test` and `npm run build`.

| # | Slice | Files | ± |
|---|---|---|---|
| S1 | `fix(progress)` seed the duck trails before they exist | `game/types.ts`, `migrateDuckCase.ts`, `.test.ts`, `openProgressStore.ts` | 175 |
| S2 | `feat(detective)` duck art, tokens, clue kinds, the four levels and the case registry | `build_art.py`, `palette.ts`, `palette.test.ts`, `assets.ts`, `artManifest.test.ts`, `catalog.ts`, `catalog.test.ts`, `cases.ts`, `cases.test.ts` | **430** |
| S3 | `feat(detective)` captioned art and the caption audit | `CaptionedArt.tsx`, `.test.tsx`, `captionAudit.ts`, `.test.ts`, `LevelPlay` CSS | 210 |
| S4 | `refactor(detective)` every text-absence suite asserts the new invariant | `HomeScreen.test.tsx`, `App.test.tsx`, `PistasRail.test.tsx`, `LevelPlay.test.tsx`, `Deduction.test.tsx` | 160 |
| S5 | `feat(detective)` the deduction becomes case-driven and captioned | `Deduction.tsx`, `Deduction.test.tsx`, `assets.ts` (`CULPRIT`/`ruledOutBy` out) | 300 |
| S6 | `feat(detective)` per-case routing | `caseState.ts`, `.test.ts`, `GameScreen.tsx`, `.test.tsx`, `HomeScreen.tsx`, `App.tsx` | 290 |
| S7 | `feat(main-screen)` leaving a mode lands on the office; the map becomes a dev surface | `GameScreen.tsx`, `App.tsx`, `levelFlow.test.ts`, `GameScreen.test.tsx`, `App.test.tsx` | 130 |
| S8 | `fix(canvas)` the lens centres on the fingertip | `placeArt.ts`, `.test.ts`, `assets.ts`, `TraceCanvas.tsx`, `modes.ts`, `HomeScreen.tsx` | 165 |
| S9 | `docs` Nivel reterm, the directive transcription, the two D6 corrections | `docs/01`..`05`, `docs/09`, `docs/11*.md`, `PistasRail.tsx` header | 300 |

**Total ≈ 2,160 authored ±.** `auto-chain`, chained PRs.

**Ordering is load-bearing in three places.** S1 before S2, or the catalog insertion locks a
returning child out of `trail1` (D4, and the same rule `detective-mode` recorded for its units
8 and 10). S3 before S4, or the audit the rewritten suites call does not exist. S2 before S5
and S6, or `DETECTIVE_CASES` is not there to drive them.

**S2 is the recorded `size:exception`**, at 430 against the 400 guard. It cannot be split: the
moment `webfoot: PRINT` enters `CLUE_ART`, `palette.test.ts:125-126`'s global distinctness
goes red, and the only honest repair is the per-case re-scope, which needs `DETECTIVE_CASES`,
which needs `clueKindsOf`, which needs the duck levels in the catalog. That knot is the direct
price of §1's derive-don't-restate decision, and the proposal accepts it by name.

**Screenshot checks (human-reviewed, `scripts/shot.sh`):**

- **S2** — a duck trail mid-trace at each of the four widths: do 100 → 70 read as a
  progression, and do `duck-trail4`'s elbows read as corners rather than merging? And a
  drained webfoot on corridor earth, against the `lamparita apagada` failure (§4).
- **S5** — the duck deduction: three animals, each with its word underneath in Nunito, the
  caption under the picture and not beside it, legible at the short-viewport breakpoint.
- **S8** — a trail mid-trace with the lens on the fingertip. This is the defect the change
  exists to fix and the suite can only prove the arithmetic, not the placement.

## Open Questions

- [ ] `duck-trail4` at `corridorWidth: 70` is as narrow as `trail4`, so the *first* case ends
      as tight as the second case's hardest trail. The widths are settled by the proposal's
      scope, and this is one number in `catalog.ts`; flag it on S2's screenshot pass and widen
      to 80 only if a child pass says so.
- [ ] Whether `clue-webfoot-drained.png` reads on corridor earth as a flat silhouette, or
      needs a grey companion source (§4). Resolvable only by running the pipeline and looking.
- [ ] Whether `art-source/burbuja.png` and `huella palmeada.png` carry real alpha. The
      renderer this design was written with composites transparency inconsistently, so it was
      not determined here; `manifest.json`'s emitted `w`/`h` settles it in one line (§4).
- [ ] Nothing blocking. No decision below is waiting on input.

### Accepted deviation

This document exceeds the skill's 800-word cap. `openspec/config.yaml:21-22` requires every
architecture decision to carry its rationale, the change carries ten design units with real
signatures, and no decision could be shortened without dropping its reason — the same
deviation `openspec/changes/detective-mode/design.md:397-402` recorded.
