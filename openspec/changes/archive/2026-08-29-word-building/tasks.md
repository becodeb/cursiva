# Tasks: Free Word Building

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High

~800 lines (13 files) fits 800-line budget + single-PR; no size:exception.

## Work Units

`npx vitest run <file>` (from `client/`).

| Unit | Tasks | Test file(s) | Runtime | Rollback |
|---|---|---|---|---|
| 1 Model | T1.1–4 | svgLetter.test.ts | N/A (pure) | revert T1 |
| 2 buildWord | T2.1–8 | wordBuilding.test.ts | N/A (pure) | revert combinations.ts |
| 3 Registry | T3.1–2 | registry.test.ts, combinations.test.ts | N/A (del) | re-add COMBO_REGISTRY |
| 4 Demo | T4.1–3 | TraceCanvas.test.tsx | dev: toggle-off hides | revert TraceCanvas/guidedTrace |
| 5 UI | T5.1–4 | App.test.tsx, wordBuilding.test.ts | dev: keyboard/Borrar | revert MainScreen.tsx |
| 6 Rail | T6.1–2 | modes.test.ts | browser: E2E gate | revert modes.test.ts |

## Phase 1 — Foundation →T1.4

- [x] T1.1 `types.ts`: `pathDefinition.mainEndArc?:number`; absent ⇒ d-end cut
- [x] T1.2 `anchors.ts`: `DEFERRED_SECONDARY_CHARS={t,i,j}`; x/f excluded
- [x] T1.3 `svgLetter.ts`: store mainEndArc (multi-subpath); `isWordEligible`: dist(flat[0], entry) ≤ 15
- [x] T1.4 `svgLetter.test.ts`: multi-subpath mainEndArc + single-M; eligibility a✓/Kalam✗/synthetic✓

## Phase 2 — buildWord (`combinations.ts` → T2.8)

- [x] T2.1 Delete buildCombination/buildOrderedPairs; buildWord throws unknown/ineligible; n=1 passthrough
- [x] T2.2 Cut: flatten translated d; mainEndArc arc-walk else anchors.exit nearest vertex
- [x] T2.3 Place: u=normalize(prevExit−entryNatural); dx=round2(prevExit−20u−entryNatural)
- [x] T2.4 Connector: 24 steps, ~3-pt tangents, arms |P3−P0|/3; skip <1px; {t,i,j} last
- [x] T2.5 Renumber 1..N writing order, deferred LAST; ideal ±8px
- [x] T2.6 Meta: entry=first, exit=last effective; id=palabra_+chars; theme from first
- [x] T2.7 Timeline: draw_path/segment 1000/2600/500/600ms cumulative + properties:{d}; fade_out max+200
- [x] T2.8 `wordBuilding.test.ts` (new): seam 0.01; 24-step tangents; t/i deferral; x immediate; 9+6→1..15; n=1; z/seed throw

## Phase 3 — Registry

- [x] T3.1 `registry.ts`: drop `COMBO_REGISTRY` + import
- [x] T3.2 `combinations.test.ts`: drop seam-exact/12-pair/guard; assert connector/x/deferral

## Phase 4 — Demo Pipeline →T4.3, T6.1

- [x] T4.1 `guidedTrace.tsx`: all draw_path → DrawDemo[] (delay/duration/properties.d ?? letter d); readyMs unchanged
- [x] T4.2 `TraceCanvas.tsx`: demo single|array, path per entry; devOn=showCheckpoints&&devCheckpoints&&devIdeal; showScore=isDevMode()
- [x] T4.3 `TraceCanvas.test.tsx` (new): renderToString array → 2 stroke="#0284c7" paths; single → 1

## Phase 5 — Word UI (`MainScreen.tsx` → T5.3–5.4)

- [x] T5.1 `word:string[]`; picker appends; Borrar clears; `nextWord`: a–z iff eligible, Backspace pop+preventDefault, mods/space/unknown → null
- [x] T5.2 keydown; remount `word.join('')`; label/canvas if len>0; progress only len===1
- [x] T5.3 `App.test.tsx`: drop combo-nav assertions; assert Borrar→placeholder
- [x] T5.4 `wordBuilding.test.ts`: nextWord suite (ca+b→cab; Backspace; mods → null)

## Phase 7 — Remediation (manual browser feedback, post-verify)

E2E manual del usuario detectó 3 defectos; los deltas spec ya están enmendados (letter-model: f→mixta; trace-canvas: 4ª línea; main-screen: append reinicia demo). Implementar:

- [x] T7.1 `TraceCanvas.tsx`: guía completa en Y=540 (descender/roots, const `ROOTS_GUIDE_Y`); actualiza `TraceCanvas.test.tsx` (SSR: y1="540")
- [x] T7.2 `svgLetter.ts` `LETTER_ZONES`: `f` sale de ALTA_CHARS y entra al grupo `mixta` ('fj'); `zoneBounds` mixta ya cubre 180–540; actualiza `svgLetter.test.ts` (zones/anchors: f→mixta) y `svg/README.md` (tabla de zonas)
- [x] T7.3 `MainScreen.tsx`: append (botones + keydown a–z) vuelve a `setMode('guided')` para que el demo secuencial de la palabra completa se reproduzca desde la primera letra; Backspace/Borrar NO resetean modo; actualiza `App.test.tsx` + `wordBuilding.test.ts`
- [x] T7.4 Suite completa `npx vitest run` + `npm run build` verdes (sin regresiones de T1–T6)

Nota: el redibujado de `f.svg` (arranque en baseline) es tarea del usuario en Inkscape; el pipeline ya ajustará la nueva f a mixta. No tocar `f.svg`.

## Verification

Commands: `npx vitest run`; `npm run build` (tsc --noEmit && vite build; TS7 bare-tsc quirk)

- [x] T6.1 `modes.test.ts`: referenceFlattenPath(buildWord(['a','c']).d) → guidedFollowState complete + evaluateTrace approved
- [x] T6.2 E2E gate — browser-only (NOT vitest, no jsdom): toggle-off hides overlay in dev

Acceptance:
- [ ] n=1 passthrough; unknown/Kalam throw; d single-M 24-step seams
- [ ] t/i/j last in d+timeline+checkpoints; x immediate
- [ ] Segments 1000/2600/500/600ms; single letter no properties.d; SSR array→N, single→1
- [x] Toggle-off hides overlay; picker gone; keyboard/Borrar; progress len-1 only