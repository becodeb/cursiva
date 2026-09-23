# Adventure flow, map guidance and story clarity

Feature document (ODD). Engram mirror: topic `odd/adventure-flow-and-map-guidance/tasks`, project `cursiva`.
Product-facing diagnosis, pedagogy and story proposal: `docs/18_DIAGNOSTICO_Y_REDISENO_PEDAGOGICO.md`.

## Objective

Make the zoo loop understandable and pleasant for a first grader (6–7 years old, mostly a non-reader):
play an adventure start to finish without detours, always know where to go next on the map, never
see the same level twice in a row, and understand why each trail is traced (you are following a
missing animal to bring it home).

## Problem (observed 2026-09-22, real Chromium, 1280x720 / 1024x768 / 844x390)

1. Every finished level returns to the map (`resolveNextAction` exits for any sector level), so a
   4-level adventure costs 4 round trips to the same map with the same bubble.
2. The entrance plays the same erase gesture on the same picture twice per enclosure
   (`glass1`/`glass2`, `sand1`/`sand2`, `glass3`/`glass4`, `sand3`/`sand4`).
3. Finishing an erase/light level shrinks the play sheet (592 → 522 px tall at 1280x720) because
   `.cv-result` only mounts after the attempt.
4. The map bubble covers the top of the map, is clipped off-screen at 844x390, and repeats the
   same line on every visit; nothing marks the one place to go next.
5. The in-level enclosure sign floats over the art (and over fog tiles the child must clear).
6. PISTAS reads as an abstract word + a light bulb; the clues lead to nothing; recovering an animal
   has no on-screen moment.
7. The intro and prologue screens still carry the 8 px UA body margin (page scrolls 16 px).
8. The mud path (`sand3`/`sand4`) says "¡Vidrio limpio!" on success.

## Scope (authorized by the user on 2026-09-22: "probala y arreglá las cosas que ves que andan mal… empezá a implementar dejando documentado")

In: flow routing, entrance play order, level layout, map guidance, sign placement, progress bar,
voice narration, rescue closings built from existing registry copy, documentation and art requests.

Out: new art (placeholders + written requests only), backend, deduction semantics, destructive
progress cleanup, deleting catalog level ids (they are persisted keys), push / PR / merge
(user decision), OpenSpec main-spec repair (U15.1, deferred by the user).

## Constraints

- Level ids are persisted keys: never delete a catalog id; only change play order.
- No `<mask>`, `url(#…)`, `clipPath` in SVG (device scar, see `TraceCanvas.tsx` header).
- Tests run in node without DOM (`renderToString`); new logic goes into pure exported functions.
- `tsc --noEmit` type-checks tests: renaming union members breaks literal assertions.
- Child-facing copy is Rioplatense Spanish (voseo), as in the existing registry.
- Every change keeps `npm test` and `npm run build` green; `git diff --check` clean.
- Commits: Conventional Commits, no AI attribution, no model identifiers.

## Mode and checks

- TDD: **off** — source `openspec/config.yaml` (`strict_tdd: false`, `tdd: false`). Ordinary checks
  still run per task.
- Unit runner: `npm test` (vitest 4, node env) from the repo root.
- Build/type check: `npm run build` (`tsc --noEmit && vite build`).
- Visual QA: Playwright driving system Chromium (`executablePath: /usr/bin/chromium`) against the
  dev server on `:5178`; scratch drivers live in `/tmp/cursiva-qa/` (not in the repo); evidence
  PNGs in `capturas/2026-09-22-*` (git-ignored).
- Receipt-driven review: was on by default; **turned off globally by the user on 2026-09-23**
  (`gentle-ai review mode status` → `off (decided by global)`). Two consent envelopes that were
  pending at that moment (lineages `review-4545fc3c7d4c6f49`, `review-3bec09516721c09f`) are moot
  and were never answered. From then on the verification gate's off path applies: after each
  writer, `gentle-ai review assess --cwd . --json` over the diff decides the tier (passive →
  structural readback; medium → writer self-verification + parent spot check; high →
  plus an independent verifier).

## Delivery

- Branch: `feat/adventure-flow-and-map-guidance` from local `main` at `9040d34` (which is 3 commits
  ahead of `origin/main`: the leaves slice, still awaiting push authorization).
- Forecast: ~2,200 authored changed lines (above the 400-line budget).
- Strategy: `ask-on-risk`. The chain strategy (`stacked-to-main` vs `feature-branch-chain`) only
  matters when PRs are opened; no PR is opened in this session, so the question is deferred to
  delivery time. Slice boundaries are recorded per commit below.

## Tasks

Route legend: inline = done by the orchestrator; delegated = one bounded writer agent.

- [x] **T0 — Diagnosis and redesign doc.** `docs/18_…` (diagnosis with evidence, pedagogy,
      story proposal, UX plan, art requests, status) + `docs/00` index row. Route: inline (single
      doc, needs the QA context).
- [x] **T1 — One level per entrance enclosure.** Play order `glass1, sand1, glass3, sand3`;
      closings, estanque gate, backpack grant and migrations follow; ids stay in the catalog.
      Route: delegated (touches `zoo/adventures.ts`, `zoo/sectors.ts`, `zoo/backpack.ts`,
      `game/openProgressStore.ts` + tests; 4+ files).
- [x] **T2 — Continuous adventure flow.** Finishing a non-final level of an adventure goes straight
      to its next level; the map only after the last level (and its closing). Levels of a sector
      not covered by an adventure row (medusa `f2-*`) continue through their contiguous block.
      Route: delegated with T1 (same writer; landed in the same commit because the tests of both
      halves share files and each half alone is red). Amendment (done, `a2caf27`): an adventure that
      recovers no animal chains into the next adventure of its sector (prologue enclosures flow
      peces → tortugas → monos → sendero without the map; night → hedgehog).
- [x] **T3 — Stable level layout.** Reserve the result row from the first render (no sheet
      shrink), global margin reset (intro/prologue), mud success copy, pulsing enabled "Siguiente".
      Route: delegated.
- [x] **T4 — Map guidance.** Dim everything except the next destination (even-odd path, no
      mask), pulsing ring + play badge on it, bubble never over the target and never clipped,
      dismissible and re-openable by tapping the Pulpito, stage centred vertically, dev reset out
      of the HUD, finished sector replays from its first level. Route: delegated.
- [x] **T5 — Enclosure sign out of the art.** The sign moves to the header row, never over the
      sheet. Route: delegated (with T3 or T6).
- [x] **T6 — Progress bar instead of PISTAS.** One slot per level of the adventure, the found item
      (clue art or a star) fills it, the animal's silhouette at the end colours in when rescued;
      the trail's goal shows the item instead of the light bulb when feasible. Route: delegated.
- [ ] **T7 — Voice narration.** Speech synthesis (es-AR → es-419 → es) for prologue, intro,
      closing, map bubble and level hints; speaker button; persisted mute; clip registry for
      future recorded audio. Route: delegated.
- [x] **T8 — Rescue closings.** Closing beat per animal adventure using the registry's existing
      `closing` lines and the animal art. (The peces intro keeps its chest: an entry icon must
      never name the absent animal — `docs/17` §1.) Route: delegated.
- [ ] **T9 — Visual QA and doc status.** Full Playwright walkthrough at 1280x720, 1024x768,
      844x390 (+ portrait guidance), evidence in `capturas/2026-09-22-despues/`, update `docs/18`
      status table. Route: inline.

## Acceptance criteria

- A child who taps the highlighted place on the map plays a whole adventure without seeing the map
  until its end (except by pressing "Volver").
- The entrance is 4 cleaning levels, one per enclosure, each followed by its closing beat.
- The play sheet's bounding box is identical before and after an erase level resolves.
- On the map exactly one place is highlighted (when there is work to do); the bubble never
  intersects its hit rect and is fully on-screen at 844x390, 1024x768 and 1280x720.
- No sign or bar overlaps the play sheet.
- `npm test`, `npm run build`, `git diff --check` green at every commit.

## Progress and evidence

- 2026-09-22: diagnosis done (see `docs/18` §2). Before-evidence in
  `capturas/2026-09-22-diagnostico/` (13 PNGs). Measured: glass1 sheet 1252x592 → 1252x522 after
  success at 1280x720; map bubble top at y=-33 px at 844x390.

| Task | Commit | Route | Checks | Review assess |
|------|--------|-------|--------|---------------|
| T0 | `7e50091` | inline (single doc, QA context lives in the orchestrator) | `git diff --check` clean | passive (`non_executable_only`), no review; boundary → `7e50091` |
| T1+T2 | `99dd8ad` | delegated (mapping trigger: 12 files) | `npm test` 82 files / 1945 tests; `npm run build` ok; `git diff --check` ok (writer + parent spot check) | medium (`executable_change` `migrateEntrance.ts`, a comment-only edit), review due → consent relayed, then RDD disabled by the user: no review |
| T2 amendment | `a2caf27` | delegated (fresh writer; the first one refused the amendment as a possible injection) | `npm test` 82 / 1953; build ok; journey QA: prologue plays 4 levels with no map trips | covered by the same moot consent; RDD off |
| T3+T5 | `caa1b00` | delegated (preparation trigger: LevelPlay 2300+ lines) + one inline CSS fix | `npm test` 82 / 1963; build ok; browser QA at 1280x720/1024x768/844x390: sheet 1252x592 / 996x640 / 824x282 identical before and after success, sign in the back-button row never over the sheet or the button, pill "✓ ¡Vidrio limpio!", "¡Sendero limpio!" on sand3, `cv-next-ready` after success, intro scroll = viewport | RDD off; assess medium (`client/index.html`) → writer self-verification + parent QA |
| T4 | `c4296a2` | delegated (mapping trigger: ZooMap, sectors, adventures, App + new journey module) + two inline CSS fixes (inline svg made the stage 1200x726; HUD portraits drawn over the montañas) | `npm test` 83 / 1983; build ok; browser QA over 10 progress states × 3 viewports: spotlight target follows the journey order, bubble never over the target and always on-screen, stage exactly 5:3 and centred | RDD off; assess medium (`client/src/App.tsx`, with the two new files declared) → writer self-verification + parent QA |
| T8 | `3a25097` | delegated (same writer as T4, resumed with the brief) | `npm test` 83 / 2000; build ok; browser: rescue closings for duck/sheep/hedgehog show the animal + 6 stars, night closes with the flashlight; after the bee the map bubble says the onward line (no stale duck rescue) | RDD off; assess medium → writer self-verification + parent QA |
| T6 | `68663c6` | delegated (same writer as T3/T5, resumed with the brief) | `npm test` 85 / 2016; build ok; browser at 3 viewports × 11 levels: bar centred in the back-button row, never over the sheet or the button; duck sheet 1252x508 → 1252x592; labels "Camino hacia el pato: N de 4"; finishes: clue art (duck 1–3), star (other non-last trails), the animal (last trail) | RDD off; assess medium → writer self-verification + parent QA |

- 2026-09-23: journey QA on `99dd8ad` from an empty store (1280x720): levels played between map
  visits `[0,1,1,1,1,4,4]` — the duck and the sheep now play 4 levels straight; the prologue still
  returns to the map after each enclosure (amendment above). Found: after the sheep the map bubble
  says "¡Encontramos al pato!" because `mapBubble` follows `recentlyDiscovered`, whose fallback picks
  the first open sector in registry order (estanque) — fixed by T4's journey order + T8's closings.

## Next step

T7 (voice narration) in progress; then T9 (full QA, after-captures, docs/18 status).

T6 notes: `PistasRail` stays only for `Deduction.tsx` (the hen's case summary); the unreachable hen
trails `trail1..4` no longer show a bar (no adventure row). On `duck-trail4` the finish shows the duck
(the encounter) rather than its feather clue.

Found in T4 QA and handed to T8: with the spotlight on the estanque after the bee, `mapBubble` still
announced "¡Encontramos al pato!" (stale news). Still open after T4: the bubble can cover a
recovered animal standing in a non-target sector (it auto-hides after 10 s and can be dismissed);
the map's hedgehog is drawn very large over the nocturna scene (registry size 90) — recorded for
docs/18.

Lesson from T3/T5: the first pass put the sign in its own row and reserved the result row, which
fixed the shrink but cost the sheet 154 px (987x592 → 730x438 drawing at 1280x720). Browser
measurement caught it; unit tests could not. Identity chrome goes in the back-button row and
transient messages overlay the sheet.
