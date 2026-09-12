# Proposal: Duck undulations and the lagoon sector backdrop

Scope is `docs/13_AVENTURAS_POR_ANIMAL.md` §8 **row B, and only row B**.

## Intent

Row B is the first step that makes an adventure look and read like the
directive describes one.

- **The ducks are not ducks yet.** `duck-trail1..4` ship a wave, a spiral, a
  switchback and a square wave. `docs/13` §4 says the spiral belongs to the
  snail and the triangular/square shape to the sheep; `catalog.ts:280-299`
  already admits this in a comment. `docs/13` §2 asks for one movement —
  small, smooth undulations — in four graded steps. Today there is no
  progression, just four unrelated shapes wearing duck clue names.
- **The sheet has no place.** `docs/13` §4 decision 3: each sector gets a
  whole drawn backdrop with the corridor over its quiet band, not a scene
  assembled from scattered marks. The lagoon art already ships
  (`SECTOR_BACKGROUND_ART.lagoon`) and nothing renders it.
- **The adventure has no entry and no closing.** `docs/13` §5 items 1 and 6.
  `docs/13` §6 names the narrative transition as the one thing the engine
  does not express today. Both components are built once here and reused by
  rows C-H.

## Scope

### In scope

1. The four duck levels recut as one undulation family with a four-step
   progression (`catalog.ts`, plus a `waveVaried` generator in `paths.ts`).
2. The lagoon backdrop drawn whole under the corridor, derived from the
   sector, with the channel repainted so it stays legible over water.
3. The scattered ground retired wherever a sector backdrop is present —
   which today is exactly the four duck levels.
4. A reusable narrative entry screen, and the map's closing phrase once the
   adventure's animal is recovered.

### Out of scope (explicitly unchanged)

Rows C-H (sheep, llamas, entrance/intro, night sector, snakes, bees,
dolphins, hedgehog); the snail; the paused three-option deduction —
`cases.ts`, `Deduction.tsx` and the clue registry are **not** deleted or
rewritten (`docs/13` §4 decision 1); letters; backpack contents; the four
medusa levels (`f2-guirnalda`, `f2-agua2..4`), which `docs/13` §4 marks
*Hecha — Nada*; new art (none is needed); `demo: true` on all four ducks;
the persisted level ids.

## Capabilities

### New capabilities

None.

### Modified capabilities

- `level-engine`: `waveVaried` generator; the duck four-step wave
  progression as an authored, asserted invariant.
- `trace-canvas`: a sector backdrop layer beneath the maze block; the solid
  wall rect yields to the backdrop; the channel's paint follows the
  `docs/09:158` luma law against whatever it is painted on.
- `detective-mode`: the scattered ground retires where a sector backdrop is
  present, per sector, not engine-wide.
- `main-screen`: entering an adventure may route through a narrative entry
  before the first level (`resolveEnterAction`, mirroring `resolveNextAction`).
- `zoo-map`: the octopus's phrase reads as a closing once the sector's
  animal is recovered.

## The five decisions

### 1. Keep the phase-1 writing-band guard; drive the progression with cycles, per-cycle amplitude, corridor width and taper

**Confirmed, with the numbers fixed.** `catalog.test.ts:415-426` encodes
`docs/01:49` — a phase-1 route must train the arm, so span > 300,
minY < 180, maxY > 420. It was added as a second-review fix
(`archive/2026-09-09-level-engine-mvp/tasks.md:44`). It is founding
pedagogy, and it outranks the schematic's proportions: the schematic
(`docs/referencias/patos-ondulaciones.png`) is a *movement* diagram — no
sheet, no bounds, no corridor — and its flatness reads as "no corners",
which in this codebase is the wave family's C1 continuity
(`paths.ts:82-83`), not low slope. That continuity is exactly what will
separate the ducks from the sheep and llamas of row C.

`wave` puts extrema exactly at `y ∓ amplitude`, so at `y = 300` the guard
reduces to `amplitude > 150`. Amplitude is therefore *not* a usable
progression knob. Cycles, per-cycle amplitude, corridor width and taper are.

| Step | Level | Generator call (`y = 300`, `x0 = 90`, `x1 = 910`) | `corridorWidth` | `taper` | minY | maxY | span | peak slope |
|---|---|---|---|---|---|---|---|---|
| 1. *"muy suave y amplia, casi una recta"* | `duck-trail1` | `wave({ amplitude: 170, cycles: 1 })` — **unchanged** | 100 | — | 130 | 470 | 340 | 1.66 (58.9°) |
| 2. *"más cantidad de ondas"* | `duck-trail2` | `wave({ amplitude: 170, cycles: 2 })` — **unchanged** | 90 | — | 130 | 470 | 340 | 3.32 (73.2°) |
| 3. *"variación de amplitud"* | `duck-trail3` | `waveVaried({ cycles: [{ width: 470, amplitude: 155 }, { width: 350, amplitude: 205 }] })` | 80 | — | 95 | 505 | 410 | 4.69 (77.9°) |
| 4. *"caminos más delimitados"* | `duck-trail4` | `wave({ amplitude: 170, cycles: 3 })` | 70 | `{ from: 1, to: 0.85 }` | 130 | 470 | 340 | 4.98 (78.6°) |

Every row clears all three assertions: span > 300, minY < 180, maxY > 420.
Every row also stays on the sheet with its channel: the widest excursion is
step 3's `505 + 80/2 = 545 ≤ 600` and `95 − 40 = 55 ≥ 0`. Peak slope
(`4A / halfWidth`) rises monotonically 1.66 → 3.32 → 4.69 → 4.98, so each
step is measurably harder than the one before, and each introduces exactly
one new demand: amplitude, repetition, variation, then narrowing.

Two consequences, both deliberate:

- **`corridorWidth` stays 100/90/80/70** — pinned by `catalog.test.ts:103-106`
  — and step 4's taper changes from `{1.15, 0.9}` to `{1, 0.85}` (70 → 59.5)
  so step 4 is narrower than step 3 *along its whole length*. `1.15` would
  have started it at 80.5, wider than step 3. `from > to` still holds
  (`catalog.test.ts:290-296`).
- **Step 4 carries three cycles as well as the narrowing.** The directive's
  progression accumulates ("recorrido *algo más* delimitado" on top of
  everything before), so the last step keeps the most waves and adds the
  tightest channel.

**`waveVaried` earns its existence.** Genuine per-cycle amplitude cannot
come from `wave` (one global number), from `transformPath` (uniform scale
only, `paths.ts:148`), or from extra `paths[]` entries (those are pen-lift
routes; only `paths[0]` receives the taper, `buildLevel.ts:199`). The exact
precedent is `garlandVaried` (`paths.ts:591-606`), built for `f2-agua3`'s
own *"variación"*. It is ~15 lines, emits only `M`/`C` — required by
`transformPath`'s alphabet (`paths.ts:172-174`) — and a uniform `cycles`
list must reproduce `wave`'s `d` string byte for byte, the same proof
`garlandVaried` already carries.

**Content that must change with the shapes** (missed by the exploration):
`duck-trail3`'s title/hint describe the switchback (*"Seguí hasta el fondo,
dá la vuelta y volvé"*) and `duck-trail4`'s describe corners (*"esquina por
esquina"*). Both are rewritten for undulations. `duck-trail3`'s
`mustBeContinuous: true` was justified solely by the reversal
(`catalog.ts:301-304`); with the reversal gone it aligns with its three
siblings at `false`. Ids, clue kinds, `resetOnContact`, `carrier`, the
`rail` on `duck-trail1` only, and `demo: true` are all untouched.

### 2. The channel repaints to `SHEET_PAPER`, and the backdrop replaces the wall rect

**Confirmed, and the second half is not a taste call.** Measured: the
lagoon's quiet band is a single flat `(180,197,208)`, luma **194.2**.
`CORRIDOR_EARTH #d9c3ae` is 198.2 — **4.0 of separation, failing the
`docs/09:158` law (≥ 55) by 51**. The corridor would be invisible.
`SHEET_PAPER #fdfcf7` is 251.9 — **57.7**, passing by 2.7. So over a
backdrop the channel is paper, never earth.

The wall rect cannot survive. `TraceCanvas.tsx:901-909` fills the *whole
sheet* with `MAZE_WALL`/`GROUND_FIELD` before the channel is stroked back
over it; a rect painted after the backdrop hides the backdrop everywhere
except inside the channel, which is the exact opposite of the feature. So
**when a sector backdrop is present the backdrop *is* the wall**: the
full-sheet rect is skipped and the channel is stroked in `SHEET_PAPER`
directly over the art. `maze: true` stays in all four `LevelConfig`s — it
still drives `guide={showShapeLine && !level.maze}` and the
corridor-is-a-channel reading — only the solid paint yields.

**What the child sees:** the lagoon drawn whole, edge to edge — water,
reeds, bank — with a pale bone-coloured channel laid across the quiet
middle of the water from one side to the other. The octopus and its glass
stand at the start. The drained clue marks (`#838383`, 121 luma from the
channel) sit along it, the child's ink (`#1e293b`) reads at 212. Outside
the channel is **water**, not grey filler — which answers `docs/09` §7's
own complaint (*"el 'afuera' del corredor no tiene identidad: es un relleno
gris"*) for real, for the first time.

Mechanism, restating the hard constraints: a plain `<image href>` with
`preserveAspectRatio="xMidYMid slice"` **on the image, never on the root
`<svg>`**, over a flat measured edge rect — the exact layering of
`screen/ZooMap.tsx:198-211`. No `<mask>`, `<pattern>`, `<clipPath>`,
`<defs>`, `useId` or any `url(#…)`: that ban is a scar
(`TraceCanvas.tsx:70-84` — it hydrated blank sheets on real devices).
Measured crop at 1000×600: source rows 51..973 of 1024 survive, 5% off the
top and 5% off the bottom, nowhere near the quiet band.

No `LevelConfig` field is added. The backdrop is derived from
`sectorOf(level.id)` (`zoo/sectors.ts:395-397` already maps every duck id to
`estanque`) through a small `SectorId → SECTOR_BACKGROUND_ART` table holding
only `estanque → lagoon` today.

### 3. Duck-scoped suppression of the scattered ground, expressed as backdrop-scoped

**Confirmed, with the mechanism sharpened.** `ground` keys off
`inDetectiveWorld` (`LevelPlay.tsx:1125-1126`), which covers **8** levels:
the four ducks plus `catalog.ts:673, 693, 728, 780` — the shipped medusa set
that `docs/13` §4 marks *Hecha — Nada*. Deleting `grassScatter`/`mudScatter`
/`GROUND_GRASS`/`GROUND_MUD`/`SCATTERS` engine-wide would blank four
approved levels to bare paper. `docs/13` §4 decision 3 retires the scatter
*"cuando entre el fondo de cada sector"* — per sector, as each backdrop
lands. Row B lands only the lagoon.

So nothing is deleted. `ground` returns `undefined` **when a backdrop is
present**, not "when the level id starts with `duck-`". Today those are the
same four levels; expressing it as the backdrop rule writes `docs/13` §4.3
into the engine once, so every later sector inherits the retirement instead
of accruing a hand-maintained list.

### 4. The entry shows once per adventure, before `duck-trail1`; the closing is already built except for one phrase

**Entry — confirmed, once per adventure.** `docs/13` §5 orders entry → demo
→ first challenge → two or more variations → closing: the entry belongs to
the *adventure*, not to each challenge. Four entries would make it a gate,
and with `resetOnContact` a child re-enters these levels constantly.

Mounted as a new `GameView` variant reached through a new pure
`resolveEnterAction(levelId, records)` mirroring `resolveNextAction`
(`GameScreen.tsx:162-168`), called from `App.tsx:71-75`'s `onEnter`.
`nextView` stays untouched and stays catalog- and sector-independent, as its
own header requires; `resolveNextAction` is the established place where
sector knowledge and routing meet. Folding the entry into `LevelPlay`'s
`phase` state is wrong: that state is per-attempt and the component remounts
per level (`key={state.levelId}`), so it would replay after every reset.

The trigger is **entering `duck-trail1`, every time, from the map** — not
records-gated. Stateless, no new persisted key, no migration, and it cannot
strand a returning child in front of a story they can no longer reach. It
costs one tap. `records` stays in the signature for symmetry and for paso
D's unlock rules, exactly as `resolveNextAction` already reserves it.

The screen itself is the octopus with its backpack, the speech bubble, the
duck, and one short phrase through `detective/CaptionedArt.tsx` — `label`
required, audited by `detective/captionAudit.ts`; `docs/12` §3, never a word
without its image. `ZooMap.tsx:341-360` already pairs bubble + phrase this
exact way. Every asset already ships and is registered: **no new art**.

**Closing — mostly verification, and this shrinks the change.** Stated
plainly: `resolveNextAction` already returns `{type:'exit'}` for every duck
level, so finishing any of them already lands on the map;
`animalPlacements` (`sectors.ts:312-316`) already stands the duck at
`{x:735, y:200}` once `duck-trail4` is filed; `footprintTrail` and the HUD
already render. One real gap remains: `ZooMap.tsx:354-358`'s phrase is the
constant *"¡Mirá! Las huellas van hacia allá. ¿Vamos?"*, shown whenever the
map is discovered — after the ducks are done it still points the child
onward instead of closing anything. So the closing work is one pure phrase
selector over the records, its test, and the wiring. Everything else is
confirmed by capture, not built.

### 5. Size: ~850 lines, over the 800 budget, seam named

| Area | Lines |
|---|---|
| `paths.ts` `waveVaried` + `paths.test.ts` | 85 |
| `catalog.ts` duck recut (shapes, titles, hints, stale comments out) | 90 |
| `catalog.test.ts`: drop the now-subjectless `duck-trail4` corner/arm guard (`:697-709`), add the progression assertions | 50 |
| `TraceCanvas.tsx` backdrop layer + wall-rect yield + channel paint | 55 |
| `TraceCanvas` tests | 60 |
| `SectorId → backdrop` table + test | 45 |
| `LevelPlay.tsx` wiring + ground suppression + tests | 65 |
| Luma-separation guard (pure, `docs/09:158`) | 45 |
| Narrative entry component + tests | 180 |
| `resolveEnterAction` + `GameView` variant + `App.tsx` + tests | 100 |
| Map closing phrase (pure selector + wiring + test) | 55 |
| Misc | 20 |
| **Total** | **~850** |

Decisions 3 and 4 did shrink it — no engine-wide deletion, no built closing,
no new persisted state — from the exploration's 950-1000 to ~850. It is
still **above the 800-line budget, by roughly 50**. Stated plainly, not
split: the orchestrator owns that call, and `sdd-tasks` produces the binding
forecast.

**The seam, if one is wanted** — three autonomous slices, each green on its
own, in dependency order:

| Slice | Contents | ~Lines |
|---|---|---|
| B1 | The wave recut: `paths.ts`, `catalog.ts`, `catalog.test.ts` | 225 |
| B2 | Backdrop + channel paint + ground suppression | 270 |
| B3 | Narrative entry + closing phrase | 335 |

## Affected areas

| Area | Impact | What changes |
|---|---|---|
| `client/src/levels/paths.ts` | New | `waveVaried` + `WaveCycle` |
| `client/src/levels/catalog.ts` | Modified | Four duck entries: paths, titles, hints, `duck-trail3` continuity, `duck-trail4` taper |
| `client/src/levels/catalog.test.ts` | Modified | Remove the square-wave corner guard; add progression assertions |
| `client/src/canvas/TraceCanvas.tsx` | Modified | Backdrop `<image>` layer; wall rect yields; channel paint selection |
| `client/src/screen/LevelPlay.tsx` | Modified | Resolve backdrop from `sectorOf`; suppress `ground` when a backdrop is present |
| `client/src/zoo/` (new small module) | New | `SectorId → SECTOR_BACKGROUND_ART` table |
| `client/src/screen/GameScreen.tsx` | Modified | `resolveEnterAction`; `'intro'` `GameView` variant |
| `client/src/App.tsx` | Modified | `onEnter` routes through `resolveEnterAction` |
| `client/src/screen/` (new component) | New | The narrative entry screen |
| `client/src/screen/ZooMap.tsx` | Modified | Closing phrase derived from records |
| `client/src/detective/palette.test.ts` | Modified | Luma law extended to the backdrop's quiet band |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| The paper channel clears the `docs/09:158` law by only **2.7 luma** over the lagoon. A future backdrop, or a re-muted lagoon, silently breaks legibility. | Med | Ship the separation as a pure assertion against the sampled quiet-band constant, so it fails at test time — the `CLUE_DRAINED` defect of 2026-09-12 is exactly this failure mode already paid for once (`docs/09:142-153`). |
| `pushBand`'s fixed `±half` offset folds on a wave crest whose radius `w²/(8A)` is under the band. **`duck-trail2` already folds on `main`** (R 30.9 vs band 39) and nothing catches it; step 4 folds harder (R 13.7 vs band 29). | Med | Unlike the garland case the guard was written for (`catalog.test.ts:371-389`), a wave crest has no adjacent arm: the folded points land at `y_crest ± band`, inside the drawn channel, so the tolerance never leaks across a wall. Assert *that* — the cloud stays inside the stroked channel — rather than importing a U-shaped predicate. Confirm on a capture. |
| Levels are persisted keys (`cursiva.levels.v1`). Changing `duck-trail3`/`4` shapes leaves returning children with approvals earned on shapes that no longer exist. | Low | Ids, clue kinds and ordering are untouched, so no migration is needed and no unlock is lost; only the drawn route changes. Do **not** rename anything. |
| The backdrop image regresses SSR/hydration the way `url(#…)` did. | Low | Plain `<image href>` with no reference and no id; `slice` on the image only. `renderToString` assertions on the emitted element, plus a device-shaped capture. |
| `demo: true` on all four contradicts `docs/13` §5 item 2 ("when the movement is new"). | Low | Out of scope for row B; recorded here so it is not rediscovered as a defect. |

## Rollback plan

Required by `openspec/config.yaml` `rules.proposal`.

1. **Whole change.** `git revert` the merge / reset `sdd/patos-ondulaciones`
   to `main` @ `20f14c3`. Nothing here writes to storage, adds a
   localStorage key, changes a level id, or migrates a record, so a revert
   restores the previous levels with every child's progress intact.
2. **Backdrop only** (if the lagoon reads badly on a device). Empty the
   `SectorId → SECTOR_BACKGROUND_ART` table. Every consumer is keyed off
   "a backdrop is present", so the wall rect returns, the channel returns to
   `CORRIDOR_EARTH`, and the scattered ground comes back — one edit, no
   code path deleted.
3. **Narrative entry only.** Make `resolveEnterAction` return
   `{type:'play'}` unconditionally; `App.tsx` and `nextView` are unchanged
   by construction, so the map goes straight to the level again.
4. **Duck shapes only.** The four `catalog.ts` entries are self-contained
   data; restoring the previous generator calls restores the previous
   levels. `waveVaried` may stay — it ships unused without affecting
   anything, the same way `SECTOR_BACKGROUND_ART` does today.

## Dependencies

None outside the repo. Every asset row B needs is already built, registered
in `client/src/detective/assets.ts`, and reachable
(`artManifest.test.ts`/`artHierarchy.test.ts`): the lagoon backdrop, the
duck, the octopus with the glass, the octopus with the backpack, the speech
bubble. **No art generation.** Paso A (the zoo map) is already on `main`.

## Success criteria

- [ ] All four duck levels are undulations of one family, with the
      `(amplitude, cycles, corridorWidth, taper)` of the decision-1 table,
      and each clears the three phase-1 assertions.
- [ ] `waveVaried` emits only `M`/`C`, survives `transformPath`, and a
      uniform `cycles` list reproduces `wave`'s `d` string exactly.
- [ ] The lagoon is drawn whole under the corridor on all four duck levels,
      via a plain `<image href>` with `slice` on the image; no `<mask>`,
      `<pattern>`, `<clipPath>`, `<defs>`, `useId`, or any `url(#…)`
      anywhere in the diff.
- [ ] A test asserts the channel paint separates ≥ 55 luma from the
      backdrop's quiet band (`docs/09:158`), and fails if either value moves.
- [ ] No scattered ground on the duck levels; the four medusa levels keep
      theirs, unchanged.
- [ ] Entering `duck-trail1` from the map shows the narrative entry; every
      other level goes straight to play. `resolveEnterAction` is pure and
      tested without a DOM.
- [ ] Finishing `duck-trail4` returns to the map with the duck standing at
      the pond and a phrase that closes the adventure instead of pointing
      onward.
- [ ] Every text beside a picture goes through `CaptionedArt`;
      `auditCaptions` stays green.
- [ ] Level ids, clue kinds, `corridorWidth` values and the `cases.ts` /
      `Deduction.tsx` / clue registry are byte-identical to `main`.
- [ ] **Baseline held**: ≥ 60 test files / ≥ 1162 tests green,
      `npm run build` green.
- [ ] **Captures, via `scripts/shot.sh` into `capturas/`** (`docs/12` §4
      makes reading them part of the work): the narrative entry; each of the
      four duck levels showing the lagoon and the channel; one mid-trace
      frame showing ink and clue marks over the water; the map before and
      after `duck-trail4` is filed; and one medusa level proving its
      scattered ground survives.
