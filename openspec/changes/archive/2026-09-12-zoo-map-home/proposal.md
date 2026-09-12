# Proposal: The Zoo Map Is the Main Screen

**Paso A** of the `docs/13_AVENTURAS_POR_ANIMAL.md` §8 table, and nothing else.

## Intent

The app still opens on a screen that says "pick a level". `docs/12_MAPA_DEL_ZOOLOGICO.md`
§1 rules that out: *"La aplicación no es una sucesión de niveles. El chico entra a un
mundo"*. The shipped entry is `HomeScreen` — the octopus's office from `docs/10` — which
`docs/12` explicitly **replaces**, naming its own failure: *"La oficina del pulpo quedó fea
justamente por eso: pasto disperso en franja, barro suelto, un escritorio tapando los
brazos"*. The office composes its scene in code; the map is one drawn illustration with
registered layers on top.

Three things are wrong today and only the map fixes them:

1. **There is no world.** A five-year-old sees a list, not a zoo. Sectors, fog, footprints
   and recovered animals are what turn "next level" into "let's go find the duck".
2. **Progress has no place to show.** `docs/12` §1 asks for three permanent elements —
   backpack, recovered animals, stars. None exists on any screen.
3. **The deduction is in the child's way.** `docs/13` §4 decision 1 puts the three-option
   questionnaire **on pause, not retired**: every later directive closes a sector with
   *"aparece el animal recuperado"*, so finishing `duck-trail4` must return to the map with
   the duck standing in the pond — not to a quiz.

The nine `zoo-*` assets are already built, shipped and registered (`detective/assets.ts:193-238`)
and no component consumes one. This change is the consumer.

## Scope

### In Scope

1. **The map is the entry screen.** `initialShell()` (`App.tsx:45-49`) resolves to the zoo
   map instead of `{at:'home'}`. `goHome` (`App.tsx:71-74`) becomes the return to the map,
   still passed as `onExit` to `GameScreen`. Returning from **any** level lands there.
2. **`client/src/zoo/sectors.ts`**, a declarative registry in the shape `docs/12` §3
   names: `id`, `hit` (viewBox rect, minimum 120×120), `fog` (list of `{art,x,y,size,rot}`),
   `animalSpot {x,y}`, `adventureIds`, and a pure `unlockedWhen(records)`.
3. **Sector→adventure mapping from `docs/13` §3, wiring only what already exists, with
   zero content change.** The **estanque** holds `duck-trail1..4` (patos) then
   `f2-guirnalda, f2-agua2..4` (medusa). **Entrada, bosque, montañas, arena and nocturna
   stay fogged with no adventures** — their content is pasos B–H. **Sendero** connects and
   has no adventure of its own.
4. **The estanque starts discovered.** Until the entrance exists (paso D) there is no intro
   to reveal it, so the estanque is unfogged from the first run and the footprints point at
   it. This is a temporary seed, deleted in paso D, not a rule.
5. **Layers, in `docs/12` §3 order**: map `<image>` at `preserveAspectRatio="xMidYMid slice"`;
   fog per closed sector; recovered animals at their `animalSpot`; footprints every 40 units
   from the plaza, alternating sides the way `clueMarks` already does; the octopus with
   backpack (~150 tall); the speech bubble with the footprint inside; then the HUD.
6. **HUD** as DOM with Nunito outside the SVG: backpack top-left, recovered animals
   top-centre, star with its count top-right.
7. **`client/src/zoo/backpack.ts`** — the registry exists and is **empty**. `docs/13` §8
   says which object each sector grants is decided in paso D.
8. **Deduction goes on pause.** `resolveNextAction` (`GameScreen.tsx:140-150`) stops
   routing the last trail of a case to `{type:'deduce'}` and instead exits to the map.
   `cases.ts`, the clue art, `PistasRail` and `Deduction` are **kept intact**; `Deduction`
   stays reachable only through `?nivel=deduccion` / `?nivel=deduccion-<caseId>` in
   `initialView` (`GameScreen.tsx:91-105`).
9. **`client/src/home/` and `screen/HomeScreen.tsx` are retired**, with their tests. The
   mode registry (`home/modes.ts`) is deleted unless the backpack genuinely reuses it.
   `home/caseState.ts` goes with them: it is imported by `HomeScreen` only — `LevelPlay`
   and `Deduction` compute their own rail slots.
10. **The guardrail tests and `?debug=sectores` from `docs/12` §4 are deliverables, not
    optional**: a pure test that each closed sector's fog rects cover its whole `hit`, a
    pure test that no two `hit`s overlap or touch the plaza, and a flag that paints `hit`s
    and `animalSpot`s in translucent red for screenshot review.
11. **Document background = `#76B56A`**, the measured edge colour of
    `client/public/art/zoo-map.png`. `docs/09` §7 forbids a third white behind a
    `slice`-cropped illustration.

### Out of Scope

- **Every paso B–H row of `docs/13` §8.** B: ducks reshaped as ondulaciones, the lagoon
  background, retiring the scattered ground, the narrative entry/close components. C: sheep
  and llamas. D: the entrance, the intro, the detective transformation, the night sector,
  the reveal grid — and the decision of which object each sector grants. E: snakes.
  F: bees. G: dolphins. H: the hedgehog.
- **No adventure content changes.** `duck-trail1..4` keep their current paths, ids and
  clues. They are wired, not rewritten.
- **No new art, and no `scripts/art/build_art.py` run.** All nine `zoo-*` assets ship
  already. `home-octopus.png` / `home-desk.png` **stay registered** in `assets.ts` even
  though nothing renders them: `artManifest.test.ts:149` asserts registry↔manifest parity
  and `artHierarchy.test.ts:281` guards them, so removing the art means touching
  `build_art.py`, the manifest and two tests for no gain. Retiring them is a later cleanup.
- **No new persisted key and no new schema.** Everything the map shows derives from
  `cursiva.levels.v1` through `openProgressStore()`.
- Retheming `docs/01`–`docs/05`: `docs/13` §4 decision 2 says those wait until the map is
  in `main`.

## Decisions (settled — do not reopen)

| # | Decision | Reason |
|---|---|---|
| D1 | **Exiting a level reaches `onExit`, not `dispatch`.** The after-level decision gains a third outcome that leaves the game shell. | `{view:'map'}` inside `GameScreen` is `LevelMap`, dev chrome — **not** the zoo map. The zoo map lives at the `App` shell level, where `{at:'home'}` is today. A `GameAction` variant cannot express "leave the shell" without forcing the deliberately pure `nextView` to know `App`'s `Shell` type — the same reasoning that made `onExit` a prop in `case-registry-and-captions`. |
| D2 | **`Deduction` is paused, not deleted.** | `docs/13` §4 decision 1 is explicit, and the `.docx` §12 keeps the case structure for later. Deleting `cases.ts` would throw away the clue palette, the rail and four tested trails to save nothing. |
| D3 | **`App.test.tsx:29-38`'s "the first screen has zero visible text" becomes "every visible word is captioned"**, asserted through `auditCaptions`. | The map has a star count and the octopus's phrase, so the old assertion cannot survive. This is **not a weakening**: the real invariant is `docs/09` §8's *"ningún texto aparece solo"*, which `captionAudit.ts` (`CAPTION_CONTAINERS = ['cv-captioned','pistas-bar']`) already encodes in code. The word "12" next to the star image and the phrase inside the bubble both satisfy it; a bare word would still fail. |
| D4 | **The estanque starts discovered** rather than inventing a stand-in intro. | Paso D owns the intro. A placeholder intro is content this change promised not to write, and a fully fogged map is a dead first run. |
| D5 | **The scene is one illustration plus registered layers**, never composed from scattered marks. | `docs/12` §3, and the office is the counter-example on record. |
| D6 | **No `url(#…)`** — no `mask`, `clipPath`, `pattern` or filter anywhere in the map, including the fog. | `TraceCanvas.tsx:69-86` records that it **hydrates blank on real devices**. Zero occurrences in shipped code; the fog is opaque `<image>` art laid over the sector, which is why `docs/12` §5 asked for three fog PNGs. |

## Open decisions (need a ruling before `sdd-design`)

| # | Question | Recommendation |
|---|---|---|
| **OD1** | **Where do the stars come from?** `docs/12` §3 says *"suma de las estrellas ganadas por nivel en los records existentes"* — **that summation has no source today.** `LevelRecord` is `{bestAccuracy,bestFluency,attempts,approvals,streakFail,streakPass,widthFactor}`; there is no star field. `grep -rn star client/src` finds only `modes/StarFeedback.tsx`, a non-persisted per-attempt overlay in the letter workbench, and the unused `ZOO_STAR_ART`. | Derive them: one pure exported `starsFor(record)` over data that **already persists**, adding no new persisted state and inventing no quality thresholds. Proposed rule: **one star per approval, capped at `APPROVALS_TO_UNLOCK` (2) per level**. Recorded tension: `docs/12` §1 says *"el avance y las estrellas son dos cosas distintas y no se mezclan"*, and approvals are exactly advance — so this rule deliberately conflates them for now. It is one pure function with one call site, to be revisited in paso D when the backpack defines what a star **costs**. |
| **OD2** | **What does tapping a fully completed sector do?** `docs/12` §3 only covers *"la primera aventura sin completar"* and *"un sector con niebla no hace nothing"*. | Re-enter the sector's **last** adventure, so the child can replay. Rejected alternative: make it inert, which reads as broken on the one sector that is finished. |
| **OD3** | **Does `sendero` get a `hit` rect at all?** `docs/12` §4 demands no two `hit`s overlap and a 120×120 minimum, and `docs/13` §3 says the sendero *"conecta; no tiene aventura propia"*. | **No hit and no fog** — register it as non-interactive scenery. It is the paths themselves: it has no destination to open, and a 120×120 rect over the paths would necessarily collide with the plaza or a neighbour and break the very test in §4. |

## Capabilities

### New Capabilities

- `zoo-map`: the sector registry and its geometry invariants, the layer order, fog,
  footprints, recovered animals, the HUD, the `?debug=sectores` flag, and the map's role as
  the application's entry screen.

### Modified Capabilities

- `main-screen`: **Exit Returns to Home Office** becomes exit returns to the zoo map; the
  home office and its mode registry are removed. **Level Map Is a Development-Gated Route**
  survives unchanged but is re-anchored to the map.
- `detective-mode`: **Deduction Screen** becomes deep-link-only; **Case Routing Across
  Multiple Cases** is REMOVED with `home/caseState.ts` (Reason: deduction paused per
  `docs/13` §4.1; Migration: the map's sector registry owns which adventure opens next, and
  persisted `<caseId>-deduce` records stay readable and inert).
- `level-engine`: **Deduction View Reachable from nextView** is MODIFIED — the fourth filed
  clue no longer routes to the deduction view; the view stays reachable only through
  `?nivel=deduccion`, and the after-level decision gains an exit-the-shell outcome.
- `trace-canvas`: **`placeArt()`** — its required call-site list drops the retired home
  screen (the spec names `home/modes.ts`; the actual call is `HomeScreen.tsx:180`).
  `TraceCanvas` remains.

## Approach

Registry first, then the screen, then navigation, then the retirement. `sectors.ts` and its
two pure guardrail tests land before any component, so the coordinates are proven against
the measured PNG before a pixel is drawn — `docs/12` §4 is explicit that a misplaced rect is
fixed **in the registry, never in the drawing**. Every decision a test must observe lives in
a named exported pure function: this harness is **vitest in node env with no DOM, no jsdom
and no testing-library**, every component test is `renderToString` plus string assertions,
so a decision inside a click handler is invisible to it. `HomeScreen` and `client/src/home/`
are deleted **last**, in their own slice, so the map is provably the entry screen before its
predecessor disappears.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `client/src/zoo/sectors.ts` | New | Sector registry: `hit`, `fog`, `animalSpot`, `adventureIds`, `unlockedWhen`. |
| `client/src/zoo/backpack.ts` | New | Empty item registry; the shape only. |
| `client/src/zoo/stars.ts` | New | `starsFor(record)` — pure, pending OD1. |
| `client/src/screen/ZooMap.tsx` | New | The screen: layers, HUD, `?debug=sectores`. |
| `client/src/App.tsx` | Modified | Entry resolves to the map; `goHome` → return-to-map; `CaseStep`/`HomeMode` imports removed. |
| `client/src/screen/GameScreen.tsx` | Modified | `resolveNextAction` exits to the map; deduction auto-route removed; `?nivel=` deep links kept. |
| `client/src/screen/HomeScreen.tsx` + `.test.tsx` | Removed | Superseded by the map. |
| `client/src/home/` | Removed | `modes.ts`, `caseState.ts`, `officeGround.ts` and their tests. |
| `client/src/App.test.tsx` | Modified | Text-absence assertion → `auditCaptions` (D3). |
| `client/src/detective/assets.ts` | Unchanged | The nine `zoo-*` entries already exist; office art stays registered. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| The `hit` rects do not land on the drawn sectors | High | `?debug=sectores` plus a screenshot with and without the flag is a named deliverable, not a nice-to-have; `docs/12` §4 fixes the registry, never the drawing. |
| `slice` crops something load-bearing on a tall tablet | Med | `docs/12` §3 relies on the 8% margin requested in the drawing; screenshots at 1000×600 **and** a portrait tablet ratio are a deliverable. |
| Deleting `client/src/home/` breaks an unnoticed importer | Low | Verified: only `App.tsx:15,20,22`, `HomeScreen.tsx`, `HomeScreen.test.tsx` and the three `home/*.test.ts`. Everything else is comment-only, and `LevelPlay`/`Deduction` build their own rail slots. |
| OD1 ships a star rule that paso D has to undo | Med | One pure function, one call site, no persisted state — rollback is deleting a file. |
| `Deduction` rots while paused behind a deep link | Med | Its tests stay green and unchanged; only its entry point moves. Re-check before paso D reinstates it. |
| Over the 800-line review budget | Med | Delivery is `single-pr` at a cached 800-line budget; the registry-first order gives clean slices if it must be split. |
| `openspec/specs/detective-mode/spec.md:195` still carries an unmerged `# Delta for Detective Mode` header inside the main spec | Low | Pre-existing archive artifact. Flag to `sdd-spec`; do not silently rewrite it in this change. |

## Rollback Plan

1. **Entry screen.** The map is additive: `HomeScreen` and `client/src/home/` are deleted in
   the final slice. Reverting that one slice restores the office byte-for-byte, and
   `initialShell()` is a two-line revert.
2. **Navigation.** `resolveNextAction`'s new exit outcome is one branch. Restoring
   `{type:'deduce'}` brings the deduction auto-route back; the deep-link path in
   `initialView` is untouched either way, so nothing has to be re-added.
3. **Persistence.** Nothing is written. No new key, no migration, no schema change — the map
   is a pure read over `cursiva.levels.v1`. A rollback cannot lose a child's progress.
4. **Registries.** `zoo/sectors.ts`, `zoo/backpack.ts` and `zoo/stars.ts` are new files with
   no importers outside the map; deleting them is complete.
5. **Art.** Untouched. No `build_art.py` run, no manifest change, so no rollback surface.
6. **Test change.** D3's `App.test.tsx` edit reverts with the screen it describes.
7. **Blocker:** if a later change starts persisting star state, item 3 stops holding.
   Re-verify before shipping any such change.

## Dependencies

- None. No new packages. All nine `zoo-*` assets are built, shipped and registered.

## Success Criteria

- [ ] The app opens on the zoo map; `HomeScreen` and `client/src/home/` no longer exist and
      nothing imports them.
- [ ] Pure test: for every closed sector, the union of its fog rects contains its whole `hit`.
- [ ] Pure test: no two `hit`s overlap, none overlaps the plaza, and every one is ≥ 120×120.
- [ ] The estanque opens `duck-trail1..4` then `f2-guirnalda, f2-agua2..4`, in that order,
      with no path, id or clue changed.
- [ ] Entrada, bosque, montañas, arena and nocturna render fogged and inert.
- [ ] Finishing `duck-trail4` lands on the map with the duck at its `animalSpot` — no
      deduction. `?nivel=deduccion` still reaches `Deduction`.
- [ ] Returning from any level lands on the map; `LevelMap` is reachable only via `?nivel=mapa`
      with `isDevMode()`.
- [ ] Every visible word on the map passes `auditCaptions`; the rewritten assertion is proven
      able to fail.
- [ ] No `url(#…)` anywhere in the new code.
- [ ] `npm test` and `npm run build` green (baseline on this branch: 60 files / 1145 tests).
- [ ] **Screenshots, human-reviewed** (`scripts/shot.sh`): the map at 1000×600 with and
      without `?debug=sectores`, and once at a portrait tablet ratio. This repo's biggest
      defects were all found by screenshots and none by the suite; a green suite is necessary
      and not sufficient.

---

**Accepted deviation:** this proposal runs past the skill's 450-word cap, the same deviation
`case-registry-and-captions/proposal.md` recorded. `config.yaml` mandates a rollback plan for
risky changes; this one retires the entry screen and pauses a whole mode, three open decisions
each needed their tension stated rather than silently resolved, and every paso B–H row had to
be named out of scope so the next change knows what it inherits.
