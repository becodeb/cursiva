# Design: The prologue — Pulpito is the zoo's caretaker

Binding inputs: `proposal.md`, `exploration.md`, `docs/16_PROLOGO_EL_CUIDADOR.md` §4, §5, §8, §9.
Every number below is either measured from shipped code or derived with the arithmetic shown.

## 1. Technical Approach

Four seams, no new engine. The adventure layer is regrouped in place, the closing screen learns to
render the *n*-th of an ordered beat list, one new shell screen is added in front of the map, and
six placeholder PNGs enter the existing four-point art registration.

```
App.tsx  initialShell()
   │  ?nivel=<deep link>  ──────────────────────────────► { at:'game' }   (bypasses the opening)
   │  ?nivel=apertura[:n] ──► prologueRoute(search, dev) ► { at:'prologue', from:n }   (dev only)
   │  firstVisit(readRecords())  true ──────────────────► { at:'prologue' }
   │                             false ─────────────────► { at:'map' }
   ▼
PrologueOpening  { from?, onDone }        ← the whole external contract
   │  zoo/prologue.ts : PROLOGUE_PLATES, advancePlate(i)   (pure, node-testable)
   │  skip control (always visible) ─┐
   └── last plate tapped ────────────┴──► onDone()  ──► goToMap() ──► ZooMap
                                                              │
                                    tap `entrada` ────────────┘
                                                              ▼
GameScreen  intro → play×2 → close(beat 0) → close(beat 1) … → onExit → ZooMap
                                  ▲                  ▲
                    closingLevel(levelId)   advanceClosing(levelId, beat)   (pure)
```

## 2. Architecture Decisions

### D1 — the opening's external contract is two props, one of them optional

```ts
// client/src/screen/PrologueOpening.tsx
export interface PrologueOpeningProps {
  /** Where to START the opening, in whatever units the opening uses
   *  internally: a plate index today, a seek offset once this is a <video>.
   *  Omitted = from the beginning, which is the only production call. */
  from?: number
  /** The opening is OVER. Called exactly once, and the caller cannot tell
   *  whether the child watched it or skipped it — that is the point. */
  onDone: () => void
}
export default function PrologueOpening(props: PrologueOpeningProps): JSX.Element
```

The one production call site, in `App.tsx`:

```tsx
if (shell.at === 'prologue') return <PrologueOpening from={shell.from} onDone={goToMap} />
```

| Option | Tradeoff | Decision |
|---|---|---|
| `{ plate, onAdvance, onDone }` — controlled from `App` | Testable without DOM, but the plate index becomes part of the app's vocabulary and a `<video>` swap breaks every caller | Rejected |
| `{ onDone }` only | Narrowest possible, but this harness cannot observe a re-render (`GameScreen.tsx:190-198`), so no capture and no test could reach plate 2 or 3 | Rejected |
| `{ from?, onDone }` + the plate script exported as pure data | One optional prop that survives the swap (a video seeks to `from`); sequencing stays internal | **Chosen** |

**How the plates advance.** Tapping the stage calls `advancePlate(i)`; `null` means done and calls
`onDone()`. Both the script and the step are pure and live outside React:

```ts
// client/src/zoo/prologue.ts — pure, no React, the zoo/adventures.ts convention
export interface ProloguePlate { line: string; art: ArtImage }
export const PROLOGUE_PLATES: readonly [ProloguePlate, ...ProloguePlate[]]   // docs/16 §4's three lines
export function advancePlate(index: number): number | null   // null = the opening is over
```

**Where the skip control lives.** Inside `PrologueOpening`, on every plate, as a SIBLING of the
stage `<button>` (never a descendant — nested buttons are invalid HTML), absolutely positioned
top-right of the `<main>`. It calls the same `onDone`. Being inside the component is what makes
docs/16 §4 item 3 structural: any future implementation must render it to satisfy the same tests.

**The swap.** `PrologueOpening` becomes a two-line shell: `<PrologueVideo onDone onError={→ plates}/>`
with `<ProloguePlates from onDone/>` as the fallback branch. `PrologueOpeningProps` does not change,
`App.tsx` does not change, and `PROLOGUE_PLATES` stays as the fallback's script.

### D2 — the opening is a `Shell` variant, gated by a derived predicate

`Shell` gains `{ at: 'prologue'; from?: number }`. Not a `GameView`: docs/16 §8 forbids a third
screen pattern inside the game shell, and the opening happens *before* the map, which the game
shell never owns.

```ts
// App.tsx — never persisted, never written
function firstVisit(records: Readonly<Record<string, LevelRecord>>): boolean {
  return Object.keys(records).length === 0
}
```

It reads `readRecords()` = `openProgressStore().all()` (`game/LevelProgressStore.ts`, key
`cursiva.levels.v1`), the same store the map already reads. **Proof that a migration cannot forge a
first visit**: all four migrations return `{}` on an empty record set — `migratePhase1:98`
(`if (!source) continue`), `migrateDuckCase:89` and `migrateNivel3:75` (`if (!source …) return {}`),
`migrateEntrance:83` (`Object.keys(records).length > 0 && …`). So an empty store after
`openProgressStore()` is exactly a fresh install.

`initialShell()` (`App.tsx:79-86`) becomes:

```ts
const view = initialView(search, dev)
if (view) return { at: 'game', initial: view }        // any ?nivel= deep link bypasses the opening
const opening = prologueRoute(search, dev)            // ?nivel=apertura[:n], dev-gated
if (opening) return opening
return firstVisit(readRecords()) ? { at: 'prologue' } : { at: 'map' }
```

`prologueRoute(search: string, dev: boolean): { at: 'prologue'; from: number } | null` is exported
from `PrologueOpening.tsx`, pure over its two parameters and dev-gated by the caller's `isDevMode()`
— the exact shape and gate `initialView(search, dev)` already uses for `?nivel=mapa` / `intro-` /
`cierre-`. Accepted cost, stated rather than papered over: a child who watches the opening and
closes the app without attempting a level sees it again. They have not started; this is the same
derive-don't-persist trade `recentlyDiscovered()` records at `sectors.ts:507-524`.

### D3 — `closingBeat` becomes a non-empty tuple; no new `GameView` member

```ts
// zoo/adventures.ts
export interface ClosingBeat {
  line: string
  art: ArtImage
  /** Overrides the standing octopus for THIS beat only. ABSENT =
   *  ZOO_OCTOPUS_BACKPACK_ART, which is every beat but the magnifier. */
  figure?: ArtImage
}
closingBeat?: readonly [ClosingBeat, ...ClosingBeat[]]   // was: { line, art }
```

A non-empty tuple, not `ClosingBeat[]`: `closingLevel()` (`adventures.ts:235-239`) guards on
`if (!adventure.closingBeat) return undefined`, and an empty array is truthy. The tuple makes the
empty case unrepresentable, so **`closingLevel` is byte-unchanged**. The field keeps its singular
name deliberately — `proposal.md` and the parallel spec both say `closingBeat`, and renaming it
would fork the vocabulary of three artifacts to save nothing.

Sequencing lives in `GameScreen`'s existing `close` view as an **optional field on the existing
member**, so the union still has exactly five members:

```ts
export type GameView = … | { view: 'close'; levelId: string; beat?: number }   // + beat, not + member
export type CloseAction = { type: 'close'; levelId: string; beat?: number }

export function advanceClosing(levelId: string, beat: number): CloseAction | ExitAction {
  const adventure = closingLevel(levelId)
  if (adventure && beat + 1 < adventure.closingBeat.length) return { type: 'close', levelId, beat: beat + 1 }
  return { type: 'exit' }
}
```

`beat` is optional at both sites so every existing construction (`{ view:'close', levelId }`,
`resolveCloseAction`, `initialView`'s `cierre-` branch, every test) still compiles unchanged.
`AdventureClosing` receives ONE beat and knows nothing about the list — the `!` assertion at
`AdventureClosing.tsx:50` disappears:

```ts
export interface AdventureClosingProps { adventure: Adventure; beat: ClosingBeat; onContinue: () => void }
// render: <img src={(beat.figure ?? ZOO_OCTOPUS_BACKPACK_ART).href} className="cv-closing-octopus" />
```

Call site in `GameScreen`'s `close` branch: `const index = state.beat ?? 0`, beat =
`adventure.closingBeat[index] ?? adventure.closingBeat[0]` (the file's never-crash convention for a
stale id), and `onContinue` discriminates `advanceClosing(...)` exactly as `onNext` already
discriminates `resolveNextAction`.

Dev route, extending `GameScreen.tsx:123`: `?nivel=cierre-<levelId>[:<n>]`. The separator is `:`
because no level id contains one and `-` is ambiguous against ids that end in digits (`sand4`).

### D4 — the magnifier beat is a swap of the figure, not a fourth sentence

`sendero`'s `closingBeat` is exactly two beats; docs/16 §6's map beat is the shipped `ZooMap`
`onContinue` already lands on.

| # | line (docs/16 §9) | `art` | `figure` |
|---|---|---|---|
| 0 | "¡Mirá! ¿Y esto? ¡Son huellas!" | `ZOO_OCTOPUS_PRINT_ART` | — (the caretaker with his backpack) |
| 1 | "¡Se fueron todos los animales! Agarrá la lupa: los vamos a buscar." | `CARRIER_LENS_ART` (the lupa itself, entering the backpack) | `OCTOPUS_ART` = `/art/carrier-octopus.png` |

Nothing else on the stage moves between beat 0 and beat 1: same background, same bubble geometry,
same position. The only thing that changes is **who is standing there** — the caretaker becomes the
detective in place. That is a transformation; two consecutive sentences are not. It also answers
proposal question 4 by reusing shipped art (`carrier-octopus.png`, `SINGLES` row
`build_art.py:354`), and the hat-and-lupa drawing becomes a one-file swap later.

### D5 — placeholder art is generated by a sibling script, never by `build_art.py`

This host has no Pillow, no ImageMagick, no potrace (`build_art.py:24-26`). The repo's own
`scripts/art/png.py` is the raster layer, and it is enough: `png.Image(w, h)` gives an RGBA
bytearray and `png.write_png(path, img)` writes it.

New file `scripts/art/make_placeholders.py`, run once, writes the six sources into `art-source/`.
`build_art.py` gains **rows only** (proposal's Out of Scope), no logic:

```python
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import png                                   # the repo's own hand-rolled raster layer

def solid(w, h, rgba):                       # fully opaque when rgba[3] == 255
    img = png.Image(w, h); img.px[:] = bytes(rgba) * (w * h); return img

def rect(img, x0, y0, x1, y1, rgba):
    for y in range(y0, y1):
        i = (y * img.w + x0) * 4
        img.px[i:i + (x1 - x0) * 4] = bytes(rgba) * (x1 - x0)

def stripes(img, rgba, period=128, width=16):          # ~12.5% coverage: the base stays MODAL
    for y in range(img.h):
        for x in range(img.w):
            if (x + y) % period < width:
                i = (y * img.w + x) * 4; img.px[i:i + 4] = bytes(rgba)

GLYPHS = {...}                               # 5x7 bit rows for P E C S T O R U G A M N
def word(img, text, x, y, cell, rgba): ...   # each set bit is a cell x cell rect(...)
```

- **Backgrounds** (`PASSTHROUGHS`, 1536×1024): `solid(...255)` → `stripes(...)` → a darker label bar.
  Alpha is 255 on every pixel by construction, so `emit_opaque_canvas` (`build_art.py:234-249`,
  which raises on the first non-opaque pixel) passes.
- **Cutouts** (`SINGLES`, 1024×1024): transparent canvas, one inset opaque block with a `#1a1a1a`
  border, so `alpha_bbox` finds a real cutout and `fill='contour'` is a no-op. No
  `SPECKLED_ALPHA_SOURCES` entry: a hand-written canvas has no dither.
- **The three signs carry their word**: a 5×7 block-letter routine draws PECES / TORTUGAS / MONOS as
  flat `#1a1a1a` rects. No font file, no dependency, and the placeholder actually satisfies docs/16
  §5's "cartel con imagen + la palabra" instead of owing it.

### D6 — the veil colours, and why the two new fills are what they are

`LevelPlay.tsx:1684` paints the erase veil from `tile`, never from a PNG. This repo measures luma
with **Rec. 601, rounded** — `detective/palette.ts:39-44`,
`round((r*299 + g*587 + b*114) / 1000)` — and `backdrops.test.ts:49` fixes
`MIN_BACKDROP_CONTRAST = 55`. Two laws apply to a reveal row: `|luma(tile) − luma(brightest)| ≥ 55`
and `|luma(tile) − luma(ink ?? INK_COLOR)| ≥ 55`, with `luma(INK_COLOR #1e293b) = 40` and
`luma(SHEET_PAPER #fdfcf7) = 252`.

| Adventure | `art` | `tile` (new tokens in **bold**) | luma(tile) | base fill = `quiet`/`brightest` | luma | gap vs veil | gap vs ink | paper gap (must be < 55) |
|---|---|---|---|---|---|---|---|---|
| `peces` | `SECTOR_BACKGROUND_ART.aquarium` (shipped) | `GLASS_GRIME #64726b` | 109 | `#9bb6c5` / `#c7d9e0` | 212 | 103 | 69 | 40 ✓ |
| `tortugas` | `SECTOR_BACKGROUND_ART.sand` (shipped) | `SAND_DRIFT #7a6a58` | 109 | `#d6cbba` / `#dad0c0` | 209 | 100 | 69 | 43 ✓ |
| `monos` | `SECTOR_BACKGROUND_ART.monkeys` (new) | **`LEAF_LITTER #6e7a4a`** | 113 | `#c9d3b8` (flat) | 205 | 92 | 73 | 47 ✓ |
| `sendero` | `SECTOR_BACKGROUND_ART.path` (new) | **`PATH_MUD #75634c`** | 102 | `#d5c8b0` (flat) | 201 | 99 | 62 | 51 ✓ |

Worked arithmetic for the two new rows:
`#6e7a4a` → (110·299 + 122·587 + 74·114)/1000 = 112.94 → **113**;
`#c9d3b8` → (201·299 + 211·587 + 184·114)/1000 = 204.93 → **205**; gap 92, ink gap 73.
`#75634c` → (117·299 + 99·587 + 76·114)/1000 = 101.76 → **102**;
`#d5c8b0` → (213·299 + 200·587 + 176·114)/1000 = 201.15 → **201**; gap 99, ink gap 62.
Both base fills sit above 197 on purpose: `|252 − base| < 55` keeps the existing falsifiability rows
("no admissible light paint", `backdrops.test.ts:136-146`) true for the two new surfaces as well, so
the dark veil stays *forced* rather than chosen.

**The `quiet`/`brightest` literals above are candidates for the placeholder fills, not values to
type in.** `sample_corridor_band` (`build_art.py:479`) computes `quiet` as the modal colour of the
middle 40 % of rows `(51, 973)` and `brightest` as the maximum-luma pixel in the whole band; the
stripe tone is darker than the base (`#8c9a7d` luma 147 < 205; `#a3906f` luma 146 < 201) and covers
~12.5 %, so both fields land on the base fill — the same `quiet === brightest` parity the `bee` row
already ships. After `python3 scripts/art/build_art.py`, **read both literals off the rebuilt
`manifest.json`** and paste them; `artManifest.test.ts` asserts the registry against the manifest,
so a hand-guessed value fails rather than drifts. This is the standing rule from pasos C/D/E.

`backdrops.test.ts`'s `REVEAL_BACKDROPS` group becomes `{ peces, tortugas, monos, sendero, night }`;
the registry-completeness guard (`:93-102`) then covers the four new rows with no new mechanism.

### D7 — `entrada`'s row is reordered, not rewritten

`sectors.ts:334` holds **level** ids in play order and `nextAdventure()` (`:495-497`) returns the
first unfiled one, so the narrative order lives here:

```ts
adventureIds: ['glass1','glass2','sand1','sand2','glass3','glass4','sand3','sand4']
```

Same eight ids, same set, interleaved. `estanque.unlockedWhen = isFiled(records,'sand4')`
(`:400`) is untouched and still correct: `sand4` is still the prologue's last level.
`backpack.ts:39-43` (lupa, `earnedWhen: ['sand4']`) and `migrateEntrance.ts` are level-id keyed and
unaffected — re-verified, not rewritten. Per-surface microprogression is enforced inside
`levels/catalog.ts` per family (`glass1..4`, `sand1..4`), which the interleave does not touch.

### D8 — the skip control is an image, because a bare word cannot ship

`captionAudit.ts` fails any on-screen text outside a container carrying its own `<image href>`, so a
`<button>saltar</button>` would go red. The skip control is
`<CaptionedArt art={ZOO_MAP_ART} label="Ir al mapa" size={28} />` inside the button: shipped art, no
new registration, and to a pre-reader the picture of the map *is* the meaning of the control. The
closing sign satisfies the same audit for free — `AdventureClosing` already renders the beat through
`CaptionedArt`, whose `label` is required at the type level, and the sign PNG supplies the `<image
href>` the licence needs.

## 3. Script (docs/16 §4 and §9, verbatim)

| Row | `intro` | `closingBeat` lines | `icon` |
|---|---|---|---|
| `peces` | "El vidrio de la pecera está todo empañado. ¿Lo limpiamos?" | "¡Las algas, el cofre, las piedras… pero no hay ni un pez!" | `SIGN_ART.fish` |
| `tortugas` | "La arena tapó todo el recinto. Barrámosla." | "Las piedras, el tronco… ¿y las tortugas dónde están?" | `SIGN_ART.turtles` |
| `monos` | "Cayeron un montón de hojas. ¿Las sacamos?" | "Las sogas, las frutas… acá tampoco hay nadie." | `SIGN_ART.monkeys` |
| `sendero` | "El sendero quedó lleno de barro." | D4's two beats | `ZOO_OCTOPUS_PRINT_ART` |

`closing` (the map bubble's one-line label) stays a single sentence per row; `mapBubble` filters on
`a.animal !== undefined`, so these four animal-less rows never reach it — unchanged behaviour.
Opening plates: docs/16 §4's three lines, art = the new caretaker, `CART_ART` (shipped), and
`ZOO_BACKPACK_ART` (shipped). The opening's stage paints `backdropFor('glass1')?.quiet ?? SHEET_PAPER`
so the cut into the `peces` intro is a continuation rather than a jump.

## 4. Art registration — six sources, four points each, 81 → 87

| # | `art-source/` | Emitted | Table | Canvas | `assets.ts` export |
|---|---|---|---|---|---|
| 1 | `pulpo cuidador.png` | `zoo-octopus-caretaker.png` | `SINGLES` (448, `'contour'`, `True`) | 1024×1024 | `ZOO_CARETAKER_ART` |
| 2 | `fondo recinto monos.png` | `sector-monkeys-background.png` | `PASSTHROUGHS` `(51, 973)` | 1536×1024 | `SECTOR_BACKGROUND_ART.monkeys` |
| 3 | `fondo sendero.png` | `sector-path-background.png` | `PASSTHROUGHS` `(51, 973)` | 1536×1024 | `SECTOR_BACKGROUND_ART.path` |
| 4 | `cartel peces.png` | `sign-fish.png` | `SINGLES` (256, `'contour'`, `True`) | 1024×1024 | `SIGN_ART.fish` |
| 5 | `cartel tortugas.png` | `sign-turtles.png` | `SINGLES` (256, `'contour'`, `True`) | 1024×1024 | `SIGN_ART.turtles` |
| 6 | `cartel monos.png` | `sign-monkeys.png` | `SINGLES` (256, `'contour'`, `True`) | 1024×1024 | `SIGN_ART.monkeys` |

All six take an `AUTHORED_SOURCE_SIZES` entry (`build_art.py:784`) — possible precisely because
`make_placeholders.py` writes them at the exact canvas, and `validate_authored_source_sizes()` runs
first. `REGISTERED` count: 81 + 2 (backgrounds, via the existing `Object.entries(SECTOR_BACKGROUND_ART)`
spread) + 1 (`ZOO_CARETAKER_ART`) + 3 (`...Object.entries(SIGN_ART)`) = **87**. Every `w`/`h` is
copied from the rebuilt `manifest.json`.

## 5. File Changes

| File | Action | What |
|---|---|---|
| `client/src/zoo/prologue.ts` | Create | `PROLOGUE_PLATES`, `advancePlate` — pure, no React |
| `client/src/screen/PrologueOpening.tsx` | Create | D1's component + `prologueRoute` |
| `scripts/art/make_placeholders.py` | Create | D5's generator; six sources into `art-source/` |
| `art-source/*.png` (×6) | Create | generated placeholders |
| `client/src/zoo/adventures.ts` | Modify | `AdventureId` (10→12 members), four entrance rows, `ClosingBeat` + tuple |
| `client/src/zoo/backdrops.ts` | Modify | `LEAF_LITTER`, `PATH_MUD`, four entrance rows replace two |
| `client/src/zoo/sectors.ts` | Modify | D7's reordered `entrada.adventureIds` |
| `client/src/screen/AdventureClosing.tsx` | Modify | `beat` prop, `figure ?? backpack`, no `!` |
| `client/src/screen/GameScreen.tsx` | Modify | `beat?` on the `close` view + `CloseAction`, `advanceClosing`, `cierre-<id>:<n>` |
| `client/src/App.tsx` | Modify | `Shell` + `prologue`, `firstVisit`, `initialShell` |
| `client/src/detective/assets.ts` | Modify | `ZOO_CARETAKER_ART`, `SIGN_ART`, two `SECTOR_BACKGROUND_ART` keys |
| `scripts/art/build_art.py` | Modify | six table rows + six `AUTHORED_SOURCE_SIZES` entries; **no logic** |
| `client/src/game/migrateEntrance.ts` | Verify only | level-id keyed; never reads `ADVENTURES` |

## 6. Testing Strategy — extend, never delete

| File | Extended assertion |
|---|---|
| `zoo/adventures.test.ts:23-67` | 10 → 12 rows; `'glass'`/`'sand'` → `'peces','tortugas','monos','sendero'`; each row's two `levelIds`, `sector: 'entrada'`, `icon` |
| `zoo/adventures.test.ts:129-165` | `introLevel('glass3')` → `monos`, `introLevel('sand3')` → `sendero`; `closingLevel('glass4')` → `monos`; `closingLevel('sand4')?.id === 'sendero'`; ADD `closingLevel('glass2')`/`('sand2')` and `closingLevel('glass1') === undefined` |
| `screen/GameScreen.test.tsx:176-188, 318-390` | `resolveNextAction('glass2'\|'sand2'\|'glass4')` now closes; `find(a=>a.id==='sand')` → `'sendero'`; ADD an `advanceClosing` table (sendero 0→1→exit, peces 0→exit, out-of-range → exit) |
| `levels/catalog.test.ts:400` | `'glass'` → `'peces'`, `levelIds[0] === 'glass1'`; microprogression assertions untouched |
| `detective/artManifest.test.ts:181` | `81` → `87`, with the enumerating comment updated |
| `zoo/backdrops.test.ts` | `REVEAL_BACKDROPS` → the four entrance rows + `night`; the two `SHEET_PAPER`-goes-red rows renamed and two added for `monos`/`sendero` |

New assertions the proposal demands:

1. **Level-id union, per family.** `ENTRANCE.flatMap(a => a.levelIds)` sorted equals the original
   eight, AND `.filter(id => id.startsWith('glass'))` equals `['glass1','glass2','glass3','glass4']`
   with `'sand'` likewise. Read "original order" per family: the interleaving *is* the change, so an
   order assertion over the flat list would assert the bug.
2. **`entrada.adventureIds`** equals D7's exact list and its sorted set equals the old one.
3. **`isFiled('sand4')` still opens `estanque`** — asserted directly in `zoo/sectors.test.ts`.
4. **`GameView` gains no member**, at build time rather than at runtime:
   `const TOTAL: Record<GameView['view'], true> = { map:true, play:true, intro:true, deduce:true, close:true }`
   — a sixth member fails `npm run build` on the missing key, the same mechanism
   `AdventureSubject` and `CaptionedArt`'s `@ts-expect-error` already rely on.
5. **The opening swaps without touching callers**: `PrologueOpening.contract.test.tsx` assigns a
   stub `({ onDone }) => <button onClick={onDone} />` to `(p: PrologueOpeningProps) => ReactElement`.
   It compiles only while the contract stays "show, then report done"; `npm run build` is the check.
6. **New unit tests**: `advancePlate` (0→1→2→null, out-of-range → null); `prologueRoute`
   (`apertura`, `apertura:2`, dev gate off → `null`, malformed → `null`); `firstVisit` (empty → true,
   one record → false, plus each migration returning `{}` on an empty store);
   `auditCaptions(renderToString(<PrologueOpening from={n}/>)).uncaptioned` is empty for every plate,
   and the skip control renders on each.

Manual: `bash scripts/shot.sh` captures into `capturas/prologo/` — the opening (3 plates, via
`?nivel=apertura:<n>`), four intros (`?nivel=intro-<id>`), five closings
(`?nivel=cierre-<id>[:<n>]`).

## 7. Threat Matrix

N/A — no routing in the HTTP/shell sense, no shell command, no subprocess, no VCS/PR automation, no
executable-file classification, no process integration. `?nivel=apertura[:n]` is an in-page query
parameter parsed by a pure function and gated by `isDevMode()`, the same surface `?nivel=mapa` and
`?nivel=intro-<id>` already ship (`case-registry-and-captions` design.md recorded the same N/A for
the same mechanism). `make_placeholders.py` is a developer-run generator in the existing
`scripts/art/` convention, not a runtime path.

## 8. Migration / Rollout

No migration. No persisted key is added, no level id is renamed, no record is invalidated, and
`migrateEntrance.ts` is re-verified rather than rewritten. Rollback is `proposal.md`'s: revert the
branch, delete the six sources and their rows, re-run `build_art.py`, and `REGISTERED.length`
returns to 81.

## 9. Open Questions

- [ ] Are `monos` and `sendero` the right third and fourth enclosures? (proposal Q1, docs/16 §5 —
      assumption: yes; if not, only two `AdventureId` members and two art slots move.)
- [ ] `ZOO_BACKPACK_ART` for the third opening plate ("¿Me ayudás?") is this document's pick from
      shipped art; the author may want the cart or a new drawing.
- [ ] The six owed drawings stay listed in docs/16 §7 and in this table; placeholders may ship on
      the branch (proposal Q2's assumption).

---

*Length note: this design exceeds the skill's 800-word budget, the recorded deviation its
predecessors took under `delivery_strategy: exception-ok`. `openspec/config.yaml` requires every
architecture decision to carry its rationale, and four of the eight above are measured rather than
argued.*
