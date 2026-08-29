# Proposal: Free Word Building

## Intent

Words capped at 12 fixed pairs (`COMBO_REGISTRY`); seam forces exact overlap (jump); demo draws one path; `t/i/j` secondaries draw mid-word; overlay auto-shows in dev. Goal: free concatenation (click + keyboard, registered/eligible only), Bézier seam, sequential animation, per-letter path order, authoritative toggle.

## User Stories (acceptance)

| # | Given | When | Then |
|---|---|---|---|
| 1 | any screen | click/type `a–z`, Backspace, "Borrar" | append iff registered+eligible; Backspace removes last + preventDefault; Borrar clears; remount `word.join('')`; mode kept; progress @ len 1 |
| 2 | word ≥2 letters | demo plays | `draw_path` steps sequential (first 1000; letters 2600ms, connectors 500ms, secondaries 600ms); `t/i/j` secondaries after all letters, `x` immediate |
| 3 | adjacent letters | seam built | 20px gap along `u`; cubic Bézier, tangents ~3 pts, arms `|P3−P0|/3`, 24 steps, ±8px ideal band |
| 4 | any user | toggle off | overlay hidden even in dev; 12-pair picker gone |

## Scope

In: `buildWord(n≥1)` replaces COMBO_REGISTRY/12-pair picker; `anchors.exit` cut + optional `mainEndArc`; connector (20px, 24 steps, 500ms); multi-step demo (`DrawDemo[]`); deferred `{t,i,j}`; `isWordEligible` (registered, `points[0] ≈ entry` ≤15px, drops ≤1-M guard); keyboard/append UI; gate fix; delta specs; tests replaced + `wordBuilding.test.ts`.

Out: cross-session persistence; spaces/uppercase; editing beyond Backspace; branches beyond immediate/deferred; `f` deferral (flagged); Approach 2 (`pathSegments`).

## Capabilities

New: None.
Modified (delta specs): `letter-combinations` (pairs → free building, seam, sequential, deferral); `letter-model` (`mainEndArc?`, `isWordEligible`, deferral set); `main-screen` (append+keyboard+toggle); `trace-canvas` (gate, `DrawDemo[]`); `guided-trace-mode` (all `draw_path` → `DrawDemo[]`). `free-trace-mode` unaffected.

## Key Decisions

1. Free building REPLACES COMBO_REGISTRY / 12-pair picker.
2. Cut at `anchors.exit` + optional `pathDefinition.mainEndArc`; `d` SINGLE-M — never split by M.
3. Seam: gap 20px along `u=normalize(prevEffectiveExit−entryNatural)`; tangents last/first ~3 pts; arms `|P3−P0|/3`; 24 steps; ±8px band; 500ms.
4. Effective exit = last IMMEDIATE segment end (`x`: 2nd diagonal; `t/i/j`: main end).
5. Deferred `{t,i,j}` drawn AFTER all letters (renumbered LAST); `x` immediate.
6. Demo: multiple `draw_path` (cumulative; first 1000; letters 2600, connectors 500, secondaries 600ms), each `properties:{d}`; ALL → `DrawDemo[]`; prop `DrawDemo|DrawDemo[]`; readyMs unchanged.
7. `isWordEligible`: registered AND `points[0]≈anchors.entry` ≤15px (Kalam seeds fail); n=1 passes config.
8. Gate = `showCheckpoints && devCheckpoints && devIdeal` (drop `isDevMode()||`); showScore `{isDevMode()}`.
9. Keyboard: `a–z` appends (registered+eligible); Backspace removes + preventDefault; ignore modifiers/inputs/space; "Borrar" clears; remount `word.join('')`; mode kept; progress @ len 1.
10. `mainEndArc` optional → `letter-model` delta.

## Approach

Approach 1: generalize `buildCombination` → `buildWord` (2-letter case falls out). Per letter: translate, cut main at `anchors.exit` (exact via `mainEndArc`), immediate secondary (`x`), connector next; deferred secondaries last. Full `LetterConfig` consumed unchanged by guided/free/evaluate. Deps in use: `transformPathD`, framer-motion `pathLength`, `flattenPathD`.

## Affected Areas

`client/src/letters/{svgLetter,types,combinations,registry}.ts`; `client/src/{screen/MainScreen,modes/guidedTrace,canvas/TraceCanvas}.tsx`; tests `combinations`/`registry`/`App` + new `wordBuilding.test.ts` — Modified/New.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Keyboard capture (nav, focus, uppercase, space) | Med | preventDefault on consumed keys; ignore modifiers/inputs |
| Single-M cut precision | Med | `anchors.exit` + `mainEndArc` |
| COMBO_REGISTRY removal breaks 2 test files | High | update same change |
| Deferred rail ordering | Med | renumber deferred checkpoints last |
| Demo array touches 3 components + tests | Med | fallback to letter `d` |

## Rollback Plan

Re-add COMBO_REGISTRY + picker path (additive; single-letter flow untouched). Gate: one-line revert. Keyboard removal deletion-only. `mainEndArc` optional — no breakage.

## Success Criteria

- [ ] 12-pair picker gone; click+keyboard building; `t/i/j` last, `x` immediate
- [ ] Seam per decision 3; sequential per-letter `d`; overlay hidden in dev when off
- [ ] Combo/registry tests replaced, `wordBuilding.test.ts` green; ~800 LoC, single PR