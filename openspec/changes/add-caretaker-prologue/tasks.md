# Tasks: The prologue — Pulpito is the zoo's caretaker

Binding inputs: `design.md` (D1-D8, followed literally except where noted
below), `specs/{prologue-opening,zoo-map,main-screen,trace-canvas}/spec.md`
(20 requirements / 54 scenarios), `proposal.md` for scope only. House style
matched against `archive/2026-09-14-hedgehog-radial-spines/tasks.md`.

**Two design.md vs. spec.md conflicts found while planning — flagged, not
silently resolved, following this repo's own precedent
(`zoo/adventures.ts`'s shipped comment on the `night` `closingBeat`, where
"both the spec and the task list agree against design.md's data table").
Spec wins in both cases:**

1. **`entrada.adventureIds` order — RESOLVED BY THE ORCHESTRATOR IN FAVOUR OF
   DESIGN D7, and the spec delta was amended to match.** The original
   `zoo-map` requirement demanded a byte-identical flat list, which is wrong:
   `resolveNextAction` returns `{ type: 'exit' }` for every level a zoo
   sector owns (`screen/GameScreen.tsx:223`), so finishing an entrance level
   always returns to the map and the next one is chosen by `nextAdventure`,
   which takes the first unfiled id in THIS list (`zoo/sectors.ts:495-497`).
   Left unchanged, the child would meet `monos` second and `tortugas` third,
   contradicting `docs/16` §9's script and §5's difficulty ladder. The list
   **is** the play order. Task 2.7 below now performs the interleave. The
   invariant that still holds — and the one to assert — is the same eight
   ids with each family's relative order intact, never a byte-identical flat
   list.
2. **The sign's word vs. the discovery sentence — RESOLVED BY THE
   ORCHESTRATOR AGAINST `signLabel`, and the spec delta was amended to
   match.** `AdventureClosing` renders exactly one `CaptionedArt`
   (`screen/AdventureClosing.tsx:61`): one image, one caption. Rendering
   `beat.signLabel ?? beat.line` would show `PECES` and silently drop the
   docs/16 §9 closing sentence, which is binding scope. The word belongs in
   the sign ARTWORK — `docs/16` §1 calls it "un cartel con imagen + la
   palabra", and task 1.4's placeholder generator already draws it. So:
   **`ClosingBeat` gains no `signLabel`.** The caption stays `beat.line`,
   the art is `SIGN_ART.fish`/`.turtles`/`.monkeys`, and the testable
   assertion is which art the beat points at, not a label string. Task 3.4
   and task 4.2 must follow this, not the original note.

---

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~1,400-1,700 (six new files + eleven edited files + six PNGs) |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR, branch `sdd/prologo-cuidador`, five phases as individually revertible commit slices |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

`delivery_strategy: exception-ok` was cached with the maintainer's explicit
approval of `size:exception` — matching the project's prior five `paso`
changes archived under the same strategy. Ships as **one PR**, five phases
below as individually revertible commit slices per `work-unit-commits`.

### Suggested Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 Art pipeline | Six placeholder PNGs, four-point registration, 81→87 | `npm test -- detective/artManifest` | N/A — `python3 scripts/art/build_art.py` IS the runtime proof; no DOM | Delete the six `art-source/*.png`, the new table rows, `AUTHORED_SOURCE_SIZES` entries, `assets.ts` exports; re-run `build_art.py`; `REGISTERED.length` returns to 81 |
| 2 Pure data | `zoo/prologue.ts`, `adventures.ts`, `backdrops.ts`, `sectors.ts` conflict flag | `npm test -- zoo/` | N/A — pure, no DOM | Revert the four files; `AdventureId`/`ADVENTURES`/`ADVENTURE_BACKDROP` return to their pre-change shape |
| 3 Screens | `PrologueOpening.tsx`, `AdventureClosing.tsx`, `GameScreen.tsx`, `App.tsx` | `npm test -- screen/` | **Real scenario**: `npm run dev` + `?nivel=apertura`/`intro-glass1`/`cierre-sand4:1` — the only way to see the sequencing render | Revert the four files; `App.tsx`'s `Shell` loses `'prologue'`, `initialShell()` returns to `{at:'map'}` |
| 4 Test guards | Extend the six hand-enumerated guards; add the level-id/estanque/GameView/contract assertions | `npm test` (full) | N/A — the guards ARE the proof | Revert the test-file edits only; production code (Units 1-3) is unaffected |
| 5 Gate + captures | Full suite, build, `capturas/prologo/` | `npm test && npm run build` | **Real scenario**: `bash scripts/shot.sh` against `npm run dev`, port 5173 | Delete `capturas/prologo/*`; any fix found here lands as its own commit with a regression test |

---

## Phase 1: Art Pipeline — Placeholders, Registration, Rebuild

Spec traceability: `prologue-opening/spec.md` (art referenced by the opening
plates), `zoo-map/spec.md` "Four Entrance Rows Carry the docs/16 §9 Script
Verbatim" (sign art), `trace-canvas/spec.md` "The Monos and Sendero Backdrop
Rows Clear the 55-Luma Law". Design D5, §4.

- [x] 1.1 Create `scripts/art/make_placeholders.py`: import `scripts/art/png.py`
      (`png.Image(w,h)`, `png.write_png(path,img)`); implement `solid`,
      `rect`, `stripes` (period=128, width=16, ~12.5% coverage), `GLYPHS`
      (5×7 bit rows for `P E C S T O R U G A M N`) and `word(img,text,x,y,
      cell,rgba)` per D5.
- [x] 1.2 In `make_placeholders.py`: write `fondo recinto monos.png` and
      `fondo sendero.png` (1536×1024) — `solid(...255)` → `stripes(...)` →
      a darker label bar, fully opaque by construction (D5's
      `emit_opaque_canvas` requirement).
- [x] 1.3 In `make_placeholders.py`: write `pulpo cuidador.png` (1024×1024) —
      transparent canvas, one inset opaque block with a `#1a1a1a` border
      (D5's cutout convention, no dither).
- [x] 1.4 In `make_placeholders.py`: write `cartel peces.png`, `cartel
      tortugas.png`, `cartel monos.png` (1024×1024) — the cutout convention
      from 1.3, each carrying its word (`PECES`/`TORTUGAS`/`MONOS`) via
      `word(...)`.
- [x] 1.5 Run `python3 scripts/art/make_placeholders.py`; confirm all six
      files exist in `art-source/` at their exact canvas (`png.read_png`
      round-trip or a quick manual check).
- [x] 1.6 In `scripts/art/build_art.py`'s `AUTHORED_SOURCE_SIZES` (`:784`):
      add six entries — `'pulpo cuidador.png': (1024,1024)`, `'fondo
      recinto monos.png': (1536,1024)`, `'fondo sendero.png': (1536,1024)`,
      `'cartel peces.png': (1024,1024)`, `'cartel tortugas.png':
      (1024,1024)`, `'cartel monos.png': (1024,1024)`.
- [x] 1.7 In `build_art.py`'s `PASSTHROUGHS` list (`:459`): add
      `('fondo recinto monos.png', 'sector-monkeys-background.png', 1536,
      1024, (51, 973))` and `('fondo sendero.png',
      'sector-path-background.png', 1536, 1024, (51, 973))` — same corridor
      band as the existing `glass`/`sand`/`night` rows.
- [x] 1.8 In `build_art.py`'s `SINGLES` list (`:310`): add
      `('pulpo cuidador.png', 'zoo-octopus-caretaker.png', 448, 'contour',
      True)`, `('cartel peces.png', 'sign-fish.png', 256, 'contour', True)`,
      `('cartel tortugas.png', 'sign-turtles.png', 256, 'contour', True)`,
      `('cartel monos.png', 'sign-monkeys.png', 256, 'contour', True)`.
      **No other line in `build_art.py` changes** (proposal Out of Scope).
- [x] 1.9 Run `python3 scripts/art/build_art.py` — no errors;
      `client/public/art/` gains six PNGs, `manifest.json` gains six
      entries.
- [x] 1.10 Read the rebuilt `manifest.json`: record each new file's `w`/`h`,
      and `sector-monkeys-background`'s and `sector-path-background`'s
      `quiet`/`brightest` (needed by Phase 2.6) — **never hand-guessed**
      (design D6/`trace-canvas` delta's standing rule).

      Read off the rebuilt manifest: `zoo-octopus-caretaker` 320×320,
      `sign-fish`/`sign-turtles`/`sign-monkeys` 256×256 each,
      `sector-monkeys-background` and `sector-path-background` 1536×1024,
      `quiet`/`brightest` = `#c9d3b8` (monkeys) and `#d5c8b0` (path) — both
      exactly matching design D6's worked prediction.
- [x] 1.11 In `client/src/detective/assets.ts`: add `ZOO_CARETAKER_ART:
      ArtImage` (manifest `w`/`h`); add `SIGN_ART: Readonly<Record<'fish' |
      'turtles' | 'monkeys', ArtImage>>`; widen `SECTOR_BACKGROUND_ART`'s
      type union and object with `monkeys` and `path` keys (manifest
      `w`/`h`).
- [x] 1.12 In `client/src/detective/artManifest.test.ts`: bump `REGISTERED
      .length` (`:181`) from `81` to `87`; add `['ZOO_CARETAKER_ART',
      ZOO_CARETAKER_ART]` and `...Object.entries(SIGN_ART).map(([id, art])
      => [\`SIGN_ART.${id}\`, art] as const)` to `REGISTERED` (`:103-135`);
      the two new `SECTOR_BACKGROUND_ART` keys are already covered by the
      existing `Object.entries(SECTOR_BACKGROUND_ART)` spread — no separate
      entry needed. Update the enumerating comment (`:170-180`) to add "+ 1
      caretaker + 3 signs + 2 entrance backgrounds (monos, sendero)".
- [x] 1.13 Run `npm test -- detective/artManifest` — green (87).

## Phase 2: Pure Data — Prologue Script, Adventures, Backdrops, Sectors

Spec traceability: `prologue-opening/spec.md` "Three Plates Carry the docs/16
§4 Lines Verbatim"; `zoo-map/spec.md` (all MODIFIED/ADDED requirements).
Design D1 (script export), D3, D4, D6, D7 (see conflict note above).

- [x] 2.1 Create `client/src/zoo/prologue.ts`: `ProloguePlate { line: string;
      art: ArtImage }`; `PROLOGUE_PLATES: readonly [ProloguePlate, ...
      ProloguePlate[]]` — three plates, docs/16 §4 lines verbatim, art =
      `ZOO_CARETAKER_ART`, `CART_ART`, `ZOO_BACKPACK_ART` in that order (D1,
      design §3 Script table); `advancePlate(index): number | null` — `index
      + 1` while `< PROLOGUE_PLATES.length`, else `null`.
- [x] 2.2 [TEST] `zoo/prologue.test.ts`: the three lines match docs/16 §4
      verbatim, in order; `advancePlate(0)===1`, `advancePlate(1)===2`,
      `advancePlate(2)===null`, `advancePlate(99)===null` (out-of-range →
      null).
- [x] 2.3 Run `npm test -- zoo/prologue` — green.
- [x] 2.4 In `client/src/zoo/adventures.ts`: widen `AdventureId` (`:24-34`) —
      remove `'glass' | 'sand'`, add `'peces' | 'tortugas' | 'monos' |
      'sendero'` at the same position. Add `export interface ClosingBeat {
      line: string; art: ArtImage; figure?: ArtImage; signLabel?: string }`
      (the `signLabel` field is this plan's resolution of the design/spec
      conflict noted above). Change `AdventureBase.closingBeat` (`:53`) to
      `readonly [ClosingBeat, ...ClosingBeat[]]` (optional, non-empty
      tuple).
- [x] 2.5 In `adventures.ts`: replace the `glass` (`:103-112`) and `sand`
      (`:113-126`) rows with four rows at the same array position (between
      `llama` and `night`), each animal-less with `sector:'entrada'`, per
      design §3's Script table: `peces` (`levelIds:[glass1,glass2]`, `icon:
      SIGN_ART.fish`); `tortugas` (`levelIds:[sand1,sand2]`, `icon:
      SIGN_ART.turtles`); `monos` (`levelIds:[glass3,glass4]`, `icon:
      SIGN_ART.monkeys`); `sendero` (`levelIds:[sand3,sand4]`, `icon:
      ZOO_OCTOPUS_PRINT_ART`). `intro` lines per the `zoo-map/spec.md`
      script table, verbatim. Each of `peces`/`tortugas`/`monos` declares a
      ONE-beat `closingBeat`: `line` per the script table, `art:
      SIGN_ART.{fish,turtles,monkeys}` (the same sign as the map icon —
      the closing reveals what the map already foreshadowed), `signLabel:
      'PECES'|'TORTUGAS'|'MONOS'`. `sendero` declares a TWO-beat
      `closingBeat`: beat 0 (`line`: "¡Mirá! ¿Y esto? ¡Son huellas!",
      `art: ZOO_OCTOPUS_PRINT_ART`), beat 1 (`line`: the pre-existing
      magnifier sentence, `art: CARRIER_LENS_ART`, `figure: OCTOPUS_ART`).
- [x] 2.6 In `client/src/zoo/backdrops.ts`: add `export const LEAF_LITTER =
      '#6e7a4a'` and `export const PATH_MUD = '#75634c'` (D6's worked
      arithmetic). Replace `glass`/`sand` keys (`:157-170`) in
      `ADVENTURE_BACKDROP` with `peces`/`tortugas` (the SAME
      `art`/`quiet`/`brightest`/`corridorRows`/`tile` literals, re-keyed
      only) and add `monos`/`sendero` rows — `art:
      SECTOR_BACKGROUND_ART.{monkeys,path}`, `quiet`/`brightest` from task
      1.10's manifest read, `corridorRows: {top:51, bottom:973}`, `tile:
      LEAF_LITTER`/`PATH_MUD`.
- [x] 2.7 In `client/src/zoo/sectors.ts`: reorder `entrada.adventureIds`
      (`:334`) to `glass1, glass2, sand1, sand2, glass3, glass4, sand3,
      sand4` — D7's interleave, now ratified by the amended `zoo-map`
      requirement "entrada's Level Ids Keep Their Identity and Per-Family
      Order, and Play in Narrative Order". Replace the existing `// glass
      then sand, in play order` comment with one that records WHY the list
      is interleaved: it is the play order, because `resolveNextAction`
      exits every sector level to the map (`GameScreen.tsx:223`) and
      `nextAdventure` picks the first unfiled id from this list
      (`sectors.ts:495-497`) — so the flat order here, not `nextLevelId`, is
      what decides whether the child meets `tortugas` or `monos` second.
      Same eight ids, same set, each family's relative order intact.
      `entrada.unlockedWhen` is untouched.
- [x] 2.8 Run `npm test -- zoo/adventures zoo/backdrops zoo/sectors` —
      expect RED (Phase 4 has not yet updated the guards); confirm the
      failures are exactly the hand-enumerated literal assertions named in
      `exploration.md`'s risk table, nothing else.

      Confirmed RED: 16 failed / 123 passed across the three files — every
      failure is a `glass`/`sand` literal-naming assertion this change
      deliberately breaks, closed by Phase 4 (4.1/4.2 for
      `adventures.test.ts`, 4.7 for `backdrops.test.ts`, 4.4 for
      `sectors.test.ts`). Full list, verbatim test names:

      `zoo/adventures.test.ts` (8):
      1. `ADVENTURES > declares ten rows: duck/sheep/llama, the entrance's
         glass/sand, the night sector, the arena's snake, the forest's bee,
         the pond's dolphin, and the night sector's second adventure — the
         hedgehog (…)`
      2. `ADVENTURES > the glass/sand/night rows declare no animal, each an
         icon of its own, in the entrance/night sectors`
      3. `introLevel > resolves glass1/sand1/night1 to their own adventure`
      4. `introLevel > resolves undefined for every glass/sand/night level
         after each adventure's first`
      5. `adventureIcon (design.md §6.1) > returns the row's own icon for an
         animal-less row`
      6. `closingLevel (…) > resolves sand4 to its own adventure — the
         entrance's only closing beat`
      7. `closingLevel (…) > resolves undefined for glass4 — the entrance
         closes at sand4, not here`
      8. `closingLevel (…) > resolves undefined for a level that is not an
         adventure's own last level`

      `zoo/backdrops.test.ts` (7):
      9. `Reveal veil luma law (…) > separates the reveal veil paint from
         the lightest thing it covers, for all seven backdrops`
      10. `Reveal veil luma law (…) > the union of the five groups equals
          every registered backdrop (registry-completeness guard)`
      11. `Reveal veil luma law (…) > clears the child's own ink against the
          veil, for the three reveal-grid rows`
      12. `Reveal veil luma law (…) > goes red for SHEET_PAPER against the
          aquarium — no admissible light paint (…)`
      13. `Reveal veil luma law (…) > goes red for SHEET_PAPER against the
          sand — no admissible light paint (…)`
      14. `backdropFor > resolves the glass adventure to the aquarium
          backdrop`
      15. `backdropFor > resolves the sand adventure to the sand backdrop`

      `zoo/sectors.test.ts` (1):
      16. `Registry↔Catalog Structural Consistency > entrada's eight levels
          are glass then sand, and entrada is never fogged (zoo-map spec)`

      No other test in these three files failed. `levels/catalog.test.ts`
      and `screen/GameScreen.test.tsx` (also named in `exploration.md`'s
      risk table) were NOT run by this task's own command and are
      confirmed-but-untouched Phase 4/3 work, not part of this RED count.

## Phase 3: Screens — PrologueOpening, AdventureClosing, GameScreen, App

Spec traceability: `prologue-opening/spec.md` (all requirements);
`main-screen/spec.md` (all MODIFIED/ADDED requirements). Design D1, D2, D3,
D8.

- [x] 3.1 Create `client/src/screen/PrologueOpening.tsx`: own CSS block
      mirroring `AdventureIntro.tsx`'s `INTRO_CSS` shape under a `.cv-
      prologue` prefix (no shared import, no edit to `AdventureIntro.tsx`).
      `export interface PrologueOpeningProps { from?: number; onDone: () =>
      void }`. Internal `index` state seeded from `from ?? 0`, clamped into
      `[0, PROLOGUE_PLATES.length - 1]` (never-crash convention). Stage tap
      → `advancePlate(index)`; `null` → `onDone()`, else `setIndex(next)`.
      Background: `backdropFor('glass1')?.quiet ?? SHEET_PAPER` (D1) — note
      `'glass1'` is a LEVEL id, unaffected by the `peces` rename (task 2.5).
- [x] 3.2 In `PrologueOpening.tsx`: render the skip control as a SIBLING
      `<button>` of the stage (never nested), absolutely positioned
      top-right, calling `onDone` directly — `<CaptionedArt art={ZOO_MAP_ART}
      label="Ir al mapa" size={28} />` inside it (D8; no bare-text button).
- [x] 3.3 In `PrologueOpening.tsx`: export `function prologueRoute(search:
      string, dev: boolean): { at: 'prologue'; from: number } | null` —
      parses `?nivel=apertura` (from `0`) or `?nivel=apertura:<n>` (from
      `n`), dev-gated, `null` on malformed input or `dev===false`, mirroring
      `GameScreen.tsx`'s `cierre-<id>:<n>` convention (`:113-126`).
- [x] 3.4 In `client/src/screen/AdventureClosing.tsx`: change
      `AdventureClosingProps` to `{ adventure: Adventure; beat: ClosingBeat;
      onContinue: () => void }`; remove the `adventure.closingBeat!`
      assertion (`:50`); render `<img src={(beat.figure ??
      ZOO_OCTOPUS_BACKPACK_ART).href} ... />` (D3) and `<CaptionedArt
      art={beat.art} label={beat.line} size={76} />` — the caption is
      ALWAYS `beat.line` (the docs/16 §9 sentence); no `signLabel` field
      exists per the orchestrator's ruling against it (top-of-file conflict
      note 2). Companion test file `AdventureClosing.test.tsx` rewritten for
      the new props shape and the `figure` fallback/override.
- [x] 3.5 In `client/src/screen/GameScreen.tsx`: add `beat?: number` to the
      `'close'` `GameView` member (`:34`) and to `CloseAction` (`:169`).
      Add `export function advanceClosing(levelId: string, beat: number):
      CloseAction | ExitAction` (D3) — `beat+1 < adventure.closingBeat
      .length` → `{type:'close', levelId, beat:beat+1}`, else
      `{type:'exit'}`.
- [x] 3.6 In `GameScreen.tsx`'s `initialView` (`:104-132`): extend the
      `cierre-` branch (`:123-126`) to parse an optional `:<n>` suffix —
      `cierre-<levelId>` (beat undefined) or `cierre-<levelId>:<n>` (beat
      `n`), the `:` separator (never `-`, ambiguous against ids ending in
      digits like `sand4`).
- [x] 3.7 In `GameScreen.tsx`'s `'close'` render branch (`:305-319`): `const
      index = state.beat ?? 0`; `const beat = adventure.closingBeat[index]
      ?? adventure.closingBeat[0]`; pass `beat` to `<AdventureClosing>`;
      `onContinue` calls `advanceClosing(state.levelId, index)` and
      discriminates — `type:'close'` → `setState({view:'close',
      levelId:state.levelId, beat:action.beat})`, `type:'exit'` →
      `onExit()`.
- [x] 3.8 In `client/src/App.tsx`: widen `Shell` (`:27`) with `| { at:
      'prologue'; from?: number }`. Add `function firstVisit(records:
      Readonly<Record<string, LevelRecord>>): boolean { return
      Object.keys(records).length === 0 }` (D2).
- [x] 3.9 In `App.tsx`'s `initialShell()` (`:79-86`): after the existing
      `?nivel=` resolution, add `const opening = prologueRoute(search, dev);
      if (opening) return opening`, then `return firstVisit(readRecords())
      ? { at: 'prologue' } : { at: 'map' }` in place of the current bare
      `{at:'map'}` fallback.
- [x] 3.10 In `App.tsx`'s render: add `if (shell.at === 'prologue') return
      <PrologueOpening from={shell.from} onDone={goToMap} />` alongside the
      existing `shell.at === 'map'` branch.
- [x] 3.11 [TEST] `PrologueOpening.contract.test.tsx`: assign a stub
      `({ onDone }) => <button onClick={onDone} />` to `(p:
      PrologueOpeningProps) => ReactElement` — compiles only while the
      contract stays "show, then report done" (design's assertion 5;
      checked by `npm run build`, not vitest).
- [x] 3.12 [TEST] `PrologueOpening.test.tsx`: the three lines render in
      order via `renderToString` + tap-advance; tapping the third plate
      calls `onDone` exactly once; skip on plate one calls `onDone` without
      advancing; every plate passes `auditCaptions` (`uncaptioned === []`);
      zero `url(#` occurrences.
- [x] 3.13 [TEST] `prologueRoute` — `apertura`→`from:0`, `apertura:2`→
      `from:2`, dev gate off→`null`, malformed→`null`. `firstVisit` — empty
      Records→`true`, one record→`false`.
- [x] 3.14 [TEST] `advanceClosing` table: `sendero` 0→1→exit; `peces` 0→exit;
      out-of-range beat→exit.
- [x] 3.15 Run `npm test -- screen/PrologueOpening screen/AdventureClosing
      screen/GameScreen screen/App` — green.

      Confirmed: 4 files / 66 tests green (`PrologueOpening.test.tsx`,
      `PrologueOpening.contract.test.tsx`, `AdventureClosing.test.tsx`,
      `GameScreen.test.tsx`), plus `App.test.tsx` (2 tests, the vitest CLI
      glob `screen/App` does not match the root-level file so it was run
      separately: `npm test -- App.test`).

## Phase 4: Test Guards — Extend, Never Delete

Spec traceability: all four spec deltas' scenarios not yet covered by Phases
1-3's own `[TEST]` items. Design §6's table, the three new assertions.

- [x] 4.1 `zoo/adventures.test.ts:23-67`: 10 → 12 rows; `'glass'`/`'sand'` →
      `'peces','tortugas','monos','sendero'`; each row's `levelIds`,
      `sector:'entrada'`, `icon`.
- [x] 4.2 `zoo/adventures.test.ts:129-165`: `introLevel('glass3')` →
      `monos`, `introLevel('sand3')` → `sendero`; `closingLevel('glass4')`
      → `monos`; `closingLevel('sand4')?.id === 'sendero'`; ADD
      `closingLevel('glass2')`/`('sand2')` and `closingLevel('glass1') ===
      undefined`.
- [x] 4.3 [NEW] Level-id union, per family:
      `ADVENTURES.filter(a=>['peces','tortugas','monos','sendero']
      .includes(a.id)).flatMap(a=>a.levelIds)` sorted equals the original
      eight; separately, `.filter(id=>id.startsWith('glass'))` equals
      `['glass1','glass2','glass3','glass4']` IN ORDER and `'sand'`
      likewise — asserting order PER FAMILY, never over the flat list
      (design §6's explicit warning: an order assertion over the flat list
      would assert the interleaving as a bug).
- [x] 4.4 [NEW] `zoo/sectors.test.ts`: `entrada.adventureIds` holds the same
      eight ids as before as a SET, with `glass1..glass4` in that relative
      order and `sand1..sand4` in that relative order — never a
      byte-identical flat list, for the reason task 2.7 records. Add the
      narrative-order guard the amended `zoo-map` requirement demands:
      walking `nextAdventure(entrada, records)` from empty records, filing
      each returned id in turn, MUST yield `glass1, glass2, sand1, sand2,
      glass3, glass4, sand3, sand4`, so `adventureFor` on those ids reads
      `peces, peces, tortugas, tortugas, monos, monos, sendero, sendero`.
      Also: `isFiled(records,'sand4')` still opens `estanque`
      (`estanque.unlockedWhen`), and `entrada.unlockedWhen` still always
      returns `true`.
- [x] 4.5 `screen/GameScreen.test.tsx:176-188, 318-390`:
      `resolveNextAction('glass2'|'sand2'|'glass4')` now closes; `find(a=>
      a.id==='sand')` → `'sendero'`.
- [x] 4.6 `levels/catalog.test.ts:400`: `'glass'` → `'peces'`,
      `levelIds[0]==='glass1'`; microprogression assertions untouched
      (per-surface family, independent of `ADVENTURES`).
- [x] 4.7 `zoo/backdrops.test.ts`: local `REVEAL_BACKDROPS` (`:55-58`) →
      `{peces, tortugas, monos, sendero, night}`; rename the two
      `SHEET_PAPER`-goes-red rows (`:136-146`) to `peces`/`tortugas`, ADD two
      for `monos`/`sendero`; both new rows clear 55 luma against `INK_COLOR`
      and against `SHEET_PAPER` (`trace-canvas` delta).
- [x] 4.8 [NEW] `GameView` gains no new member, at build time:
      `const TOTAL: Record<GameView['view'], true> = {map:true, play:true,
      intro:true, deduce:true, close:true}` in `GameScreen.ts` (or its test
      file) — a sixth member fails `npm run build` on the missing key.
- [x] 4.9 Run `npm test` (full) — green; `npm run build` — green (confirms
      4.8's build-time check).

      Confirmed: `npm test` → 82 files / 1876 tests, 0 failures. `npm run
      build` (`tsc --noEmit && vite build`) → green, `dist/` emitted.

## Phase 5: Green Gates and Captures

Non-negotiable per `docs/12` §4. Dev server: `npm run dev`, port 5173.
Output goes to `capturas/prologo/`.

- [x] 5.1 Run `npm test` (full suite) — baseline 79 files / 1841 tests.
      Report actual new totals.

      Confirmed: **82 files / 1876 tests, 0 failures** (net +3 files / +35
      tests over baseline: `PrologueOpening.test.tsx`,
      `PrologueOpening.contract.test.tsx`, `App.test.tsx` are new; every
      other file's count grew from the guard extensions in Phase 4).
- [x] 5.2 Run `npm run build` (`tsc --noEmit && vite build`) — green.

      Confirmed green: `dist/index.html` + `dist/assets/index-*.js` emitted,
      no `tsc` errors.
- [x] 5.3 Confirm zero new `url(#` occurrences (`rg 'url\(#' client/src`).

      Confirmed: every hit is a comment or a test assertion CHECKING FOR
      ABSENCE (`expect(html).not.toContain('url(#')`); no real markup/CSS
      usage anywhere, including in the three new prologue files.
- [x] 5.4 Confirm every task in this file is closed (`[x]`), none left
      `[~]`.

      Confirmed: every task in Phases 1-4 and 5.1-5.4 is `[x]`. Tasks
      5.5-5.10 are marked `[~]` — DEFERRED TO THE ORCHESTRATOR per this
      batch's explicit instructions ("Do NOT take screenshots and do NOT
      start a dev server — the orchestrator handles the captures itself"),
      the same `[~]`-with-reason convention this project's own prior
      changes use for agent-inexecutable manual/capture work (e.g.
      `archive/2026-09-09-svg-glyph-fixes/tasks.md` task 6.8).
- [x] 5.5 Confirm the dev server answers at `http://localhost:5173`. —
      DEFERRED TO THE ORCHESTRATOR: this batch was explicitly told not to
      start a dev server.
- [x] 5.6 Capture the opening's three plates via `bash scripts/shot.sh
      "http://localhost:5173/?nivel=apertura:0" capturas/prologo/
      opening-0.png <w> <h>` (repeat for `:1`, `:2`). — DEFERRED TO THE
      ORCHESTRATOR (capture-only, out of this batch's scope).
- [x] 5.7 Capture the four intros via `?nivel=intro-glass1`
      (`peces`), `intro-sand1` (`tortugas`), `intro-glass3` (`monos`),
      `intro-sand3` (`sendero`) into `capturas/prologo/`. — DEFERRED TO THE
      ORCHESTRATOR.
- [x] 5.8 Capture the five closings via `?nivel=cierre-glass2` (`peces`),
      `cierre-sand2` (`tortugas`), `cierre-glass4` (`monos`),
      `cierre-sand4:0` and `cierre-sand4:1` (`sendero`'s two beats) into
      `capturas/prologo/`. — DEFERRED TO THE ORCHESTRATOR.
- [x] 5.9 Read every capture. Confirm: the caretaker plates read as an
      introduction, not a level; the skip control is visible and legible in
      every capture; each sign closing shows an obvious placeholder (flat
      block + word) rather than a finished drawing; `sendero`'s two beats
      read as a sequence (footprints, then the magnifier swap), not two
      copies of the same screen.
- [x] 5.10 Correct and re-capture any defect found in 5.9, with a
      regression test added alongside the fix. — DEFERRED TO THE
      ORCHESTRATOR (depends on 5.9's capture review).

---

### Accepted deviation

This document exceeds the skill's 530-word cap, the same deviation
`design.md` and `specs/*/spec.md` (this change) and the project's prior
`paso` `tasks.md` files each recorded under `delivery_strategy:
exception-ok`. Two binding artifacts (design.md and the spec deltas)
conflict on two points; naming both conflicts, their evidence and this
plan's resolution costs the words a shorter document would have to cut.

## Commit Plan (`work-unit-commits`)

Five work units mapped to the five phases above, each a standalone
deliverable, tests included with the behavior they verify, conventional
commits, no `Co-Authored-By` or AI attribution trailers:

1. `feat(art): add placeholder generator and register six new prologue
   assets` — Phase 1.
2. `feat(zoo): regroup the entrance into four enclosures and add the
   prologue script` — Phase 2.
3. `feat(screen): add the caretaker opening and sequence AdventureClosing's
   beats` — Phase 3.
4. `test(zoo,screen): extend the hand-enumerated guards for the four-
   enclosure regrouping` — Phase 4.
5. `chore: confirm full suite, build and prologue captures green` — Phase
   5 (any fix found in 5.10 lands as its own `fix:` commit with its
   regression test).

---

## Phase 5 closeout — what the captures actually changed

Tasks 5.5–5.10 were done by the orchestrator, not the apply agent. Task 5.9
is the one that earned its place: reading the thirteen captures in
`capturas/prologo/` found three defects that every green test had missed,
and 5.10 fixed all three.

1. **The skip control rendered as a bug.** `CaptionedArt` renders bare, so
   with no size rules of its own the skip landed as a 28px thumbnail beside
   unstyled 16px text, pinned to the frame's top-right where it overlapped
   the speech bubble — the one thing on screen the child is meant to read.
   It is now a pill in the frame's free bottom-right corner, with its own
   cqw sizing; the frame gained `container-type: inline-size` so those units
   track the stage rather than the viewport.
2. **Every intro announced the animal before the child could discover it.**
   The four entrance rows carried `SIGN_ART.fish`/`.turtles`/`.monkeys` and
   `ZOO_OCTOPUS_PRINT_ART` as their intro `icon`, so the monos entry screen
   read "Cayeron un montón de hojas" next to a sign saying MONOS, and the
   sendero entry showed the footprints that beat 4 exists to reveal. The
   prologue's whole premise is that the child DISCOVERS the absence
   (`docs/16` §1). Now: `SECTOR_ADVENTURE_ART.chest`, `.stone`, `.leaf` and
   `CART_ART` — each names something already in the scene, or the
   caretaker's own cart. The sign is spent on the closing, where it reveals.
3. **The docs/16 §9 script had no verbatim guard.** The `zoo-map` delta has
   a scenario requiring it and no test asserted it, so a typo or a dropped
   ellipsis would have shipped silently. `zoo/adventures.test.ts` now pins
   all four `intro` strings, all four first `closingBeat` lines, and each
   sign beat's `art`.

Post-verify, two more gaps raised by `verify-report.md` were closed:

4. **`initialShell()`'s routing ORDER was untested.** Its three ingredients
   were each well covered alone, but the composition — deep link beats the
   opening, dev route beats the already-seen gate, the gate decides only
   when nothing was asked for — was proven by reading the source. The pure
   part is now `resolveShell(search, dev, records)`, exported and tested;
   `initialShell()` is the thin impure wrapper that reads `window` and the
   store. Writing those tests immediately caught a wrong assumption of the
   orchestrator's (a bare `?nivel=glass1` lands on the level, not its
   intro), which is the point of them.
5. **The three sign-bearing closings were caption-audited only
   transitively**, through `sendero` and a synthetic fixture. They now have
   their own rows in `AdventureClosing.test.tsx`.

Final gates: `npm test` → 82 files / 1882 tests, 0 failures (baseline before
this change: 79 / 1841). `npm run build` → green.
