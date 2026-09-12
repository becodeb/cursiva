# Tasks: Duck Undulations and the Lagoon Sector Backdrop

Binding inputs: `proposal.md` (five decisions, settled), `design.md` (the HOW,
including the orchestrator's "Measured facts" appendix, which overrides every
earlier estimate in the body), and the five delta specs under `specs/`. The
`detective-mode/spec.md` ground-retirement gate used below is the **reconciled**
version: `inDetectiveWorld(level) && backdropFor(level.id)`, keyed on the
ADVENTURE — never on `sectorOf` and never on `level.maze`.

Two settled numbers, not reopened: `SECTOR_BACKDROP.estanque.brightest` is
`#b4c5d0` (luma 193, margin 58 against the `>= 55` law) — the design's reserved
remedy (`duck-trail3` cycle 2 `amplitude: 205 -> 185`) is **not needed**.
`corridorRows` is `{ top: 135, bottom: 889 }`; the sampled quiet band is source
rows 201..818 = viewBox `[97.6, 499.1]`; every corridor overflows it and
full-bleed stands regardless.

Delivery seam = phase seam, per design's own B1/B2/B3 grouping (`single-pr`
cached strategy — everything lands in one PR, ordered as internal commit
slices).

**Sequencing note (flagged, not silently resolved).** `zoo/backdrops.ts`
(Phase 2 / B2) calls `adventureFor` from `zoo/adventures.ts` (Phase 3 / B3).
The design's own claim that "B1 → B2 → B3 is dependency order and each is
green on its own" does not hold literally for this one forward reference:
`backdrops.ts` will not compile in isolation until `adventures.ts` exists.
Because delivery is `single-pr` (not chained), this is not a blocker — the
whole PR lands together and the only gate that must be green in isolation is
the **Final Gate** (Phase 5). Task 2.5 names this explicitly at the point it
occurs. If delivery is later re-scoped to chained PRs, this forward reference
becomes a real blocker and `zoo/adventures.ts`'s core (`Adventure`,
`adventureFor`) would need to move into the first chained slice.

---

## Phase 1: The Wave Recut (B1)

Spec traceability: `level-engine/spec.md` — "Duck Trail Set Precedes trail1",
"waveVaried Per-Cycle Amplitude Generator", "Duck Undulation Progression
Invariant", "Corridor Tolerance Band Stays Inside the Channel on Wave Crests".

Sequential within the phase: 1.1 before 1.2; 1.3/1.4 can be done in either
order (independent literals in the same file, no shared lines); 1.6/1.7 depend
on 1.3/1.4 landing first; 1.8 is independent of everything else in this phase
and could run in parallel.

- [x] 1.1 In `client/src/levels/paths.ts`: add the `WaveCycle` interface
      (`{ width, amplitude }`) and `waveVaried(o)`, the per-cycle sibling of
      `garlandVaried`, alternating crest/trough per cycle via
      `alternatingArches`'s own construction (`M`/`C` only, no other command).
      Add `waveCrestRadius(halfWidth, amplitude) = halfWidth ** 2 / (8 *
      amplitude)`, `paths.ts`'s own closed form (§2 of `design.md`).
- [x] 1.2 In `client/src/levels/paths.test.ts`: add the six rows design §1
      names — (a) `waveVaried`'s command alphabet is a subset of `{M, C}`;
      (b) `transformPath` throws when an `A` command is appended to
      `waveVaried`'s output; (c) a uniform `cycles` list reproduces `wave()`'s
      `d` string **byte for byte** via `toBe`, using the exact literals design
      §1 verified by hand (`wave()` with `x0=120,x1=880,cycles=2` vs
      `waveVaried({cycles:[{width:380,amplitude:170},{width:380,amplitude:170}]})`);
      (d) extrema land exactly at `y ∓ amplitude` per cycle; (e) the first
      extremum is above `y`; (f) `waveCrestRadius` reproduces `w²/8A` on the
      four duck literals (123.60, 30.90, 44.54/18.67, 13.73).
- [x] 1.3 In `client/src/levels/catalog.ts`, `duck-trail3`: replace
      `switchback({ x0: 120, x1: 880, yTop: 140, yBottom: 480 })` with
      `waveVaried({ x0: 90, y: 300, cycles: [{ width: 470, amplitude: 155 },
      { width: 350, amplitude: 205 }] })`; `corridorWidth` stays `80`; `title`
      → `'Las burbujas suben y bajan'`; `hint` →
      `'Seguí las burbujas: unas ondas son más grandes.'`; `rules(1, false,
      true, 0)` (drop `mustBeContinuous`); replace the stale three-reasons
      deviation comment (the switchback-vs-garland rationale, currently ~20
      lines) with a short comment naming the one thing that survives it: the
      8.71° C1 kink at the single cycle boundary, and why it is accepted
      (design §1, "Decision: step 3's one cycle boundary is a kink").
- [x] 1.4 In `client/src/levels/catalog.ts`, `duck-trail4`: replace
      `squareWave({ x0: 100, mid: 300, amplitude: 170, run: 200, cycles: 3 })`
      with `wave({ x0: 90, x1: 910, y: 300, amplitude: 170, cycles: 3 })`;
      `corridorWidth` stays `70`; `taper: { from: 1, to: 0.85 }` (was
      `{1.15, 0.9}`); `hint` →
      `'Seguí el rastro de plumas, el camino se angosta.'`. Keep
      `resetOnContact`, `carrier`, `demo: true`, `clue` untouched.
- [x] 1.5 Confirm (no code change) that `switchback` and `squareWave` stay
      imported and used in `catalog.ts` by their non-duck callers — `trail3`
      and `trail4`'s own configs — so `noUnusedLocals` stays quiet after 1.3/
      1.4.
- [x] 1.6 In `client/src/levels/catalog.test.ts`: delete the
      `describe('detective-mode — duck-trail4 clears the corner and arm
      guards…')` block (currently lines 697-709) — it reads
      `target.polyline[0..2]` as a flat run and a vertical transition, which a
      wave shape has neither of. Confirm `cornerClearance`, `armClearance` and
      `buildLevelTarget` stay imported and used by the untouched `trail4`
      (non-duck) describe immediately above it (lines 678-695).
- [x] 1.7 In `client/src/levels/catalog.test.ts`: add
      `describe('LEVELS — the duck adventure is one undulation family')` with
      the six rows design §1 names: (1) every duck level has exactly one path
      whose command letters are a subset of `{M, C}`; (2) `peakSlope = 4A /
      halfWidth`, restated from each level's own generator literals, strictly
      increases 1.66 → 3.32 → 4.69 → 4.98; (3) `corridorWidth` strictly
      decreases 100 → 90 → 80 → 70; (4) `cw₄·taper.from ≤ cw₃` and
      `cw₄·taper.to < cw₃`; (5) `buildLevelTarget(duck-trail3).polyline`'s two
      crest depths differ by ≥ 40 units; (6) `mustBeContinuous` is `false` on
      all four. Re-verify the pre-existing, unchanged assertions still hold:
      `:103-106` (corridor widths), `:290-296` (tapered set and `from > to`),
      `:305-314` (`resetOnContact`), `:415-426` (phase-1 span/minY/maxY),
      `:169-179` (phase-1 continuity).
- [x] 1.8 In `client/src/levels/buildLevel.test.ts`: add the `pushBand`
      containment test over **every** catalog level with a corridor — every
      pushed point lies within `band = corridorWidth/2 − BAND_INSET` of its
      own centreline, folded or not. Pair it with a tightness row: the same
      predicate at `band − 1` MUST fail for `duck-trail2` (falsifiability —
      it can never pass vacuously). Add a third, documentary row recording
      which duck crests fold and which do not, matching design §2's table
      (step 1 no; step 2 yes; step 3 cycle 1 no, cycle 2 yes; step 4 yes) —
      this is the "Corridor Tolerance Band Stays Inside the Channel on Wave
      Crests" spec requirement.
- [x] 1.9 Run `npx vitest run client/src/levels` — green, zero regressions.

## Phase 2: The Sector Backdrop (B2)

Spec traceability: `trace-canvas/spec.md` — "Sector Backdrop Layer Beneath the
Maze Block", "Wall Rect Yields to the Backdrop", "Channel Paint Follows the
Backdrop Luma Law"; `detective-mode/spec.md` — "World Behaviours Gate on
inDetectiveWorld, Not on the Clue" (the ground-retirement scenarios).

Sequential: 2.1 before 2.2 (palette move must land before its test imports
it); 2.3 before 2.4; 2.5 depends on `adventureFor` existing (see sequencing
note above — write it against the Phase 3 API contract now, verify compile at
the Final Gate); 2.9 depends on 2.5/2.11 conceptually but not on file
contents; 2.7/2.8 (the Python sampler + manifest parity) are independent of
2.9-2.12 and can run in parallel.

- [x] 2.1 Move `luma` from `client/src/detective/palette.test.ts` (currently
      lines 31-36) into `client/src/detective/palette.ts` as an exported
      function, carrying its "rounds-where-the-pipeline-floors" comment
      verbatim.
- [x] 2.2 In `client/src/detective/palette.test.ts`: import `luma` from
      `palette.ts` instead of defining it locally. Extend the existing ground
      set (`:128-136`) with `SHEET_PAPER`: `BUBBLE`, `BREADCRUMB`, `PLUME`,
      `PRINT`, `POND`, `KERNEL` must clear `MIN_GROUND_CONTRAST` (40) against
      it; `CLUE_DRAINED` must clear `MIN_DRAINED_GROUND_CONTRAST` (55)
      against it.
- [x] 2.3 In `client/src/zoo/sectors.ts`: add `viewBoxToImage(vbX, vbY)`, the
      exact inverse of the existing `imageToViewBox` (currently lines
      147-156), over the same `MAP_IMG_W`/`MAP_IMG_H` constants.
- [x] 2.4 In `client/src/zoo/sectors.test.ts`: add a round-trip test —
      `viewBoxToImage(imageToViewBox(x, y))` (and the reverse composition)
      returns the original coordinates within floating-point tolerance.
- [x] 2.5 Create `client/src/zoo/backdrops.ts`: `SectorBackdrop` interface
      (`art`, `quiet`, `brightest`, `corridorRows: { top, bottom }`);
      `SECTOR_BACKDROP: Partial<Record<SectorId, SectorBackdrop>>` with the
      single `estanque` entry using the **measured** values —
      `art: SECTOR_BACKGROUND_ART.lagoon`, `quiet: '#b4c5d0'`,
      `brightest: '#b4c5d0'`, `corridorRows: { top: 135, bottom: 889 }`;
      `backdropFor(levelId) = SECTOR_BACKDROP[adventureFor(levelId)?.sector]`.
      **This line imports `adventureFor` from `zoo/adventures.ts` (Phase 3) —
      see the sequencing note at the top of this document.**
- [x] 2.6 Create `client/src/zoo/backdrops.test.ts`: (a) the luma law —
      `|luma(SHEET_PAPER) − luma(brightest)| >= 55` for every entry in
      `SECTOR_BACKDROP` (measured: 58); (b) the falsifiability row —
      `|luma(CORRIDOR_EARTH) − luma(SECTOR_BACKDROP.estanque.quiet)| < 55`
      (measured: 6.0), proving the guard is sensitive; (c) `corridorRows`
      coverage — for every duck level, `viewBoxToImage(0,
      channelTop/Bottom).y` falls inside `corridorRows`, using the measured
      channel extents (`duck-trail1` [80,520], `duck-trail2` [85,515],
      `duck-trail3` [55,545], `duck-trail4` [95,505]); (d) `backdropFor` is
      defined for `duck-trail1..4` and **undefined** for `f2-guirnalda`,
      `f2-agua2`, `f2-agua3`, `f2-agua4`, and for `trail1..4` — the medusa
      regression guard named in the task brief's constraints.
- [x] 2.7 In `scripts/art/build_art.py`: add a per-backdrop row-range entry to
      the `PASSTHROUGHS` table for the lagoon (`corridorRows` 135..889), and
      extend the existing emit function with two extra manifest fields for
      that entry: `quiet` (the modal colour of the middle 40% of rows) and
      `brightest` (the maximum-luma pixel colour across the full row range).
      No new invocation surface, no new argument, no new caller.
- [x] 2.8 In `client/src/detective/artManifest.test.ts`: extend the existing
      registry↔manifest parity check to cover `quiet`/`brightest` for
      `SECTOR_BACKDROP.estanque` against the manifest's sampled values from
      2.7 — confirms both equal `#b4c5d0` and `corridorRows` equals
      `{135, 889}`.
- [x] 2.9 In `client/src/canvas/TraceCanvas.tsx`: add the `TraceBackdrop`
      interface (`href`, `quiet`) and the `backdrop?: TraceBackdrop` prop.
      Insert the backdrop `<g pointerEvents="none">` layer (flat `quiet` rect
      + `<image href>` at `preserveAspectRatio="xMidYMid slice"` on the
      `<image>` only, never the root `<svg>`) between the base rect (`:844-
      864`) and the maze block (`:865`) — the only position where it is not
      hidden by either. Change exactly the four conditionals design §3.4
      names: `:865` `corridor && (mazeOn || ground)` →
      `corridor && (mazeOn || ground || !!backdrop)`; `:901`
      `{mazeOn && (<rect …/>)}` → `{mazeOn && !backdrop && (<rect …/>)}`;
      `:916`/`:927` `stroke={ground ? CORRIDOR_EARTH : SHEET_PAPER}` →
      `stroke={ground && !backdrop ? CORRIDOR_EARTH : SHEET_PAPER}`; `:969`
      `corridor && !mazeOn` → `corridor && !mazeOn && !backdrop`. No
      `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, or `url(#…)`
      anywhere in the diff (`TraceCanvas.tsx:70-84`'s ban).
- [x] 2.10 In `client/src/canvas/TraceCanvas.test.tsx`: with `backdrop` set —
      the `<image>` carries `xMidYMid slice` and the root `<svg>`'s own
      `preserveAspectRatio` is not `"xMidYMid slice"`; the full-sheet wall
      `<rect>` is absent; every channel `<path>`'s `stroke` is `SHEET_PAPER`
      regardless of `ground`; the `quiet` rect is present; zero `url(#`,
      `<mask`, `<pattern`, `<clipPath`, `<defs` occurrences; the channel
      `<path>` renders after (below, i.e. later in document order than) the
      backdrop `<image>`. Without `backdrop` — markup byte-identical to today
      for a `ground` maze and for a plain maze (regression pin).
- [x] 2.11 In `client/src/screen/LevelPlay.tsx`: resolve
      `backdrop = useMemo(() => { const b = backdropFor(level.id); return b ?
      { href: b.art.href, quiet: b.quiet } : undefined }, [level.id])`; change
      the `ground` memo's guard to
      `if (!inWorld || !corridor || backdrop) return undefined`, adding
      `backdrop` to its dependency array; the page background follows
      `style={backdrop ? { background: backdrop.quiet } : undefined}` on the
      existing `<main className={ground ? 'cv-play cv-play-ground' :
      'cv-play'}>`.
- [x] 2.12 In `client/src/screen/LevelPlay.test.tsx`: `duck-trail2` → zero
      `GROUND_GRASS`/`GROUND_MUD` hrefs present and the `quiet` colour as the
      page's inline background. **Medusa ground regression guard, named
      explicitly**: `f2-agua2` → its grass and mud hrefs are still present,
      completely unchanged from before this change (it shares the estanque
      sector with the ducks but belongs to no declared adventure, so
      `backdropFor('f2-agua2')` stays `undefined`).
- [x] 2.13 Run `npx vitest run client/src/zoo client/src/detective/palette.test.ts
      client/src/detective/artManifest.test.ts client/src/canvas/TraceCanvas.test.tsx
      client/src/screen/LevelPlay.test.tsx` — expect `backdrops.ts`/`backdrops.test.ts`
      to fail to resolve `adventureFor` until Phase 3 lands (the flagged
      forward reference); every other file in this phase must be green on its
      own.

## Phase 3: The Narrative Entry and Closing (B3)

Spec traceability: `main-screen/spec.md` — "resolveEnterAction Chooses Between
Play and the Narrative Entry", "Narrative Entry GameView Variant and App
Wiring", "Narrative Entry Screen Content"; `zoo-map/spec.md` — "Octopus Phrase
Reads as a Closing Once the Sector's Animal Is Recovered".

Sequential: 3.1 before everything else in this phase (and before Phase 2's
`backdrops.ts` compiles — see the sequencing note). 3.3/3.4 can be done in
either order; 3.7 depends on 3.3; 3.9 is independent of 3.3/3.4/3.7 and could
run in parallel.

- [x] 3.1 Create `client/src/zoo/adventures.ts`: the `Adventure` interface
      (`levelIds`, `sector`, `animal`, `intro`, `closing`); `ADVENTURES` with
      the single duck entry (`levelIds: ['duck-trail1', 'duck-trail2',
      'duck-trail3', 'duck-trail4']`, `sector: 'estanque'`, `animal: 'pato'`,
      the intro/closing lines from design §3.3); `adventureFor(levelId)`;
      `introLevel(levelId)` (true only when `levelId === adventure.levelIds[0]`);
      `mapBubble(sector, records)` per design §5 — the `ONWARD` constant, and
      the recovered-animal check via `animalPlacements`.
- [x] 3.2 Create `client/src/zoo/adventures.test.ts`: `adventureFor` — every
      duck id resolves the row, `trail1` and `f2-agua2` resolve `undefined`.
      `introLevel` — `duck-trail1` → the row; `duck-trail2..4` → `undefined`.
      `mapBubble` — empty records → `ONWARD`; `duck-trail4` filed → the duck
      art and the closing line; a sector with no adventure row → `ONWARD`.
- [x] 3.3 In `client/src/screen/GameScreen.tsx`: add the `'intro'` `GameView`
      variant (`{ view: 'intro'; levelId: string }`); add
      `resolveEnterAction(levelId, records)` returning
      `introLevel(levelId) ? { view: 'intro', levelId } : { view: 'play',
      levelId }`; add the `state.view === 'intro'` render branch that resolves
      `introLevel(state.levelId)` and renders `AdventureIntro`, dispatching
      `{ type: 'play', levelId: state.levelId }` on `onStart` (falling through
      to `play` on an unresolved id, the existing never-crash convention).
      `nextView`'s reducer switch stays byte-identical — it gains no new case.
- [x] 3.4 Create `client/src/screen/AdventureIntro.tsx`: `AdventureIntroProps`
      (`adventure`, `onStart`); the markup per design §4 — a `<button
      type="button" className="cv-intro-stage" onClick={onStart}>` containing
      the backpack octopus `<img>`, the speech bubble `<img>` + `CaptionedArt`
      wrapping `ANIMAL_ART[adventure.animal]` with `label={adventure.intro}`;
      no `aria-label` on the button (the caption already names it).
      `INTRO_CSS` follows the map's own fix — `container-type: inline-size`,
      `cqw` caption sizing, `.cv-captioned > svg { flex: none }` — with **no
      backticks** in its comments (a template literal; one backtick ends the
      string).
- [x] 3.5 Create `client/src/screen/AdventureIntro.test.tsx`
      (`renderToString`, no DOM): the three registered hrefs present
      (backpack octopus, speech bubble, duck); the intro line present exactly
      once; `auditCaptions(html).uncaptioned` is `[]` and
      `.imagelessContainers` is `[]`; zero `url(#` occurrences; one hand-built
      failing row — the phrase rendered outside `cv-captioned` — proving the
      audit assertion can go red.
- [x] 3.6 In `client/src/screen/GameScreen.test.tsx`: `resolveEnterAction`
      cases — `duck-trail1` → `'intro'` (with any `records`, including empty
      and fully-filed); `duck-trail2..4`, `trail1`, `f3-a` → `{type:'play',
      levelId}` unchanged; an unknown id → `{type:'play', levelId}`. Add one
      render case proving the `'intro'` branch mounts `AdventureIntro` and
      that its `onStart` dispatches into `play`.
- [x] 3.7 In `client/src/App.tsx`: `onEnter` becomes
      `(levelId) => { setTrip((n) => n + 1); setShell({ at: 'game', initial:
      resolveEnterAction(levelId, records) }) }`, replacing the hardcoded
      `{view:'play', levelId}`.
- [x] 3.8 In `client/src/App.test.tsx`: entering `duck-trail1` from the map
      renders the narrative entry, not the trail; entering `duck-trail2`
      renders the trail unchanged.
- [x] 3.9 In `client/src/screen/ZooMap.tsx`: replace the constant closing/
      onward phrase block (currently `:341-360`, hardcoding "¡Mirá! Las
      huellas van hacia allá. ¿Vamos?") with one call to
      `mapBubble(discovered, records)` feeding `CaptionedArt`'s `art`/`label`.
- [x] 3.10 In `client/src/screen/ZooMap.test.tsx`: the onward label renders
      before `duck-trail4` is filed; the closing label renders after; the
      duck's art href replaces the print art's href in the bubble once
      recovered; `auditCaptions` stays green in both states.
- [x] 3.11 Run `npx vitest run client/src/zoo client/src/screen/AdventureIntro.test.tsx
      client/src/screen/GameScreen.test.tsx client/src/App.test.tsx
      client/src/screen/ZooMap.test.tsx` — green, and re-run Phase 2's
      `backdrops.test.ts` now that `adventures.ts` exists — it must be green
      too.

## Phase 4: Screenshot Verification (human-reviewed, not optional)

Spec-adjacent: `docs/12` §4 (reading captures is part of the work). Sequential
— capture, then read, then correct if needed, then re-capture.

- [x] 4.1 Start the dev server: `npm run dev -- --host 0.0.0.0` (port 5173).
- [x] 4.2 Capture the four duck levels via `scripts/shot.sh`, which writes
      into `capturas/` at the repo root (gitignored) and already handles this
      host's three chromium traps (`--disable-gpu` mandatory, the
      `CHROME_OFFSET` viewport correction, the 500px width floor):
      `scripts/shot.sh "http://localhost:5173/?nivel=duck-trail1"
      duck-trail1.png 1000 600` (and the equivalent for `duck-trail2`,
      `duck-trail3`, `duck-trail4`).
- [x] 4.3 Capture the narrative entry as `capturas/duck-intro.png`. **This
      one cannot use `scripts/shot.sh`'s single-URL model**: the entry is only
      reachable by tapping the estanque sector on the map (`App.onEnter` →
      `resolveEnterAction`), and `?nivel=duck-trail1` deliberately bypasses it
      by design (`GameScreen.tsx`'s `initialView`, untouched by this change).
      Use a real interactive browser session against `http://localhost:5173/`
      — click the estanque, then capture the resulting screen with the
      browser's or OS's own screenshot tool, saved to `capturas/duck-intro.png`.
- [x] 4.4 Capture the map after the duck is recovered, as
      `capturas/zoo-map-duck-recovered.png`. Same constraint as 4.3: this
      needs `duck-trail4` filed in `cursiva.levels.v1`, which requires either
      playing through the four levels in the same interactive session or
      setting the record via devtools before reloading `/`. Capture with the
      browser/OS tool, not `scripts/shot.sh` (its fresh `--user-data-dir` per
      invocation means localStorage would not survive a second automated
      call).
- [x] 4.5 **Read every capture from 4.2-4.4** — production, not proof, is the
      goal here. Specifically check: does the paper channel read as legible
      over the water at each of the four levels; does the channel's overflow
      into the reed bands (measured: 17.6/12.6/42.6/2.6 over the top,
      20.9/15.9/45.9/5.9 under the bottom) read as a path through the reeds or
      as damage — `duck-trail3` is the one to scrutinise, its overflow is 3-4×
      the others; does the entry screen's bubble land on the octopus rather
      than over him; does the map's closing bubble read as a closing rather
      than a leftover "onward" phrase.
- [x] 4.6 If 4.5 finds the channel illegible or the overflow reading as
      damage, correct the responsible code (`catalog.ts`'s duck-trail3
      geometry, or `TraceCanvas.tsx`'s layering) — never the registry values
      that were already measured directly (§ the task brief's "do not
      re-open" facts) — re-run the affected phase's tests, and re-capture.
      Record what was found and what was changed, or record that no
      correction was needed.

## Phase 5: Final Gate

- [x] 5.1 Run `npm test` (full suite, repo root or `client/`) — green.
      Baseline is **60 test files / 1162 tests green**. Report the actual new
      totals explicitly (this change nets +2 files from `zoo/backdrops.ts`
      + `.test.ts`, +2 from `zoo/adventures.ts` + `.test.ts`, +2 from
      `screen/AdventureIntro.tsx` + `.test.ts` = 6 new files against a 1-test
      removal in Phase 1.6, plus every added row from 1.2/1.7/1.8/2.2/2.4/
      2.6/2.8/2.10/2.12/3.2/3.6/3.8/3.10) — the change must not drop a test
      outside its own deliberate deletion (the single Phase 1.6 describe
      block).
- [x] 5.2 Run `npm run build` — green.
- [x] 5.3 Confirm byte-identical-to-`main`: level ids (`duck-trail1..4`
      unchanged, still persisted `cursiva.levels.v1` keys), clue kinds,
      `corridorWidth` values (100/90/80/70), and `client/src/detective/cases.ts`,
      `Deduction.tsx`, and the clue registry (no diff in any of the three).
- [x] 5.4 Confirm zero `url(#` occurrences anywhere in the diff (`rg 'url\(#'
      client/src` should show no new hits beyond whatever pre-existed, which
      per `TraceCanvas.tsx:70-84` should be none).
- [x] 5.5 **Scope stop.** This change ends at row B. Confirm no row C-H
      content was started: no sheep, llamas, entrance/intro screen beyond
      this row's own, night sector, snakes, bees, dolphins, or hedgehog; no
      snail; `demo: true` on all four ducks is carried forward unchanged (a
      recorded, out-of-scope contradiction with `docs/13` §5 item 2, not
      fixed here).

---

## Review Workload Forecast

Estimated from the actual task list above, file by file — not restated from
`design.md`'s own ~990 (which the design itself flagged as provisional,
"`sdd-tasks` owns the binding forecast").

| Phase | Files | ~Changed lines |
|---|---|---|
| 1 (B1) | `paths.ts` (+20), `paths.test.ts` (+70), `catalog.ts` (~35 net), `catalog.test.ts` (−13, +80), `buildLevel.test.ts` (+90) | **~280** |
| 2 (B2) | `palette.ts` (+15), `palette.test.ts` (+15), `sectors.ts` (+15), `sectors.test.ts` (+20), `backdrops.ts` (+40, new), `backdrops.test.ts` (+90, new), `build_art.py` (+45), `artManifest.test.ts` (+20), `TraceCanvas.tsx` (+55), `TraceCanvas.test.tsx` (+70), `LevelPlay.tsx` (+20), `LevelPlay.test.tsx` (+40) | **~445** |
| 3 (B3) | `adventures.ts` (+45, new), `adventures.test.ts` (+60, new), `AdventureIntro.tsx` (+90, new), `AdventureIntro.test.tsx` (+70, new), `GameScreen.tsx` (+30), `GameScreen.test.tsx` (+40), `App.tsx` (+5), `App.test.tsx` (+20), `ZooMap.tsx` (~10 net), `ZooMap.test.tsx` (+25) | **~395** |
| **Total** | | **~1,120** |

- **400-line budget risk**: High. `~1,120` against the cached `800`-line
  `single-pr` budget is **~40% over**, and every individual phase (280/445/
  395) already exceeds the `400`-line single-review guard on its own —
  this is not a borderline case.
- **Chained PRs recommended**: Yes, if the `400`-line guard is meant to bind
  per review, not per change. The B1→B2→B3 seam is a real dependency order
  (modulo the one flagged forward reference in Phase 2/3) and each slice is
  independently reviewable once `adventures.ts`'s core lands ahead of or
  alongside `backdrops.ts`.
- **Decision needed before apply**: Yes. This forecast is materially higher
  than the design's own `~990` (driven mainly by the two new test files in
  Phase 2 — `backdrops.test.ts` and `TraceCanvas.test.tsx` — and Phase 1's
  `buildLevel.test.ts` containment suite, all three larger here than the
  design's per-slice tally implied). The orchestrator owns the split-or-
  exception call, per the review-budget guard's own rule; this document does
  not choose for it and does not trim scope to force a smaller number.

---

## Delivery decision (orchestrator, before apply)

**`size:exception` recorded.** The forecast of ~1,120 changed lines exceeds the
session's 800-line review budget, and the user was asked and chose to deliver
row B whole as a single PR rather than split it or trim it.

Reason accepted: the three phases hold each other up. The ducks without the
backdrop are still a diagram on scattered grass; the backdrop without the
narrative entry leaves `docs/13` §5's mandatory adventure structure unbuilt.
`docs/13` §8 row B is the scope the work was commissioned against.

Consequences for apply:
- `delivery_strategy` is `exception-ok` for this run. B1/B2/B3 stay as
  **phase** boundaries inside one branch, not as separate PRs.
- The B2 -> B3 forward reference (`zoo/backdrops.ts` calls `adventureFor` from
  `zoo/adventures.ts`) is therefore harmless and needs no reordering, since the
  tree only has to be green at the end of B3, not at the end of B2. Apply must
  still leave `npm test` green after every phase it reports complete, so
  `zoo/adventures.ts` lands in whichever phase makes that true.


---

## Phase 4 evidence (orchestrator)

Dev server on 5173. All captures written to `capturas/` (gitignored) by
`scripts/shot.sh`, which already handles this host's three chromium traps.

| Capture | URL | Size |
|---|---|---|
| `b-duck-trail1.png` | `?nivel=duck-trail1` | 1000x600 |
| `b-duck-trail2.png` | `?nivel=duck-trail2` | 1000x600 |
| `b-duck-trail3.png` | `?nivel=duck-trail3` | 1000x600 |
| `b-duck-trail4.png` | `?nivel=duck-trail4` | 1000x600 |
| `b-intro.png` | `?nivel=intro-duck-trail1` | 1000x600 |
| `b-intro-tablet.png` | `?nivel=intro-duck-trail1` | 768x1024 |
| `b-mapa-pato.png` | `?dev&debug=pato-recuperado` | 1000x600 |
| `baseline-duck-trail1.png` | `main` before the change | 1000x600 |

### What reading them found

**The channel is legible over the water — decision 2 confirmed in the
render.** `SHEET_PAPER` against the lagoon reads at a glance in all four
levels. Nothing about the corridor is ambiguous.

**The backdrop is full-bleed within the sheet.** Measured rather than
eyeballed, because the sheet's own letterboxing makes this easy to misread:
the corridor occupies screen columns 208..792 in both the baseline and the
new capture — *identical* — which fixes the sheet SVG at 635 px wide for
1000 viewBox units. Centred on x=500 that is 182..817, and the drawn art
measures 180..819. The art therefore covers its sheet edge to edge. The
flat water colour filling the rest of the window is `.cv-play`'s CSS
background, which the design set to `backdrop.quiet` on purpose; it makes
the sheet's edge invisible and the lagoon read as continuous. The sheet's
letterboxing itself is pre-existing and byte-identical on `main`.

**The four-step progression reads as one movement.** Step 3's varied
amplitude is visible as authored: a wide shallow first cycle, a narrower
deeper second. Step 4 reads as the tightest and the only narrowing one.

**The closing reads as a closing.** The duck stands in its lagoon, the
footprints run to it, the bubble says so, the star count moved.

**The overflow is not visible as a defect.** Every corridor exceeds the
drawn quiet band (`[97.6, 499.1]`), but because the band's colour and the
bank above/below are the same authored scene, the corridor crossing into
the reeds reads as a path along the shore, not as a mistake.

### One defect found and fixed — task 4.6

The narrative entry's stage is a square sized on width alone. At 1000x600
the 4% padding leaves 520 of height and the stage claimed its full 620, so
the octopus — anchored to the stage's bottom — lost its lower tentacles
past the viewport edge. Landscape is this app's primary orientation, so the
narrow side has to decide the stage's side. Fixed in `022afdb` by clamping
the side with `84dvh`; re-captured at both sizes. Landscape now clears the
edge by 56 px; portrait tablet renders byte-identically (octopus rows
377..811 before and after).
