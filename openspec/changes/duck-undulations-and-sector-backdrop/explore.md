# Exploration — duck ondulaciones + lagoon backdrop (`docs/13` §8 row B)

Scope is `docs/13_AVENTURAS_POR_ANIMAL.md` §8 **row B only**: recut the duck
levels as undulations, draw the lagoon backdrop under the corridor, retire the
scattered ground, and build the reusable narrative entry/closing of §5.
Rows C-H, the snail, and the paused clue-case deduction are out of scope.

Findings carry `file:line`. Judgements are marked as such. Numbers marked
**[verified]** were re-measured by the orchestrator against the real files.

---

## Q1 — The phase-1 vertical-span guard vs. the duck progression

### Findings

`client/src/levels/catalog.test.ts:415-426` **[verified]** — three assertions,
not two:

```
it('puts no phase-1 route inside the writing band', () => {
  // The band is 300-420. A route that fits inside it trains the fingertip;
  // phase 1 exists to train the arm (docs/01 phase 1).
  expect(maxY - minY).toBeGreaterThan(300)   // span taller than the band
  expect(minY).toBeLessThan(180)             // must reach above the middle line
  expect(maxY).toBeGreaterThan(420)          // must reach below the baseline
})
```

Origin: `openspec/changes/archive/2026-09-09-level-engine-mvp/tasks.md:44`, a
second-review fix — *"Every phase-1 route hugged the writing band, training only
the fingertip; phase 1 now uses the whole 1000x600 sheet."* It encodes
`docs/01_VISION_Y_PEDAGOGIA.md:49`: *"un recorrido encerrado ahi entrena
solamente la yema del dedo... eso pide movimiento grande: los caminos cruzan la
hoja entera."* The guard is this project's own founding pedagogy, not a later
opinion.

`wave` (`client/src/levels/paths.ts:327-336`) is built on `alternatingArches`
(`paths.ts:88-109`): `x(t) = w·t` exactly, extrema exactly at `y ∓ amplitude`,
and consecutive half-arches share their end tangent (`paths.ts:82-83`). Every
wave is C1-continuous with no corners, at any amplitude or cycle count.

Half-wave width `w = (x1-x0)/(2N)`; max slope at each join is `4A/w = 8AN/(x1-x0)`.
For the shipped `x0=90, x1=910` (span 820), `slope_max ≈ A·N/102.5`:

| Progression step (`docs/13` §2) | A | N | half-width | slope_max | angle |
|---|---|---|---|---|---|
| 1. "muy suave y amplia, casi una recta" | 170 | 1 | 410 | 1.66 | 59 deg |
| 2. "mas cantidad de ondas pequenas" | 170 | 2 | 205 | 3.32 | 73 deg |
| 3. "variacion de amplitud" | 150-230 | 2-3 | 137-205 | 3.2-5.4 | 73-80 deg |
| 4. "caminos mas delimitados" | 170 | 3 | 137 | 4.68 | 78 deg |

The guard forces `A > 150` (since it needs `2A > 300`). Slope therefore rises
step to step from cycle count compressing the wavelength, not from any conflict
with the guard.

`docs/14` §3 orders the global curriculum "Recorridos amplios y movimientos
simples" *before* "Repeticion" and "Variacion de amplitud" — that supports the
guard's intent rather than arguing for smaller amplitude.

Precedent for per-cycle amplitude variation already exists: `garlandVaried`
(`paths.ts:591-606`) takes a list of `{width, depth}` and was built for
`f2-agua3`'s *"arcos de ancho y hondura variables"*. It emits `M`/`C` only.

`catalog.ts:234-239` records that `design.md`'s literal `amplitude:140` for
`duck-trail1` failed this same guard by 20 units and was bumped to 170.
`duck-trail3` and `duck-trail4` currently borrow shapes that belong to other
animals — `switchback` and `squareWave`; `catalog.ts:280-299` already notes the
spiral belongs to the snail and the triangular wave to the sheep. Row B recuts
both to waves. Level ids and clue kinds stay (they are persisted keys,
`cursiva.levels.v1`).

### Recommendation

**Keep the guard unchanged.** Express the four-step progression through
`cycles` + `corridorWidth` + `taper`, and add a `waveVaried` generator
(sibling of `garlandVaried`) so step 3's "variacion de amplitud" is genuine
per-cycle amplitude change instead of one global number. Do not chase
"gentle" by lowering amplitude: it cannot go below ~150 without breaking the
guard, and in this codebase "suave" means *no corners* (the wave family's C1
continuity), not *low slope* — which is exactly what separates the ducks from
the sheep and llamas of rows C.

**Open for the proposal:** the exact `(A, N, corridorWidth, taper)` per step,
and whether `waveVaried` is worth its own generator.

---

## Q2 — How the lagoon backdrop goes under the corridor

### Findings

The maze block (`canvas/TraceCanvas.tsx:865-934`) paints the **whole sheet
solid** (`MAZE_WALL` or `GROUND_FIELD`, `:900-909`) then strokes the corridor
back over it. A backdrop `<image>` must sit behind that entire block or the
solid rect hides it everywhere except inside the corridor stroke.

`SECTOR_BACKGROUND_ART` (`detective/assets.ts:240-253`) already exists, already
builds, and is **currently unused** outside `artHierarchy.test.ts` and
`artManifest.test.ts`. Built through `PASSTHROUGHS` (`scripts/art/build_art.py:370-379`)
from `art-source/fondo laguna.png`, authored 1536x1024, emitted by
`emit_opaque_canvas` (`build_art.py:230-252`) which crops nothing and rejects
any pixel with `alpha != 255`.

**Crop math [verified]** — measured on `client/public/art/sector-lagoon-background.png`:

```
source 1536x1024 (3:2), viewBox 1000x600 (5:3)
xMidYMid slice -> scale 0.6510 (width-bound), displayed 1000 x 666.7
visible source rows 51..973 of 1024  => 5.0% cropped top, 5.0% bottom
```

90% of the art survives. The quiet band is nowhere near the cropped margins.

**Contrast [verified] — this is the real finding.** Sampling rows 42-58% of the
source, every one of 28160 samples is the single flat colour `(180,197,208)`,
luma **194.2**. The authored quiet band is one uniform colour, so this is
exactly measurable:

| Paint | Hex | Luma | Separation from water |
|---|---|---|---|
| `CORRIDOR_EARTH` | `#d9c3ae` | 198.2 | **4.0** |
| `SHEET_PAPER` | `#fdfcf7` | 251.9 | **57.7** |
| `GROUND_FIELD` | `#c9d7bd` | 210.1 | 15.9 |
| `MAZE_WALL` | `#e2e8f0` | 231.3 | 37.1 |
| `INK_COLOR` | `#1e293b` | 40.0 | 154.2 |

`docs/09_GUIA_DE_ESTILO_VISUAL.md:158` already states the law: *"legible:
separa al menos 55 de luma del suelo que tiene abajo."*

So **`CORRIDOR_EARTH` over the lagoon fails that law by 51** — the corridor
would be invisible. `SHEET_PAPER` passes at 57.7, clearing by 2.7. The child's
ink reads either way (154 of separation).

`sectorOf(levelId)` (`zoo/sectors.ts:395-397`) already maps every duck id to
`estanque` (`sectors.ts:305-330`). `drawingBand` (`screen/LevelPlay.tsx:209-229`)
already returns the full `{y:0, height:600}` sheet for `surface:'blank'`, which
every duck level is.

The layer pattern to copy is `screen/ZooMap.tsx:198-211`: flat edge-colour
`<rect>`, then `<image ... preserveAspectRatio="xMidYMid slice" />`, with
`slice` on the image and never on the root `<svg>`. `url(#...)` stays banned
(`TraceCanvas.tsx:70-84`).

### Recommendation

Do **not** add a `LevelConfig` field. Derive the backdrop from
`sectorOf(level.id)` plus a small `SectorId -> SECTOR_BACKGROUND_ART` lookup,
populated only with `estanque -> 'lagoon'` for row B. That reuses art that
already ships and leaves the config surface alone.

Paint the corridor channel in `SHEET_PAPER` (not `CORRIDOR_EARTH`) whenever a
backdrop is present, and add a pure luma-separation test asserting >= 55
against the backdrop's sampled quiet-band colour, so `docs/09:158` becomes
enforced rather than remembered.

**Open for the proposal:** whether `maze: true`'s solid-wall language still
makes sense over open water, or whether the duck corridor drops the wall rect
entirely and lets the backdrop supply the context.

---

## Q3 — Retiring the scattered ground

### Findings

`ground` is keyed off `inDetectiveWorld(level)` (`levels/world.ts:25-29`), which
is `isCaseTrail(level) || level.detectiveWorld === true`. **[verified]** That is
**8 levels, not 4**: the four `duck-trail*` (they carry `clue`) plus four levels
with `detectiveWorld: true` at `catalog.ts:673, 693, 728, 780` — the shipped
Nivel 3 medusa set (`f2-guirnalda`, `f2-agua2`, `f2-agua3`, `f2-agua4`).

`docs/13` §4 marks the medusa **"Hecha ... Nada"** — it is explicitly not part
of rows B-H. Deleting `grassScatter`/`mudScatter`/`GROUND_GRASS`/`GROUND_MUD`
and the `SCATTERS` table (`build_art.py:441-449`) engine-wide would blank those
four approved levels to bare paper.

`docs/13` §4 decision 3 says the scattered ground *"se retiran cuando entre el
fondo de cada sector"* — per sector, as each backdrop lands. Row B lands only
the lagoon.

### Recommendation

Do **not** delete the module or its art. Suppress `ground` for the four duck
levels once the lagoon backdrop is wired, and leave the medusa levels on the
scatter until their own sector backdrop arrives. This turns "retiro del suelo
disperso" from an engine-wide deletion into a duck-scoped suppression — much
smaller, and it protects shipped content.

---

## Q4 — The narrative entry and closing

### Findings

**The closing is largely already built.** `resolveNextAction`
(`screen/GameScreen.tsx:162-168`) **[verified]** returns `{type:'exit'}` for any
level `sectorOf()` matches — which is all four ducks, not just the last. So
finishing any duck level already drops the child on the map. `animalPlacements`
(`zoo/sectors.ts:423-438`) already stands the duck at its `animalSpot` once
`duck-trail4` is filed; `footprintTrail` and the bubble (`ZooMap.tsx:341-360`)
already show the huellas and the Pulpito's phrase. That covers most of §5 item 6
("animal recuperado ... vuelve al mapa con el cambio visible").

**The entry is genuinely new.** All the art it needs already ships (Q5).
`CaptionedArt` (`detective/CaptionedArt.tsx`) is the only sanctioned way to put
a word beside a picture — `label` is required and `detective/captionAudit.ts`
enforces it. `ZooMap.tsx:354-358` already pairs bubble + phrase exactly this
way, so an entry screen of `pulpo mochila` + `bocadillo` + `pato` + a short
`CaptionedArt` phrase has direct precedent. No new text mechanism, no audio,
no violation of `docs/12` §3's *"nunca una palabra sola sin su imagen"*.

`LevelPlay`'s own `phase` state (`'demo' | 'ready' | 'result'`,
`LevelPlay.tsx:697`) is per-attempt, and the component remounts on every level
(`key={state.levelId}`, `GameScreen.tsx:216`). Folding the intro in there would
replay it after every `resetOnContact` — wrong.

`App.tsx:71-75` hardcodes `{view:'play', levelId}` on `ZooMap.onEnter`,
bypassing the reducer. `nextView` (`GameScreen.tsx:54-68`) is documented as
staying catalog- and sector-independent; `resolveNextAction` is the established
place where sector knowledge and routing meet.

### Recommendation

Mount the entry as a new `GameView` variant reached through a new pure
`resolveEnterAction(levelId, records)` mirroring `resolveNextAction`, called by
`App.tsx`'s `onEnter`. `nextView` stays untouched. Leave the closing mechanism
alone — it already satisfies the requirement; row B's closing work is verifying
it reads as a closing, not building one.

**Open for the proposal:** does the entry show once per **adventure** (before
`duck-trail1` only, matching §5's "one entry, then challenge plus variations")
or before each of the four levels? The former reads as intended.

---

## Q5 — Art inventory

Every asset row B needs is already built, registered and reachable. **No new art
generation.**

| Asset | Registry | File | Status |
|---|---|---|---|
| Lagoon backdrop | `SECTOR_BACKGROUND_ART.lagoon` (`assets.ts:247`) | `sector-lagoon-background.png` | built, registered, unused outside tests |
| Duck | `ANIMAL_ART.pato` (`assets.ts:157`) | `animal-pato.png` | built, registered, used |
| Pulpo con lupa | `OCTOPUS_ART` (`assets.ts:187-191`) | `carrier-octopus.png` | built, registered, used as carrier |
| Pulpo mochila | `ZOO_OCTOPUS_BACKPACK_ART` | `zoo-octopus-backpack.png` | built, registered, used on map |
| Bocadillo | `ZOO_SPEECH_BUBBLE_ART` (`assets.ts:234-238`) | `zoo-speech-bubble.png` | built, registered, used on map |

---

## Q6 — Size forecast

| Area | Est. lines |
|---|---|
| `paths.ts` (+`waveVaried`) + tests | 100-150 |
| `catalog.ts` duck recut | 60-150 |
| `catalog.test.ts` updates (incl. the now-obsolete `duck-trail4` corner/arm guard, `catalog.test.ts:697-702`) | 20-40 |
| `TraceCanvas.tsx` backdrop layer + contrast guard | 80-150 |
| `TraceCanvas` tests | 40-80 |
| `SectorId -> background` map | 10-40 |
| `LevelPlay.tsx` wiring + tests | 70-140 |
| Narrative entry component | 120-200 |
| Entry component tests | 60-120 |
| `GameScreen.tsx` `resolveEnterAction` + wiring + tests | 60-130 |

Midpoint **~950-1000 lines**, above the 800-line review budget. Q3 and Q4 both
shrink the original reading of row B (duck-scoped suppression instead of
engine-wide deletion; closing already built), so the real figure may land lower
— `sdd-tasks` produces the binding forecast.

Natural seam if a split is needed: **B1** the duck wave recut (`paths.ts`,
`catalog.ts`, `catalog.test.ts`) and **B2** the backdrop plus narrative entry.

---

## Decisions the proposal must confirm

1. **Q1** — keep the phase-1 writing-band guard; express the progression via
   `cycles`/`corridorWidth`/`taper`/`waveVaried`, never via amplitude. Exact
   per-step numbers still open.
2. **Q2** — the corridor channel repaints to `SHEET_PAPER` over a backdrop
   (`CORRIDOR_EARTH` fails `docs/09:158` by 51 luma), and whether `maze: true`'s
   solid wall survives over open water.
3. **Q3** — the scattered ground stays wired for the medusa levels; only the
   ducks lose it.
4. **Q4** — entry frequency: once per adventure vs. once per level.
5. **Q6** — accept a two-PR split or record an explicit `size:exception`.
