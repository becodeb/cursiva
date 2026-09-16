# Proposal: The prologue — Pulpito is the zoo's caretaker

Binding brief: `docs/16_PROLOGO_EL_CUIDADOR.md`. Where `docs/11` and `docs/12` disagree with it, docs/16 wins (its own §opening states this). Exploration: `openspec/changes/add-caretaker-prologue/exploration.md`.

## Intent

The app opens on the zoo map. Tapping `entrada` enters the `glass` adventure, whose entry line is *"El vidrio de la pecera está todo sucio. ¿Lo limpiamos?"*. Eight levels later (`glass1..4`, `sand1..4`) the child meets the only `closingBeat` in the whole game (`zoo/adventures.ts:122`): *"¡Se fueron todos los animales! Agarrá la lupa: los vamos a buscar."*

So the entire prologue is that one sentence. The child cleans eight screens without knowing who Pulpito is or why he cleans, and is then **told** that every animal is missing — animals never seen, in enclosures never introduced as enclosures. The glass is "dirty", not fogged; when it is clean nobody is absent, because nobody was ever said to belong there.

The engine and the difficulty ladder are fine. What is missing is that the child **discovers** the absence instead of being informed of it. Nine of ten adventures have no closing at all, so `AdventureIntro`/`AdventureClosing` — the shipped narrative pair — are simply under-used. This is a change of **script, data and art**, not of engine.

## Scope

### In Scope

1. **An opening sequence (beat 0)** presenting Pulpito as the zoo's CARETAKER: 2–3 chained fixed plates on the `screen/AdventureIntro.tsx` pattern (backdrop, octopus, bubble, one short line, tap to advance), with the three lines fixed by docs/16 §4. It ships as **one component with a single responsibility — show the opening, report when it is done** — so a `<video>` can replace the plates *inside* it later with nothing else in the app noticing. **A skip control is visible at all times**; the opening is never mandatory to play.
2. **Four entrance adventures instead of two**, regrouping the eight existing level ids two-by-two:

   | Adventure | Level ids | Enclosure | Surface | Missing animal |
   |---|---|---|---|---|
   | `peces` | `glass1`, `glass2` | aquarium | fogged glass | PECES |
   | `tortugas` | `sand1`, `sand2` | turtle pen | sand to sweep | TORTUGAS |
   | `monos` | `glass3`, `glass4` | monkey house | fallen leaves | MONOS |
   | `sendero` | `sand3`, `sand4` | zoo path | mud | *(none — the path)* |

   **Level ids are never touched.** They are persisted progress keys and `zoo/sectors.ts:400` opens the pond with `isFiled('sand4')`, which survives the regrouping untouched. The per-surface microprogression asserted in `levels/catalog.test.ts` lives in `levels/catalog.ts`, independent of the `ADVENTURES` grouping layer.
3. **One intro line and one closing per enclosure**, verbatim from docs/16 §9. The closing of the first three is the discovery that the animal is MISSING, carried by a wooden zoo sign (image + word: PECES, TORTUGAS, MONOS) through the shipped `detective/CaptionedArt.tsx`.
4. **`sendero`'s closing is a sequence**: the footprints appear, then the magnifier moment — Pulpito becomes a detective and the lupa enters the backpack (already earned at `sand4`, `zoo/backpack.ts:39-43`) — then the map, which already draws footprints toward the newly discovered sector. `closingBeat` therefore becomes an **ordered, non-empty list of beats** rendered in sequence by the existing `AdventureClosing`. No new screen pattern and no new `GameView` (docs/16 §8 forbids a third pattern).
5. **Four `ADVENTURE_BACKDROP` rows** (the registry is keyed by `AdventureId`, not `SectorId`) with the veil `tile` colour per surface — the erase veil is painted from `tile` at `LevelPlay.tsx:1684`, never from a PNG.
6. **Six new art slots as hand-authored placeholders** (see "Art placeholder policy"), each registered at all four required points.
7. **The hand-enumerated guards that go red**, extended rather than deleted: `zoo/adventures.test.ts:23-67` (ten literal rows incl. `'glass'`/`'sand'`), `:129-165` (`introLevel` undefined for `glass3`/`sand3`; `closingLevel('glass4')` undefined), `screen/GameScreen.test.tsx:176-188, 318-390` (hardcodes that `sand4` closes and `glass4` does not), `levels/catalog.test.ts:400`, and `detective/artManifest.test.ts:181`'s exact `REGISTERED.length === 81`.

### Out of Scope (Non-Goals)

- **The real video.** Beat 0 ships as plates. The video is the author's, and the component boundary exists precisely so it costs nothing later. Its fallback-to-plates behaviour is specified now, not built now.
- **The other nine adventures' closings.** Nine adventures still return to the map silently. Only the four entrance rows gain narration here; generalising it is a separate change.
- **The `docs/00` §4 visual-style pass.** The `docs/referencias/primer-caso/` direction is more elaborate than the shipped art, and `docs/09_GUIA_DE_ESTILO_VISUAL.md` still governs. Functional art now; the style pass later.
- **Any new persisted key.** No `<sector>-seen`, no `prologue-seen`, no new store field. `zoo/sectors.ts:507-524` records the team rejecting exactly this, and `game/migrateEntrance.ts:83` already reads an empty record set as a fresh install.
- **Any change to `scripts/art/build_art.py`'s logic.** New rows in the existing tables only; no placeholder convention is invented inside the script.
- **`night1..4` and the flashlight.** Same reveal grid, different sector (docs/16 §6). Untouched.
- **Retiring or renaming any level id, and any progress migration.** `migrateEntrance.ts` is **re-verified, not rewritten**.
- **A new backpack item.** The lupa is already granted at `sand4`.

## Capabilities

### New Capabilities

- `prologue-opening`: the opening sequence as a bounded capability — one component that shows the opening and reports completion; a derived (never persisted) "already seen" gate; an always-visible skip; a `?nivel=` deep link that bypasses it; an on-demand route so tests and screenshots can reach it; and the documented swap point where a `<video>` replaces the plates with a fallback to them.

### Modified Capabilities

- `zoo-map`: `AdventureId` gains `'peces' | 'tortugas' | 'monos' | 'sendero'` and loses `'glass' | 'sand'`; `ADVENTURES` carries four entrance rows instead of two; `closingBeat` becomes an ordered non-empty beat list; four `ADVENTURE_BACKDROP` rows; `entrada`'s row updated. `estanque.unlockedWhen = isFiled('sand4')` is asserted **unchanged**.
- `main-screen`: `AdventureClosing` renders an ordered sequence of beats (one at a time, tap to advance, last one continues to the map) instead of a single beat; the opening reuses `AdventureIntro`'s stage pattern without modifying it.
- `trace-canvas`: two new backdrop rows must satisfy `docs/09` §4's 55-luma law and join the registry-completeness guard (`trace-canvas/spec.md:820`), so a placeholder background cannot silently escape it.

## Approach

1. **Regroup, do not renumber.** The adventure layer is a pure grouping over level ids. Four rows replace two; `introLevel()` matches `levelIds[0]` and `closingLevel()` matches `levelIds.at(-1)` plus a defined beat list, both unchanged in shape.
2. **A beat list, not a second screen.** `closingBeat: Beat[]` with a sequence index held in `GameScreen`'s existing `close` view. `AdventureClosing` already renders image + phrase; showing N of them in order is a prop and an index, not a pattern.
3. **Derive the opening gate.** "Has the opening been seen?" is answered from the existing level records (a fresh install has none), following `recentlyDiscovered()`'s precedent at `sectors.ts:507-524`. Deep links bypass it; the repo's existing `?nivel=intro-<id>` / `?nivel=cierre-<id>` dev convention (`GameScreen.tsx:113,123`) is extended for the opening so captures and tests can reach it on demand.
4. **Art last, registration first.** Placeholders unblock the flow; the four-point registration is done once, so replacing a placeholder with the author's drawing is a file swap plus a rebuild.

## Art placeholder policy

Hand-authored flat-colour stand-ins at the **exact** `AUTHORED_SOURCE_SIZES` canvas, visually obvious as stand-ins (flat block, high-contrast label area) so the author can see what is still owed. **No change to `build_art.py`'s logic** — only new rows in its existing tables.

| # | Source (`art-source/`) | Emitted | Table | Canvas |
|---|---|---|---|---|
| 1 | `pulpo cuidador.png` | `zoo-octopus-caretaker.png` | `SINGLES` | 1024×1024 |
| 2 | `fondo recinto monos.png` | `sector-monkeys-background.png` | `PASSTHROUGHS` | 1536×1024 |
| 3 | `fondo sendero.png` | `sector-path-background.png` | `PASSTHROUGHS` | 1536×1024 |
| 4 | `cartel peces.png` | `sign-fish.png` | `SINGLES` | 1024×1024 |
| 5 | `cartel tortugas.png` | `sign-turtles.png` | `SINGLES` | 1024×1024 |
| 6 | `cartel monos.png` | `sign-monkeys.png` | `SINGLES` | 1024×1024 |

Each of the six passes **four** registration points: `art-source/<name>.png` → a row in the right `build_art.py` table **plus** an `AUTHORED_SOURCE_SIZES` entry → an export in `client/src/detective/assets.ts` carrying the manifest `w`/`h` → an entry in `REGISTERED` in `client/src/detective/artManifest.test.ts`, whose exact-length assertion moves **81 → 87**.

**Already shipped — reuse, do not re-request** (this shortens docs/16 §7's list): `fondo pecera.png` → `sector-aquarium-background.png` (peces) and `fondo arena.png` → `sector-sand-background.png` (tortugas) both already exist as `PASSTHROUGHS` rows; `pulpo con lupa.png` → `carrier-octopus.png` already exists for the detective beat; `carrito.png` → `zoo-cart.png` already exists for the opening; the footprints (`zoo-octopus-print.png`, `clue-footprint-*.png`) already exist and the map already draws them.

`emit_opaque_canvas` rejects any non-opaque pixel, so the two background placeholders must be fully opaque, and their flat fill must be chosen so `quiet`/`brightest` clear the 55-luma law against the veil `tile` and the ink — a flat placeholder is the easiest way to fail that test, and the easiest to tune.

## Affected Areas

| Area | Impact | What changes |
|---|---|---|
| `client/src/zoo/adventures.ts` | Modified | `AdventureId` union; four entrance rows; `closingBeat` → ordered beat list |
| `client/src/zoo/backdrops.ts` | Modified | `glass`/`sand` rows become four; two new veil `tile` tokens |
| `client/src/zoo/sectors.ts` | Modified | `entrada`'s row; `estanque.unlockedWhen` asserted unchanged |
| `client/src/screen/PrologueOpening.tsx` | New | the single-responsibility opening (plates today, video later) |
| `client/src/screen/AdventureClosing.tsx` | Modified | renders an ordered beat sequence |
| `client/src/screen/GameScreen.tsx` | Modified | beat index in the existing `close` view; opening route |
| `client/src/App.tsx` | Modified | `initialShell()` (`:79-86`) resolves the opening before the map |
| `client/src/detective/assets.ts` | Modified | six new art exports |
| `scripts/art/build_art.py`, `art-source/` | Modified / New | six rows + six placeholder PNGs; no logic change |
| `client/src/game/migrateEntrance.ts` | **Verified only** | level-id/positional, never reads `ADVENTURES` |
| `zoo/adventures.test.ts`, `screen/GameScreen.test.tsx`, `levels/catalog.test.ts`, `detective/artManifest.test.ts` | Modified | the guards in scope item 7 |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Rewriting the hardcoded `glass`/`sand` assertions masks a real regression | **High** | Extend, never delete: add an assertion that the union of the four `levelIds` equals the eight ids in the original order, and that `isFiled('sand4')` still opens `estanque` |
| A returning child with existing records never sees beats their progress skipped past | Medium | Accepted, not migrated: the opening is derived-gated and the beats are session-time; stated to the author rather than papered over with a persisted flag |
| Flat placeholder backgrounds fail the 55-luma law or the registry-completeness guard | Medium | The law is an assertion, not a review step; placeholder fills are chosen against it and the two new rows join a luma group |
| The beat sequence quietly grows into a third screen pattern | Medium | The index lives in the existing `close` view; a test asserts `GameView` gains no member |
| Placeholder art reaches a real child | Medium | Stand-ins are deliberately obvious; the six owed drawings are listed in the change and in docs/16 §7 |
| Enclosure names `monos` / `sendero` are this document's proposal, not the author's | Medium | docs/16 §5 flags it as needing confirmation; carried into the question round below |
| `AdventureId` is a persisted or cross-referenced key somewhere unnoticed | Low | Re-grepped at apply time and the result stated; `backpack.ts` and `migrateEntrance.ts` are already confirmed level-id keyed |

## Rollback Plan

Every seam is data-level and additive-or-regrouping, never a rename of a persisted key.

1. **Code**: `git revert` the branch merge. `AdventureId` returns to `'glass' | 'sand'`, `ADVENTURES` to two entrance rows, `closingBeat` to the single optional beat, and `App.tsx`'s `initialShell()` to `{ at: 'map' }` (a two-line revert, the precedent `2026-09-12-zoo-map-home` already set).
2. **Art**: delete the six `art-source` PNGs and their rows in `build_art.py`/`assets.ts`/`REGISTERED`, re-run `python3 scripts/art/build_art.py`, and `REGISTERED.length` returns to `81`.
3. **Progress**: nothing to undo. No level id is renamed, no record is invalidated, no store key is added, and `estanque.unlockedWhen` is untouched — so a child mid-prologue before the revert is exactly as far along after it.

## Dependencies

- Six placeholder PNGs must exist at the exact authored canvas before `build_art.py` runs; `validate_authored_source_sizes()` runs first and raises on any mismatch.
- The `quiet`/`brightest` literals for the two new backdrop rows must be **read off the rebuilt `manifest.json`**, never hand-guessed — the standing rule from pasos C/D/E.

## Success Criteria

- [ ] A fresh install opens on the caretaker plates, not the map; the skip control is visible on every plate; skipping lands on the map.
- [ ] The opening is a single component whose external contract is "show, then report done" — proven by a test that swaps its internals without touching any caller.
- [ ] `?nivel=` deep links bypass the opening, and the opening is reachable on demand for tests and captures.
- [ ] Four entrance adventures play with the docs/16 §9 script verbatim; the first three close on a sign carrying image + word.
- [ ] `sendero` closes on an ordered sequence: footprints, then the magnifier moment, then the map with footprints toward the discovered sector.
- [ ] The eight level ids are unchanged, in order, and `isFiled('sand4')` still opens `estanque` — both asserted.
- [ ] No `url(#…)` introduced anywhere; `captionAudit` stays green (no on-screen text without its own image).
- [ ] `REGISTERED.length === 87`, every new PNG registered at all four points.
- [ ] `npm test` and `npm run build` green (baseline 79 files / ~1633 tests).
- [ ] Captures of the opening, the four intros and the five closings in `capturas/prologo/`.
- [ ] The six owed drawings are written down where the author will find them, not left implicit in a placeholder.

## Proposal question round

SDD is running in `auto` mode, so these are raised here rather than asked live. None blocks `sdd-spec` or `sdd-design`; each carries a working assumption the author can overturn in one line.

1. **Are `monos` and `sendero` the right third and fourth enclosures?** *Assumption: yes.* docs/16 §5 proposes them and flags them as needing confirmation; `docs/11` leaves the third open and has no fourth.
2. **May placeholder art reach a deployed build, or is the prologue gated until the real drawings land?** *Assumption: placeholders may ship on the branch and in captures, and the six owed drawings are tracked.*
3. **Should a returning child who already finished the entrance be shown the prologue retroactively?** *Assumption: no.* It would require the persisted flag this change refuses; their records already carry them past it.
4. **Does the magnifier beat reuse `carrier-octopus.png` (Pulpito with the lupa, already shipped) or wait for a hat-and-lupa drawing?** *Assumption: reuse now, swap later* — that is exactly what the four-point registration makes cheap.
5. **Is the opening replayable from anywhere a child can reach, or only from a dev route?** *Assumption: dev route only for now*, following the existing `?nivel=intro-<id>` convention.

---

*Length note: this proposal exceeds the skill's 450-word budget, the recorded deviation its six predecessors also took under `delivery_strategy: exception-ok`. `openspec/config.yaml` requires a rollback plan for risky changes; this one regroups a persisted-key layer, adds an entry screen ahead of the map, and introduces six art slots.*
