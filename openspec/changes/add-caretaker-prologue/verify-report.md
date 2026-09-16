# Verification Report: add-caretaker-prologue

**Mode**: Full artifact set (proposal, design, 4 spec deltas, tasks, apply-progress).
**Verdict**: **FAIL** (1 CRITICAL, 4 WARNING, 2 SUGGESTION)

The implementation is substantively correct and matches `docs/16` verbatim
everywhere checked. The blocking issue is a coverage gap, not a behavioral
defect: three `prologue-opening` scenarios describing `App.tsx`'s routing
COMPOSITION have no runtime-passing test, only source-inspection evidence.

## Command Evidence

| Command | Result |
|---|---|
| `npm test` | **82 files / 1877 tests, 0 failures** (matches orchestrator's claimed final state; note apply-progress/tasks.md recorded 1876 — one more test exists now than either artifact recorded, harmless drift) |
| `npm run build` (`tsc --noEmit && vite build`) | **green**, `dist/` emitted, no type errors |
| `rg 'url\(' client/src` (excluding `url(#`) | zero real usages — every hit is a comment or a `.not.toContain('url(#')` absence-assertion |
| `rg 'signLabel' client/src` | zero field usages — one explanatory comment in `adventures.ts:46` documenting its removal |
| `client/public/art/*.png` count | **87** (matches `REGISTERED.length` in `artManifest.test.ts`) |
| `manifest.json` keys | **87** |

## Completeness (tasks.md, 55 tasks)

Tasks 1.1–5.4 are `[x]` and verified against code (55/55 minus captures). Tasks
5.5–5.10 are marked `[~]` (deferred) in `tasks.md` itself, but the orchestrator's
brief states they were completed out-of-band. Verified directly:

- `capturas/prologo/` contains 13 PNGs (non-zero size, 42–77 KB each): three
  opening plates, four intros (`peces`/`tortugas`/`monos`/`sendero`), five
  closing beats (including `sendero`'s two), and the map — matching the
  6-task capture list (5.6–5.8) exactly.
- **`tasks.md` itself was NOT updated to mark 5.5–5.10 `[x]`** — see WARNING W3.

## Spec Compliance Matrix

### `prologue-opening` (8 requirements / 17 scenarios)

| Requirement | Scenario | Status | Evidence |
|---|---|---|---|
| Single-Responsibility Component | onDone is the only output | PASS (inspection) | `App.tsx:16,130` — only call site passes `{from, onDone}`; `PrologueOpeningProps` (`PrologueOpening.tsx:59-68`) has no other prop |
| | Swapping internal render touches no caller | PASS (inspection + `PrologueOpening.contract.test.tsx`) | one call site only; contract test compiles a stub `({onDone}) => <button onClick={onDone}/>` against the exported prop type |
| Three Plates Verbatim | Lines render in order | PASS | `PrologueOpening.test.tsx:22-27` renders `from:0,1,2`, matches `PROLOGUE_PLATES` lines verbatim (`zoo/prologue.ts:20-24`, matches docs/16 §4) |
| | Tapping last plate ends opening | PASS | `zoo/prologue.test.ts` (`advancePlate(2)===null`) + `PrologueOpening.tsx:91-94` wiring |
| | Caption audit passes on all 3 | PASS | `PrologueOpening.test.tsx:29-34` |
| Skip Control | Present on every plate | PASS | `PrologueOpening.test.tsx:53-68` (sibling-button structural proof) |
| | Skip on plate 1 ends immediately | PASS (via `onDone` wiring) | `PrologueOpening.tsx:108` skip button calls `onDone` directly, no index mutation; asserted structurally, not via a fired click (no DOM test renderer in this harness — consistent with `AdventureIntro.test.tsx`'s own documented constraint) |
| Already-Seen Gate Derived | Empty Records → not seen | PASS | `App.test.tsx:12` `firstVisit({})===true` |
| | Existing record → seen | PASS | `App.test.tsx:16-17` |
| | No new store key | PASS (inspection) | `firstVisit` reads only `Object.keys(records)`; `git diff --stat client/src/game/migrateEntrance.ts` empty (byte-identical) |
| Deep Link Bypasses Opening | Level deep link skips opening on fresh install | **CRITICAL — UNTESTED** | `initialShell()` (`App.tsx:99-107`) composes `initialView` → `prologueRoute` → `firstVisit`, in that order; the ordering is correct BY INSPECTION, but `initialShell` is a private, unexported function with no test anywhere (`rg -ln initialShell client/src` → only `App.tsx`), and no test in the repo renders `<App/>` at all. `initialView`, `prologueRoute`, `firstVisit` are each unit-tested in isolation, but their COMPOSITION — the exact behavior this scenario specifies — is not |
| Dev-Gated Route | Dev route reaches opening even when seen | **CRITICAL — UNTESTED** (same `initialShell` gap) | same as above |
| | Dev route inert outside dev mode | WARNING — partially tested | `prologueRoute(search, false)` returning `null` is tested (`PrologueOpening.test.tsx:78-86`), but the full `initialShell` fallthrough to `firstVisit` after a `null` is not |
| Video Swap Point | No video → plates render | PASS (inspection) | no video source wired anywhere in `PrologueOpening.tsx`; plates are the only render path, exercised by every other passing test |
| | Failed video falls back | N/A — no video wired yet, correctly deferred, nothing to test | — |
| | Video path keeps skip | N/A — same | — |
| No `url(#…)` | Zero occurrences | PASS | `PrologueOpening.test.tsx:37-41` + repo-wide grep above |

### `zoo-map` (6 requirements / 18 scenarios)

| Requirement | Scenario | Status | Evidence |
|---|---|---|---|
| Entrance/Night Backdrops Re-Keyed | `backdropFor` resolves 4 new ids | PASS | `zoo/backdrops.test.ts:551-560` |
| | night unaffected | PASS | `zoo/backdrops.test.ts` (pre-existing night assertions, untouched) |
| | night `brightest` still own file | PASS | pre-existing assertion, untouched |
| Adventure Ids Regroup | Union of 4 rows = original 8 | PASS | `zoo/adventures.test.ts` new describe block (task 4.3) |
| | Per-family order survives | PASS | same block, `glass*`/`sand*` filtered separately |
| | `introLevel('glass3'/'sand3')` → monos/sendero | PASS | `zoo/adventures.test.ts:229-230` |
| | `closingLevel` resolves all 4 last levels | PASS | `zoo/adventures.test.ts` (task 4.2) |
| Script Verbatim | intro lines match docs/16 §9 | PASS | `zoo/adventures.test.ts:80-83`, verified verbatim against `docs/16_PROLOGO_EL_CUIDADOR.md:257-260` |
| | closing line + sign art match | PASS | `zoo/adventures.test.ts:85-96` |
| | caption audit on 3 sign closings | **WARNING — indirect only** | `AdventureClosing.test.tsx` audits `sendero`'s 2 beats and one synthetic fixture beat, proving the component generic over any `{line,art}` beat — but no test directly renders `peces`/`tortugas`/`monos`'s own closing beat through `auditCaptions`. Structurally low-risk (same shape, same component) but not the literal scenario evidence |
| closingBeat Ordered List | peces/tortugas/monos = 1 beat | PASS | `client/src/zoo/adventures.ts:141-176` (source) + implied by `adventures.test.ts` length assertions |
| | sendero = 2 beats, in order | PASS | `GameScreen.test.tsx:416,436` (`.beat` probes at index 0/1) |
| | magnifier line carried verbatim | PASS (inspection) | `adventures.ts:198` line matches pre-existing text |
| | no other adventure gains closingBeat | PASS | `zoo/adventures.test.ts` (task 4.1/4.2 unaffected rows) |
| entrada Order/Narrative | 8 ids, per-family order preserved | PASS | `zoo/sectors.test.ts:245-256` |
| | narrative order = glass1,glass2,sand1,sand2,glass3,glass4,sand3,sand4 | PASS | `zoo/sectors.test.ts:271-...` walks `nextAdventure` from `{}` |
| isFiled(sand4) unlocks estanque | Filing sand4 opens estanque | PASS | `zoo/sectors.test.ts:258-261` (`filed('sand4')` in the always-true loop; pre-existing "Estanque" describe untouched) |
| | `unlockedWhen` byte-identical | PASS (inspection) | `sectors.ts:413` `isFiled(records,'sand4')`, unchanged |

### `main-screen` (4 requirements / 14 scenarios)

| Requirement | Scenario | Status | Evidence |
|---|---|---|---|
| close/resolveCloseAction widened | 4 ids resolve to close | PASS | `GameScreen.test.tsx:349` loop over `glass2,sand2,glass4,sand4` |
| | night4 still doesn't | PASS | `GameScreen.test.tsx:360` |
| | mid-adventure levels don't | PASS | `GameScreen.test.tsx:365,371` |
| | reducer switch unaffected | PASS (inspection) | `nextView` switch untouched — no diff on that function |
| AdventureClosing renders beats | single-beat unaffected | PASS | `AdventureClosing.test.tsx:60-64` (peces, standing octopus) |
| | sendero 2-beat sequence advances then continues | PASS | `GameScreen.test.tsx:416-465` beat probes + `advanceClosing` table (`:506-520`) |
| | caption audit per beat in sequence | PASS | `AdventureClosing.test.tsx:76-83` |
| | AdventureIntro unaffected (byte-identical) | WARNING — file-level only | `AdventureIntro.tsx` absent from `git status` diff (confirmed untouched); no runtime before/after render-diff test exists, nor is one needed since the file itself never changed |
| | advancing past closing → `{at:'map'}` | PASS (inspection) | `onContinue` → `advanceClosing` `{type:'exit'}` → `onExit()` → `App.tsx`'s `goToMap` → `{at:'map'}` |
| | replaying last level replays full closing | WARNING — scenario names `glass4`/`monos`, test uses `sand4` | `GameScreen.test.tsx:375-381` tests `sand4` replay, not `glass4` as the spec's GIVEN clause names; functionally equivalent (pure, generic function) but not the literal case specified |
| Opening reuses AdventureIntro shape | file untouched | PASS | confirmed via git status (not in modified list) |
| | rendered output unaffected for existing adventure | PASS (by the same file-unchanged fact) | — |
| GameView gains no member | 5 variants only | PASS | `GameScreen.tsx:29-34` (`map,play,intro,deduce,close`) |
| | exhaustiveness guard | PASS | `GameScreen.test.tsx:487-497` `GAME_VIEW_VARIANTS` record, fails `tsc` on a 6th |

### `trace-canvas` (2 requirements / 5 scenarios)

| Requirement | Scenario | Status | Evidence |
|---|---|---|---|
| 55-luma law for monos/sendero | clears vs ink | PASS | `zoo/backdrops.test.ts:157-...` loop covers all 5 `REVEAL_BACKDROPS` incl. monos/sendero |
| | clears vs paper | PASS | `zoo/backdrops.test.ts:163-166` |
| | literals measured from manifest, not guessed | PASS (inspection) | `backdrops.ts:179-191` uses `quiet:'#c9d3b8'`/`'#d5c8b0'` matching `manifest.json`'s own `sector-monkeys-background`/`sector-path-background` entries exactly |
| Completeness guard extends automatically | 4 keys covered | PASS | `zoo/backdrops.test.ts` "union of the five groups equals every registered backdrop" (pre-existing test, now covering the re-keyed set with zero code change) |
| | unrouted row still fails | PASS (inspection) | guard logic unchanged, generic over `Object.keys(ADVENTURE_BACKDROP)` |

**Totals**: 20 requirements / 54 scenarios counted directly from the four spec
files (tasks.md's own header says "53" — off by one, cosmetic, see S2).

## Structural Spec-Delta Check (`docs/00` §5 house defect)

No orphaned `## ADDED`/`## MODIFIED` sections, and every one of the 20
requirements across all four deltas has at least one `#### Scenario:` —
confirmed by direct `awk` pass counting scenarios per requirement header in
each file. Clean.

## Other Verified Facts (from the task brief)

- `REGISTERED.length === 87`, `client/public/art/` holds 87 PNGs, and all
  six new sources pass all four registration points (`AUTHORED_SOURCE_SIZES`,
  `SINGLES`/`PASSTHROUGHS`, `assets.ts`, `artManifest.test.ts`'s `REGISTERED`
  array) — confirmed by direct inspection of `build_art.py` and `assets.ts`.
- Zero `url(#…)` anywhere in `client/src` — confirmed.
- Eight level ids unchanged as a set, per-family order preserved, narrative
  order `glass1,glass2,sand1,sand2,glass3,glass4,sand3,sand4` — confirmed.
- `isFiled('sand4')` still unlocks `estanque`; `entrada.unlockedWhen` always
  true — confirmed.
- `GameView` gained no new member (`close.beat?` is optional) — confirmed.
- No new persisted localStorage key; `migrateEntrance.ts` byte-identical
  (empty git diff) — confirmed.
- `ClosingBeat` has no `signLabel` anywhere in `client/src` or the OpenSpec
  artifacts (only an explanatory comment documenting its removal) —
  confirmed.
- `PrologueOpeningProps` is exactly `{ from?, onDone }`; only one caller
  (`App.tsx:130`) and it uses only those two props — confirmed.
- The three post-apply fixes described in the brief (skip control styling
  fixed and moved bottom-right with `container-type: inline-size`; entrance
  icons switched from `SIGN_ART.*`/`ZOO_OCTOPUS_PRINT_ART` to
  `SECTOR_ADVENTURE_ART.{chest,stone,leaf}`/`CART_ART`; docs/16 §9 script
  verbatim guard added to `adventures.test.ts`) are all present in the
  current source exactly as described.

## Issues

### CRITICAL

1. **Three `prologue-opening` scenarios describing `App.tsx`'s routing
   composition have no runtime-passing test.** `initialShell()`
   (`App.tsx:99-107`) is the only place that orders `initialView` →
   `prologueRoute` → `firstVisit`, which is exactly what "A level deep link
   skips the opening even on a fresh install" and "The dev route reaches the
   opening even when already seen" require. `initialShell` is private,
   unexported, and no test in the repository renders `<App/>` or otherwise
   exercises this composition — each ingredient function is well-tested in
   isolation, but their ordering is proven only by reading the source. Per
   this phase's own hard rule, a spec scenario is compliant only when a
   covering test passes at runtime; these three do not have one. The code
   reads as correct, but this is exactly the kind of composition bug (wrong
   branch order, an early return that short-circuits the wrong way) a test
   would catch and inspection can miss.
   **Recommendation**: export `initialShell` (or an equivalent pure
   `resolveShell(search, dev, records)`) and add the three scenarios as
   direct unit tests, mirroring the pattern already used for `initialView`.

### WARNING

2. **`tasks.md` was not updated to reflect that tasks 5.5–5.10 are done.**
   The task brief states the orchestrator completed the capture pass and
   made three post-apply fixes after reviewing it, but `tasks.md` itself
   still shows those six tasks as `[~]` (deferred), and `apply-progress.md`
   still describes them as pending on the orchestrator. A later reader of
   `tasks.md` alone (including a future `sdd-archive` pass) will see an
   inaccurate state. This is a paperwork gap, not a functional one — the
   captures and fixes are verifiably present in the working tree.
3. **`zoo-map`'s "Every closing beat's text passes the caption audit"
   scenario is only indirectly covered** for `peces`/`tortugas`/`monos`. The
   direct test coverage is `sendero`'s two beats plus one synthetic fixture
   beat in `AdventureClosing.test.tsx`, proving the component is generic
   over any `{line, art}` shape — a reasonable transitive proof, since
   `peces`/`tortugas`/`monos`'s beats share that exact shape — but not the
   literal scenario (rendering those three adventures' own beats and
   auditing them).
4. **`main-screen`'s "Replaying any entrance adventure's last level replays
   its full closing" scenario names `glass4`/`monos` in its GIVEN clause;
   the covering test (`GameScreen.test.tsx:375-381`) exercises `sand4`
   instead.** `resolveCloseAction` is pure and generic across all four ids
   (already proven by the four-way loop test above), so this is very
   unlikely to hide a real defect, but it is not the literal case the
   scenario specifies.

### SUGGESTION

5. `tasks.md`'s binding-inputs header states "20 requirements / 53
   scenarios"; a direct count across the four shipped spec files totals 54
   scenarios (one more than recorded). Cosmetic drift, worth a one-line fix
   next time `tasks.md` is touched.
6. `apply-progress.md` and `tasks.md` both record the final full-suite count
   as "82 files / 1876 tests"; the actual current count is 1877. Harmless —
   evidently one test was added after those documents were last written —
   but worth noting so nobody chases a phantom off-by-one later.

## Verdict

**FAIL** — one CRITICAL coverage gap (composition-level routing scenarios
in `prologue-opening` untested at runtime). Everything else — all four spec
deltas' remaining 51 scenarios, the art registration pipeline, the
level-id/backdrop/closingBeat data model, the `GameView`/`signLabel`
non-regression guards, and the full test/build gates — is verified PASS.
Recommend returning to `sdd-apply` to add the three missing composition
tests (or export `initialShell` for direct testing) before archiving.
