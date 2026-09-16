# Exploration — add-caretaker-prologue

Source brief: `docs/16_PROLOGO_EL_CUIDADOR.md` (binding) and
`docs/00_ESTADO_DEL_PROYECTO.md`. Full exploration transcript is in Engram
under topic key `sdd/add-caretaker-prologue/explore` (observation 1432).

## Current state, by file

| File | What matters here |
|---|---|
| `client/src/zoo/adventures.ts` | `Adventure = AdventureBase & AdventureSubject`. `AdventureBase`: `id`, `levelIds` (index 0 is the intro level), `sector`, `intro`, `closing` (map-bubble line), `closingBeat?: { line, art }` — **one** closing screen per adventure, present on 1 of 10 rows. `AdventureId` union at `:24-34`. `glass` row `:103-112` (glass1-4, icon, no beat); `sand` row `:113-126` (sand1-4, icon, the game's only `closingBeat`). `introLevel()` `:225` matches `levelIds[0]`; `closingLevel()` `:235` matches `levelIds.at(-1)` **and** a defined `closingBeat`. |
| `client/src/screen/AdventureIntro.tsx`, `AdventureClosing.tsx` | Near-identical ~110-line siblings, deliberately not unified (their own header comments say why). Full-viewport `<button>` stage, octopus bottom-centre, speech bubble on top, `CaptionedArt` inside it, tap anywhere to advance. Background from `backdropFor(levelId).quiet`. Container queries + `cqw`, 100dvh clamp. No `url(#…)`. |
| `client/src/screen/GameScreen.tsx` | `GameView = map \| play \| intro \| deduce \| close`. Routing is data-driven through pure resolvers (`resolveEnterAction` `:236`, `resolveNextAction` `:217`, `resolveCloseAction`), never a `GameAction`. |
| `client/src/screen/App.tsx` | `initialShell()` `:79-86` resolves `?nivel=` deep links, else `{ at: 'map' }`. **The app opens on `ZooMap`.** This is the only hook point for a beat-0 opening. |
| `client/src/zoo/sectors.ts` | `entrada.adventureIds` `:334` actually holds **level** ids, not adventure ids (same misnomer on every sector row). `estanque.unlockedWhen = isFiled(records,'sand4')` `:400` — survives the split untouched. `footprintTrail()` `:601` already draws map footprints. `recentlyDiscovered()` `:507-524` documents the team's decision **against** a persisted `<sector>-seen` key, deriving from `attempts` instead. |
| `client/src/zoo/backdrops.ts` | `ADVENTURE_BACKDROP` is keyed by `AdventureId`, not `SectorId`, because one sector can own two adventures. `glass` `:157-163` (tile `GLASS_GRIME #64726b`), `sand` `:164-170` (tile `SAND_DRIFT #7a6a58`). `LevelPlay.tsx:1684` paints the erase veil in `tile`, so the veil colour comes from here, never from a PNG. |
| `client/src/zoo/backpack.ts` | `lupa` row `:39-43`: `grantedBy: 'entrada'`, `earnedWhen: ['sand4']`. Level-id keyed, so the split does not touch it. |
| `client/src/detective/artManifest.test.ts` | `:181` asserts `REGISTERED.length === 81` **exactly**, cross-checked against `import.meta.glob` of `public/art/*.png`. Fails on a file with no registry row and on a registry row with no file. |
| `client/src/detective/CaptionedArt.tsx`, `captionAudit.ts` | `label` is required (a `@ts-expect-error` test proves an imageless caption cannot compile). `auditCaptions()` walks `renderToString` output and fails on any text outside a container carrying its own `<image href>`/`<img src>`. |
| `scripts/art/build_art.py` | Three source tables: `PASSTHROUGHS` `:459` (opaque backgrounds → `emit_opaque_canvas` `:234`, rejects any non-opaque pixel), `SINGLES` (cutouts → `emit` `:221`), `CENTRED` `:935`. Every source name must also appear in `AUTHORED_SOURCE_SIZES` `:784` with an exact canvas (1024×1024 cutouts, 1536×1024 backgrounds); `validate_authored_source_sizes()` runs first and raises on mismatch. **No placeholder convention exists.** |
| `client/src/game/migrateEntrance.ts` | Positional/level-id only (`ENTRANCE_UNLOCK_ID='sand4'` `:34-36`). Never reads `ADVENTURES`. Unaffected by the regrouping; re-verify, do not rewrite. |
| Progress stores | `cursiva.levels.v1` (`game/LevelProgressStore.ts:11`) holds the real per-level records. `cursiva.progress.v1` (`progress/LocalProgressStore.ts:14`) is the old, unrelated letter workbench. Neither carries any "seen" boolean, and none should be added. |

## Tests that the 2→4 adventure split puts at risk

- `client/src/zoo/adventures.test.ts:23-67` — asserts exactly 10 rows, including literal `'glass'`/`'sand'` and their four-level `levelIds`.
- `client/src/zoo/adventures.test.ts:129-165` — `introLevel` is `undefined` for `glass3`/`sand3` (false after the split); `closingLevel('glass4')` is `undefined` (false once `monos` has a beat); `closingLevel('sand4')?.id === 'sand'`.
- `client/src/screen/GameScreen.test.tsx:176-188, 318-390` — hardcodes that `sand4` closes and `glass4` does not, and does `ADVENTURES.find(a => a.id === 'sand')`.
- `client/src/levels/catalog.test.ts:400` — `ADVENTURES.find(a => a.id === 'glass')!.levelIds[0] === 'glass1'`.
- `client/src/detective/artManifest.test.ts:181` — the exact `81` count.

The microprogression assertions in `catalog.test.ts` (radius never grows, `minAccuracy` never drops, `cols*rows` never drops) are checked per **surface family** (`glass1..4`, `sand1..4`) inside `levels/catalog.ts`, independent of the `ADVENTURES` grouping layer. The split does not endanger them, which confirms docs/16 §5's own claim.

## Open forks, resolved by the orchestrator before `sdd-propose`

1. **Two beats on `sendero`.** `closingBeat` is one screen; docs/16 wants the footprints and then the magnifier. **Decision: `closingBeat` becomes an ordered, non-empty list of beats.** docs/16 §8 forbids a third screen pattern, and `AdventureClosing` already renders image + phrase, so a sequence of beats reuses it. No new `GameView`.
2. **"Has the opening been seen?"** **Decision: derive it, never persist a new flag.** `sectors.ts:507-524` records the team rejecting exactly this kind of key, and `migrateEntrance.ts:83` already reads an empty record set as "fresh install". A `?nivel=` deep link must bypass the opening, and the opening must be reachable on demand for tests and screenshots.
3. **Placeholder art.** **Decision: hand-authored flat-colour stand-in PNGs at the exact `AUTHORED_SOURCE_SIZES` canvas, with no change to `build_art.py`.** The user approved placeholders explicitly. They must be visually obvious as stand-ins so the author knows what is still owed.

## Commands

- `npm test` → `vitest run` (79 files, ~1633 cases before this change)
- `npm run build` → `tsc --noEmit && vite build`
- `python3 scripts/art/build_art.py` → regenerates `client/public/art/` + `manifest.json`
- `bash scripts/shot.sh <url> capturas/x.png <w> <h>` → screenshots
