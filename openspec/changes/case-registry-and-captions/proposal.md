# Proposal: Case Registry and Captioned Art

Step 1 of five in the `docs/11_PULPITO_DETECTIVE_DIRECTIVA` rollout.

## Intent

The directive makes the duck — not the hen — the first case, and asks for a word under
each animal in the deduction. The shipped code cannot express either. The case is
hardcoded: `CULPRIT` is a module constant (`detective/assets.ts:139`), `ruledOutBy` is a
global property of the animal (`assets.ts:118-134`), and `DETECTIVE_TRAIL_IDS`
(`game/types.ts:67`) is a single flat list that eight modules read as *the* case. Text is
forbidden outright by decision D6, and a handful of tests assert its absence.

Three defects sit directly in this path and are cheapest to fix now: the carrier lens
rides ~11 units off the child's fingertip on every trail (`TraceCanvas.tsx:1257-1264`
hardcodes (0.5, 0.5) while the shipped art's lens centre is (0.603, 0.391)); leaving a
mode lands on the level map instead of the home office; and `DeductionState.closed`
(`Deduction.tsx:96-102`) never persists, which is invisible with one case and ambiguous
with two.

## Scope

### In Scope

1. **Captioned art.** One component whose `label` is a required prop with no default and
   no conditional branch, so the type checker rejects a picture without its word at every
   call site. The caption is HTML, a sibling of the `<svg>`, never an SVG `<text>` — the
   precedent is `PistasRail.tsx:157`'s `.pistas-word`, which participates in the
   height-breakpoint type scale a 40-unit local viewBox cannot reach. Nunito already
   inherits from `client/index.html:41-44`. Every text-absence test is rewritten to assert
   the real invariant: **every word on screen has its image**.
2. **Case registry.** New `client/src/detective/cases.ts` exporting `DetectiveCase`
   (`id`, `culprit`, ordered `options`, per-case `ruledOutBy`, `trailIds`) and
   `DETECTIVE_CASES`. `ruledOutBy` leaves `ANIMAL_ART`: the hen is a cleared distractor in
   one case and the culprit of another, so it is a fact about the case. `caseState.ts`,
   `GameScreen.tsx` and `Deduction.tsx` stop being global and take the active case.
3. **Duck case**, inserted before `trail1`: four trails whose microprogression is
   **corridor width plus path complexity only** — `wave(140,1)/100/webfoot`,
   `wave(170,2)/90/breadcrumb`, `garland(3)/80/bubble`, `squareWave(140,200,3)/70/feather`
   — and a three-option deduction (`pato`, `vaca`, `gato`) with the word under each animal.
   `vaca` is ruled out by `feather`, `gato` by `bubble`; `webfoot` and `breadcrumb` narrow
   nobody, the structural role `droplet` plays today.
4. **Case-solved persistence** through the existing `LevelProgressStore` under a per-case
   pseudo-id `<caseId>-deduce`, written as a `LevelRecord` with `approvals: 1`. No new key,
   no new schema, no new store method; `isUnlocked` already returns `false` for an id
   `LEVELS.findIndex` cannot place.
5. **Progress migration.** `game/migrateDuckCase.ts` in `migratePhase1.ts`'s exact
   three-part shape (declarative table, per-field merge policy, pure function returning
   only changed entries), wired into `openProgressStore.ts`.
6. **Lens centring.** The grip becomes a field of `CARRIER_LENS_ART` in `assets.ts`, and
   both `home/modes.ts` and `TraceCanvas` read it through one pure exported `placeArt()`.
   One source of truth, not a magic offset in the renderer.
7. **Return to the office.** A required `onExit: () => void` on `GameScreenProps`, given
   `goHome` from `App.tsx` — a prop, not a `GameAction`, because an action variant would
   force the deliberately pure `nextView` to know `App`'s `Shell` type.
8. **Docs.** `docs/01`..`docs/05` retermed Fase → Nivel without deleting pedagogy; a
   faithful Spanish `docs/11_PULPITO_DETECTIVE_DIRECTIVA.md` beside the unreadable PDF;
   and the stale D6 claims in `PistasRail.tsx`'s module header and `docs/09:228-230`
   corrected, since deliverable 1 is precisely what makes them stale.

### Out of Scope

- Nivel 3's U-shapes and the jellyfish, including the "frenar y continuar" starfish —
  **step 2**.
- Nivel 4's mountains and sheep — **step 3**.
- Nivel 1's clean-to-reveal fog and the `PECES`/`TORTUGAS`/`PATOS` enclosure signs —
  **step 4**.
- The persisted "already a detective" narrative state driving the home's arms — **step 5**.
- Code still says "Fase" (`LevelMap.tsx:76`, `LevelPlay`'s `<h1>`); deliverable 8 is
  docs-only. The mismatch is intentional and temporary.

## Decisions (settled — do not reopen)

| # | Decision | Reason |
|---|---|---|
| D1 | **No timed obstacle on any duck trail.** | The directive puts "frenar y continuar" in Nivel 3 desafío 4. Spending it here flattens step 2 before it ships. Nivel 2 asks only for "si el jugador toca el borde, reinicia el recorrido", which `resetOnContact` already does. |
| D2 | Case-solved state persists as `<caseId>-deduce`. | Without it, a child who opens the duck deduction and backs out — now landing on the home — is routed past their own unfinished case. |
| D3 | **The level map becomes a development surface**, reachable only via `?nivel=` deep links behind `canvas/devMode.ts`'s `isDevMode()`. | Deliverable 7 takes the map out of normal play, and it owns "Reiniciar progreso" and "Modo prueba: abrir todo". Both are development chrome — the same judgement the user already applied to the map's own "la oficina" footer link. |
| D4 | **The migration's cost is accepted, and recorded as a decision.** Seeding the four duck ids to protect `trail1`'s unlock also marks the duck case solved for anyone with prior progress: they never meet it. | The alternative demotes a child out of levels they already earned — the exact regression `migratePhase1.ts:1-10` exists by name to prevent. No production user base exists (`config.yaml`: backend not scaffolded). Mitigation: progress reset stays reachable on the dev-gated map. |
| D5 | **`webfoot` reuses the existing `PRINT` token.** | `docs/09` §4: "La huella es la excepción y va a negro, no a un color, porque una huella en la tierra no tiene color propio." Only `breadcrumb` and `bubble` need new tokens. **Verified:** `palette.test.ts:125-126` asserts earned colours pairwise-distinct across *all* of `CLUE_ART`; that assertion must be re-scoped to distinct **within a case**, which is the real invariant — the same move this change already makes for `ruledOutBy`. (`palette.test.ts:66-72`'s hardcoded four-token `EARNED` set is unaffected.) |

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

Four delta specs under `openspec/changes/case-registry-and-captions/specs/`:

- `detective-mode`: case registry replaces the global culprit and `ruledOutBy`; captioned
  art invariant supersedes D6's text ban; duck case; per-case clue-colour distinctness;
  case-solved persistence.
- `level-engine`: four duck trail levels inserted before `trail1`; positional unlock
  migration.
- `trace-canvas`: carrier placement reads the registry grip through `placeArt()`.
- `main-screen`: exit lands on the home office; the level map becomes a dev-gated route.

**Spec base warning for `sdd-spec`:** `openspec/changes/detective-mode/` is complete but
**unarchived**, and its three delta specs (`detective-mode`, `level-engine`,
`trace-canvas`) have **not** been merged into `openspec/specs/`. Neither
`openspec/specs/detective-mode/` nor `openspec/specs/level-engine/` exists. Do not archive
that change and do not depend on it — write these deltas against the shipped code,
knowing the main specs are behind.

## Approach

Data first, then consumers, then navigation, then docs. The registry lands before the duck
case so the duck is *data added to a registry*, not a second hardcoded path. Every
decision that a test must observe lives in a named exported pure function — this repo's
harness runs `renderToString` with no DOM, so a decision inside a click handler or a
`setState` updater is invisible to it. All art enters through `scripts/art/build_art.py`
and is registered in `assets.ts` in the same step its level ships, because
`artManifest.test.ts` rejects shipped art no registry entry can reach.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `client/src/detective/cases.ts` | New | `DetectiveCase`, `DETECTIVE_CASES`. |
| `client/src/detective/assets.ts` | Modified | `ruledOutBy`/`CULPRIT` out; `webfoot`/`breadcrumb`/`bubble` and the lens grip in. |
| `client/src/detective/Deduction.tsx` | Modified | Case-driven; captioned animals. |
| `client/src/detective/palette.ts` / `palette.test.ts` | Modified | Two new tokens; distinctness re-scoped per case. |
| `client/src/levels/catalog.ts` | Modified | Four duck trails before `trail1`. |
| `client/src/game/migrateDuckCase.ts` | New | Positional-unlock migration. |
| `client/src/game/openProgressStore.ts` | Modified | Migration wiring. |
| `client/src/home/caseState.ts`, `screen/GameScreen.tsx`, `App.tsx` | Modified | Per-case routing; `onExit` to the office. |
| `client/src/canvas/TraceCanvas.tsx` | Modified | `placeArt()` replaces the hardcoded (0.5, 0.5). |
| `scripts/art/build_art.py` | Modified | Three new `SINGLES` entries. |
| `docs/01`..`05`, `docs/09`, `docs/11*.md` | Modified/New | Nivel reterm; D6 correction; directive transcription. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration hides the duck case from any pre-existing player, permanently | High | Accepted and recorded as D4; progress reset stays on the dev-gated map. |
| `docs/03:48` "el retiro se aplica desde la Fase 3" is a code-enforced boundary (`WITHDRAWAL_FROM_PHASE = 3`, `LevelPlay.tsx:503`) | Med | The reterm relabels the **same** numbered boundaries; it never renumbers which levels a rule reaches. Same for `docs/03:53`'s ruled-vs-blank split. |
| New clue kinds ripple wider than they look | Med | `palette.ts` tokens, `palette.test.ts` bands, `build_art.py`'s `SINGLES`, and `artManifest.test.ts:121`'s exact registered-file count all move together in one slice. |
| Level map leaves normal play, taking progress reset and test mode with it | Med | D3's `isDevMode()` route. |
| `docs/04:30-34`'s inventory is already stale (lists six retired `f1-*` ids) | Low | Fixed in the same docs pass. |
| Over the 400-line review budget | High | `size:exception` explicitly accepted; `auto-chain` slices by deliverable. |

## Rollback Plan

1. **Migration.** `migrateDuckCase.ts` is copy-forward only and returns *only changed
   entries*; it writes no deletions. Reverting the module leaves the seeded duck records as
   orphans the store tolerates (`LevelProgressStore.ts:75-77,:93`), so every child's prior
   state is intact. The `<caseId>-deduce` pseudo-id is likewise inert on rollback:
   `LEVELS.findIndex` returns `-1` and `isUnlocked` returns `false` without throwing.
2. **Duck levels.** The four entries are contiguous in `catalog.ts` and land in their own
   slice. Deleting that block restores `trail1`'s original predecessor `f1-libre`
   positionally, with no id removed from any persisted payload.
3. **Navigation.** `onExit` is one prop at two wiring sites (`GameScreen.tsx:179,:185`).
   Rollback is restoring `dispatch({type:'back'})`; `nextView`'s `back` branch is left
   intact and merely unreachable, so it needs no change to come back.
4. **Level map route.** The dev gate is one `isDevMode()` guard. Removing it restores the
   child-facing route with no data implication.
5. **Lens grip.** `placeArt()` is pure and additive; reverting it restores the (0.5, 0.5)
   arithmetic at both call sites.
6. **Blocker:** if `LevelProgressStore`'s unknown-id tolerance is ever narrowed, items 1
   and 2 stop holding. Re-verify before shipping any such change.

## Dependencies

- None. No new packages. Art already delivered in `art-source/`: `huella palmeada.png`,
  `miga de pan.png`, `burbuja.png`. `feather` reuses the existing plume pair.

## Success Criteria

- [ ] `DETECTIVE_CASES` holds two cases; no module imports a global `CULPRIT` or reads
      `ruledOutBy` off `ANIMAL_ART`.
- [ ] The three structural deduction tests iterate `DETECTIVE_CASES` instead of asserting
      one case — strictly stronger, since they also catch a clue kind meaning one thing in
      one case and another elsewhere.
- [ ] A caption cannot be rendered without its image: removing `label` from a call site is
      a **type error**, asserted by a test that also proves the rewritten text-absence
      suites can still fail.
- [ ] Four duck trails precede `trail1`; corridor width decreases monotonically 100 → 70;
      `duck-trail4` satisfies `cornerClearance` and `armClearance`.
- [ ] Solving the duck deduction survives a reload: `isFiled('duck-deduce')` is true.
- [ ] A `cursiva.levels.v1` payload captured mid-hen-campaign loads with no locked dead
      end and no level demotion.
- [ ] `placeArt()` is unit-tested and both call sites use it; the lens centres on the
      pointer, not on the bounding box.
- [ ] Exiting every mode lands on the home office; the level map is unreachable without
      `isDevMode()`.
- [ ] `docs/11_PULPITO_DETECTIVE_DIRECTIVA.md` exists and matches the PDF's structure;
      no D6 "never typeset" claim survives in `PistasRail.tsx` or `docs/09`.
- [ ] `npm test` and `npm run build` green (baseline 972 tests / 52 files); no new
      `url(#…)` reference.
- [ ] **Screenshot check, human-reviewed** (`scripts/shot.sh`): a duck trail mid-trace
      showing the lens on the fingertip, and the duck deduction showing three captioned
      animals. This repo's three big defects were all found by screenshots and none by the
      suite; a green suite is necessary and not sufficient.

---

**Accepted deviation:** this proposal runs past the skill's 450-word cap. `config.yaml`
mandates a rollback plan for risky changes, this change carries two risky ones (migration
and navigation), and five decisions each needed their reason on the record. Truncating
either would have been the wrong trade — the same deviation `detective-mode/proposal.md`
recorded.
