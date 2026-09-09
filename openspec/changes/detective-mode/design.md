# Design: Detective Mode (Phase 1 Retheme)

Binding inputs: `proposal.md` §Orchestrator Decision Block (D1–D6) and
`explore.md` §2/§4. Neither is reopened here.

## Technical Approach

Nothing in the trace engine changes shape. The mode is assembled from four
additive seams — a new canvas layer prop, a pure reducer, a DOM rail, and a new
`GameView` branch — plus two path generators and one pure progress migration.
Every piece of new logic is a pure exported function over path data or plain
records, because tests run under vitest 4 on the default **node** environment
and assert `renderToString` output (`explore.md` §4); `getTotalLength()` /
`getBBox()` do not exist. No `url(#…)` reference is introduced anywhere
(`TraceCanvas.tsx:70-84`). No new dependency, and no third `framer-motion` use.

---

## Art Direction (revised plan)

### Revisions from the first pass, and why

The first pass produced five things that were defaults rather than choices.

| Dropped | Replaced with | Why |
|---|---|---|
| A six-hue "detective palette" with a warm-clay accent | Four pigments, each named by its clue's own material, each locked to exactly one trail | Warm clay next to the shipped `SHEET_PAPER '#fdfcf7'` and `GOAL_COLOR '#b45309'` (`TraceCanvas.tsx:61,149`) is trait 1 of generated design. The repo is already one accent away from it. |
| A radial-gradient lamp glow | Engraver's halo: three concentric stroked rings at stepped opacity | A gradient is illegal here anyway (`url(#…)`). Quantised rings are how light is drawn in pen-and-ink, so the constraint becomes the idiom instead of a workaround. |
| A separate centred deduction screen with a headline | Deduction reuses the play shell; the rail keeps the four clues exactly where the child filed them | Continuity of the case file, no new copy (D6 allows one word), and it reuses `.cv-play` instead of authoring a second layout. |
| Numbered clue slots (`01 / 02 / 03`) | Slots identified by their clue silhouette | The order is a real sequence, but numerals are unreadable to this reader — the repo already records that reasoning at `LevelPlay.tsx:746`. |
| — (kept) | ALL-CAPS `PISTAS` | The brief pins it and it is the user's own sketch; the brief wins over the generic-tell warning. |

### Colour — the reward system

Base is the **shipped** ink-on-paper palette, imported, never redefined: paper
`#fdfcf7`, wall `#e2e8f0`, ink `#1e293b`. Adding no new neutral is itself the
anti-cliché move. Six new values, in `detective/palette.ts`:

| Token | Hex | Role |
|---|---|---|
| `CLUE_DRAINED` | `#c8cdd2` | Every unearned mark. One step darker than the wall so it reads on paper and on wall alike. |
| `POND` | `#3f6f8f` | Trail 1 only — water droplets. |
| `KERNEL` | `#b8912f` | Trail 2 only — corn. Hue ~44° against the shipped ochre's ~30° and the warm-clay band's ~16°, chroma held below the ochre's. |
| `PRINT` | `#000000` | Trail 3 only — footprints. True black, not a fashionable tinted near-black: the print must be **darker than the child's own ink** or it reads as part of the trace, and it must not read as a UI text colour. Achromatic by material, not by exception. |
| `PLUME` | `#2f6b5c` | Trail 4 only — the iridescence a glass reveals in a hen feather. |
| `LAMP` | `#f2d377` | The single light source. Appears in the lamp glyph and its halo and nowhere else. Pale (L≈85) against `KERNEL`'s dark brass (L≈60), and the two never share a location. |

Rules the palette test asserts: the four earned values are pairwise distinct;
none equals or approaches `GOAL_COLOR`, `HAZARD_COLOR` or `CARRIER_COLOR`
(`TraceCanvas.tsx:149,177,194`); the footprint value has zero chroma; no value
falls in the warm-clay band; `GOAL_COLOR` gains no new use.

The magnifying glass is drawn in **ink**, not in a colour of its own — it
belongs to the world, not to the reward. That frees the green band that
`CARRIER_COLOR '#5f8a86'` would otherwise crowd, which is why the carrier gains
an art override (below) rather than a recolour.

### Type

D6 removes typography from scope, so there is exactly one type role and it is
geometry: **`PISTAS`, written, not typeset** — six glyphs as stroked `M`/`L`
polylines, stroke width 8 in a 100-unit em, `strokeLinecap="round"` to match the
child's own ink cap (`TraceCanvas.tsx:890`), no fill, stacked vertically and
read downward. Everything else keeps the shipped `.cv-*` classes untouched. The
mode adds no other text.

### Layout

Rail is a fixed DOM column inside `.cv-sheet`, a flex sibling of the canvas — so
it steals nothing from the 1000-unit viewBox (proposal Q2). 96px wide, 72px
under the existing `max-height:820px` query.

```
primary: landscape tablet
┌──────────────────────────────────────────┐
│ ← volver          Fase 1 · <trail title> │
│ hint line                                │
├────────────────────────────────┬─────────┤
│                                │   ·lamp │
│        canvas 1000×600         │ P  [◆]  │
│                                │ I  [◆]  │
│                                │ S  [ ]  │
│                                │ T  [ ]  │
│                                │ A       │
│                                │ S       │
├────────────────────────────────┴─────────┤
│ pillars / coach                          │
│ [ Otra vez ]   [ Seguir ]                │
└──────────────────────────────────────────┘

short viewport (existing max-height:520px query): the rail turns into a row
│ ┌──────────────── canvas ────────────────┐ │
│  PISTAS  [◆] [◆] [ ] [ ]                   │

deduction view — same shell, same rail, the sheet area becomes a lineup
┌────────────────────────────────────────────┬──────────┐
│                                            │   ·lamp  │
│    ( )        ( )        ( )        ( )    │ P  [◆]   │
│    /|\        /|\        /|\        /|\    │ I  [◆]   │
│  ────────────────────────────────────────  │ S  [◆]   │
│   (a dismissed animal drains and drops)    │ T  [◆]   │
└────────────────────────────────────────────┴──────────┘
```

The lineup is four animals standing on one drawn ink line — no cards, no
borders, no border-radius, no shadow. Alignment: the rail is one vertical axis
(slots share the word's stem); the lineup is centred because a four-way choice
has no reading order. Animals are `<button>`s reusing the shipped 64px tap floor
(`LevelPlay.tsx:140`).

### Principles

1. Ink on paper is the whole world; colour only ever means *earned*.
2. One colour per trail, and it appears nowhere else in the mode.
3. Light is drawn, never blurred.
4. One motion moment per trail, and only after the finger is up (D5).
5. The case file never moves: a filed clue stays where the child put it.

---

## Architecture Decisions

### Decision: clue layer is a new `clues` prop, not `children`

**Choice**: new prop rendered as its own `<g>` immediately before the ink path
(`TraceCanvas.tsx:885`), following the `hazards` precedent (`:166-177`, `:893-910`).
**Alternatives**: the existing `children` slot (`:239`, rendered `:941`).
**Rationale**: three independent reasons. (1) `children` renders **last**, above
the ink and above the carrier — clues are marks on the ground and must sit
*under* both; `children` cannot express that z-order without re-ordering the
whole canvas. (2) `StarFeedback` already occupies `children` from `LevelPlay`;
sharing it couples two unrelated overlays. (3) `hazards` is the exact shape
precedent for "index-aligned readonly arrays plus values computed outside".

**The rAF loop is not touched.** Hazards need it because their position is a
function of time (`:486-498`). A clue's lit state is a function of the *ink*,
flips at most 4–6 times per run, and D5 forbids animation — so it is ordinary
React state. Detection rides the existing 10 Hz `onFrame` sample in `LevelPlay`
(`:578-623`), adding no second cloud scan, exactly as `resetOnContact` does at
`:613`.

### Decision: the first token module, scoped to this mode only

**Choice**: `client/src/detective/palette.ts` holding only the new values.
No refactor of the existing inline consts.
**Alternatives**: keep every colour inline per the current convention; extract a
repo-wide theme; CSS custom properties.
**Rationale**: the four earned colours are a *system* whose whole content is
"no colour repeats and nothing chromatic exists outside a clue" — a system has
to be reviewable on one screen, and three consumers need the same values (canvas
caller, rail, deduction). It is still the shipped convention (module-scoped
exported consts with the reason in the doc comment, `TraceCanvas.tsx:59-196`),
moved one file over. A repo-wide extraction would rewrite `TraceCanvas.tsx:59-196`
and `LevelPlay.tsx:112-146` and spend the whole budget on a no-behaviour
refactor. CSS variables are rejected because the app has one CSS string template
and no cascade layer, and SVG attributes carrying `var()` are not assertable in
`renderToString`.

### Decision: assets behind a typed registry with origin-centred art

**Choice**: `client/src/detective/assets.ts`, one entry per clue kind, one per
animal, one for the glass. Art is authored as path data in a 100×100 box
**centred on the origin**, so placement is `translate(x,y) rotate(deg) scale(s)`
with no offset arithmetic. Placeholders live as `d` strings in that same file;
replacing them with the user's art is a single-file edit and touches no logic.
**Alternatives**: separate `.svg` files imported as assets; a component per clue.
**Rationale**: files would need a loader and would defeat `renderToString`
assertions; a component per clue makes art a code change. Note the `M`/`L`/`C`
restriction (`paths.ts:172-175`) does **not** apply to registry art — art never
passes through `transformPath`, it is positioned by a group transform — so the
full path alphabet is available for the real assets.

### Decision: earned clues are derived from progress, not stored

**Choice**: clue *N* is earned iff its trail's record has `approvals >= 1`,
read through `LevelProgressStore.get()`. Marks lit *within* a run are per-run
reducer state, discarded on `restartRun`.
**Alternatives**: a new `cursiva.clues.v1` key; a field added to `LevelRecord`.
**Rationale**: zero new persistence, zero new storage key, zero new migration
surface, and it survives a reload for free. It also resolves the brief's
ambiguity cleanly: the 4–6 marks along a trail light as the glass passes, and
the trail's single rail clue files when the trail is **approved** — which is
exactly D5's "fires only after the trail is finished".

### Decision: deduction is a third `GameView` branch

**Choice**: `GameView` gains `{ view: 'deduce' }` and `GameAction` gains
`{ type: 'deduce' }`. `nextView` stays catalog-independent.
**Alternatives**: a 5th catalog entry; a terminal phase of trail 4.
**Rationale**: proposal Q3 already settled the view (no path, no ink, none of
the three pillars). The reducer must not learn the catalog — its own comment at
`GameScreen.tsx:18-21` says the resolved successor is passed in for that reason —
so the *decision* lives in `GameScreen.onNext`: dispatch `deduce` when the
finished level is the last trail and all four clues are earned, otherwise
`next`. Both the reducer and the `allEarned` predicate are pure functions over
plain values, so both are node-testable. `initialView` also accepts
`?nivel=deduccion`, for the same reviewability reason the deep link exists at
`GameScreen.tsx:47-52`.

### Decision: motion stays library-free

**Choice**: the lamp switch-on and the clue-filing move are two-state CSS
transitions in `LAYOUT_CSS`. No third `framer-motion` use.
**Alternatives**: `framer-motion` for the filing sequence.
**Rationale**: `TraceCanvas.tsx:856` records that the reset fade is hand-rolled
"so nothing depends on an animation library", and the beat pulse is already a
CSS transition (`:777-781`). Lamp and slot live in the same DOM subtree, so a
transition reaches both. One `prefers-reduced-motion: reduce` block disables
them.

### Decision: corner clearance is one pure closed-form helper

**Choice**: `cornerClearance(legLength, interiorDeg, w)` in `paths.ts`, and both
new generators must satisfy `cornerClearance(...) >= w` plus, for parallel arms,
`gap - w >= 0.7w` — the same ratio the shipped spiral keeps (~50 of wall against
a 70 corridor, `paths.ts:353-359`, `catalog.ts:329`).
**Alternatives**: hand-tuned per-level constants; a rendered-pixel check.
**Rationale**: a round join eats `(w/2)/tan(α/2)` of each incident leg
(`strokeLinejoin="round"`), so the readable flat is
`legLength − 2·(w/2)/tan(α/2)`. At 90° that reduces to `run − w ≥ w`, i.e.
**`run ≥ 2·corridorWidth`**, and the arm-to-arm rule gives
**`amplitude ≥ corridorWidth`**. Closed form is assertable with no DOM; a pixel
check is not available (`explore.md` §4). Worked values for `w = 70` over
x ∈ [120, 880]: `run 190`, `amplitude 110` → flat 120 ✓, wall 150 ✓.

---

## Data Flow

```
LevelConfig ──buildLevel──▶ LevelTarget { polyline, length }   (levels/buildLevel.ts:217)
                                   │
                    clueMarks(polyline, length, count)              PURE
                                   │  readonly ClueMark[]
                                   ▼
 onFrame @10Hz ──▶ clueTick(state, head, marks, radius) ──▶ ClueState   PURE
                                   │
        clueLayer(marks, state, CLUE_ART, palette) ──▶ TraceClues
                                   ▼
                     TraceCanvas  <g>  UNDER the ink
 ─────────────────────────────────────────────────────────────────────
 onRelease ─approved─▶ onAttempt ─▶ LevelProgressStore.save
                                   │
                    earnedClues(store.all()) ──▶ PistasRail (DOM chrome)
                                   │
   GameScreen.onNext: allEarned ? {type:'deduce'} : {type:'next', levelId}
```

## Interfaces / Contracts

```ts
// canvas/TraceCanvas.tsx — additive, colour already resolved by the caller so
// the canvas imports nothing from detective/ and holds no token.
export interface TraceClueMark {
  x: number; y: number; angle: number
  d: string                      // origin-centred registry art
  paint: 'fill' | 'stroke'
  color: string                  // CLUE_DRAINED or the trail's earned value
  scale: number
}
export interface TraceClues { marks: readonly TraceClueMark[] }
/** Override the hardcoded carrier shape with registry art. Absent = the shipped
 *  sage figure, so every existing caller is untouched. */
export interface TraceCarrierArt { d: string; color: string }

// detective/assets.ts
export type ClueKind = 'droplet' | 'corn' | 'footprint' | 'feather'
export type AnimalId = 'gallina' | 'pato' | 'chancho' | 'vaca'
export interface ClueArt { d: string; paint: 'fill' | 'stroke'; earned: string }
export const CLUE_ART: Readonly<Record<ClueKind, ClueArt>>
export const ANIMAL_ART: Readonly<Record<AnimalId, { d: string; ruledOutBy: ClueKind }>>
export const GLASS_ART: { d: string }

// detective/clues.ts — no DOM, no storage
export interface ClueMark { x: number; y: number; angle: number; kind: ClueKind }
export interface ClueState { lit: readonly boolean[] }
export function clueMarks(
  polyline: ReadonlyArray<{ x: number; y: number }>, length: number, count: number,
): readonly ClueMark[]                                    // pointAtArcLength + directionArrowOf
export function clueTick(
  state: ClueState, head: { x: number; y: number },
  marks: readonly ClueMark[], radius: number,
): ClueState                                              // monotone: a lit mark never unlights
export function emptyClueState(count: number): ClueState

// game/migratePhase1.ts — pure, idempotent
export const PHASE_1_FORWARD: ReadonlyArray<readonly [string, string]>
export function migratePhase1(
  records: Readonly<Record<string, LevelRecord>>,
): Record<string, LevelRecord>                            // only the entries that changed
```

## File Changes

| File | Action | Description |
|---|---|---|
| `client/src/levels/paths.ts` | Modify | `triangularWave`, `squareWave`, `cornerClearance`. `M`/`L` only, ≥3 points. |
| `client/src/detective/clues.ts` | Create | Placement + collection reducer, pure. |
| `client/src/detective/assets.ts` | Create | Typed registry; placeholder path data. |
| `client/src/detective/palette.ts` | Create | The six new tokens. |
| `client/src/detective/PistasRail.tsx` | Create | Drawn word, four slots, lamp. DOM chrome. |
| `client/src/canvas/TraceCanvas.tsx` | Modify | `clues` prop + `<g>` under the ink; `carrierArt` override. |
| `client/src/screen/LevelPlay.tsx` | Modify | Clue tick in `onFrame`; rail column; rail CSS + reduced-motion block. |
| `client/src/screen/Deduction.tsx` | Create | The lineup; dismissal per D4. |
| `client/src/screen/GameScreen.tsx` | Modify | `deduce` view/action; migration call in the store initialiser. |
| `client/src/game/migratePhase1.ts` | Create | Copy-forward seeding. |
| `client/src/levels/catalog.ts` | Modify | Four trail configs added; `f1-libre` rethemed and clue-free. |
| `client/src/levels/catalog.ts` | Modify (last) | Six configs moved to exported `LEGACY_PHASE_1`, out of `LEVELS`. |
| `docs/05_ROADMAP_EVOLUTIVO_POR_ETAPAS.md` | Modify | Módulo A reward ladder, per D1. Spanish. Only `docs/` edit allowed. |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (pure) | `cornerClearance`, both generators, arc-length floor | Closed-form assertions; `run ≥ 2w`, `amplitude ≥ w`; command alphabet is `M`/`L` only; total trail length ≥ the six removed, computed from `buildLevel().length` |
| Unit (pure) | `clueMarks` spacing, `clueTick` monotonicity and radius edge | Hand-built polylines; a lit mark never unlights; count matches config |
| Unit (pure) | `migratePhase1` | Idempotent on re-run; never deletes; never demotes (field-wise max, `attempts` summed, `widthFactor` max); mid-campaign payload keeps every unlock |
| Unit (pure) | `nextView` with `deduce`; `allEarned` | Node, no DOM, existing `GameScreen` test pattern |
| Unit (data) | palette invariants | Pairwise distinct, zero chroma on `PRINT`, no warm-clay value, no collision with shipped accents |
| Component | clue `<g>`, rail, deduction lineup | `renderToString`; assert marks under the ink, drained vs earned fill, four slots, zero `url(#` occurrences in the whole mode's output |
| Integration | trail → approval → clue filed → deduction reachable | Store + reducers driven directly; `fakeSvgSurface`/`fakePointerEvent` (`canvas/testUtils.ts`) for pointer paths |
| E2E | N/A | No browser harness in this repo (`explore.md` §4) |

## Threat Matrix

N/A — no routing, shell command, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary. The change is client-side
rendering, pure geometry and one `localStorage` copy-forward.

## Migration / Rollout

One-time, copy-forward, positional-unlock safe (D3). `PHASE_1_FORWARD` is built
from the **unlock chain**, not from theme similarity, because `isUnlocked` reads
`LEVELS[index - 1].approvals` (`LevelProgressStore.ts:123-129`):
`f1-travesia→trail1`, `f1-pelotas→trail2`, `f1-paseo→trail3`, `f1-pasillo→trail4`.
`f1-libre` stays at index 0 and is untouched. `f1-ondas` and `f1-espiral` have no
successor to seed and remain readable orphans — the store keys by arbitrary
string and never prunes (`:75-77`, `:93`).

Merge rule: field-wise **max** on `bestAccuracy`, `bestFluency`, `approvals`,
`streakPass` and `widthFactor` (wider is more forgiving, so max never punishes),
`attempts` summed, `streakFail` kept from the newer record. Never a deletion,
never an overwrite of a higher value — so re-running is a no-op and no
"migrated" flag or new storage key is needed. It runs inside `GameScreen`'s
`useState(() => …)` store initialiser; idempotence is what makes a StrictMode
double-invoke harmless.

## Work Units and Review Budget

Session budget 800 lines; per-PR work-unit guard 400. Estimates are authored
additions + deletions.

| # | Work unit (one commit, independently revertible) | Files | ± |
|---|---|---|---|
| 1 | `feat(levels)` triangular + square generators and the corner constraint | `paths.ts`, `paths.test.ts` | 160 |
| 2 | `feat(detective)` clue placement and collection reducer | `clues.ts`, `clues.test.ts` | 165 |
| 3 | `feat(detective)` asset registry and mode palette | `assets.ts`, `palette.ts`, `palette.test.ts` | 190 |
| 4 | `feat(canvas)` clue layer prop and carrier art override | `TraceCanvas.tsx`, new canvas test | 117 |
| 5 | `feat(detective)` PISTAS rail beside the sheet | `PistasRail.tsx`, `.test.tsx`, `LevelPlay` CSS | 165 |
| 6 | `feat(detective)` wire clue collection into level play | `LevelPlay.tsx` | 45 |
| 7 | `feat(detective)` deduction view and dismissal | `Deduction.tsx`, `.test.tsx`, `GameScreen.tsx`, `GameScreen.test.tsx` | 270 |
| 8 | `fix(progress)` seed the new trails from the replaced records | `migratePhase1.ts`, `.test.ts` | 145 |
| 9 | `feat(levels)` the four themed trails; `f1-libre` rethemed, clue-free | `catalog.ts` (+150), `catalog.test.ts` | 205 |
| 10 | `refactor(levels)` retire the six unthemed configs behind `LEGACY_PHASE_1` | `catalog.ts` (−170/+10) | 180 |
| 11 | `docs(roadmap)` phase 1 closes its own case | `docs/05_…md` | 22 |

**Total ≈ 1,664 authored ±.** Well over both budgets, so `auto-chain` slices it.
Suggested slices, each within 400 and each ending in a working repo:

| Slice | Units | ± |
|---|---|---|
| S1 | 1, 2 | 325 |
| S2 | 3, 4 | 307 |
| S3 | 5, 6 | 210 |
| S4 | 7 | 270 |
| S5 | 8 | 145 |
| S6 | 9, 10, 11 | 407 |

Two slices fit one 800-line session, so plan on three sessions. **Ordering is
load-bearing in one place**: unit 8 must land before unit 10, or removing the
six configs shifts every position and locks trails 2–4 (D3). Unit 10 is the only
unit that changes `LEVELS` composition and is deliberately last, so a rollback
is one revert plus swapping `LEGACY_PHASE_1` back in.

## Open Questions

- [ ] Clue-mark count per trail: 4, 5 or 6. Proposal Q1 fixed the range but not
      the value; it is a `LevelConfig` field, so it is tunable after the first
      run on a device and does not block any work unit.
- [ ] Which themed hazard trail 2 carries (proposal Q1 keeps `taper` and one
      hazard for motor volume). The spiral's radial gap of 120 against a 70
      corridor leaves little room for a 32-radius hazard sweep; may have to move
      to trail 1 or 3.
- [ ] Whether S6 fits 407 lines under the per-PR 400 guard, or unit 11 splits
      off. `sdd-tasks` decides against the live count.

### Accepted deviation

This document exceeds the skill's 800-word design cap. `openspec/config.yaml`
requires every architecture decision to carry rationale, the brief additionally
requires a revised art-direction plan with wireframes and a per-file review
budget, and no decision could be shortened without dropping its reason.

---

## Orchestrator Correction (binding, supersedes the Layout section above)

### C1 — The detective play shell carries no words but `PISTAS`

The Layout wireframe keeps four text surfaces from the shipped shell: the
`Fase 1 · <trail title>` header, the hint line, the pillars/coach strip, and
the labelled `[ Otra vez ] [ Seguir ]` buttons. The brief forbids all four.
Verbatim: *"Hace todo bien grande, bien simple la pantalla, sin texto (solo lo
basico como 'PISTAS')."* The user's own sketch shows no chrome at all.

Reusing `.cv-play` to save review lines was the right instinct and it stays —
but the chrome is **suppressed for detective levels**, not inherited. Required:

- No level title, no hint sentence, no coach or pillar copy on a detective
  trail or on the deduction view.
- Controls become icon-only and keep the shipped 64px tap floor
  (`LevelPlay.tsx:140`): retry and continue as ink glyphs, drawn the same way
  `PISTAS` is. Back stays as an affordance, as an icon.
- Any suppression is conditional on the level being a detective trail. Phases 2
  through 5 keep their existing chrome untouched. This is a branch, not a
  removal, so nothing outside phase 1 can regress.

**What replaces the hint.** The engine already animates the route when a level
sets `demo: true` (`TraceCanvas.tsx:747`, currently used only by phases 3-5).
The four trails set `demo: true`, so the instruction is *shown* rather than
written. That is a better fit for a pre-reader than a sentence they cannot read,
and it costs no new machinery.

**Pedagogical note, flagged not resolved.** The hint sentence and the coach copy
are also read by the adult sitting beside the child. Removing them removes that
channel. The brief is explicit and it wins; if classroom use later shows the
adult needs it, the honest fix is an adult-facing surface, not words on the
child's screen.

### C2 — Work unit and budget consequence

Add:

| # | Work unit | Files | ± |
|---|---|---|---|
| 12 | `feat(detective)` suppress shell copy on detective levels; ink icon controls | `LevelPlay.tsx`, `icons.tsx`, `.test.tsx` | ~95 |

New total ≈ **1,759 authored ±**. Unit 12 belongs with unit 6 (the other
`LevelPlay` wiring), which puts slice S3 at 305 and keeps every slice under the
400 per-PR guard. `sdd-tasks` recounts against the live figure and decides
whether unit 11 splits off S6, which the design already left open.

### C3 — Resolved open questions

- **Clue marks per trail: 5.** It is a `LevelConfig` field and tunable, so this
  unblocks the work rather than settling it forever. Five gives the reducer more
  than one interior transition to assert and keeps spacing legible at the square
  wave's run length.
- **The themed hazard goes on trail 1, not trail 2.** The design's own geometry
  rules trail 2 out: the spiral's 120-unit radial gap against a 70 corridor
  leaves no room for a 32-radius sweep. Trail 1 is the sine, which has the most
  open interior of the four.
- **`carrierArt` override stays.** The magnifying glass is drawn in ink, which
  is what keeps `CARRIER_COLOR '#5f8a86'` from crowding `PLUME '#2f6b5c'`. The
  design flagged that cutting the override forces the feather to a different
  hue; do not cut it.

### C4 — The corner geometry gets verified by eye, once

The clearance closed form (`run ≥ 2·corridorWidth`, `amplitude ≥ corridorWidth`,
from round-join consumption `(w/2)/tan(α/2)`) is derived, not observed, and this
repo has no pixel check. It IS checkable here: `scripts/shot.sh` drives headless
chromium and the dev server takes a `?nivel=<id>` deep link. After work unit 9
lands, screenshot the square-wave trail and confirm the elbows read as corners
rather than merging. Record the result in the verify report. A derived formula
asserted only by a unit test that shares its assumptions proves nothing about
what a child sees.

### C5 — `amplitude` units are pinned, and the constraint gets a failing case

The corner-clearance arithmetic in `Decision: corner clearance is one pure
closed-form helper` is correct, but it never says what `amplitude` measures,
and the two readings differ by a factor of two. Pinned to the shipped
convention: **`amplitude` is the offset from the centreline**, so extrema land
at `y ∓ amplitude` and the arm-to-arm gap is `2·amplitude`. That is what
`alternatingArches`' contract already states — `paths.ts:320`, "Extrema land
exactly at `y ∓ amplitude`" — and it is what makes the design's own worked
values hold: `w = 70`, `amplitude 110` gives a gap of 220 and a wall of 150
against a 49 threshold.

Under the other reading the same stated rule `amplitude >= corridorWidth`
yields a wall of **zero** and renders the trail as one filled block, which is
precisely the failure the requirement exists to prevent. So the spec now names
both inequalities explicitly (`run >= 2·corridorWidth`,
`amplitude >= corridorWidth`) and carries a scenario that asserts the helper
**fails** on the misread candidate. A constraint test that can only pass proves
nothing.
