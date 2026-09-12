# Design: The Zoo Map Is the Main Screen

Binding input: `proposal.md`. Its D1–D6 are settled and are not reopened. Its three open
decisions were RULED by the orchestrator before this document and are recorded as settled
in §2. Every file:line below was re-verified against the working tree on branch
`sdd/zoo-map-home`; where a number differs from the brief it is marked **[measured]**.

## Technical Approach

Nothing in the trace engine, the level engine, the catalog or the progress store changes
shape. The change is one new leaf package plus one screen plus two navigation edits plus one
deletion:

1. `client/src/zoo/` — three pure data/decision modules (`sectors.ts`, `stars.ts`,
   `backpack.ts`) that own every fact about the world and every decision about it;
2. `client/src/screen/ZooMap.tsx` — one drawn illustration with registered layers on top
   (D5), an SVG for the world and DOM for the HUD;
3. `App.tsx` — the entry shell resolves to the map, and `goHome` becomes the return to it;
4. `GameScreen.tsx` — the after-level decision gains a third outcome that leaves the shell
   (D1), and the deduction auto-route goes (D2);
5. `client/src/home/` and `screen/HomeScreen.tsx` are deleted **last**, in their own slice.

The governing constraint is the harness, unchanged since `case-registry-and-captions`:
vitest on the **node** environment, no jsdom, no testing-library, `client/vite.config.ts`
sets only `include`. Every component test is `renderToString` plus string assertions, so a
decision taken inside a click handler is invisible to it. Every decision this change
introduces is therefore a **named exported pure function** — `isOpen`, `nextAdventure`,
`sectorOf`, `recentlyDiscovered`, `animalPlacements`, `footprintTrail`, `fogBoxes`,
`starsFor`, `totalStars`, `isSectorDebug`, `resolveNextAction` — and the handler only
dispatches it. The precedents are exactly the ones already shipped: `shouldFileClue`
(`LevelPlay.tsx:594`), `resolveNextAction` (`GameScreen.tsx:140-150`), `nextCaseStep`
(`home/caseState.ts:77`), `modeArt` (`home/modes.ts`), `bandScatter`
(`home/officeGround.ts:72`).

No `url(#…)` (D6). No new dependency. No new persisted key. All nine `zoo-*` assets are
already registered at `detective/assets.ts:193-238` and already guarded by
`artManifest.test.ts` (manifest parity **and** on-disk existence, read through
`import.meta.glob` because `@types/node` is not a dependency) — so this change adds **no**
art test: the hrefs it consumes are already proven to resolve.

---

## 1. The geometry, and why every coordinate in this change follows from one line

This is the load-bearing fact of the whole document.

`client/public/art/zoo-map.png` is exactly **1536 × 1024** (3:2). The map `<image>` is laid
on the full `0 0 1000 600` viewBox (5:3) at `preserveAspectRatio="xMidYMid slice"`. `slice`
scales by the **larger** ratio:

```
scaleX = 1000 / 1536 = 0.651042        scaleY = 600 / 1024 = 0.585938
slice  = max(scaleX, scaleY) = 0.651042          → the image covers by WIDTH
rendered = 1536 × 0.651042 = 1000 wide, 1024 × 0.651042 = 666.667 tall
centred on a 600-tall box → y ∈ [−33.333, 633.333]; 33.333 units cropped top and bottom
```

Because a single scale is used on both axes, the image→viewBox map is **uniform** and
invertible in closed form:

```
vbX = imgX × (1000 / 1536)              = imgX × 0.651042
vbY = imgY × (666.667 / 1024) − 33.333  = imgY × 0.651042 − 33.333
```

Both factors are `0.651042`. Every rect below was produced by region-restricted colour
sampling of the shipped PNG and then pushed through those two lines. Nothing here was eyed.

### Decision: the crop happens inside the viewBox, never against the viewport

**Choice**: the outer `<svg>` keeps `preserveAspectRatio="xMidYMid meet"` (the same value
`HomeScreen.tsx:213` uses) and the **map `<image>` inside it** carries the `slice`. The
letterbox `meet` leaves is filled with the document background `#76B56A`.

**Alternatives considered**: `slice` on the `<svg>` root, which is the literal reading of
`docs/12` §3's sketch.

**Rationale**: three things fall out, and all three are load-bearing.

- **The crop becomes a constant.** With `slice` on the root, how much of the map a child
  sees depends on the device's aspect ratio, so the proposal's Med risk ("`slice` crops
  something load-bearing on a tall tablet") is unbounded. With `slice` on the `<image>`
  inside a fixed 5:3 viewBox, the crop is **always** 33.333 units off the top and 33.333 off
  the bottom, on every device. The risk stops being variable and becomes one measurable fact.
- **The HUD can be positioned in percent, exactly.** `docs/12` §3 requires the HUD as DOM
  outside the SVG, and the speech bubble has to sit near the plaza. A DOM node cannot track
  a root-level `slice` in both axes with pure CSS. Under `meet` the SVG's rendered box is
  exactly 5:3, so wrapping it in a `position: relative` container pinned to that same ratio
  makes `left: {x/10}%` / `top: {y/6}%` an **exact** viewBox→CSS mapping. No JS measurement,
  no `ResizeObserver`, no layout effect — which matters because the harness has no DOM and
  could not test one.
- **`docs/09` §7's rule gets a job.** The letterbox is what the measured edge colour
  `#76B56A` fills. Under a root `slice` there is no letterbox and the background colour is
  dead code that nobody would notice rotting.

`docs/12` §3's sentence is honoured where it matters: the map image really is
`xMidYMid slice` and really is full-bleed inside the world's coordinate system.

### The measured registry

| Sector | Measured feature on the PNG | `hit` (x, y, w, h) |
|---|---|---|
| `nocturna` | night sky blob `#496A93` at 102, 27, 235×168 | 95, 22, 250, 190 |
| `montanas` | grey peaks `#90969D` at 385, 73, 236×102 (snow caps above) | 360, 22, 270, 140 |
| `estanque` | lagoon water `#67BCE8` at 675, 77, 246×180 | 660, 68, 280, 200 |
| `bosque` | tree canopy, left edge | 25, 230, 300, 300 |
| `arena` | sand blob `#EFCB8D` at 670, 294, 270×254 | 675, 290, 280, 228 |
| `entrada` | gate + bridge, bottom centre | 398, 424, 228, 170 |
| `sendero` | the drawn paths themselves | **absent** (OD3) |
| `PLAZA` (not a sector) | central tan disc | 408, 225, 180, 115 |

`PLAZA_CENTRE = { x: 498, y: 282 }` — where the octopus stands and where the footprints
start. `estanque.animalSpot = { x: 735, y: 200 }`, inside the water and clear of the reed
island at x ∈ [768, 833], y ∈ [130, 182].

**[measured] Re-verified pairwise here.** All seven rects are mutually disjoint and every
sector `hit` is ≥ 120 × 120 (smallest: `entrada` at 228 × 170). The brief records the
minimum gap as 15 units between `nocturna` and `bosque`; the actual minimum is **15 units
between `nocturna` and `montañas` on x** (345 → 360), with `nocturna`→`bosque` at **18 units
on y** (212 → 230). No decision changes — both clear the strict-disjointness test — but the
number is corrected here rather than copied forward wrong. `entrada` ends at y = 594, six
units inside the viewBox, so the drawn gate extends below the `hit` and the `hit` never
needs clipping.

**These numbers are a measured first pass, not gospel.** `docs/12` §4 governs what happens
when one misses: **the registry is corrected against the `?debug=sectores` screenshot, never
the drawing.** Nothing in this change may respond to a misplaced rect by editing
`zoo-map.png`.

---

## 2. The three ruled decisions, recorded as settled

### OD1 — Stars are derived, and the conflation is deliberate and isolated

**Choice**: a new `client/src/zoo/stars.ts` exporting two pure functions.
`starsFor(record) = Math.min(record.approvals, APPROVALS_TO_UNLOCK)` — one star per
approval, capped at 2. `totalStars(records)` sums `starsFor` over every record **whose id is
a real catalog level**, so the `<caseId>-deduce` pseudo-records (`duck-deduce`,
`hen-deduce`) never count. No new persisted state, no invented quality threshold.

**Alternatives considered**: a new `stars` field on `LevelRecord` (a schema change and a
migration, for a rule paso D is expected to replace); a quality threshold over
`bestAccuracy`/`bestFluency` (inventing a pedagogy number nobody authored).

**Rationale, with its tension stated verbatim rather than hidden**: `docs/12` §1 says of
advance and stars that they *"son dos cosas distintas y no se mezclan"* — and `approvals`
**are** advance. This rule therefore conflates exactly the two things the directive
separates. It is accepted as a **deliberate placeholder for paso D**, when the backpack
defines what a star *costs*, on three conditions that make it cheap to undo: it is one pure
function, it has one call site (`ZooMap`'s HUD), and it writes nothing. Rolling it back is
deleting a file. The alternative — shipping the map with no star count — would leave one of
`docs/12` §1's three permanent elements unbuilt and unplaceable.

The pseudo-record filter is not defensive padding. `LevelProgressStore` keys by arbitrary
string and re-serialises unknown ids untouched (`LevelProgressStore.ts:75-77`, `:93`), which
is precisely why `duck-deduce` is sitting in real children's `cursiva.levels.v1` today with
`approvals: 1`. Without the filter the star count would be inflated by a screen the child
never sees.

### OD2 — Tapping a finished sector re-enters its last adventure

**Choice**: `nextAdventure(sector, records)` returns the first unfinished adventure id; if
every one is filed it returns the **last** id; for a sector with no adventures at all it
returns `null`.

**Alternatives considered**: making a completed sector inert.

**Rationale**: on the one sector that is finished, inert reads as broken to a five-year-old
who just watched the duck appear there. Replay costs nothing — `approvals` is monotonic, the
adaptive-tolerance record only improves, and `LevelPlay` already supports re-entering a
filed trail through `?nivel=`. Returning the last id rather than the first also keeps the
re-entry meaningful: it lands on the hardest thing the child has beaten, not back at the
easiest. `null` is reachable only for a sector whose `adventureIds` is empty, which today is
every fogged sector — and those are never tappable anyway, so `null` is the type being
honest rather than a state the UI can reach.

### OD3 — The sendero is non-interactive scenery

**Choice**: `hit` is **optional** on `ZooSector`. The sendero carries no `hit`, `fog: []` and
`adventureIds: []`. A sector without a `hit` is never tappable, never fogged, and is skipped
by both geometry tests. It exists in the registry only so `docs/13` §3's seven-row table is
complete in code.

**Alternatives considered**: giving it a `hit` over the drawn paths; leaving it out of the
registry entirely.

**Rationale**: `docs/12` §4 demands no two `hit`s overlap and a 120 × 120 minimum. The
sendero *is* the paths, which run between the plaza and every neighbour — any 120 × 120 rect
on them necessarily collides with the plaza or a sector, so giving it a `hit` would break the
very test §4 exists to impose. Omitting the row instead would make the registry silently
disagree with `docs/13` §3 and would invite a later reader to "add the missing sector" with a
rect. The optional `hit` says both things at once: this place is real, and it is not a
destination. It is the same move `ZooSector` makes nowhere else — every other field is
required — so the optionality itself is the discriminator, not a convenience.

---

## 3. Interfaces

### `client/src/zoo/sectors.ts`

```ts
import { LEVELS } from '../levels/catalog'
import { ZOO_FOG_ART } from '../detective/assets'
import { placeArt, type ArtBox } from '../canvas/placeArt'
import type { AnimalId } from '../detective/assets'
import type { LevelRecord } from '../game/types'

/** The persisted records, straight from `cursiva.levels.v1`. Re-homed here
 *  because `home/caseState.ts:29` owned this alias and is deleted; nothing
 *  outside `home/` ever imported it (verified). */
export type Records = Readonly<Record<string, LevelRecord>>

/** "Filed" = at least one approval, the exact rule `caseState.isFiled` used. */
export function isFiled(records: Records, levelId: string): boolean {
  return (records[levelId]?.approvals ?? 0) >= 1
}

/** An axis-aligned rect in viewBox units. `ArtBox` (canvas/placeArt.ts:36)
 *  is the same shape with `w`/`h` spelled out; this one keeps `docs/12` §3's
 *  own field names so the registry reads like the directive. */
export interface Rect { x: number; y: number; w: number; h: number }

export interface FogPatch {
  /** Index into ZOO_FOG_ART: 0 wide (495×155), 1 tall (343×479), 2 round (474×424). */
  art: 0 | 1 | 2
  /** Centre of the patch, viewBox units. */
  x: number
  y: number
  /** Rendered HEIGHT; width follows the file's own aspect ratio. */
  size: number
  /** ALWAYS 0, and the literal type is the guard — see §4. Kept rather than
   *  dropped because `docs/12` §3 names it: the field documents the degree of
   *  freedom this change refuses, instead of deleting the evidence of it. */
  rot: 0
  /** Mirror about the patch's own vertical centreline. Footprint-preserving
   *  (§4), which is why variety is spent here and not on `rot`. */
  flip?: boolean
}

export interface ZooAnimal {
  /** Drawn from `ANIMAL_ART[id]`, by its FEET (`STANDING_GRIP`). */
  id: AnimalId
  /** Offset from the sector's single `animalSpot`, so one spot carries a
   *  group. `docs/12` §3 names `animalSpot` singular and this keeps it that
   *  way — the medusa joins the estanque later with no schema change. */
  dx: number
  dy: number
  /** Rendered height, viewBox units. */
  size: number
  /** Every one of these filed ⇒ the animal stands in the zoo. DECLARATIVE
   *  ids, not a closure: §3's structural test needs to prove each id is a
   *  real catalog level, and a closure cannot be inspected. */
  appearsWhen: readonly string[]
}

export type SectorId =
  | 'entrada' | 'bosque' | 'estanque' | 'montanas' | 'arena' | 'nocturna' | 'sendero'

export interface ZooSector {
  id: SectorId
  /** ABSENT = scenery: never tappable, never fogged, skipped by both
   *  geometry tests (OD3, the sendero). */
  hit?: Rect
  fog: readonly FogPatch[]
  animalSpot: { x: number; y: number }
  animals: readonly ZooAnimal[]
  /** In play order. `docs/13` §3. */
  adventureIds: readonly string[]
  /** Pure, the shape `docs/12` §3 asks for. Today every implementation is
   *  `() => true` (estanque, D4's seed) or `() => false` (the five fogged
   *  sectors). Paso D's intro plugs in HERE, one line per sector. */
  unlockedWhen: (records: Records) => boolean
}

export const PLAZA: Rect = { x: 408, y: 225, w: 180, h: 115 }
export const PLAZA_CENTRE = { x: 498, y: 282 } as const
export const SECTORS: readonly ZooSector[]
```

The estanque's `adventureIds` is exactly, and in this order:
`duck-trail1, duck-trail2, duck-trail3, duck-trail4, f2-guirnalda, f2-agua2, f2-agua3,
f2-agua4`. Its one animal today is
`{ id: 'pato', dx: 0, dy: 0, size: 96, appearsWhen: ['duck-trail4'] }` — the duck appears
when `duck-trail4` is filed, **not** when the sector is done, which is why `appearsWhen` is
per-animal and not a per-sector flag.

### `client/src/zoo/stars.ts`

```ts
export function starsFor(record: LevelRecord): number
export function totalStars(records: Records): number   // real catalog ids only
```

### `client/src/zoo/backpack.ts`

```ts
export interface BackpackItem {
  id: string
  art: ArtImage
  /** Which sector grants it. `docs/13` §8 defers the answer to paso D. */
  grantedBy: SectorId
  /** Every one filed ⇒ the item is in the backpack. Same declarative shape
   *  as `ZooAnimal.appearsWhen`, for the same structural-test reason. */
  earnedWhen: readonly string[]
}

/** Deliberately EMPTY. The shape ships now so the HUD has one call site that
 *  survives paso D unchanged; the contents are paso D's decision. */
export const BACKPACK_ITEMS: readonly BackpackItem[] = []
export function earnedItems(records: Records): readonly BackpackItem[]
```

`earnedItems` over an empty registry returns `[]`, and the HUD draws the closed
`ZOO_BACKPACK_ART` — a backpack with nothing in it is exactly the true state of the world on
paso A, so this is not a stub standing in for content.

---

## 4. The fog-containment invariant

`docs/12` §4: for every closed sector, the union of its fog rects must contain its whole
`hit`. Three things have to be settled for that sentence to be provable.

### Decision: a fog patch's rect is `placeArt`, and `rot` is pinned to the literal `0`

**Choice**: `fogBoxes(sector)` maps each patch to
`placeArt(ZOO_FOG_ART[p.art], p.size, { x: p.x, y: p.y })` — the shipped placer
(`canvas/placeArt.ts:53`), with the default centre grip. `rot` is typed as the **literal
`0`**, not `number`. The renderer emits no `rotate(…)` on a fog `<image>` at all. Variety
comes from three different fog silhouettes, from `size`, and from `flip`.

**Alternatives considered**: allowing a real `rot` and proving containment conservatively
against the rotated rect's inscribed axis-aligned box; allowing `rot` and testing the
rotated polygon's union directly; deleting the field.

**Rationale**: a rotated blob's footprint is **not** its axis-aligned rect. Proving coverage
against the bounding box would be *unsound* — it would claim a corner is fogged that the art
leaves bare — and proving it against the inscribed box is both fiddly and so conservative
that it would force much larger patches, which is a worse picture arrived at by a harder
proof. Union-of-rotated-polygons is a real computational-geometry routine and it would be
the largest, least-reviewed thing in this change, written to buy a few degrees of tilt. A
horizontal `flip`, by contrast, leaves the axis-aligned footprint **bit-identical**, so it
buys variety at zero cost to the proof. The governing principle: **an unprovable invariant
is worse than a plainer picture**, and `docs/12` §4 asked for the invariant, not for the
tilt. The literal type is the guard rather than a test, the same mechanism
`CaptionedArt`'s required `label` uses (`case-registry-and-captions/design.md` §2): a
non-zero `rot` is `TS2322` under `tsc --noEmit`, which `npm run build` runs — a runtime test
could not prove it. A `@ts-expect-error` line in `sectors.test.ts` proves the guard is live,
exactly as `CaptionedArt.test.tsx` does.

The remaining approximation is stated rather than hidden: a fog PNG has soft alpha edges, so
its rect over-claims coverage at the corners by a constant amount. That is the same
approximation `docs/12` §4 itself assumes by asking about rects, and a screenshot is what
checks it.

### Decision: fog is authored by a closed-form construction, not by eye

**Choice**: for a closed sector with `hit = {x, y, w, h}`, two patches:

```
size    = 1.06 × h                                 (FOG_OVERLAP = 1.06)
centres = (x + w/4, y + h/2)  and  (x + 3w/4, y + h/2)
art     = any index whose aspect w/h satisfies  aspect ≥ hit.w / (2.12 × hit.h)
flip    = false, then true
```

**Proof, in two lines.** Vertically each box is `1.06h` tall centred on the hit's own
midline, so it spans `[y − 0.03h, y + 1.03h] ⊇ [y, y + h]`. Horizontally each box is
`size × aspect ≥ 1.06h × w/(2.12h) = w/2` wide, centred on the midpoint of its half, so it
covers that half. Two halves ⇒ the union contains the hit. ∎

**Alternatives considered**: hand-placing patches per sector and letting the test find the
holes.

**Rationale**: the test is exact (below), so hand-placing would eventually converge — but by
a loop of red runs, and whoever tunes a patch later has no rule to tune against. A
closed-form construction means the data is *derived* from the `hit` that was already
measured, which is the same derive-don't-restate move `clueKindsOf` made for clue kinds. The
five closed sectors resolve as: `nocturna` → art 2 (needs ≥ 0.62), `montanas` → art 2
(needs ≥ 0.91, and only the round blob at 1.118 clears it), `bosque` → art 1 (needs ≥ 0.47),
`arena` → art 1 (needs ≥ 0.58), `entrada` → art 1 (needs ≥ 0.63). Apply may hand-tune a
centre afterwards for looks; the test is what keeps the tuning honest.

### Decision: containment is verified exactly, by coordinate compression

**Choice**: `coversRect(boxes, target)` — collect every box edge clipped to `target` plus
`target`'s own edges, compress to sorted unique x and y lists, and assert some box contains
the centre of every resulting cell.

**Alternatives considered**: sampling on a fixed grid; comparing total area.

**Rationale**: sampling can pass over a hole narrower than the step, which is precisely the
failure this test exists to catch, and area comparison is wrong the moment two patches
overlap — which the construction above guarantees they do. Coordinate compression is exact
for axis-aligned rects, is about fifteen lines, and needs no dependency. It is also reusable
as-is by paso D when a sector gains a third patch.

---

## 5. Decision functions, and where each one lives

| Question | Function | Module | Consumer |
|---|---|---|---|
| is this sector open | `isOpen(sector, records)` = `!!sector.hit && sector.unlockedWhen(records)` | `zoo/sectors.ts` | `ZooMap` (fog, tap) |
| which adventure does a tap open | `nextAdventure(sector, records)` (OD2) | `zoo/sectors.ts` | `ZooMap` → `App.onEnter` |
| which sector owns this level id | `sectorOf(levelId)` | `zoo/sectors.ts` | `GameScreen.resolveNextAction` |
| where do the footprints point | `recentlyDiscovered(records)` | `zoo/sectors.ts` | `ZooMap` (footprints, bubble) |
| which animals stand where | `animalPlacements(sector, records)` → `readonly {art, box}[]` | `zoo/sectors.ts` | `ZooMap` |
| the footprint trail itself | `footprintTrail(from, to, step = 40)` | `zoo/sectors.ts` | `ZooMap` |
| each fog patch's rect | `fogBoxes(sector)` → `readonly ArtBox[]` | `zoo/sectors.ts` | `ZooMap`, the containment test |
| how many stars | `starsFor` / `totalStars` | `zoo/stars.ts` | `ZooMap` HUD |
| what is in the backpack | `earnedItems(records)` | `zoo/backpack.ts` | `ZooMap` HUD |
| is the debug overlay on | `isSectorDebug(search)` | `canvas/devMode.ts` | `ZooMap` |

`recentlyDiscovered` is paso A's one temporary rule, isolated on purpose: the first open
sector that still has an unfinished adventure, else `null`. Today that is the estanque until
`f2-agua4` is filed. A real *recently* needs persisted knowledge of what the child has
already been shown, which is paso D's `<sector>-seen` state and is out of scope here
(proposal, "No new persisted key"). One function, one call site, one line to replace.

`animalPlacements` returns boxes from `placeArt(ANIMAL_ART[a.id], a.size, spot)` with
`grip: STANDING_GRIP` — `docs/09` §3, *"los animales llevan el origen en las patas"*. The
recovered duck stands on its spot, it is not bisected by it. `STANDING_GRIP` is already
exported at `canvas/placeArt.ts:33`; no second placer is written.

### Decision: the footprint alternation is the shipped one, restated at zoo scale

**Choice**: `footprintTrail` places a print every `40` units along the straight segment from
`PLAZA_CENTRE` to the target `hit`'s centre, at arcs `40, 80, … ≤ dist − 40` (so no print
sits on either endpoint), offset `±PRINT_OFFSET` along the **left-hand normal**, with
`side = i % 2 === 0 ? 1 : -1`.

**Alternatives considered**: exporting `FOOTPRINT_OFFSET` from `detective/clues.ts` and
reusing it; inventing a fresh alternation for the map.

**Rationale**: `clues.ts:161-171` is the one alternation convention in this repo, and its
comment records *why* it exists (*"that is what makes a track read as walking"*). Its
formula is reused verbatim — SVG convention, y grows down, `rotate(deg)` turns clockwise,
so rotating the tangent `(cos, sin)` by +90° gives the left-hand normal `(−sin, cos)`. What
is **not** reused is the magnitude: `FOOTPRINT_OFFSET = 10` (`clues.ts:23`) is sized against
a trail's 35–45-unit corridor half-width and is not exported. The map has no corridor, and
its prints are rendered at ~26 units tall rather than a clue mark's size, so it declares its
own `PRINT_OFFSET = 12` beside a comment naming `clues.ts:161-171` as the source of the
*rule*. Exporting the trail constant instead would tie a map coordinate to a corridor
number, and the next person to widen a corridor would silently move the map's footprints.
The interior-arc rule (nothing on an endpoint) is `clueMarks`'s own
`(i + 1) / (count + 1)` reasoning (`clues.ts:137-146`) restated for a fixed pitch: a print
under the octopus and a print under the sector are both invisible.

The print art is 134 × 256 — taller than wide, so authored pointing along −y. `PRINT_FACING`
is therefore `−90°` added to `atan2(dy, dx)`. That offset is **measured from the file's
aspect, not from looking at it**, and is a named screenshot check in §9: does the toe point
at the sector?

### Decision: `?debug=sectores` is parsed by a pure function, and is not dev-gated

**Choice**: `canvas/devMode.ts` gains `export function isSectorDebug(search: string): boolean`
— pure over its one explicit argument, exactly like `initialView(search, dev)`
(`GameScreen.tsx:91`), and unlike `isDevMode()`, which reads `window`. `ZooMap` calls it with
the same `typeof window === 'undefined' ? '' : window.location.search` guard `App.tsx:46` and
`GameScreen.tsx:180` already use.

**Alternatives considered**: parsing inline in the component; gating it behind `isDevMode()`
the way `?nivel=mapa` is.

**Rationale**: inline is untestable — the harness has no `window` and the decision would sit
inside a render body with no exported name. The dev gate is deliberately *not* copied,
because the two flags are different in kind: `?nivel=mapa` opens a navigable surface
carrying a **destructive control** ("Reiniciar progreso"), which is why proposal D3 of the
previous change gated it. `?debug=sectores` paints seven translucent red rects and a marker
per `animalSpot`; it adds no control, no word (so it cannot affect `auditCaptions`), and no
route. It must work against the **exact build a reviewer is screenshotting** —
`scripts/shot.sh` takes any URL and is routinely pointed at a preview build — and a gate
would mean the reviewed build and the debugged build are different builds. That is the
failure mode `docs/12` §4's "captura con y sin el flag" instruction exists to avoid.

---

## 6. The after-level exit (D1), end to end

### Decision: the third outcome is a type OUTSIDE `GameAction`

**Choice**:

```ts
// client/src/screen/GameScreen.tsx
/** Leaving the game shell entirely. Deliberately NOT a `GameAction` member:
 *  `nextView` is shell-independent (its own comment, :44-52) and `App`'s
 *  `Shell` lives one level up (`App.tsx:27`). Keeping `exit` out of the
 *  union is what lets `nextView`'s switch stay exhaustive over exactly the
 *  states it can express. */
export type ExitAction = { type: 'exit' }
export type NextAction = GameAction | ExitAction

export function resolveNextAction(
  finishedLevelId: string,
  records: Readonly<Record<string, LevelRecord>>,
): NextAction {
  if (sectorOf(finishedLevelId)) return { type: 'exit' }
  return { type: 'next', levelId: nextLevelId(finishedLevelId) }
}
```

and the one call site becomes, at `GameScreen.tsx:203`:

```tsx
onNext={() => {
  const action = resolveNextAction(state.levelId, store.all())
  if (action.type === 'exit') onExit()
  else dispatch(action)
}}
```

**Alternatives considered**: adding `{ type: 'exit' }` to `GameAction` and intercepting it
before `dispatch`; a `GameView` variant; threading `App`'s `Shell` into `nextView`.

**Rationale**: adding it to `GameAction` would force `nextView`'s `switch` to grow a case for
a state `GameView` cannot represent — the reducer would have to either return `state`
unchanged (a lie the type system would then bless) or `throw`. Keeping `exit` in a sibling
type means `nextView` is *unchanged in this change*, its exhaustiveness still proves
something true, and the compiler forces the one call site to discriminate before
dispatching. This is D1's own reasoning ("a `GameAction` variant cannot express 'leave the
shell'") applied at the type level rather than by convention, and it mirrors why `onExit`
became a prop in `case-registry-and-captions` (§8) rather than an action.

`resolveNextAction` stays pure and node-testable, which is the whole reason it was extracted
in the first place (`GameScreen.tsx:122-139`: the real `onNext` closure runs inside a
`useState` setter and `renderToString` cannot observe a re-render).

### Decision: finishing ANY sector adventure returns to the map

**Choice**: the rule above — belongs to a sector ⇒ `exit`; otherwise today's catalog `next`,
byte-for-byte.

**Alternatives considered**: chain within the sector and exit only at its end; exit only at
an animal-group boundary; keep chaining and exit only after `duck-trail4`.

**Rationale**: `docs/12` §3 states the interaction directly — *"Tocar un sector abierto entra
a la primera aventura sin completar de ese sector. Volver de un nivel cae en el mapa."* The
map is where every reward this change builds is shown: the recovered animal, the rising star
count, the fog lifting. Chaining inside the sector would hide all three until `f2-agua4`, and
it would break the proposal's own success criterion that finishing `duck-trail4` lands on the
map with the duck at its `animalSpot`. Chain-to-the-animal-group would couple routing to the
animal registry and needs a "group" concept the data does not have. The cost is one extra tap
per adventure; that tap is the world re-asserting itself, and it is where the child sees the
star count go up.

Two consequences worth stating. `{ type: 'next' }` becomes reachable only for levels no
sector owns — today the hen's `trail1..4` and the phase 2–5 catalog, reachable through
`?nivel=` — which is honest: those are exactly the levels the zoo has not adopted yet, and
`nextLevelId` keeps working for them unchanged. And the deduction auto-route disappears
entirely (D2/proposal §8): `caseOf`, `allEarned` and `caseSolvedId` are no longer called from
`resolveNextAction`. `allEarned` (`GameScreen.tsx:115`) loses its last production caller;
it is **kept**, because `Deduction` is paused and not deleted, and deleting it would have to
be undone by paso D. Its own test stays green.

### The shell

```ts
// App.tsx
type Shell = { at: 'map' } | { at: 'game'; initial?: GameView } | { at: 'workbench' }

function initialShell(): Shell {
  const search = typeof window === 'undefined' ? '' : window.location.search
  const view = initialView(search, isDevMode())
  return view ? { at: 'game', initial: view } : { at: 'map' }      // was { at: 'home' }
}

const goToMap = () => { setRecords(readRecords()); setShell({ at: 'map' }) }
```

`goToMap` is the renamed `goHome` (`App.tsx:71-74`) and stays the **only** function that can
reach the map shell; it is still what `onExit` receives at `App.tsx:124`. `initialView` is
untouched, so `?nivel=<id>`, `?nivel=deduccion`, `?nivel=deduccion-<caseId>` and the
dev-gated `?nivel=mapa` all keep working exactly as they do today. `viewFor(step: CaseStep)`
(`App.tsx:55-59`) is **deleted**: the map hands down a level id, not a `CaseStep`, so
`onEnter` becomes `(levelId: string) => …` and the shell stops re-deriving anything.

---

## 7. The rendered tree

```
<main className="cv-zoo">                        background: #76B56A   ← measured edge colour
  <style>{ZOO_CSS}</style>
  <div className="cv-zoo-stage">                 aspect-ratio: 5/3; position: relative
    <svg viewBox="0 0 1000 600" width="100%" height="100%"
         preserveAspectRatio="xMidYMid meet" aria-label="El zoológico del Pulpito">
      <rect fill="#76B56A" …/>                   the world continues under the art
      <image href="/art/zoo-map.png" x=0 y=0 width=1000 height=600
             preserveAspectRatio="xMidYMid slice" />                       ← §1
      {closed sectors} <image href="/art/zoo-fog-N.png" {...fogBoxes} />   ← fog
        the recently-discovered sector's patch carries className="cv-zoo-fog-lift"
      {animalPlacements} <image href="/art/animal-pato.png" {...box} />    ← recovered
      {footprintTrail}   <image href="/art/zoo-octopus-print.png"
                                transform={`rotate(a cx cy)`} />           ← huellas
      <image href="/art/zoo-octopus-backpack.png" {...placeArt(art,150,PLAZA_CENTRE)} />
      {sectors with hit && isOpen} <rect {...hit} fill="transparent" onClick=… />
      {isSectorDebug} <rect {...hit} fill="#ff0000" opacity=0.28 /> + animalSpot markers
    </svg>

    <div className="cv-zoo-hud">                 position: absolute; inset: 0
      <div className="cv-zoo-hud-left">   <img src="/art/zoo-backpack.png" alt="" /> + items
      <div className="cv-zoo-hud-mid">    one <img> per recovered animal
      <div className="cv-zoo-hud-right">  <CaptionedArt art={ZOO_STAR_ART} label={`${n}`} />
    </div>
    {recentlyDiscovered && (
      <div className="cv-zoo-bubble" style={{ left: '49.8%', top: '47%' }}>
        <img src="/art/zoo-speech-bubble.png" alt="" />          the backdrop
        <CaptionedArt art={ZOO_OCTOPUS_PRINT_ART} label="¡Mirá! Las huellas van hacia allá. ¿Vamos?" />
      </div>
    )}
  </div>
</main>
```

Layer order is `docs/12` §3's, unchanged. Every picture inside the SVG is an
`<image href="/art/…">` — the one mechanism that survives D6's ban
(`HomeScreen.tsx:18-20`).

### Decision: the star count and the octopus's phrase both go through `CaptionedArt`

**Choice**: both live in the DOM, inside `CaptionedArt`
(`client/src/detective/CaptionedArt.tsx`). The speech bubble is a DOM `<div>` whose backdrop
is a plain `<img>` and whose content is a `CaptionedArt` pairing the footprint art with the
phrase.

**Alternatives considered**: SVG `<text>` inside the bubble `<image>`; licensing a third
`CAPTION_CONTAINERS` entry; a CSS `background-image` for the bubble.

**Rationale**: `CaptionedArt` emits HTML `<span class="cv-captioned">` / `<span
class="cv-caption">`, **not SVG** — which is exactly why `docs/12` §3 puts the HUD in the DOM
outside the SVG, and the two facts are the same fact. `captionAudit.ts:23` licenses
`['cv-captioned', 'pistas-bar']` and nothing else, and the archived design records that the
list is *not* an exemption list: every licensed container must itself carry an `<image
href>`. A bare `<text>` in the SVG would land in `audit.uncaptioned` and fail D3's rewritten
assertion — so the star count and the phrase have no other legal home. `label: string` is
required at type level, so neither can ship wordless-by-accident either. The bubble's
backdrop is an `<img>` rather than a CSS `background-image` because "every picture is a real
image node" is this repo's convention and is what keeps a picture greppable and
manifest-checkable; a CSS background would be a second, unprecedented mechanism introduced
for one node. §1's fixed 5:3 stage is what lets the bubble be positioned in percent and
still land on the plaza.

### Decision: the one self-motion is a scoped `<style>` with `@keyframes`

**Choice**: `ZOO_CSS`, a scoped `<style>` block on the screen's own class names, carrying an
opacity `@keyframes` over 1.5s applied to the recently-discovered sector's fog patches, plus
`@media (prefers-reduced-motion: reduce) { … animation: none }`.

**Alternatives considered**: an SVG `<animate>` element; a framer-motion transition; an SVG
filter or mask fade.

**Rationale**: the precedent is `HOME_CSS` at `HomeScreen.tsx:88-104`, which exists verbatim
because *"a keyframe animation cannot be expressed as an inline style"* and which already
carries the reduced-motion override this change must honour (`docs/12` §3). A mask or filter
is D6-banned outright: `TraceCanvas.tsx:69-86` records that `url(#…)` **hydrates blank on
real devices**, because the fragment resolves against the document base URL and `useId()`
differs server-to-client. framer-motion is a dependency the map does not otherwise need and
would put the one moving thing behind a runtime the node harness cannot render. Opacity on
an `<image>` needs neither.

Because the fade is a CSS class, `renderToString` can assert the class is present on exactly
the right patch and absent everywhere else — which is the only part of an animation this
harness can see, and it is stated as such rather than pretended otherwise.

---

## 8. What is deleted, in what order

Deletion is the **last** slice, after the map is provably the entry screen (proposal
§Approach). Order inside it:

1. `client/src/screen/HomeScreen.tsx` and `HomeScreen.test.tsx`;
2. `client/src/home/modes.ts` + `modes.test.ts`, `officeGround.ts` + `officeGround.test.ts`,
   `caseState.ts` + `caseState.test.ts` — the whole folder.

Verified importers of `home/*` outside `home/` itself: `App.tsx:20,22`, `HomeScreen.tsx:33,
41,42`, `HomeScreen.test.tsx:6`. Nothing else. `isFiled`, `Records`, `activeCase`,
`railSlots` and `lampOn` are used only inside `home/` and by `HomeScreen`; `LevelPlay` and
`Deduction` build their own rail slots.

**The `App.tsx` type-import fallout is a tripwire, not a chore.** `import type { CaseStep }
from './home/caseState'` (`:20`) and `import type { HomeMode } from './home/modes'` (`:22`)
are already `import type` under `verbatimModuleSyntax`, so removing them is pure deletion —
and `noUnusedLocals` means leaving either one behind after `viewFor` and the `onEnter`
signature change is a **build error**, not a silent orphan. `import HomeScreen from
'./screen/HomeScreen'` (`:15`) goes the same way. `import type { LevelRecord }` (`:21`) stays:
`readRecords()` still declares it.

Two consequences to expect rather than debug. `npm test`'s file and test counts drop from the
branch baseline of 60 files / 1145 tests — the deletion slice is the only place that is
allowed to happen, so a drop anywhere else is a regression. And `home-octopus.png` /
`home-desk.png` **stay registered** in `assets.ts` with nothing rendering them, guarded by
`artManifest.test.ts:149` and `artHierarchy.test.ts:281`; un-registering them means touching
`build_art.py`, the manifest and two tests for no gain (proposal §Out of Scope).

`App.test.tsx:21`'s `/art/home-octopus.png` assertion must move in the slice that **switches
the entry**, not the slice that deletes the office, or the suite goes red between them.

---

## Data Flow

```
zoo-map.png (1536×1024) ──[ imgX×0.651042 , imgY×0.651042 − 33.333 ]──▶ SECTORS[].hit
                                                                             │
cursiva.levels.v1 ─▶ openProgressStore() ─▶ Records ─┬─▶ isOpen ─────────────┼─▶ fog layer
   (no write, ever)                                  ├─▶ animalPlacements ───┼─▶ animals
                                                     ├─▶ recentlyDiscovered ─┼─▶ huellas + bocadillo
                                                     ├─▶ totalStars ─────────┼─▶ HUD ★
                                                     └─▶ earnedItems ────────┴─▶ HUD mochila
                                                                             │
                                     tap on an open sector's <rect> ─▶ nextAdventure(sector, records)
                                                                             │
   App { at:'map' } ◀── goToMap ◀── onExit ◀─┐                                ▼
                                             │        App { at:'game', initial:{view:'play',levelId} }
                                             │                                │
                                             │                                ▼
                          resolveNextAction ─┤                           GameScreen
                          sectorOf(id) ? exit│                                │
                                             └── else { type:'next' } ──▶ nextView ──▶ LevelPlay
```

## File Changes

| File | Action | Description |
|---|---|---|
| `client/src/zoo/sectors.ts` | Create | `Rect`, `FogPatch`, `ZooAnimal`, `ZooSector`, `SECTORS`, `PLAZA`, `PLAZA_CENTRE`, `Records`, `isFiled`, and the eight decision functions of §5. |
| `client/src/zoo/sectors.test.ts` | Create | The geometry invariants, the decision functions, the `@ts-expect-error` `rot` proof. |
| `client/src/zoo/stars.ts` (+`.test.ts`) | Create | `starsFor`, `totalStars` (OD1). |
| `client/src/zoo/backpack.ts` | Create | `BackpackItem`, empty `BACKPACK_ITEMS`, `earnedItems`. |
| `client/src/screen/ZooMap.tsx` (+`.test.tsx`) | Create | The screen of §7: layers, HUD, bubble, `ZOO_CSS`, debug overlay. |
| `client/src/canvas/devMode.ts` | Modify | `isSectorDebug(search)` beside `isDevMode()`. |
| `client/src/App.tsx` | Modify | `Shell.at: 'map'`; `initialShell` fallback; `goHome`→`goToMap`; `viewFor` and the three `home/` imports deleted; header rewritten to name `docs/12`. |
| `client/src/App.test.tsx` | Modify | Entry assertion → `/art/zoo-map.png`; D3's text-absence assertion → `auditCaptions`. |
| `client/src/screen/GameScreen.tsx` | Modify | `ExitAction`/`NextAction`; `resolveNextAction` sector-aware; `onNext` discriminates; `caseOf`/`caseSolvedId` import narrowed. |
| `client/src/screen/GameScreen.test.tsx`, `levelFlow.test.ts` | Modify | The deduce-route cases become exit cases; `nextView` cases unchanged. |
| `client/src/screen/HomeScreen.tsx` + `.test.tsx` | Delete | Superseded by the map. |
| `client/src/home/` (6 files) | Delete | `modes`, `officeGround`, `caseState` and their tests. |
| `client/src/detective/assets.ts` | Unchanged | The nine `zoo-*` entries already exist and are already guarded. |
| `client/public/art/*`, `scripts/art/build_art.py` | Unchanged | No art is generated by this change. |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (geometry) | fog containment | `coversRect` by coordinate compression, per closed sector. Falsifiability: shrinking one patch's `size` to `0.5 × h` must go red. |
| Unit (geometry) | `hit` hygiene | pairwise disjoint, disjoint from `PLAZA`, every one ≥ 120 × 120; `sendero` asserted as the **only** sector without a `hit`, so a later `hit` on it cannot slip past. |
| Unit (data) | registry↔catalog | every `adventureIds` entry and every `appearsWhen` id is a real `LEVELS` id; no level id appears in two sectors; `estanque.adventureIds` equals the exact eight-id list in order. |
| Unit (pure) | `nextAdventure` | first unfinished → that one; all filed → the **last** (OD2); empty → `null`. |
| Unit (pure) | `sectorOf`, `isOpen`, `recentlyDiscovered` | hand-built `Records`; estanque open from an empty store (D4), the five others closed at every input. |
| Unit (pure) | `footprintTrail` | pitch is exactly 40; no print on either endpoint; consecutive prints on **opposite** sides of the line (the alternation invariant, `clues.ts:161-171`); zero prints under two steps. |
| Unit (pure) | `starsFor`/`totalStars` | 0→0, 1→1, 2→2, 5→2; `duck-deduce` and an unknown key contribute nothing. |
| Unit (pure) | `animalPlacements` | `pato` absent until `duck-trail4` is filed, present after; the box is `STANDING_GRIP`, i.e. its bottom edge is on `animalSpot.y`. |
| Unit (pure) | `isSectorDebug` | on, off, absent, malformed (must not throw). |
| Unit (pure) | `resolveNextAction` | a sector level → `{type:'exit'}`; `duck-trail4` → `exit`, **never** `deduce`; a non-sector level → today's `{type:'next'}`; `nextView` untouched. |
| Type | `rot` is `0` | `@ts-expect-error` on a `rot: 15` literal, enforced by `npm run build` (`tsc --noEmit`). Vitest transpiles without typechecking and cannot prove this. |
| Component | `ZooMap` markup | `renderToString`: map href + `xMidYMid slice`; five fog images, estanque's absent; `zero` occurrences of `url(#`; the duck href appears only when filed; the fade class on exactly one patch. |
| Component | captions (D3) | `auditCaptions(renderToString(<ZooMap …/>)).uncaptioned` is `[]` and `imagelessContainers` is `[]`, **plus** a hand-built failing row (a bare star count outside `cv-captioned`) proving the assertion can go red. |
| Component | debug flag | off → no `#ff0000`; on → six sector rects + the plaza, and still no new word. |
| Component | `App` | opens on `/art/zoo-map.png`, not `/art/home-octopus.png`, not `Elegí un camino`. |
| Screenshot (human) | `scripts/shot.sh` | §9. Non-negotiable. |
| E2E | N/A | No browser harness in this repo. |

**Which invariants ONLY a screenshot can catch, said plainly.** Whether each `hit` lands on
its drawn sector; whether the fog reads as fog rather than as two obvious ellipses; whether
`PRINT_FACING` points the toe at the sector; whether the HUD covers drawn sky at a portrait
ratio; whether the letterbox green is indistinguishable from the map's edge (a one-value
mismatch reads as a seam). The suite cannot see any of them, because the harness has no DOM
and `@types/node` is not a dependency, so no test may read the PNG to re-measure — the
registry's numbers are **authored constants verified by eye**, and the pure tests check the
registry's internal consistency, never the drawing. This repo's real defects — the office's
scattered ground, the garland's merged cusps, the clipped octopus, the off-centre lens —
were every one of them found by a screenshot and none of them by the suite. A green suite is
necessary and not sufficient.

## Threat Matrix

N/A — no routing in the HTTP/shell sense, no shell command, no subprocess, no VCS/PR
automation, no executable-file classification, no process-integration boundary. `?nivel=`
and `?debug=` are client-side query-string reads inside the app's own document, parsed by
`URLSearchParams` inside a `try`. The change is rendering, pure geometry, and one read of
`localStorage`.

## Migration / Rollout

**No migration.** Nothing is written: no new key, no schema change, no store method. The map
is a pure read over `cursiva.levels.v1` through `openProgressStore()` — still the only
sanctioned constructor, because `LevelProgressStore` caches on construction and a second
long-lived instance goes stale (`App.tsx:30-36` builds one per read, and this change keeps
that). Existing `<caseId>-deduce` pseudo-records stay readable and are now explicitly inert:
`totalStars` filters them out and no sector claims them. A rollback cannot lose a child's
progress.

## Slice Plan and the review-budget forecast

Cached delivery strategy is `single-pr` at a **800-line** budget; the shared guard is 400 per
PR. Data before consumers, consumers before navigation, retirement last.

| # | Slice | Files | ± |
|---|---|---|---|
| S1 | `feat(zoo)` the registry and its guardrail tests | `zoo/sectors.ts`, `.test.ts`, `zoo/stars.ts`, `.test.ts`, `zoo/backpack.ts` | ~360 |
| S2 | `feat(zoo)` the map screen, HUD, bubble and `?debug=sectores` | `screen/ZooMap.tsx`, `.test.tsx`, `canvas/devMode.ts` | ~360 |
| S3 | `feat(main-screen)` the map is the entry; finishing an adventure returns to it | `App.tsx`, `App.test.tsx`, `GameScreen.tsx`, `.test.tsx`, `levelFlow.test.ts` | ~170 |
| S4 | `refactor(main-screen)` retire the office | `screen/HomeScreen.tsx` + test, `client/src/home/` ×6 | ~1,400 (deletion) |

**Decision needed before apply: Yes.** **Chained PRs recommended: Yes.** **400-line budget
risk: High.** S1–S3 each sit inside the per-PR guard and chain cleanly. S4 cannot be split
usefully — the folder's six files import each other and `HomeScreen` imports all three — and
it is ~1,400 lines of **pure deletion with zero additions**, which is the cheapest diff a
reviewer ever reads. It is flagged for `sdd-tasks` as a recorded `size:exception` on that
basis, not waved through. S1 before S2 is load-bearing: `docs/12` §4 is explicit that the
coordinates are proven before a pixel is drawn. S3 before S4 is load-bearing: the map must
be provably the entry screen before its predecessor disappears.

## Open Questions

- [ ] Does `PRINT_FACING = −90°` point the toe at the sector? Derived from the file's
      134 × 256 aspect, not from looking at the art. One constant; settled by S2's screenshot.
- [ ] Do two fog patches per sector read as fog, or as two ellipses? The construction in §4
      guarantees coverage, not beauty. If it reads badly the repair is a third patch or a
      different art index — the containment test stays green either way, which is the whole
      point of having it.
- [ ] Does `#76B56A` in the letterbox read as continuous with the map's edge at a portrait
      ratio, or as a seam? Measured on all four borders of the PNG; the risk is the crop, not
      the value.
- [ ] Does bouncing to the map after **every** adventure read as progress or as interruption
      to a five-year-old? The rule follows `docs/12` §3 literally and is one branch in
      `resolveNextAction`. Flag it on the first child pass; changing it later is a two-line
      diff plus its test.
- [ ] Nothing blocking. No decision above is waiting on input.

---

### Accepted deviation

This document exceeds the skill's 800-word cap, the same deviation
`case-registry-and-captions/design.md:950-955` and `detective-mode/design.md:397-402`
recorded. `openspec/config.yaml:22-23` requires every architecture decision to carry its
rationale; this change carries eleven decisions, three of them rulings on previously open
questions whose *tension* had to be recorded verbatim rather than resolved silently, plus one
geometric derivation that every coordinate in the change depends on. No decision could be
shortened without dropping its reason.
