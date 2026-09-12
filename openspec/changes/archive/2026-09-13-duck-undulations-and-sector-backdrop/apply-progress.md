# Apply Progress: Duck Undulations and the Lagoon Sector Backdrop

Mode: **Standard** (`strict_tdd: false` per `openspec/config.yaml`). Delivery:
`exception-ok` / `size:exception` (orchestrator-recorded, ~1,120 forecast
lines against an 800-line budget). Branch: `sdd/patos-ondulaciones`, four
commits, one per phase-ish slice (Phase 3 absorbed `zoo/adventures.ts` early
— see the sequencing deviation below).

## Status

**All code tasks (Phases 1-3 + the dev-flag addendum + Phase 5's runnable
checks) complete.** Phase 4 (screenshots) is explicitly the orchestrator's
job, not apply's — not started here by design.

## Commits

1. `5fb5fbc` `feat(levels): recut duck trails as one undulation family` — Phase 1 (B1)
2. `415af49` `feat(zoo): draw the lagoon backdrop under the duck corridor` — Phase 2 (B2) + Phase 3's core (`zoo/adventures.ts`)
3. `f9bf77e` `feat(screen): the duck adventure gets a narrative entry and a closing` — rest of Phase 3 (B3)
4. `68ec3a4` `feat(dev): dev-gated URLs for the intro screen and the recovered map` — the required addendum for Phase 4's capture needs

## Sequencing deviation (flagged, not silent)

`tasks.md`'s own sequencing note says B1→B2→B3 does not hold literally
because `zoo/backdrops.ts` (Phase 2) imports `adventureFor` from
`zoo/adventures.ts` (Phase 3). Rather than leave `backdrops.ts` uncompilable
until a later commit (acceptable under `single-pr`/`exception-ok` per the
task brief, but unnecessarily inconvenient to work with), I landed
`zoo/adventures.ts` + `zoo/adventures.test.ts` (task 3.1/3.2's full content)
in the **Phase 2 commit**, one phase earlier than the task list's own
grouping. Consequence: `npm test`/`npm run build` were green after **every**
commit, including the Phase 2 one — stricter than the task brief required
("only the Final Gate must be green in isolation"), never looser. No task
content changed, only which commit it landed in. Tasks 3.1/3.2 are marked
`[x]` at the point their file was created (Phase 2 commit), not literally
inside a "Phase 3" commit.

## Phase 1 — The Wave Recut (B1): tasks 1.1-1.9, all `[x]`

| File | Action | What |
|---|---|---|
| `client/src/levels/paths.ts` | Modified | `WaveCycle`, `waveVaried`, `waveCrestRadius` |
| `client/src/levels/paths.test.ts` | Modified | 6 new rows: M/C-only alphabet, `transformPath` rejects `A`, byte-identical to `wave()` on uniform cycles, per-cycle extrema, first-extremum-up, `waveCrestRadius` on the 4 duck literals |
| `client/src/levels/catalog.ts` | Modified | `duck-trail3` → `waveVaried` (2 cycles, 155/205 amplitude), title/hint/rules rewritten; `duck-trail4` → `wave(cycles:3)`, taper `{1,0.85}`, hint rewritten; stale comment block replaced |
| `client/src/levels/catalog.test.ts` | Modified | Deleted the now-subjectless `duck-trail4` corner/arm describe (`:697-709`, the sole deliberate test removal); added the 6-row "one undulation family" describe |
| `client/src/levels/buildLevel.test.ts` | Modified | `pushBand` containment bound (every corridor level's ideal cloud stays inside `band`, taper-aware), the band−1 tightness row (fails for `duck-trail2`), and the fold ledger (design.md §2 table) |

**Work Unit Evidence**
- Focused test: `npx vitest run client/src/levels` → 6 files, 251 tests, all green.
- Runtime harness: N/A — pure geometry/data, no DOM, no network, no process boundary; `buildLevel.test.ts`'s containment test IS the closest thing to an integration check (it runs the real `buildLevelTarget` derivation end to end).
- Rollback boundary: the 5 files above, self-contained; reverting restores the switchback/square-wave shapes byte for byte (proposal's own rollback plan item 4).

**One resolved discrepancy**: the pushBand containment bound initially failed
at the exact nominal band for tapered levels (`trail1`/`trail4`, taper
`from > 1`) by up to 5.85 units — the bound has to scale by
`max(taper.from, taper.to)`, not the untapered nominal band. Corrected in
`buildLevel.test.ts`'s `nominalBand` helper; a further ~0.07-unit epsilon
absorbs the discretization gap between the resampled centreline `pushBand`
offsets from and the raw flattened polyline `maxBandOffset` measures
against. Neither loosens the assertion below the point where it would pass
vacuously (duck-trail2's own tightness row still fails at `band − 1`).

## Phase 2 — The Sector Backdrop (B2): tasks 2.1-2.13, all `[x]`

| File | Action | What |
|---|---|---|
| `client/src/detective/palette.ts` | Modified | `luma` moved here from `palette.test.ts`, exported |
| `client/src/detective/palette.test.ts` | Modified | imports `luma`; `SHEET_PAPER` joins the ground-contrast set |
| `client/src/zoo/sectors.ts` | Modified | `viewBoxToImage`, exact inverse of `imageToViewBox` |
| `client/src/zoo/sectors.test.ts` | Modified | round-trip test, both directions |
| `client/src/zoo/backdrops.ts` | Created | `SectorBackdrop`, `SECTOR_BACKDROP.estanque` (measured values), `backdropFor` |
| `client/src/zoo/backdrops.test.ts` | Created | luma law + falsifiability, `corridorRows` coverage for all 4 duck levels, `backdropFor` defined/undefined matrix (medusa regression guard) |
| `client/src/zoo/adventures.ts` | Created (early, see deviation) | `Adventure`, `ADVENTURES` (duck row), `adventureFor`, `introLevel`, `mapBubble` |
| `client/src/zoo/adventures.test.ts` | Created (early) | full coverage of the four functions above |
| `scripts/art/build_art.py` | Modified | `PASSTHROUGHS` row-range 5th element, `sample_corridor_band` (quiet = modal colour of middle 40%, brightest = max-luma pixel across the full range) |
| `client/src/detective/artManifest.test.ts` | Modified | `quiet`/`brightest`/`corridorRows` parity between `manifest.json` and `SECTOR_BACKDROP.estanque` |
| `client/src/canvas/TraceCanvas.tsx` | Modified | `TraceBackdrop`, `backdrop` prop, the backdrop `<g>` layer, the 4 named conditionals |
| `client/src/canvas/TraceCanvas.test.tsx` | Modified | backdrop layer describe: slice-on-image, quiet rect, wall-rect absence, forced `SHEET_PAPER` stroke regardless of `ground`, zero `url(#`, document-order check, byte-identical-without-prop regression pins |
| `client/src/screen/LevelPlay.tsx` | Modified | `backdrop` memo (via `backdropFor`), `ground` memo gated on `!backdrop`, page background = `backdrop.quiet` |
| `client/src/screen/LevelPlay.test.tsx` | Modified | `duck-trail2` → no ground, `backdrop` = lagoon; `f2-agua2` → ground unchanged, no backdrop (medusa regression guard, named) |

**`npx vitest run client/src/zoo client/src/detective/palette.test.ts
client/src/detective/artManifest.test.ts client/src/canvas/TraceCanvas.test.tsx
client/src/screen/LevelPlay.test.tsx`**: 8 files, 289 tests, all green — task
2.13's own scope, run AFTER `adventures.ts` already existed (the sequencing
deviation above), so the "expect backdrops.test.ts to fail to resolve
adventureFor" clause never applied; every file was green from the start.

**`build_art.py` run**: regenerated `manifest.json` only (no PNG bytes
changed — confirmed via `git diff --stat`, 6 lines added: `quiet`,
`brightest`, `corridorRows.{top,bottom}` on the `sector-lagoon-background`
entry only). Measured values matched the orchestrator's own "Measured
facts" appendix exactly: `quiet`/`brightest` both `#b4c5d0`, `corridorRows
{135, 889}`. Runtime: ~3.5 minutes (pure-Python pixel loop over the full
art set, not just the sampled entry) — ran once, in the background, output
verified before continuing.

**Work Unit Evidence**
- Focused test: the 2.13 command above, 289/289 green.
- Runtime harness: `build_art.py`'s actual run against the real shipped PNG is the closest thing to an integration test here — it is the offline build script that produces the artifact `artManifest.test.ts` then checks for drift. Ran for real, not mocked.
- Rollback boundary: emptying `SECTOR_BACKDROP` (one object literal) restores the wall rect / earth channel / scattered ground everywhere, per the proposal's own rollback plan item 2 — verified this is still true by inspection (every consumer keys off `backdropFor` returning something).

## Phase 3 — The Narrative Entry and Closing (B3): tasks 3.1-3.11, all `[x]`

| File | Action | What |
|---|---|---|
| `client/src/zoo/adventures.ts` (+`.test.ts`) | Created | (see Phase 2 — landed early) |
| `client/src/screen/AdventureIntro.tsx` | Created | the reusable narrative entry: octopus + bubble + `CaptionedArt`-wrapped animal, background = the adventure's sector backdrop's `quiet` colour (or `SHEET_PAPER`) |
| `client/src/screen/AdventureIntro.test.tsx` | Created | 3 registered hrefs, intro line exactly once, `auditCaptions` clean, zero `url(#`, structural button/no-aria-label check, hand-built failing row proving the audit can go red |
| `client/src/screen/GameScreen.tsx` | Modified | `'intro'` `GameView` variant, `resolveEnterAction`, the intro render branch (merged into the `play` render path on a stale/unresolved id, rather than a bare fallthrough — see note below) |
| `client/src/screen/GameScreen.test.tsx` | Modified | `resolveEnterAction` cases, a mounted-`AdventureIntro` render case (mocked probe) proving `onStart` dispatches into `play` without throwing |
| `client/src/App.tsx` | Modified | `onEnter` routes through `resolveEnterAction(levelId, records)` |
| `client/src/App.test.tsx` | Modified | scoped `vi.doMock` test proving `App.onEnter` delegates to `resolveEnterAction` for both `duck-trail1` (→ intro) and `duck-trail2` (→ play) |
| `client/src/screen/ZooMap.tsx` | Modified | the bubble's art+label now come from `mapBubble(discovered, records)` |
| `client/src/screen/ZooMap.test.tsx` | Modified | onward phrase before `duck-trail4` filed, closing phrase after, `auditCaptions` clean both states |

**Deviation from the design's literal code, noted per the skill's own
rule ("if a task is blocked by something unexpected, note it — don't
silently deviate")**: design.md §4's snippet has the `'intro'` branch,
on an unresolved adventure, "fall through to play" via a bare code
fallthrough with no further statement. Read literally, that fallthrough
lands on the `'deduce'` check next, then the bottom-of-function `LevelMap`
return — i.e. the **map**, not **play**. I merged the intro branch's
fallback into the existing `if (state.view === 'play')` condition instead
(`if (state.view === 'play' || state.view === 'intro')`), which is the
literal code shape that actually achieves "fall through to play" the
comment describes. This is unreachable in normal play today (
`resolveEnterAction` only ever produces `'intro'` when `introLevel` already
resolved truthy), so it is defensive-only, exactly as the design intended —
only the concrete code shape changed to make the described behaviour real
rather than aspirational.

**`npx vitest run client/src/zoo client/src/screen/AdventureIntro.test.tsx
client/src/screen/GameScreen.test.tsx client/src/App.test.tsx
client/src/screen/ZooMap.test.tsx`** (task 3.11, re-run after
`adventures.ts` already existed): 8 files, 111 tests, all green.

**Work Unit Evidence**
- Focused test: the 3.11 command above, 111/111 green.
- Runtime harness: `App.test.tsx`'s new describe uses scoped `vi.doMock` + `vi.resetModules()` + a dynamic `import('./App')` to capture the REAL `onEnter` closure `App` builds (not a hand-written stand-in) and invoke it — the closest thing to an integration proof this SSR-only, no-DOM harness supports (documented in-file why a real click-driven re-render cannot be observed here, the same limit `LevelPlay.test.tsx`'s own header records).
- Rollback boundary: emptying `ADVENTURES` (one array) sends `resolveEnterAction` straight to `play` and `mapBubble` back to the constant phrase, per the proposal's own rollback plan item 3 — verified true by inspection.

## Addendum — dev-gated capture URLs (required by the orchestrator's brief)

`scripts/shot.sh` cannot click through the map or seed `localStorage`
between invocations (fresh `--user-data-dir` each call), so tasks 4.3/4.4
need a URL-reachable route for each state. Added two dev-gated flags,
following the exact precedent of `?nivel=mapa` (dev-gated, navigable
surface) and `?debug=sectores` (pure function, no window mutation) —
neither is a new production surface, both require `isDevMode()` (i.e. the
Vite dev server, or `?dev` on a preview build) to do anything:

- **Narrative entry**: `http://localhost:5173/?nivel=intro-duck-trail1`
  → `initialView` resolves `{view:'intro', levelId:'duck-trail1'}` directly,
  bypassing the map. Capture this for task 4.3's `capturas/duck-intro.png`.
- **Map with the duck recovered**: `http://localhost:5173/?dev&debug=pato-recuperado`
  → `App`'s `maybeSeedRecoveredDuck` files `duck-trail4` (`approvals: 1`) in
  `cursiva.levels.v1` before the map's own records are read, then falls
  through to the ordinary map render. Capture this for task 4.4's
  `capturas/zoo-map-duck-recovered.png`. Note: `?dev` is needed explicitly
  on a `vite preview` build; the flag is already implied under `npm run dev`
  (`import.meta.env.DEV`).

New pure functions, both tested directly (no DOM): `shouldSeedRecoveredDuck`
(`client/src/canvas/devMode.ts`) and the `intro-<levelId>` branch of
`initialView` (`client/src/screen/GameScreen.tsx`).

## Phase 5 — Final Gate: runnable tasks done, human tasks left to the orchestrator

- [x] **5.1** `npm test` (repo root): **63 test files / 1223 tests, all green.**
  Baseline was 60/1162. Net **+3 test files**: `zoo/adventures.test.ts`,
  `zoo/backdrops.test.ts`, `screen/AdventureIntro.test.tsx` — vitest's
  "Test Files" count only counts `.test.*` files, not the 3 paired
  non-test source files also created (`zoo/adventures.ts`,
  `zoo/backdrops.ts`, `screen/AdventureIntro.tsx`), so 60+3=63 reconciles
  exactly with "6 new files" in the human sense the forecast used. Net
  **+61 tests**: −1 (the deliberate Phase 1.6 deletion) plus every added
  row across all three phases (six-row undulation-family describe,
  pushBand containment + tightness + fold ledger, the palette/backdrop/
  TraceCanvas/LevelPlay/adventures/AdventureIntro/GameScreen/App/ZooMap
  additions listed above). No test dropped outside the one deliberate
  deletion.
- [x] **5.2** `npm run build`: green, `tsc --noEmit` clean, `vite build`
  succeeds (514 modules, same pre-existing >500kB chunk-size warning as
  before this change — unrelated, not introduced here).
- [x] **5.3** Byte-identical-to-`main` confirmed: `git diff main` shows
  zero `id:` line changes in `catalog.ts` (`duck-trail1..4` unchanged as
  persisted keys); `corridorWidth` values still 100/90/80/70; `git diff
  main -- client/src/detective/cases.ts client/src/screen/Deduction.tsx
  client/src/detective/clues.ts` is empty (0 lines) — all three untouched.
- [x] **5.4** Zero `url(#` occurrences introduced: every `url(#` hit in
  `git diff main` is inside a test assertion string
  (`.not.toContain('url(#')`) or a comment restating the ban — none is
  live markup.
- [x] **5.5** Scope stop confirmed: no row C-H content (`rg` for
  sheep/llama/snake/bee/dolphin/hedgehog/snail in the diff returns nothing
  new — the only hits are pre-existing `SECTOR_ADVENTURE_ART`/
  `HEDGEHOG_ART` entries in the UNTOUCHED `detective/assets.ts`, confirmed
  via `git diff main --stat` showing zero lines changed there); `demo:
  true` still present on all four duck levels (unchanged, the recorded
  out-of-scope contradiction with `docs/13` §5 item 2 is carried forward
  exactly as instructed, not fixed here).

**Not done here, by explicit instruction**: Phase 4's actual screenshots
(4.1-4.6) — the orchestrator drives those. `sdd-verify` and `sdd-archive` —
not run. No push, no PR.

## Diff summary vs `main`

30 files changed, 1302 insertions(+), 111 deletions(-), 4 commits, all on
`sdd/patos-ondulaciones`. New files: `client/src/zoo/adventures.ts`,
`client/src/zoo/adventures.test.ts`, `client/src/zoo/backdrops.ts`,
`client/src/zoo/backdrops.test.ts`, `client/src/screen/AdventureIntro.tsx`,
`client/src/screen/AdventureIntro.test.tsx`.
