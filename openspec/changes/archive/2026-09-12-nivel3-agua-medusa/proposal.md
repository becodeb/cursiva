# Proposal: Nivel 3 — Water, Jellyfish and U Movements

Step 2 of five in the `docs/11_PULPITO_DETECTIVE_DIRECTIVA` rollout.

## Intent

The directive's Nivel 3 is four challenges of U movements in a water setting, ending in
"frenar y continuar". The shipped catalog has one U level for it — `f2-guirnalda`
(`catalog.ts:639-654`), a bare blank-sheet metronome exercise with no world around it — and
`docs/04:40-41`, shipped by step 1, already committed the split that leaves `f2-colinas`,
`f2-bucles` and `f2-crestas` to Nivel 4. So three of the four challenges do not exist, the
one that does is not in the narrative, and the jellyfish has no way to be a goal.

Underneath sits the real blocker: `isDetectiveTrail = !!level.clue` (`LevelPlay.tsx:633`)
bundles two separate ideas — *is a case trail* (clue marks, the PISTAS rail, filing,
deduction routing) and *is in the detective world* (ground scatter, mud ink, the standing
octopus and the fingertip glass, the wordless shell, the suppressed result block). Nivel 3
is the second without the first, and it is the first thing in the app that needs them apart.
Two more supporting gaps: every path generator in `paths.ts` takes one amplitude and one
cycle count for the whole path (`:546-563`), so challenge 3's varying U's are unreachable;
and a hazard is a bare `<circle>` whose `cx`/`cy` the rAF loop mutates
(`TraceCanvas.tsx:629, 703-711, 1242-1253`), which an `<image>` cannot be.

## Scope

### In Scope

1. **World / case split.** Replace the single `isDetectiveTrail` with two derived
   predicates — `isCaseTrail` (clue mark, rail, filing, deduction routing) and
   `inDetectiveWorld` (ground scatter, mud ink, standing octopus, fingertip glass, wordless
   shell, suppressed result block) — where a case trail implies the world but not the
   reverse. Every current consumer is enumerated first and converted in **one** slice, with
   a test per gated behaviour. This is the change's centre of gravity.
2. **Nivel 3 catalog, four challenges as a microprogression.** `f2-guirnalda` rethemed as
   desafío 1 (wider band, slower `feedback(metronomeBpm, rail)`; its id is a persisted key
   and MUST survive), plus three new ids inserted after it and before `f2-colinas`:
   desafío 2 (more cycles, narrower band — the existing `garland` signature already reaches
   it), desafío 3 (per-cycle variation), desafío 4 ("frenar y continuar").
3. **Per-cycle garland variant** in `paths.ts`: an array of `{width, depth}` in place of the
   scalar `cycles`, keeping `garland`'s exact rounded-U cubic math and emitting only
   absolute `M`/`C` — `transformPath` (`paths.ts:172-174`) throws on anything else.
   `buildLevel.ts`'s checkpoint and ideal-band derivation MUST be checked against a
   non-uniform path *before* desafío 3 is authored.
4. **Starfish hazard rendering.** Hazard moves from `<circle>` + mutated `cx`/`cy` to a
   `<g ref transform="translate(x,y)">` holding a static `<image>` placed by `placeArt` —
   the pattern the carrier already uses. `hazardEls` becomes `SVGGElement[]`; `TraceHazards`
   gains an optional art; the bare-circle path stays the **default** so `trail1` cannot
   regress.
5. **`LevelConfig.goalArt`.** `TraceCanvas`'s `startArt`/`endArt` are already generic
   (`TraceCanvas.tsx:340-439`, no `detective/` import); `endArt` becomes the level's own goal
   art when present. The medusa is level content, not a side effect of case membership, and
   the field generalises to Nivel 4's sheep. `LAMP`, `LAMP_ART` and `caseState.lampOn` are
   untouched — they remain the case's lamp.
6. **Progress migration, shipped BEFORE the insertion.** `game/migrateNivel3.ts` copying
   `migrateDuckCase.ts`'s shape (not `migratePhase1.ts` — nothing is removed here), in its
   own slice. Exactly one predecessor link breaks: `f2-colinas`, whose predecessor moves from
   `f2-guirnalda` to the new desafío-4 id. No case-solved pseudo-id, because Nivel 3 is not a
   case.
7. **Art: exactly two files.** `medusa.png` (goal) and `estrella de mar.png` (desafío-4
   hazard), entering through `scripts/art/build_art.py` `SINGLES` pointing at `ART_OUTLINE`
   (`#1a1a1a`) and **never** `INK_COLOR` — the mistake `palette.ts`'s header records as
   having happened twice — and registered in the same slice their level ships.
8. **Docs.** `docs/04`'s Nivel 3 inventory gains the three new ids; `docs/09` §7 gains a
   short note that the sheet-as-a-place rule reaches Nivel 3 without a case.

### Out of Scope

- Nivel 4's mountains and sheep, including `f2-colinas` / `f2-bucles` / `f2-crestas` —
  **step 3**. They keep their current configs; only `f2-colinas`'s unlock predecessor moves.
- Nivel 1's clean-to-reveal fog and the `PECES`/`TORTUGAS`/`PATOS` enclosure signs —
  **step 4**.
- The persisted "already a detective" narrative state driving the home's arms — **step 5**.
- A third `DetectiveCase`, any new `ClueKind`, any new palette token, any deduction change.
- `alga.png`, `piedra.png`, `hoja.png` — they wait for the step that renders them.
- The code-says-"Fase" reterm (`LevelMap.tsx:76`, `LevelPlay`'s `<h1>`); still intentional
  and temporary, as step 1 recorded.

## Decisions (settled — do not reopen)

| # | Decision | Reason |
|---|---|---|
| D1 | **Nivel 3 keeps the detective WORLD but is not a CASE.** Grass and earth, the standing octopus, the glass on the fingertip, the wordless shell — and no clue marks, no PISTAS rail, no deduction. The jellyfish is simply the goal. | The directive says *"Uno de los rastros conduce al sector acuático"*: one continuous narrative. `docs/09` §7 spent a whole section making the sheet a place rather than a diagram, so dropping the child onto a bare white worksheet with a title contradicts both. But the Pulpito **sees** the jellyfish — there is no lineup to deduce — so a third `DetectiveCase` would be a fake mystery. |
| D2 | **Four challenges as a microprogression, not four repetitions**: `f2-guirnalda` rethemed as desafío 1 plus three new levels, inserted before `f2-colinas`. | Step 1's `docs/04:40-41` already committed the Nivel 3 / Nivel 4 split. |
| D3 | **Desafío 4 is "frenar y continuar" with the starfish, reusing the retired `f1-pelotas` hazards' measured reasoning — not their literal numbers.** | `trail1` (`catalog.ts:348`) already spends a retuned version of those numbers. Copying them again would put three near-identical hazards in the catalog with no pedagogical distinction. |
| D4 | **The medusa is the goal via a new `LevelConfig` field**, not by joining the case machinery. | Keeps case membership meaning one thing, and gives Nivel 4's sheep the same seam. |
| D5 | **No timed obstacle and no angular peaks may leak in from Nivel 4.** | Step 1's D1 established the rule in the other direction — a level's signature mechanic is not free decoration for its neighbour — and it binds both ways. |
| D6 | **The three stars stay hidden in Nivel 3**, for Nivel 2's reason, not Nivel 1's. | The gate is `!isDetectiveTrail` (`LevelPlay.tsx:1141-1155`): a wordless shell has no result block. Nivel 1 hides them because it asks for no precision; the two reasons only coincide for now. `docs/03` previously claimed the stars return from Nivel 2; that was false and was corrected on `main` (commit `058ffc4`). Stated here so it is not rediscovered as a bug. |
| D7 | **The migration ships before the catalog insertion**, in its own slice. | Step 1 had to catch this ordering live twice. |

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

Three delta specs under `openspec/changes/nivel3-agua-medusa/specs/`:

- `detective-mode`: world membership separated from case membership; a level MAY be in the
  detective world with no clue, no rail entry, no filing and no deduction routing; the
  result block and the three stars stay suppressed for every world level (D6).
- `level-engine`: the Nivel 3 trail set (`f2-guirnalda` retheme + three new ids) between
  `f2-guirnalda` and `f2-colinas`; the per-cycle garland variant; `LevelConfig.goalArt`; the
  positional-unlock migration; and the no-Nivel-4-mechanics constraint (D5).
- `trace-canvas`: hazard rendering as a transformed `<g>` with optional art, circle default
  preserved; `endArt` sourced from the level's `goalArt`.

**Spec base note for `sdd-spec`:** unlike step 1, the bases are now real.
`openspec/specs/` holds 10 specs, and today's two archives gave `detective-mode`,
`level-engine`, `main-screen` and `trace-canvas` live requirement sets — including
`detective-mode` › *Clue Collection State Machine*, *Trail Completion Lamp and Rail Filing*,
*Case Registry Data Shape*; `level-engine` › *PISTAS Rail Chrome*, *Duck Trail Set Precedes
trail1*, *Duck Case Positional-Unlock Migration*; `trace-canvas` › *Clue Layer Rendering*,
*Carrier Art Placement via placeArt()*. **Read each base before declaring a delta** and
decide ADDED vs MODIFIED from its actual wording — in particular whether *PISTAS Rail
Chrome* and *Clue Layer Rendering* currently bind their behaviour to the level's clue in a
way D1 now contradicts. `main-screen` is expected to be untouched; confirm against its base
rather than assuming.

## Approach

The split first, then the generator, then the levels, then the art. `isCaseTrail` /
`inDetectiveWorld` land before any Nivel 3 level exists, so the new levels are *data that
sets a flag*, not a second special case wired by hand — the same ordering step 1 used for
the case registry. The migration slice precedes the insertion slice (D7). Every decision a
test must observe lives in a named exported pure function: this repo's harness runs
`renderToString` with no DOM, so a decision inside a click handler or a `setState` updater is
invisible to it. All art enters through `build_art.py` and is registered in the same step its
level ships, because `artManifest.test.ts` rejects shipped art no registry entry can reach.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `client/src/screen/LevelPlay.tsx` | Modified | `isDetectiveTrail` split into `isCaseTrail` / `inDetectiveWorld`; every gated consumer converted. |
| `client/src/game/types.ts` (`LevelConfig`) | Modified | `goalArt?`, detective-world flag. |
| `client/src/levels/paths.ts` | Modified | Per-cycle garland variant; absolute `M`/`C` only. |
| `client/src/levels/catalog.ts` | Modified | `f2-guirnalda` rethemed; three new ids before `f2-colinas`. |
| `client/src/levels/buildLevel.ts` | Verify/Modified | Checkpoints and ideal band against a non-uniform path. |
| `client/src/canvas/TraceCanvas.tsx` | Modified | `hazardEls` → `SVGGElement[]`; `TraceHazards` optional art; `endArt` from `goalArt`. |
| `client/src/game/migrateNivel3.ts` | New | Positional-unlock migration (ships first). |
| `client/src/game/openProgressStore.ts` | Modified | Migration wiring. |
| `client/src/detective/assets.ts` | Modified | `medusa` and `estrella de mar` registry entries. |
| `scripts/art/build_art.py` | Modified | Two `SINGLES` rows on `ART_OUTLINE`. |
| `client/src/levels/catalog.test.ts` | Modified | `EXPECTED_IDS` and phase-ordering at the exact positions. |
| `docs/04`, `docs/09` | Modified | Nivel 3 inventory; sheet-as-a-place note. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A partial world/case split leaves one consumer on the old flag — a level half in the world | High | Enumerate every consumer before converting; one slice; one test per gated behaviour; rollback item 1. |
| Hazard rendering change touches the rAF hot loop | Med | Circle stays the default; numeric before/after of rendered attributes, not only a screenshot; rollback item 2. |
| Per-cycle geometry is new surface in `paths.ts`, which several tests measure closely | Med | Verify `buildLevel.ts`'s checkpoint and ideal-band derivation on a non-uniform path before authoring desafío 3. |
| The wordless shell removes `f2-guirnalda`'s title and hint ("Hacé las hamacas de corrido, al ritmo"), its only rhythm instruction | Med | The metronome (`feedback`) carries the rhythm without words; confirm in the screenshot check that desafío 1 still reads as a rhythm task. |
| Reusing the legacy hazard numbers literally would duplicate `trail1` | Med | D3 — reuse the reasoning, retune the numbers. |
| Migration ordering slips | Med | D7; the migration is its own slice with its own verification. |
| Over the 400-line review budget | High | `size:exception` accepted for this session; `auto-chain` slices by deliverable. |

## Rollback Plan

Two of the eight deliverables are risky; each gets its own exit.

1. **World/case split (deliverable 1).** It is additive at the type level: `isCaseTrail` is
   the old `!!level.clue` under a new name, and `inDetectiveWorld` is a widening. Reverting
   is collapsing both call sites back to one predicate, which restores today's behaviour
   exactly **provided no Nivel 3 level is in the catalog**. Therefore deliverable 1 ships and
   verifies in its own slice, before deliverable 2, so this rollback never has to unwind two
   things at once. If the split must be reverted after the levels land, revert deliverable 2
   first (item 3), then item 1.
2. **Hazard rendering (deliverable 4).** The bare `<circle>` path remains the default and is
   never deleted, so rollback is dropping the optional art branch and restoring
   `hazardEls: SVGCircleElement[]`. `trail1` renders through the retained default either
   way, so the revert is provably a no-op for the only shipped hazard.
3. **Nivel 3 levels (deliverable 2).** The four entries are contiguous in `catalog.ts`.
   Deleting the three new ones restores `f2-colinas`'s original predecessor `f2-guirnalda`
   positionally, and `f2-guirnalda`'s id is never removed from any persisted payload.
   Reverting its retheme is restoring its config literal.
4. **Migration (deliverable 6).** Copy-forward only, returns only changed entries, writes no
   deletions. Reverting the module leaves seeded records the store already tolerates
   (`LevelProgressStore.ts:75-77, :93`), so every child's prior state stays intact.
5. **`goalArt` (deliverable 5).** An optional field with an absent-means-today's-behaviour
   default; removing it is inert.
6. **Art (deliverable 7).** The two PNGs and their registry entries move together in one
   slice — reverting one without the other breaks `artManifest.test.ts`, which is the
   intended guard, not a rollback hazard.
7. **Blocker:** if `LevelProgressStore`'s unknown-id tolerance is ever narrowed, items 3 and
   4 stop holding. Re-verify before shipping any such change.

## Dependencies

- None. No new packages. Both art files already exist in `art-source/`: `medusa.png` and
  `estrella de mar.png`.

## Success Criteria

- [ ] No module reads `isDetectiveTrail`; every former consumer reads `isCaseTrail` or
      `inDetectiveWorld`, and each gated behaviour (scatter, mud ink, standing octopus,
      fingertip glass, wordless shell, result block, rail, filing, deduction routing) has a
      test that distinguishes the two predicates.
- [ ] A Nivel 3 level renders in the detective world with **zero** clue marks, no rail entry,
      no filing, and no deduction route reachable from it.
- [ ] The three stars and the result block are absent on every Nivel 3 level (D6), asserted
      with the reason recorded, and still present on non-world levels.
- [ ] Four Nivel 3 levels sit between `f2-guirnalda` and `f2-colinas` in `LEVELS`, with a
      measurable microprogression across the four (amplitude/proximity, then per-cycle
      variation, then the stop-and-go) rather than four instances of the same geometry.
- [ ] Desafío 3's path has non-uniform per-cycle amplitude, emits only absolute `M`/`C`, and
      `buildLevel.ts` derives valid checkpoints and an ideal band for it.
- [ ] Desafío 4's hazard numbers differ from `trail1`'s (`travel 220 / periodMs 2400 /
      radius 30`) and preserve a real gap for a majority of each cycle.
- [ ] No Nivel 3 level carries an angular peak generator, and no Nivel 4 level gains a timed
      obstacle (D5).
- [ ] `medusa.png` renders as the goal via `goalArt`; the starfish renders as the desafío-4
      hazard; `trail1`'s circle hazard is byte-identical in rendered attributes before and
      after deliverable 4 (numeric check, not only visual).
- [ ] Exactly two new art files and two new registry entries; `artManifest.test.ts` green.
- [ ] A `cursiva.levels.v1` payload captured with `f2-guirnalda` approved loads with
      `f2-colinas` still unlocked and no level demoted.
- [ ] `npm test` and `npm run build` green; no new `url(#…)` reference.
- [ ] **Screenshot check, human-reviewed** (`scripts/shot.sh`): desafío 1 mid-trace showing
      the detective world with no clue mark and no stars, and desafío 4 showing the starfish
      occupying the corridor. This repo's three big defects were all found by screenshots and
      none by the suite; a green suite is necessary and not sufficient.

---

**Accepted deviation:** this proposal runs past the skill's 450-word cap, as
`case-registry-and-captions` and `detective-mode` did before it. `config.yaml` mandates a
rollback plan for risky changes, this change carries two, and seven settled decisions each
needed their reason on the record so they are not reopened downstream.
