# Explore: case-registry-and-captions

Step 1 of the five-step `docs/11_PULPITO_DETECTIVE_DIRECTIVA` rollout.
Investigation only; no source file was edited during this phase.

Sources read: the directive text (extracted from the unreadable PDF),
`docs/09_GUIA_DE_ESTILO_VISUAL.md`, `docs/10_HOME_LA_OFICINA_DEL_PULPO.md`, and the
live source tree. Every file:line below was verified against the working tree.

## 1. Captioned art

Only the deduction screen needs a word beside a picture in this change; the
`PECES`/`TORTUGAS` enclosure signs belong to step 4.

`Deduction.tsx:151-191` already renders each animal as
`<div className="cv-lineup-slot"><button className="animal-btn"><svg viewBox="-20 -20 40 40" …><image …/></svg></button></div>`.
`cv-lineup-slot` is a plain HTML flex column (`Deduction.tsx:202`), outside any viewBox.

**Decision: the caption is HTML, a sibling of the `<svg>`, never an SVG `<text>`.**
The precedent is already shipped: `PistasRail.tsx:157` renders
`<div className="pistas-word">PISTAS</div>` as HTML, and its own test block —
`PistasRail.test.tsx:99-108`, titled `'PistasRail typeset word (supersedes D6)'` —
asserts `not.toContain('<text')` and records the reason. An SVG `<text>` inside a
40-unit local viewBox cannot participate in the height-breakpoint type scale that
`LevelPlay.tsx:301-374` already drives for `.pistas-word`.

**Nunito reaches it.** `client/index.html:41-44` sets the family on `:root, body`, not
in `LAYOUT_CSS`, precisely because `LevelMap`, `MainScreen` and `HomeScreen` use inline
styles and never mount `LAYOUT_CSS`. Inheritance runs through the DOM, so any new HTML
text node gets Nunito regardless of which component mounted which stylesheet.

**Shape that makes a caption-less image unrepresentable.** One component whose `label`
is a REQUIRED prop with no default and no conditional branch, so the type checker — not
a test — rejects a picture without its word at every call site.

## 2. Case registry

Consumers of the hardcoded `CULPRIT` (`detective/assets.ts:139`): `Deduction.tsx:29,119`
and six assertions in `Deduction.test.tsx`.

Consumers of `DETECTIVE_TRAIL_IDS` (`game/types.ts:67`): `home/caseState.ts:15,49,61,78`;
`screen/GameScreen.tsx:12,95,101,111-116,130-137`; `game/migratePhase1.ts:19,32-37`; and
`GameScreen.test.tsx`, `catalog.test.ts`.

Consumers of `ANIMAL_ART[...].ruledOutBy`: `Deduction.tsx:161,177-188` and the three
structural tests at `Deduction.test.tsx:44,51,60`.

Proposed new module `client/src/detective/cases.ts`:

```ts
export interface DetectiveCase {
  id: string
  culprit: AnimalId
  options: readonly AnimalId[]
  ruledOutBy: Readonly<Partial<Record<AnimalId, ClueKind>>>
  trailIds: readonly string[]
}
export const DETECTIVE_CASES: readonly DetectiveCase[]
```

`ANIMAL_ART` keeps the pictures and loses `ruledOutBy`: the hen is a cleared distractor
in one case and the culprit of another, so "who this clue rules out" is a fact about the
CASE, not about the animal.

Modules that stop being global: `caseState.ts`'s `railSlots`/`nextCaseStep`/`lampOn`
take the active case's trail ids; `GameScreen`'s `allEarned` is already parametrised and
only needs the right argument, while `LAST_DETECTIVE_TRAIL_ID` and `resolveNextAction`
must resolve against whichever case owns the finished trail; `Deduction`'s `ANIMAL_ORDER`
becomes `case.options`, `FILED_SLOTS` derives from the case's trails, and `pickAnimal`
takes the case's culprit as an argument.

### The gap this surfaces

`DeductionState.closed` (`Deduction.tsx:96-102`) is `useState` and is **never persisted**.
With one case that is invisible — `nextCaseStep` returns `{kind:'deduce'}` forever and
there is nowhere else to go. With two cases, "four trails filed, deduction not attempted"
and "four trails filed, case solved" are indistinguishable in storage.

Recommended: persist it through the store that already exists, with a per-case pseudo-id
(`<caseId>-deduce`) written as a `LevelRecord` with `approvals: 1` when `pickAnimal`
closes. `isFiled` then answers "was this case solved" unchanged. No new key, no new
schema, no new store method. `isUnlocked` is safe against a pseudo-id: `LEVELS.findIndex`
returns `-1` and the method returns `false`.

## 3. The duck case's four trails

The directive's own words for this case: *"El camino comienza más amplio y simple y puede
aumentar gradualmente su complejidad."* Progression axis: corridor width narrows while
path complexity rises.

| # | id | generator | corridorWidth | clue |
|---|---|---|---|---|
| 1 | `duck-trail1` | `wave({ amplitude: 140, cycles: 1 })` | 100 | `webfoot` |
| 2 | `duck-trail2` | `wave({ amplitude: 170, cycles: 2 })` | 90 | `breadcrumb` |
| 3 | `duck-trail3` | `garland({ cycles: 3 })` | 80 | `bubble` |
| 4 | `duck-trail4` | `squareWave({ amplitude: 140, run: 200, cycles: 3 })` | 70 | `feather` |

`duck-trail4` clears both authoring guards: `cornerClearance(200, 90, 70)` reduces to
`200 >= 140`, and `armClearance(140, 70)` to `210 >= 49`. The three `wave`/`garland`
trails have no corner predicate to satisfy; all four widths sit inside
`MIN_CORRIDOR`/`MAX_CORRIDOR` (30/260, `buildLevel.ts:26-27`).

**No timed obstacle on any duck trail.** The directive places "frenar y continuar"
squarely in Nivel 3, desafío 4 (the starfish that crosses). Spending that mechanic here
would flatten the step-2 level before it ships, and the directive's Nivel 2 asks only for
"si el jugador toca el borde, reinicia el recorrido", which `resetOnContact` already does.

New art, all verified present in `art-source/`: `huella palmeada.png` → `webfoot`,
`miga de pan.png` → `breadcrumb`, `burbuja.png` → `bubble`. `feather` is reused with the
existing `pluma verde.png`/`pluma gris.png` pair, so it needs no new art and no new token.

## 4. The duck deduction

Three options: `pato` (culprit), `vaca`, `gato`.

`gallina` is deliberately NOT in the duck lineup. She is the next case's culprit, and
clearing her here would read to a returning child as a contradiction one case later.

- `vaca` ruled out by `feather` — a cow has no feathers. The same true statement the hen
  case already makes; it is a fact about the animal, so telling it twice is consistent.
- `gato` ruled out by `bubble` — a cat does not go in the water.
- `webfoot` and `breadcrumb` narrow nobody, on purpose. The webbed print is positive
  evidence FOR the duck rather than against anyone, and the crumb establishes that
  something was eating here. This is the structural role `droplet` plays in the hen case:
  a child should meet a clue that establishes presence without deciding the answer.

The three structural tests become per-case, iterating `DETECTIVE_CASES`. That is strictly
stronger than today: it also catches a clue kind meaning one thing in one case and
something else in another.

## 5. Progress migration

`isUnlocked` is positional (`LevelProgressStore.ts:123-129`). Inserting four levels before
`trail1` shifts every later index, but only ONE predecessor-by-id actually changes:
**`trail1`'s predecessor moves from `f1-libre` to `duck-trail4`.**

Two regressions follow. On the map, a returning child with
`f1-libre.approvals >= 2` finds `trail1` freshly locked — the exact demotion
`migratePhase1.ts:1-10` exists to prevent. On the home, which `caseState.ts:43-46` calls
"a resume control, not a level picker", a case-aware `nextCaseStep` would send a
mid-hen-trails child back to `duck-trail1`, i.e. to the very beginning.

Policy: a new `game/migrateDuckCase.ts` in `migratePhase1.ts`'s exact three-part shape —
declarative table, per-field merge policy, pure function returning only changed entries,
wired into `openProgressStore.ts`. Guard on the condition that used to grant `trail1` its
unlock (`f1-libre.approvals >= APPROVALS_TO_UNLOCK`), seed all four duck ids only when
none of them has a record yet.

**Cost, stated rather than hidden:** the seed also makes `isFiled` true for the four duck
trails, so a returning player never meets the duck case. Accepted: the alternative locks
them out of the trails they had already earned, which this repo has explicitly rejected
once by name. There is no production user base — `openspec/config.yaml` records the
backend as not yet scaffolded.

## 6. Lens centring

Traced and confirmed, not restated. `prepare()` (`build_art.py:168-175`) crops `lupa.png`
to its tight alpha box; `centre_on()` (`:288-325`) pads it so the lens centroid becomes
the image centre; `emit()` (`:155-165`) then calls `png.alpha_bbox` and crops back down,
removing exactly the transparent padding that was just added. The correction is applied
and unconditionally undone. The shipped file's centre is the bbox centre, which the
handle pulls off the lens.

The (0.603, 0.391) figure is already checked into the repo twice with the same narrative:
`home/modes.ts:113` and `docs/10:132`.

`TraceCanvas.tsx:1257-1264` hardcodes (0.5, 0.5). It is a second, independent
implementation of the same arithmetic that `modes.ts`'s `Hung` already does with an
override.

Recommended: the grip becomes a field of `CARRIER_LENS_ART` in `detective/assets.ts` —
the art registry owns a fact about the art, and `TraceCanvas` has no business importing
from `home/modes.ts`. Both call sites collapse onto one pure exported function:

```ts
export function placeArt(
  art: ArtImage, height: number,
  center: { x: number; y: number },
  grip?: readonly [number, number],
): { x: number; y: number; width: number; height: number }
```

## 7. Return to the office

`nextView` (`GameScreen.tsx:49-63`) is deliberately pure and shell-independent, and
`{at:'home'}` lives one level up in `App`'s `Shell` (`App.tsx:26`). So the fix cannot live
inside `nextView`.

Recommended: a required `onExit: () => void` prop on `GameScreenProps`, passed
`goHome` from `App.tsx`, replacing `dispatch({type:'back'})` at both `onBack` wiring
sites (`GameScreen.tsx:179` and `:185`). A prop, not a new `GameAction`, because an
action variant would force `nextView` to know about `App`'s `Shell` type and break the
purity its own comments insist on. This mirrors the existing `footer`/`initial` props.

`reset` is unaffected. `nextView`'s `back` branch stops being reachable through the UI.
Tests that must change: `levelFlow.test.ts:26,35` and `GameScreen.test.tsx:49`.

**Consequence: the level map stops being reachable in normal play** — only by finishing
the whole catalog or via the `?nivel=` deep link. "Reiniciar progreso" and "Modo prueba:
abrir todo" live only there. Both are development chrome, and the user has already called
the map's own "la oficina" footer link exactly that, so the map should be treated as a
dev surface and kept reachable by a dev-gated route (`canvas/devMode.ts`'s `isDevMode()`
already exists) rather than by a child-facing one.

## 8. Docs

Every "Fase" occurrence in `docs/01`..`docs/05`, verified:

- `docs/01`: 25 (phase diagram), 33/52/57/62/66 (the five `### Fase N` sections, which
  carry the pedagogy and must survive the reheading), 98/108.
- `docs/02`: 24, 92, 97, 116, 118. Line 116's concrete corridor-width contrast and 118's
  justification for the narrow-channel floor are content, not flavour.
- `docs/03`: 7, 19, 48, 50, 53, 98, 133, 134. **Riskiest file.** Line 48's "el retiro se
  aplica desde la Fase 3" is a real code-enforced boundary (`WITHDRAWAL_FROM_PHASE = 3`,
  `LevelPlay.tsx:503`), as is the ruled-vs-blank split at line 53. The reterm must relabel
  the SAME numbered boundaries, never renumber which levels a rule reaches.
- `docs/04`: 30-34, the level inventory, **already stale before this change** — it lists
  six retired `f1-*` ids that left `LEVELS` and live on only as `LEGACY_PHASE_1`. Line 60
  quotes the rendered `"Fase 2 · Las hamacas"` title, which the code still emits.
- `docs/05`: 13-22, a per-phase reward ladder that already describes a different mapping
  than what shipped.

Two adjacent staleness bugs sit directly in this change's path and are worth fixing in
the same pass, because decision 1 is exactly what makes them stale: `PistasRail.tsx`'s
module header and `docs/09:228-230` both still say the PISTAS word is drawn geometry and
must never be typeset (D6), which the shipped code and that file's own tests already
contradict.

Code keeps saying "Fase" after this change (`LevelMap.tsx:76`, `LevelPlay`'s `<h1>`),
since scope item 6 is docs-only. That mismatch is intentional and temporary.

## 9. Risks

1. **The duck case's solved state has nowhere to persist.** Without it, a child who opens
   the duck deduction and backs out — now landing on the home — is routed past their own
   unfinished deduction into the hen case. Mitigation: the pseudo-id in §2.
2. **The migration hides the duck case from any pre-existing player, permanently.**
   Mitigation: accept and record it in `design.md` as a decision, not a side effect.
3. **The level map leaves normal play**, taking progress reset and test mode with it.
   Mitigation: treat the map as a dev surface and gate its route on `isDevMode()`.
4. **Two doc/code staleness bugs** (`PistasRail` header + `docs/09:228-230`; `docs/04`'s
   inventory) sit in the path of this change's own docs pass. Low cost to fix here.
5. **New clue kinds ripple wider than they look**: `palette.ts` tokens and
   `palette.test.ts` bands, `build_art.py`'s `SINGLES` table, and
   `artManifest.test.ts:121`'s exact registered-file count.
6. **No contradiction found with the orchestrator briefing.** Every factual claim that
   could be independently checked — the grip figure, the bounding-box bug, the consumer
   lists, the positional unlock, Nunito's placement — held up against the source.
