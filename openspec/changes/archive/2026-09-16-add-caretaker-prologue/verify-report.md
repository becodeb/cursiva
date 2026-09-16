# Verification Report: add-caretaker-prologue

**Mode**: Full artifact set (proposal, design, 4 spec deltas, tasks, apply-progress) — re-run after remediation.
**Verdict**: **PASS WITH WARNINGS** (0 CRITICAL, 1 WARNING, 0 SUGGESTION)

## Previous pass (FAIL: 1 CRITICAL, 4 WARNING, 2 SUGGESTION)

| # | Finding | Resolution this pass |
|---|---|---|
| CRITICAL | Three `prologue-opening` scenarios describing `App.tsx`'s routing composition (`initialShell`) had no runtime test — only source inspection. | **FIXED.** `App.tsx` now exports pure `resolveShell(search, dev, records): Shell`; `initialShell()` is the thin impure wrapper. `App.test.tsx`'s new `describe('resolveShell …')` block directly asserts the three scenarios by name: deep link beats the opening (`?nivel=glass1`, `?nivel=intro-glass1`, both on a fresh install), the dev route beats the already-seen gate (`?nivel=apertura`/`:2` with `played` records), the dev route is inert outside dev mode (falls through to the gate), and with nothing asked for the gate alone decides. Verified passing at runtime. |
| WARNING | `tasks.md` still marked 5.5–5.10 `[~]` despite the orchestrator's out-of-band completion. | **FIXED.** All of 5.5–5.10 are now `[x]`, with a new "Phase 5 closeout" section documenting the three defects the capture review found and how 5.10 fixed them. |
| WARNING | `zoo-map`'s caption-audit scenario for `peces`/`tortugas`/`monos` covered only transitively (via `sendero` + a synthetic fixture). | **FIXED.** `AdventureClosing.test.tsx` gained a dedicated test iterating `['peces','tortugas','monos']`, rendering each adventure's own `closingBeat`, and asserting `auditCaptions` is clean plus `art.href` present and no `url(#` — the literal scenario, not an inference. |
| WARNING | `main-screen`'s "replaying the last level replays its full closing" scenario names `glass4`/`monos`; the covering test used `sand4`. | **STILL OPEN** — see below, restated. |
| SUGGESTION | `tasks.md` header said "53 scenarios"; actual count is 54. | **FIXED.** Header now reads "20 requirements / 54 scenarios", matching the direct count. |
| SUGGESTION | `apply-progress.md`/`tasks.md` recorded "1876 tests" vs. the actual 1877 at verify time. | **Superseded, not chased.** `tasks.md`'s new closeout section records the true final count (82 files / 1882 tests) as the authoritative final gate; `apply-progress.md` is a point-in-time record of an earlier phase and is expected to lag — not worth editing after the fact. |

## Command Evidence (run independently this pass)

| Command | Result |
|---|---|
| `npm test` | **82 files / 1882 tests, 0 failures** — matches the orchestrator's claimed final state and `tasks.md`'s closeout section. |
| `npm run build` (`tsc --noEmit && vite build`) | **green**, `dist/` emitted, no type errors (one pre-existing chunk-size advisory, unrelated to this change). |

## Re-checked regressions (all confirmed unchanged)

- `REGISTERED.length === 87` and 87 PNGs in `client/public/art/` — confirmed.
- Zero real `url(#` usage in `client/src` — every hit is a comment or a `.not.toContain('url(#')` absence-assertion — confirmed by direct grep.
- Zero `signLabel` field usage — one explanatory comment in `zoo/adventures.ts:46` documenting its deliberate absence — confirmed.
- `GameView` gained no new member: still exactly 5 variants (`map, play, intro, deduce, close`); `close` only gained an optional `beat?` field — confirmed at `GameScreen.tsx:29-34`.
- No new persisted key: `git diff --stat 88d9d06 HEAD -- client/src/game/migrateEntrance.ts` is empty (byte-identical) — confirmed.
- Eight level ids unchanged as a set, per-family order intact, and `entrada.adventureIds` carries the narrative play order `glass1, glass2, sand1, sand2, glass3, glass4, sand3, sand4` — confirmed directly in `zoo/sectors.ts:347`.
- `isFiled('sand4')` still unlocks `estanque` (`sectors.ts:413`, `unlockedWhen: (records) => isFiled(records, 'sand4')`) — confirmed unchanged.
- `docs/00_ESTADO_DEL_PROYECTO.md`/`docs/13_AVENTURAS_POR_ANIMAL.md` no longer describe the entrance as two adventures; `docs/17_PEDIDOS_DE_ARTE_PROLOGO.md` exists — confirmed.

## Commit audit (`git log --stat 88d9d06..HEAD`, 4 commits)

| Commit | Message claims | Actual diff | Match |
|---|---|---|---|
| `feat(art): register the prologue's six placeholder assets` | New placeholder generator + 6 registered assets | `scripts/art/make_placeholders.py` (new), `build_art.py` (+22), 6 new `art-source/*.png` + 6 new `client/public/art/*.png`, `manifest.json`, `assets.ts`, `artHierarchy.test.ts`, `artManifest.test.ts` | Match — no unrelated files. |
| `feat(zoo): split the entrance into four narrated enclosures` | 4 enclosures, script verbatim, interleaved `adventureIds`, non-empty-tuple `closingBeat` | `zoo/adventures.ts`, `backdrops.ts`, `sectors.ts` + their tests, `zoo/prologue.ts` (new) + test | Match — `prologue.ts`'s presence here (rather than the next commit) is reasonable since it's zoo-domain routing data, not a screen. |
| `feat(screen): add the caretaker opening and the sequenced closing` | `PrologueOpening`, `AdventureClosing` beat sequencing, `resolveShell`/`initialShell` split | `App.tsx`, `App.test.tsx`, `PrologueOpening.tsx` (+contract test), `AdventureClosing.tsx`, `GameScreen.tsx`, plus test-file touch-ups on `AdventureIntro.test.tsx`/`levels/catalog.test.ts` | Match — the two touch-up files are minor adjustments to keep pre-existing tests green against the new shapes (e.g. widened `GameView`), not undisclosed scope. |
| `docs: record the prologue, its art requests and the SDD change` | docs/00, docs/13 updates, new docs/17, OpenSpec artifacts (proposal/design/specs/tasks/state/verify-report/apply-progress) | Exactly those files | Match — this is the SDD paperwork commit; nothing code-level hides in it. |

No commit contains material its message does not describe.

## Spec Compliance Matrix — delta from previous pass only

All 51 previously-PASS scenarios across `prologue-opening`, `zoo-map`, `main-screen`, and `trace-canvas` are unchanged (no code touched between passes that would invalidate them) and remain PASS. The 3 previously-CRITICAL scenarios and the 1 previously-indirect scenario are re-verified below; the full 54-scenario matrix from the prior report is otherwise still accurate and not repeated here.

| Requirement | Scenario | Status | Evidence |
|---|---|---|---|
| Deep Link Bypasses Opening | Level deep link skips opening on fresh install | **PASS** | `App.test.tsx` `resolveShell` describe, "a level deep link skips the opening even on a fresh install" — both `?nivel=glass1` and `?nivel=intro-glass1` against `fresh` records. |
| Dev-Gated Route | Dev route reaches opening even when seen | **PASS** | same describe, "the dev route reaches the opening even when it has already been seen" — `?nivel=apertura` and `?nivel=apertura:2` against `played` records. |
| Dev-Gated Route | Dev route inert outside dev mode | **PASS** | same describe, "the dev route is inert outside dev mode, and the gate decides instead" — `dev=false` falls through to `firstVisit`. |
| Caption audit on 3 sign closings (`zoo-map`) | Every closing beat's text passes the caption audit | **PASS** | `AdventureClosing.test.tsx`, "keeps auditCaptions green for the three sign-bearing closings on their own rows" — iterates `peces`/`tortugas`/`monos`'s own `closingBeat` rows directly. |

## Issues

### CRITICAL

None.

### WARNING

1. **`main-screen`'s "Replaying any entrance adventure's last level replays its full closing" scenario names `glass4`/`monos` in its GIVEN clause; the covering test (`GameScreen.test.tsx:375-381`, "replaying sand4 resolves to the close view again") still exercises `sand4`, not `glass4`.** This is unchanged from the previous pass — not remediated. My judgement is that this is acceptable to leave open rather than blocking archive: `resolveCloseAction` is a pure, id-generic function, and a separate test at `GameScreen.test.tsx:347` already proves it resolves to `close` for all four entrance-adventure last levels (`glass2, sand2, glass4, sand4`) without records; the only thing the replay test adds beyond that is "with a pre-existing record", which is tested for one of the four ids and is exceedingly unlikely to differ by id given the function's implementation (a lookup keyed by `levelId`, no adventure-specific branching). Recommend a one-line follow-up next time this test file is touched (swap `sand4` for `glass4`, or parametrize over all four), but it does not warrant another `sdd-apply` cycle on its own.

### SUGGESTION

None.

## Verdict

**PASS WITH WARNINGS.** The CRITICAL coverage gap from the previous pass is closed with real runtime tests naming the exact scenarios; the paperwork gaps (`tasks.md` completion state and scenario count) are corrected; the indirect caption-audit coverage is now direct. One low-risk WARNING remains (a test uses a different-but-equivalent id than the scenario's literal GIVEN clause) and is judged acceptable to archive with, not a blocker. `npm test` (82 files / 1882 tests) and `npm run build` are both green, verified independently in this pass. Recommend proceeding to `sdd-archive`.


---

## Post-report remediation (orchestrator)

The one WARNING this pass left open — the replay scenario naming
`glass4`/`monos` while the test used `sand4` — was closed rather than
carried. `client/src/screen/GameScreen.test.tsx`'s replay test now loops
every enclosure's last level (`glass2`, `sand2`, `glass4`, `sand4`), each
with and without an existing record.

The reasoning for closing it rather than accepting it: "`resolveCloseAction`
is pure and id-generic" is an argument about the current implementation, not
a guard. The thing that would actually break this scenario is a persisted
"already saw the closing" flag creeping in later, and such a flag would most
plausibly be keyed per adventure — which a `sand4`-only test would not
catch.

Gates after the change: `npm test` → 82 files / 1882 tests, 0 failures.
`npm run build` → green. **No open findings remain.**
