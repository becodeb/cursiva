# Apply Progress: nivel3-agua-medusa

Scope of this pass: **Phase 1 only (S1 — world/case predicate split)**, per an
explicit parent-orchestrator scope fence. Phases 2-8 are untouched and remain
`[ ]` in `tasks.md`.

## Completed Tasks

- [x] 1.1 Created `client/src/levels/world.ts` — `isCaseTrail(level)` and
  `inDetectiveWorld(level)`, both pure, no React/`detective/` import.
- [x] 1.2 Added `detectiveWorld?: boolean` to `LevelConfig`
  (`client/src/levels/types.ts`).
- [x] 1.3 Created `client/src/levels/world.test.ts` — six tests: the four
  truth-table fixtures, the widening invariant, and a regression guard over
  every level in `LEVELS` (asserts `detectiveWorld` is falsy on every shipped
  level today, and `inDetectiveWorld(l) === isCaseTrail(l)` for all of them —
  the exact equality that proves this slice is behaviour-neutral).
- [x] 1.4 Audit task — see **Reconciled Enumeration** below. A real
  discrepancy was found in design.md's own prose count; reported, not
  silently followed either direction.
- [x] 1.5 Converted all 26 `LevelPlay.tsx` conversion sites (see enumeration):
  3 groups (4 lines) → `isCase`, the rest (22 lines) → `inWorld`. Deleted the
  `isDetectiveTrail` definition at the old `:633`.
- [x] 1.6 Updated stale prose in `client/src/levels/catalog.ts:162` and
  `client/src/detective/palette.test.ts:260`. **`docs/03:131` deliberately
  NOT touched** — see Deviations below.
- [x] 1.7 Added a `makeWorldOnlyLevel()` fixture (`detectiveWorld: true,
  clue: undefined`) and a world-only assertion in all eight named suites
  (by content, since line numbers shifted as tests were inserted
  top-to-bottom): chrome branch, magnifying glass, icon controls, PISTAS
  rail presence, `clues` prop, `ground`, octopus/lamp, mud ink. Six of the
  eight got a wholly new `it` block; the `clues`-prop and `ground` suites
  already had an existing `it` structured to compare an ordinary level
  against the gated behaviour in one place, so the world-only case was added
  as a third `render()` call inside that SAME `it` rather than duplicating
  the whole test shape — same assertion coverage, fewer new test names.
- [x] 1.8 `npm test` and `npm run build` green — see Work Unit Evidence.

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `client/src/levels/world.ts` | Created | `isCaseTrail` / `inDetectiveWorld`, pure predicates (26 lines). |
| `client/src/levels/world.test.ts` | Created | 6 tests: truth table, widening invariant, catalog regression guard. |
| `client/src/levels/types.ts` | Modified | Added `detectiveWorld?: boolean` to `LevelConfig`, documented. |
| `client/src/screen/LevelPlay.tsx` | Modified | Deleted `isDetectiveTrail`; added `isCase`/`inWorld` derived from `world.ts`; converted all 26 conversion sites; updated 3 comment blocks that named the old identifier. |
| `client/src/screen/LevelPlay.test.tsx` | Modified | Added `makeWorldOnlyLevel()` helper and 8 new `it` blocks (one per named suite), asserting world-only behaviour without a case trail. |
| `client/src/levels/catalog.ts` | Modified | Comment at old `:162` renamed `isDetectiveTrail` → `inDetectiveWorld`. |
| `client/src/detective/palette.test.ts` | Modified | Comment at old `:260` renamed `isDetectiveTrail` → `inDetectiveWorld(level)` / `isCaseTrail`. |

## Reconciled Enumeration (Task 1.4)

Ran `rg -n "isDetectiveTrail" client/src` and `rg -n "clueDef"
client/src/screen/LevelPlay.tsx` before any edit, then reconciled against
design.md §1's table line by line.

**Result: the design table's line numbers are correct and match the grep
exactly** — 26 raw code lines convert (plus the definition line, deleted),
split 4 lines → `isCaseTrail` (3 behaviour groups: lamp latch `:949,:977`,
`PistasRail` mount `:1162`, `endArt` lamp `:1234`) and 22 lines →
`inDetectiveWorld` (16 behaviour groups). The 6 `clueDef` consumers
(`:635`, `:862`, `:1004`, `:1065`, `:1119`, `:1281`) needed no change, exactly
as the design predicted.

**Discrepancy found, reported per the task's instruction "if your grep and
the table disagree, the table is wrong":** design.md's own PROSE at line 108
says "Three case, seventeen world," and tasks.md 1.4 says "24 renamed sites
(3 → isCaseTrail ... 17 → inDetectiveWorld)." Counting the design table's ROWS
(not raw line numbers) gives 3 `isCaseTrail` rows and **16** `inDetectiveWorld`
rows (19 total), not 17/24. The row list, counted directly from the table:
ground scatter, back control, `<h1>`, hint, rotate prompt, `startArt`, arrow
suppression, carrier rest offset, `carrierArt`, `inkOnly`, `MUD_INK`/`_DIM`,
result block, "Borrar", "Ver de nuevo", "Ver la guía" suppression, "Siguiente"
— 16 rows. The table's own LINE-NUMBER content is internally consistent and
matches the live code exactly; only its own summary prose ("seventeen") and
tasks.md's derived count ("24") undercount/miscount by conflating rows with
raw line numbers. This is a documentation-only discrepancy in design.md/tasks.md,
not a code defect — no site was missed and no site was over-converted. Verified
by `rg -n "isDetectiveTrail" client/src` post-edit returning ONLY the two
historical-prose comment references (`world.ts`'s own doc comment quoting the
old name, and `catalog.ts`) — zero live code references remain.

## Deviations from Design

1. **`docs/03:131` intentionally NOT edited**, though tasks.md 1.6 calls for
   it. The parent orchestrator's launch prompt for this apply pass set an
   explicit scope fence: "Do not touch `docs/`." I made the edit once (a
   one-line prose rename, matching the task), then reverted it via `git
   checkout -- docs/03_SISTEMA_PROGRESION_Y_DESAFIOS.md` on recognizing the
   fence overrides the task instruction for this pass. `docs/03:131` still
   reads `isDetectiveTrail` in prose; this is the one open line item against
   task 1.6, left for a docs-scoped pass (Phase 8 already covers `docs/04`
   and `docs/09` — `docs/03:131` can ride with it, or a dedicated docs slice).
2. Everything else matches design.md exactly — no other deviation.

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test -- world LevelPlay` → 2 files, 46 tests, all passed |
| Full suite | `npm test` → 59 files, 1085 tests, all passed (baseline 58/1073 + 1 new file `world.test.ts` (6 tests) + 6 new `it`s across `LevelPlay.test.tsx`'s 8 named suites = 12 new tests; 1073+12=1085 ✓, 58+1=59 ✓) |
| Build | `npm run build` (`tsc --noEmit && vite build`) → 0 TypeScript errors (confirms no `noUnusedLocals` orphans from removing `isDetectiveTrail`), build succeeded in 396-408ms across two runs |
| Runtime harness command/scenario and exact result | DOM-dump neutrality proof (below) — real dev-server render, not a synthetic probe |
| Rollback boundary | Revert `client/src/levels/world.ts`, `world.test.ts` (delete, new files); revert `LevelPlay.tsx`, `LevelPlay.test.tsx`, `types.ts`, `catalog.ts`, `palette.test.ts` hunks (all additive/rename-only, no other logic touched). Collapses `isCaseTrail`/`inDetectiveWorld` back to nothing; behaviour-neutral either direction while no level sets `detectiveWorld`. |

## Neutrality Evidence (mandatory for this slice)

Dev server was already running on `http://localhost:5174`. Compared two
URLs — a case trail (`?nivel=duck-trail1`) and an ordinary Fase 2 level
(`?nivel=f2-guirnalda&dev=1`) — before and after the code change, two ways:

1. **PNG screenshots** (`scripts/shot.sh`, 1280×900): `duck-trail1` came back
   **byte-for-byte identical** (`cmp` exit 0) before vs. after. `f2-guirnalda`
   came back with a small byte diff — investigated and found to be **capture
   noise, not a render change**: two consecutive POST-change screenshots of
   the exact same URL, with zero code change between them, already differ by
   bytes (confirmed via `cmp`). This is timing/compositor jitter under
   `--disable-gpu` headless capture (the `&dev=1` overlay likely animates),
   not a regression.
2. **DOM dumps** (`chromium --headless --dump-dom`, deterministic — confirmed
   by two dumps of the same unchanged URL diffing to zero): captured a
   genuine "before" state by `git stash -u`, dumping both URLs, then `git
   stash pop` to restore the change and dumping again. Diffing before vs.
   after: **both URLs are identical except for Vite's HMR cache-busting query
   string on the `<script src="/src/main.tsx?t=...">` tag** — every other
   byte of markup (chrome text, PISTAS rail, ground scatter, ink colours,
   button labels, everything) is unchanged. This is the rigorous proof the
   screenshot noise could not provide on its own.

Conclusion: **S1 is confirmed behaviour-neutral** for both a case trail and
an ordinary level, matching the design's stated invariant that
`inDetectiveWorld ≡ isCaseTrail` while no level sets `detectiveWorld`.

## Status

8/8 Phase 1 tasks complete (1 partial: 1.6's `docs/03:131` line deferred per
scope fence — see Deviations). Phases 2-8 remain untouched. Ready for the
next apply batch (Phase 2, S2) or for `sdd-verify` to review S1 alone if the
orchestrator wants it audited before continuing.
