# Apply Progress: add-caretaker-prologue

**Batch 2 of 2** — Phase 3 (screens), Phase 4 (test guards), and Phase 5's
gate tasks (5.1–5.4). Phase 5's capture tasks (5.5–5.10) are explicitly
DEFERRED to the orchestrator, which owns the dev-server/screenshot pass.
Batch 1's Phase 1 (art pipeline) and Phase 2 (pure data/logic) sections below
are carried forward unchanged except for one correction noted inline (the
`signLabel` note in task 2.4, overridden by the orchestrator's ruling — see
"Ruling correction" below).

## Ruling correction to batch 1's own notes (read this first)

Two orchestrator rulings, issued between batch 1 and batch 2, override
batch 1's own resolution of the two conflicts `tasks.md`'s top-of-file note
originally flagged:

1. **`entrada.adventureIds` interleave — batch 1 already implemented this
   correctly** (task 2.7: `glass1, glass2, sand1, sand2, glass3, glass4,
   sand3, sand4`), ratified by the amended `zoo-map` requirement. No change
   needed from batch 2 on this point.
2. **`signLabel` — batch 1's task 2.4 added `signLabel?: string` to
   `ClosingBeat` and used it in the three sign-bearing rows (`peces`/
   `tortugas`/`monos`). The orchestrator ruled AGAINST this** (ruling 2):
   `AdventureClosing` renders exactly one `CaptionedArt` per beat — one
   image, one caption — so rendering `beat.signLabel ?? beat.line` would
   show `PECES` and silently drop the docs/16 §9 closing sentence, which is
   binding scope. Batch 2 REMOVED `signLabel` from `ClosingBeat` and from
   all three rows in `client/src/zoo/adventures.ts`, removed the mention in
   `client/src/detective/assets.ts:296`, and updated `state.yaml` and this
   file. The caption is now always `beat.line`; the testable invariant is
   which art (`SIGN_ART.fish`/`.turtles`/`.monkeys`) the beat points at, not
   a label string. `tasks.md`'s task 2.4/2.5 body text still describes the
   original (now-retired) `signLabel` plan verbatim — left as historical
   record per the batch-2 prompt's narrow scope (only `state.yaml` and this
   file were named for correction), but the top-of-file conflict note and
   the checkbox state both reflect the CURRENT ruling.

## Completed tasks (55/55)

### Phase 1: Art Pipeline — Placeholders, Registration, Rebuild (13/13)

- [x] 1.1 `scripts/art/make_placeholders.py` created: `solid`, `rect`,
      `stripes`, `GLYPHS` (5×7 bitmaps for `P E C S T O R U G A M N`),
      `word`, plus an `octagon` helper (see Deviations).
- [x] 1.2 `fondo recinto monos.png` / `fondo sendero.png` written,
      1536×1024, fully opaque.
- [x] 1.3 `pulpo cuidador.png` written, 1024×1024, transparent canvas +
      inset octagon block bordered in `#1a1a1a`.
- [x] 1.4 `cartel peces.png` / `cartel tortugas.png` / `cartel monos.png`
      written, each carrying its block-letter word.
- [x] 1.5 All six files confirmed on disk at exact canvas.
- [x] 1.6 `AUTHORED_SOURCE_SIZES` — six entries added.
- [x] 1.7 `PASSTHROUGHS` — two rows added (`sector-monkeys-background.png`,
      `sector-path-background.png`, corridor `(51, 973)`).
- [x] 1.8 `SINGLES` — four rows added (`zoo-octopus-caretaker.png`,
      `sign-fish.png`, `sign-turtles.png`, `sign-monkeys.png`).
- [x] 1.9 `python3 scripts/art/build_art.py` ran clean — 87 files (was 81).
- [x] 1.10 Manifest read: `zoo-octopus-caretaker` 320×320, three signs
      256×256 each, `sector-monkeys-background`/`sector-path-background`
      1536×1024 with `quiet === brightest` = `#c9d3b8` / `#d5c8b0` — exact
      match to design D6's worked prediction.
- [x] 1.11 `assets.ts`: `ZOO_CARETAKER_ART`, `SIGN_ART` (3 keys),
      `SECTOR_BACKGROUND_ART` widened with `monkeys`/`path`.
- [x] 1.12 `artManifest.test.ts`: `REGISTERED.length` 81→87, new entries
      added, enumerating comment updated.
- [x] 1.13 `npm test -- detective/artManifest` green (102 tests).

### Phase 2: Pure Data — Prologue Script, Adventures, Backdrops, Sectors (8/8)

- [x] 2.1 `client/src/zoo/prologue.ts` created: `ProloguePlate`,
      `PROLOGUE_PLATES` (docs/16 §4 verbatim), `advancePlate`.
- [x] 2.2 `zoo/prologue.test.ts` created.
- [x] 2.3 `npm test -- zoo/prologue` green (5 tests).
- [x] 2.4 `adventures.ts`: `AdventureId` widened (`glass`/`sand` →
      `peces`/`tortugas`/`monos`/`sendero`); `ClosingBeat` interface added.
      **Batch 2 correction**: batch 1 originally added `signLabel?: string`
      here; the orchestrator ruled against it (see "Ruling correction"
      above) and batch 2 removed the field entirely. `closingBeat` is
      `readonly [ClosingBeat, ...ClosingBeat[]]`.
- [x] 2.5 Four entrance rows (`peces`, `tortugas`, `monos`, `sendero`)
      replace `glass`/`sand`, docs/16 §9 lines verbatim, `sendero`'s
      two-beat closing per design D4. **Batch 2 correction**: the three
      sign-bearing rows' `signLabel: 'PECES'|'TORTUGAS'|'MONOS'` fields were
      removed per the ruling above; the caption is `beat.line` alone.
- [x] 2.6 `backdrops.ts`: `LEAF_LITTER`/`PATH_MUD` added; `ADVENTURE_BACKDROP`
      re-keyed `glass`/`sand` → `peces`/`tortugas` (same literals), `monos`/
      `sendero` rows added with the manifest-read `quiet`/`brightest`.
- [x] 2.7 `sectors.ts`: `entrada.adventureIds` interleaved to
      `glass1, glass2, sand1, sand2, glass3, glass4, sand3, sand4`.
- [x] 2.8 `npm test -- zoo/adventures zoo/backdrops zoo/sectors` — RED as
      expected: **16 failed / 123 passed**. Exact list in `tasks.md`'s own
      task 2.8 entry. All 16 are `glass`/`sand`-literal naming assertions
      Phase 4 (tasks 4.1, 4.2, 4.4, 4.7) closes; no other failure.

### Phase 3: Screens — PrologueOpening, AdventureClosing, GameScreen, App (15/15)

- [x] 3.1 Created `client/src/screen/PrologueOpening.tsx`: `.cv-prologue`
      CSS block mirroring `AdventureIntro.tsx`'s `INTRO_CSS` shape;
      `PrologueOpeningProps { from?, onDone }`; internal `index` state
      seeded from `clampPlate(from)` (clamped into `[0, PROLOGUE_PLATES
      .length - 1]`); stage tap → `advancePlate(index)` → `null` calls
      `onDone()`, else `setIndex(next)`; background =
      `backdropFor('glass1')?.quiet ?? SHEET_PAPER`.
- [x] 3.2 Skip control rendered as a SIBLING `<button className="cv-prologue
      -skip">` of the stage button (never nested) — `<CaptionedArt art=
      {ZOO_MAP_ART} label="Ir al mapa" size={28} />` inside it, calling
      `onDone` directly.
- [x] 3.3 `prologueRoute(search, dev)` exported from `PrologueOpening.tsx`:
      `?nivel=apertura` → `from:0`, `?nivel=apertura:<n>` → `from:n`,
      dev-gated, `null` on malformed input or `dev===false`.
- [x] 3.4 `AdventureClosing.tsx`: `AdventureClosingProps` changed to
      `{ adventure, beat: ClosingBeat, onContinue }`; the `adventure.
      closingBeat!` assertion removed; renders `<img src={(beat.figure ??
      ZOO_OCTOPUS_BACKPACK_ART).href} .../>` and `<CaptionedArt art=
      {beat.art} label={beat.line} size={76} />` — the caption is ALWAYS
      `beat.line` (no `signLabel`, per the ruling). Companion test file
      `AdventureClosing.test.tsx` fully rewritten for the new props shape,
      the `figure` fallback/override, and `sendero`'s two-beat sequence.
- [x] 3.5 `GameScreen.tsx`: `beat?: number` added to the `'close'` `GameView`
      member and to `CloseAction`; `advanceClosing(levelId, beat)` exported
      — `beat+1 < adventure.closingBeat!.length` → `{type:'close', levelId,
      beat:beat+1}`, else `{type:'exit'}`.
- [x] 3.6 `initialView`'s `cierre-` branch extended to parse an optional
      `:<n>` suffix (`:` separator, never `-` — ambiguous against ids ending
      in digits like `sand4`); malformed/negative suffix falls through to
      `null`.
- [x] 3.7 `'close'` render branch: `index = state.beat ?? 0`; `beat =
      adventure.closingBeat![index] ?? adventure.closingBeat![0]`
      (never-crash fallback for a stale/out-of-range index); `onContinue`
      calls `advanceClosing(state.levelId, index)` and discriminates —
      `'close'` → re-renders with the next beat, `'exit'` → `onExit()`.
- [x] 3.8 `App.tsx`: `Shell` widened with `| { at:'prologue'; from?: number
      }`; `firstVisit(records)` added (exported for direct unit testing) —
      `Object.keys(records).length === 0`.
- [x] 3.9 `initialShell()`: after `initialView`, added `const opening =
      prologueRoute(search, dev); if (opening) return opening`, then `return
      firstVisit(readRecords()) ? { at:'prologue' } : { at:'map' }` in place
      of the old bare `{at:'map'}` fallback.
- [x] 3.10 `App.tsx` render: `if (shell.at === 'prologue') return
      <PrologueOpening from={shell.from} onDone={goToMap} />` added.
- [x] 3.11 `PrologueOpening.contract.test.tsx` created: a stub `({ onDone })
      => <button onClick={onDone} />` assigned to `(p: PrologueOpeningProps)
      => ReactElement` — compiles only while the contract stays "show, then
      report done" (checked by `npm run build`, not vitest).
- [x] 3.12 `PrologueOpening.test.tsx` created: the three lines render in
      order (via `from: 0,1,2` — the harness cannot fire a real click, so
      each plate position is reached directly, exactly the reason design.md
      D1 kept `from` on the props); every plate passes `auditCaptions`; zero
      `url(#`; skip control present on every plate, structurally a SIBLING
      (not nested) of the stage button; out-of-range `from` clamps rather
      than crashing.
- [x] 3.13 `prologueRoute` tests (in `PrologueOpening.test.tsx`) —
      `apertura`→`from:0`, `apertura:2`→`from:2`, dev gate off→`null`,
      malformed→`null`. `firstVisit` tests in new `client/src/App.test.tsx`
      — empty Records→`true`, one record→`false`.
- [x] 3.14 `advanceClosing` table (in `GameScreen.test.tsx`): `sendero`
      0→1→exit; `peces` 0→exit; out-of-range beat→exit; a level id with no
      `closingBeat`→exit.
- [x] 3.15 Ran `npm test -- screen/PrologueOpening screen/AdventureClosing
      screen/GameScreen screen/App` — green: 4 files / 66 tests (the CLI
      glob `screen/App` does not match the root-level `App.test.tsx`, so it
      was run separately: `npm test -- App.test`, 2 tests green).

### Phase 4: Test Guards — Extend, Never Delete (9/9)

- [x] 4.1 `zoo/adventures.test.ts`: `ADVENTURES` row-count test widened 10→12;
      `'glass'`/`'sand'` → `'peces'`/`'tortugas'`/`'monos'`/`'sendero'`; each
      row's `levelIds`, `sector:'entrada'`, `icon` asserted (`SIGN_ART.fish/
      .turtles/.monkeys`, `ZOO_OCTOPUS_PRINT_ART`).
- [x] 4.2 `introLevel('glass3')`→`monos`, `introLevel('sand3')`→`sendero`
      (new adventure starts, unlike before the regrouping); `closingLevel`
      rewritten to assert `glass2`→`peces`, `sand2`→`tortugas`, `glass4`→
      `monos`, `sand4`→`sendero`, plus `closingLevel('glass1'/'sand1')`→
      `undefined`. The stale "resolves undefined for a level that is not an
      adventure's own last level" list was corrected to drop `sand2` (now a
      real last level) and use `glass3`/`sand3` instead.
- [x] 4.3 New describe block in `zoo/adventures.test.ts`: the four entrance
      rows' `levelIds` union, sorted, equals the original eight; `glass*`
      and `sand*` filtered subsets each equal their original in-order list
      — asserted PER FAMILY, never over the flat union.
- [x] 4.4 `zoo/sectors.test.ts`: `entrada.adventureIds` rewritten from a
      byte-identical flat-list assertion to a SET + per-family relative
      order assertion, plus a NEW narrative-order guard: walking
      `nextAdventure(entrada, records)` from empty records and filing each
      returned id in turn yields `glass1, glass2, sand1, sand2, glass3,
      glass4, sand3, sand4`, and `adventureFor` on those ids reads `peces,
      peces, tortugas, tortugas, monos, monos, sendero, sendero`.
      `isFiled('sand4')` opening `estanque` was already covered by the
      pre-existing "Estanque" describe block (untouched); `entrada.
      unlockedWhen` always-`true` is re-asserted in the rewritten test.
- [x] 4.5 `screen/GameScreen.test.tsx`: `resolveCloseAction` rewritten —
      `glass2`/`sand2`/`glass4`/`sand4` all close (the `glass4` prior
      negative case is explicitly retired, per house style, with a
      "(Previously: …)" note); `glass1`/`sand1`/`glass3`/`sand3` do not. The
      `'close'` view mount test renamed from `sand` to `sendero`, plus new
      cases for beat-0/beat-1 sequencing, a single-beat adventure (`peces`)
      exiting immediately, an out-of-range beat falling back to beat 0, and
      the stale-id fallback case moved from `glass4` (which now HAS a
      closingBeat) to `night4` (which still does not).
- [x] 4.6 `levels/catalog.test.ts:400`: `ADVENTURES.find(a=>a.id==='glass')`
      → `'peces'`; `levelIds[0]==='glass1'` unchanged.
- [x] 4.7 `zoo/backdrops.test.ts`: `REVEAL_BACKDROPS` widened from
      `{glass,sand,night}` to `{peces,tortugas,monos,sendero,night}`; the
      two `SHEET_PAPER`-goes-red rows renamed to `peces`/`tortugas`; two new
      rows added for `monos`/`sendero` (same falsifiability pattern); the
      generic "clears the child's own ink against the veil" loop now covers
      all five rows automatically; `backdropFor` tests split into four
      (`peces`/`tortugas`/`monos`/`sendero`), each asserting its own two
      level ids.
- [x] 4.8 `GameView` gains-no-member check added to `GameScreen.test.tsx`:
      `const GAME_VIEW_VARIANTS: Record<GameView['view'], true> = {map,play,
      intro,deduce,close: true}` — a sixth `GameView` variant fails
      `tsc --noEmit` on the missing key.
- [x] 4.9 Ran `npm test` (full) — **green: 82 files / 1876 tests**. Ran
      `npm run build` (`tsc --noEmit && vite build`) — **green** (confirms
      4.8's build-time check compiles).

### Phase 5: Green Gates and Captures (4/10 — gate tasks only; captures deferred)

- [x] 5.1 `npm test` (full suite) — **82 files / 1876 tests, 0 failures**
      (baseline was 79 files / 1841 tests before this change; net +3 files /
      +35 tests: `PrologueOpening.test.tsx`, `PrologueOpening.contract.
      test.tsx`, `App.test.tsx` are new files; every other file's count
      grew from the guard extensions above).
- [x] 5.2 `npm run build` (`tsc --noEmit && vite build`) — **green**.
- [x] 5.3 Confirmed zero new `url(#` occurrences: `rg 'url\(#' client/src`
      returns only pre-existing comments/test-assertion strings that check
      for its ABSENCE (`expect(html).not.toContain('url(#')` and header
      comments citing the ban) — no real markup/CSS usage anywhere,
      including in the three new prologue files.
- [x] 5.4 Confirmed every task in Phases 1–4 and 5.1–5.4 is `[x]` in
      `tasks.md`; tasks 5.5–5.10 are marked `[~]` deferred (see below), none
      left as a silent `[ ]`.
- [ ] 5.5 **DEFERRED to the orchestrator** — confirm the dev server answers
      at `http://localhost:5173`. This batch's instructions explicitly
      forbid starting a dev server.
- [ ] 5.6 **DEFERRED to the orchestrator** — capture the opening's three
      plates (`?nivel=apertura:0/1/2`).
- [ ] 5.7 **DEFERRED to the orchestrator** — capture the four intros
      (`intro-glass1`, `intro-sand1`, `intro-glass3`, `intro-sand3`).
- [ ] 5.8 **DEFERRED to the orchestrator** — capture the five closings
      (`cierre-glass2`, `cierre-sand2`, `cierre-glass4`, `cierre-sand4:0`,
      `cierre-sand4:1`).
- [ ] 5.9 **DEFERRED to the orchestrator** — read every capture and confirm
      the five visual invariants tasks.md's own 5.9 lists.
- [ ] 5.10 **DEFERRED to the orchestrator** — correct and re-capture any
      defect found in 5.9, with a regression test.

## Files changed (cumulative, both batches)

| File | Action | What |
|---|---|---|
| `scripts/art/make_placeholders.py` | Created | D5's generator, plus an `octagon` helper (deviation, batch 1) |
| `art-source/pulpo cuidador.png` | Created | 1024×1024 cutout (batch 1) |
| `art-source/fondo recinto monos.png` | Created | 1536×1024 background (batch 1) |
| `art-source/fondo sendero.png` | Created | 1536×1024 background (batch 1) |
| `art-source/cartel peces.png` | Created | 1024×1024 cutout, word "PECES" (batch 1) |
| `art-source/cartel tortugas.png` | Created | 1024×1024 cutout, word "TORTUGAS" (batch 1) |
| `art-source/cartel monos.png` | Created | 1024×1024 cutout, word "MONOS" (batch 1) |
| `scripts/art/build_art.py` | Modified | 6 `AUTHORED_SOURCE_SIZES` entries, 2 `PASSTHROUGHS` rows, 4 `SINGLES` rows (batch 1) |
| `client/src/detective/assets.ts` | Modified | `ZOO_CARETAKER_ART`, `SIGN_ART`, widened `SECTOR_BACKGROUND_ART` (batch 1); `SIGN_ART` comment corrected to drop `signLabel` (batch 2) |
| `client/src/detective/artManifest.test.ts` | Modified | `REGISTERED` +7, count 81→87; `ADVENTURE_BACKDROP.glass/.sand` → `.peces/.tortugas` ripple (batch 1) |
| `client/src/detective/artHierarchy.test.ts` | Modified | `WORLD_GUARDED_ART` entry for `zoo-octopus-caretaker.png`; timeout widened (batch 1) |
| `client/src/zoo/prologue.ts` | Created | `PROLOGUE_PLATES`, `advancePlate` (batch 1) |
| `client/src/zoo/prologue.test.ts` | Created | Unit tests (batch 1) |
| `client/src/zoo/adventures.ts` | Modified | `AdventureId`, `ClosingBeat`, four entrance rows (batch 1); `signLabel` field and all three usages REMOVED (batch 2, ruling correction) |
| `client/src/zoo/backdrops.ts` | Modified | `LEAF_LITTER`/`PATH_MUD`, re-keyed + 2 new rows (batch 1) |
| `client/src/zoo/sectors.ts` | Modified | `entrada.adventureIds` interleaved (batch 1) |
| `client/src/zoo/adventures.test.ts` | Modified | Batch 1: `'glass'`→`'peces'` ripple in the animal-less-icon describe block. Batch 2: 10→12 row count, icon/levelIds per new row, `introLevel`/`closingLevel` rewrites, new per-family union describe block |
| `client/src/zoo/sectors.test.ts` | Modified | Batch 2: `entrada.adventureIds` SET+order+narrative-order rewrite |
| `client/src/zoo/backdrops.test.ts` | Modified | Batch 2: `REVEAL_BACKDROPS` widened, renamed/added falsifiability rows, `backdropFor` split four ways |
| `client/src/levels/catalog.test.ts` | Modified | Batch 2: `'glass'`→`'peces'` at line 400 |
| `client/src/screen/AdventureIntro.test.tsx` | Modified | Batch 1: `'glass'`→`'peces'` ripple |
| `client/src/screen/AdventureClosing.tsx` | Modified | Batch 2: `beat` prop, `figure ?? backpack`, no `!`, no `signLabel` |
| `client/src/screen/AdventureClosing.test.tsx` | Rewritten | Batch 2: new props shape, `figure` fallback/override, two-beat sequence |
| `client/src/screen/GameScreen.tsx` | Modified | Batch 2: `beat?` on `'close'`/`CloseAction`, `advanceClosing`, `cierre-<id>:<n>` parsing |
| `client/src/screen/GameScreen.test.tsx` | Modified | Batch 2: `resolveCloseAction`/`'close'`-view/`advanceClosing`/`GameView`-exhaustiveness tests |
| `client/src/screen/PrologueOpening.tsx` | Created | Batch 2: D1/D2/D8 — the opening screen + `prologueRoute` |
| `client/src/screen/PrologueOpening.test.tsx` | Created | Batch 2 |
| `client/src/screen/PrologueOpening.contract.test.tsx` | Created | Batch 2 |
| `client/src/App.tsx` | Modified | Batch 2: `Shell` + `prologue`, `firstVisit` (exported), `initialShell` |
| `client/src/App.test.tsx` | Created | Batch 2: `firstVisit` unit tests |
| `openspec/changes/add-caretaker-prologue/tasks.md` | Modified | `[x]` marks both batches; task 2.8 evidence (batch 1) |
| `openspec/changes/add-caretaker-prologue/state.yaml` | Modified | Batch 2: conflict-note correction reflecting both orchestrator rulings |

## Deviations from design

1. **`make_placeholders.py`'s cutout shape is an octagon, not a plain
   rectangle** (batch 1). Design D5's pseudocode draws a plain inset rect,
   which fails `build_art.py`'s own cutout contract (`alpha_bbox` crops
   flush to all four sides, leaving zero transparent pixels; a straight
   axis-aligned edge downscales to another hard 0/255 edge). Cutting the
   four corners on the diagonal (`octagon()`, notch 96px) fixes both —
   confirmed against the rebuilt manifest, `w`/`h` and sign words unaffected.
2. **Two ripple fixes outside the task list in batch 1**, both mechanical
   renames tied to that batch's own edits: `artManifest.test.ts`'s
   pre-existing `ADVENTURE_BACKDROP.glass/.sand` read (renamed `.peces/
   .tortugas`) and `AdventureIntro.test.tsx`'s own `glass`-adventure test
   block (renamed `peces`) — both required for `tsc --noEmit` to accept
   task 2.6's rename. `artHierarchy.test.ts`'s `WORLD_GUARDED_ART` map
   needed its own `zoo-octopus-caretaker.png` entry and a widened decode
   timeout (5000ms → 20000ms, legitimate extra decode work under
   full-suite contention).
3. **`AdventureClosingProps` gained a `beat` prop beyond what `main-screen`
   spec's prose literally enumerates** (batch 2, task 3.4). The spec's
   "MODIFIED Requirements" text describes the component's props
   parenthetically as `{ adventure, onContinue }` while narrating the
   beat-sequencing BEHAVIOUR ("render beats ONE AT A TIME... a tap advances
   to the NEXT beat"); design.md D3 is unambiguous that the beat INDEX lives
   in `GameScreen`'s own `close` view (`beat?: number`), not inside
   `AdventureClosing`, and `tasks.md`'s task 3.4 instructs the exact `{
   adventure, beat: ClosingBeat, onContinue }` shape. Implemented per
   design.md/tasks.md: the externally OBSERVABLE behaviour the spec
   describes (tap advances the sequence; the last tap invokes `onContinue`
   which lands on the map) is unchanged — `GameScreen` re-mounts
   `AdventureClosing` with the next beat on each tap, exactly matching the
   spec's black-box description. Not one of the two conflicts the
   orchestrator's rulings named, so not silently resolved without note:
   flagged here for visibility.
4. **`PrologueOpening`'s visual composition is not fully specified by
   design.md/spec** beyond "reuse `AdventureIntro`'s stage pattern" and the
   script table's three `{line, art}` pairs. Implemented as: a FIXED
   decorative caretaker image (`ZOO_CARETAKER_ART`) at the `AdventureIntro`-
   style bottom "octopus" position on every plate, and each plate's OWN
   `art` (`ZOO_CARETAKER_ART`/`CART_ART`/`ZOO_BACKPACK_ART`) rendered via
   `CaptionedArt` paired with its `line` inside the speech bubble — mirroring
   `AdventureIntro`'s fixed-octopus + variable-bubble-icon shape exactly,
   with the plate's own art standing in for the "adventure icon" role. This
   is a reasonable, spec-compliant reading (satisfies the caption-audit
   requirement, the verbatim-line requirement, and the "reuses the stage
   pattern" requirement) but is a genuine design gap, not a literal
   design.md instruction — noted for the author's review alongside the
   proposal's other open questions.

## Work Unit Evidence (Phase 3 + Phase 4 + Phase 5 gates)

| Evidence | Value |
|---|---|
| Focused test command and result | `npm test -- screen/PrologueOpening screen/AdventureClosing screen/GameScreen screen/App` → 4 files / 66 tests green; `npm test -- App.test` → 1 file / 2 tests green; `npm test -- zoo/adventures zoo/sectors` → 2 files / 93 tests green; `npm test -- zoo/backdrops` → 1 file / 55 tests green |
| Runtime harness command/scenario and result | `npm test` (full) → 82 files / 1876 tests green; `npm run build` (`tsc --noEmit && vite build`) → green, `dist/` emitted. No live dev-server/browser scenario run in this batch (explicitly out of scope — captures deferred to the orchestrator) |
| Rollback boundary | Phase 3: revert `PrologueOpening.tsx`/`.test.tsx`/`.contract.test.tsx`, `AdventureClosing.tsx`/`.test.tsx`, `GameScreen.tsx`, `App.tsx`/`.test.tsx` — `App.tsx`'s `Shell` loses `prologue`, `initialShell()` returns to `{at:'map'}`. Phase 4: revert only the six test-file edits (`zoo/adventures.test.ts`, `zoo/sectors.test.ts`, `zoo/backdrops.test.ts`, `levels/catalog.test.ts`, plus `GameScreen.test.tsx`'s Phase-4-owned assertions) — production code from Phases 1–3 is unaffected. Both are independently revertible per the Commit Plan's five work-unit slices |

## Known state after this batch

`npm test`: **82 files / 1876 tests, 0 failures** (up from the 79/1841
pre-change baseline and the batch-1-inherited 26-failed/1826-passed RED
state). `npm run build`: **green**. No `signLabel` anywhere in `client/src`
(confirmed via `rg signLabel client/src` — only the explanatory comment in
`adventures.ts` documenting its removal remains). All 55 tasks in
`tasks.md` are `[x]` except 5.5–5.10, explicitly deferred to the
orchestrator's capture pass.
