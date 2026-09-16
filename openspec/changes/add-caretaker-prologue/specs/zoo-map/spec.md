# Delta for Zoo Map

## MODIFIED Requirements

### Requirement: Entrance and Night Backdrops Resolve Through the Adventure-Keyed Registry

The `peces` adventure (`glass1`, `glass2`) MUST resolve the aquarium
backdrop with the SAME `tile` and luma literals the old `glass` row
carried; the `tortugas` adventure (`sand1`, `sand2`) MUST resolve the sand
backdrop with the SAME `tile` and luma literals the old `sand` row
carried — both surfaces are unchanged by the regrouping, only the key
they resolve through changes. The `monos` adventure (`glass3`, `glass4`)
MUST resolve a NEW leaf-veil backdrop row, and the `sendero` adventure
(`sand3`, `sand4`) MUST resolve a NEW mud-veil backdrop row — both
satisfying `trace-canvas`'s 55-luma law (see that capability's delta). The
`night` adventure (`night1..4`) MUST continue to resolve the night
backdrop, UNAFFECTED by this re-key — each via `backdropFor(levelId)` →
`adventureFor(levelId).id`, the same lookup shipped for sheep/llama. The
night backdrop's registered `brightest` sample MUST remain measured
directly from its own authored source (`fondo nocturno.png`), and its
registry entry MUST continue to reference only the built file
`sector-night-background.png`, never `bosque` or `forest` directly — both
facts unchanged by this change.

(Previously: this requirement named the `glass` adventure resolving the
aquarium backdrop and the `sand` adventure resolving the sand backdrop;
`AdventureId` no longer carries `'glass' | 'sand'`, so those two clauses
are re-keyed to `peces`/`tortugas`, and two new clauses cover `monos`/
`sendero`, which did not exist as separate adventures before.)

#### Scenario: backdropFor resolves each new entrance adventure to its own backdrop

- GIVEN a `peces`, `tortugas`, `monos`, and `sendero` level id (`glass1`,
  `sand1`, `glass3`, `sand3` respectively)
- WHEN `backdropFor` is called for each
- THEN each MUST return its own registered backdrop, and `peces`'s and
  `tortugas`'s MUST equal the old `glass`/`sand` rows' literals unchanged

#### Scenario: night is unaffected by the re-key

- GIVEN a `night` level id
- WHEN `backdropFor` is called
- THEN it MUST still return the night backdrop, with its `brightest`
  sample and file reference unchanged from before this change

#### Scenario: The night backdrop's brightest still reflects its own file, not the forest's

- GIVEN the night backdrop's registered `brightest` and the forest
  source's own sampled brightest
- WHEN compared
- THEN they MUST still differ, unaffected by this change

## ADDED Requirements

### Requirement: Adventure Identifiers Regroup the Entrance Into Four Enclosures

`AdventureId` SHALL lose `'glass' | 'sand'` and gain `'peces' |
'tortugas' | 'monos' | 'sendero'`. `ADVENTURES` SHALL carry four entrance
rows in place of the two it carries today:

| Adventure id | `levelIds` |
|---|---|
| `peces` | `glass1`, `glass2` |
| `tortugas` | `sand1`, `sand2` |
| `monos` | `glass3`, `glass4` |
| `sendero` | `sand3`, `sand4` |

No level id is renamed, dropped, or duplicated: the union of the four
rows' `levelIds`, taken together, MUST equal the set `{glass1, glass2,
glass3, glass4, sand1, sand2, sand3, sand4}`, and filtering that union
down to the `glass*` ids MUST yield `glass1, glass2, glass3, glass4` in
that order, and down to the `sand*` ids MUST yield `sand1, sand2, sand3,
sand4` in that order — the eight original ids, in their original order,
regrouped but never renumbered. `introLevel()` and `closingLevel()` stay
unchanged in shape: `introLevel()` still matches `levelIds[0]`,
`closingLevel()` still matches `levelIds.at(-1)` plus a defined
`closingBeat`.

#### Scenario: The four rows' levelIds union equals the eight original ids

- GIVEN `peces.levelIds`, `tortugas.levelIds`, `monos.levelIds`, and
  `sendero.levelIds`
- WHEN their union is computed
- THEN it MUST equal `{glass1, glass2, glass3, glass4, sand1, sand2,
  sand3, sand4}`, with no id missing, renamed, or duplicated

#### Scenario: Each family's internal order survives the regrouping

- GIVEN that same union
- WHEN filtered down to `glass*` ids and, separately, to `sand*` ids
- THEN the first filter MUST yield `glass1, glass2, glass3, glass4` in
  that order, and the second MUST yield `sand1, sand2, sand3, sand4` in
  that order

#### Scenario: introLevel resolves glass3 and sand3 as new adventure starts

- GIVEN `introLevel('glass3')` and `introLevel('sand3')`
- WHEN evaluated after the regrouping
- THEN both MUST return their own adventure (`monos`, `sendero`
  respectively) — unlike before this change, when both were `undefined`

#### Scenario: closingLevel resolves glass2, sand2, glass4, and sand4 as adventures end

- GIVEN `closingLevel('glass2')`, `closingLevel('sand2')`,
  `closingLevel('glass4')`, and `closingLevel('sand4')`
- WHEN evaluated
- THEN all four MUST return their own adventure (`peces`, `tortugas`,
  `monos`, `sendero` respectively), each carrying a defined `closingBeat`

### Requirement: Four Entrance Rows Carry the docs/16 §9 Script Verbatim

Each entrance adventure's `intro` line and its closing beat's `line` MUST
match docs/16 §9 exactly:

| Adventure | `intro` | Closing beat `line` |
|---|---|---|
| `peces` | "El vidrio de la pecera está todo empañado. ¿Lo limpiamos?" | "¡Las algas, el cofre, las piedras… pero no hay ni un pez!" |
| `tortugas` | "La arena tapó todo el recinto. Barrámosla." | "Las piedras, el tronco… ¿y las tortugas dónde están?" |
| `monos` | "Cayeron un montón de hojas. ¿Las sacamos?" | "Las sogas, las frutas… acá tampoco hay nadie." |
| `sendero` | "El sendero quedó lleno de barro." | "¡Mirá! ¿Y esto? ¡Son huellas!" (first beat only — the second beat is specified in "closingBeat Becomes an Ordered, Non-Empty Beat List") |

`peces`'s, `tortugas`'s, and `monos`'s closing beat MUST carry a wooden
zoo-sign image through `detective/CaptionedArt.tsx` — `SIGN_ART.fish`,
`SIGN_ART.turtles`, `SIGN_ART.monkeys`, emitted from
`sign-fish.png`/`sign-turtles.png`/`sign-monkeys.png`.

**The uppercase word lives IN the sign artwork, not in a second DOM
label.** `AdventureClosing` renders exactly one `CaptionedArt`
(`screen/AdventureClosing.tsx:61`): one image, one caption. That caption
is the beat's `line`, which the table above pins verbatim. A separate
`PECES`/`TORTUGAS`/`MONOS` label would need either a second captioned
element on the stage or the sentence's removal, and the sentence is scope
(`docs/16` §9). `docs/16` §1 describes the sign as "un cartel con imagen +
la palabra", so a sign whose drawing carries its own word is the artefact
the brief asks for, and `scripts/art/make_placeholders.py` draws that word
into the placeholder rather than owing it. The testable invariant is
therefore **which art the beat points at**, not a label string.

`ClosingBeat` gains no `signLabel` field.

#### Scenario: Each adventure's intro line matches docs/16 §9 verbatim

- GIVEN `peces.intro`, `tortugas.intro`, `monos.intro`, and
  `sendero.intro`
- WHEN read
- THEN each MUST equal its table row above, character for character

#### Scenario: Each sign-bearing adventure's closing line and sign art match

- GIVEN `peces`, `tortugas`, and `monos`'s closing beat
- WHEN their `line` and their `art` are read
- THEN `line` MUST equal the table above character for character, and
  `art` MUST be `SIGN_ART.fish`, `SIGN_ART.turtles`, or
  `SIGN_ART.monkeys` respectively

#### Scenario: Every closing beat's text passes the caption audit

- GIVEN each of the three sign-bearing closings rendered via
  `renderToString`
- WHEN `auditCaptions` runs on the resulting HTML string
- THEN `uncaptioned` MUST be `[]`

### Requirement: closingBeat Becomes an Ordered, Non-Empty Beat List

`Adventure.closingBeat` changes shape from an optional single `{ line,
art }` object to an optional, non-empty, ORDERED `readonly Beat[]`
(`Beat = { line: string; art: … }`), rendered in sequence by
`AdventureClosing` (`main-screen` "AdventureClosing Screen Renders the
Transformation"). `peces`, `tortugas`, and `monos` each declare exactly
ONE beat (the sign closing from "Four Entrance Rows Carry the docs/16 §9
Script Verbatim"). `sendero` declares exactly TWO beats, in order:

1. The footprints beat: `line` = "¡Mirá! ¿Y esto? ¡Son huellas!", art
   showing the footprints already shipped (`zoo-octopus-print.png`/
   `clue-footprint-*.png`).
2. The magnifier beat: `line` = "¡Se fueron todos los animales! Agarrá la
   lupa: los vamos a buscar." — the game's pre-existing (and, before this
   change, only) `closingBeat` line, carried forward unchanged in wording
   but moved from the old `sand` row to `sendero`'s second beat, with art
   reusing `carrier-octopus.png` (the shipped Pulpito-with-lupa art).

No pre-existing adventure outside the four entrance rows gains or loses a
`closingBeat` because of this change.

#### Scenario: peces, tortugas, and monos each declare exactly one beat

- GIVEN `peces.closingBeat`, `tortugas.closingBeat`, and
  `monos.closingBeat`
- WHEN their length is read
- THEN each MUST be an array of length 1

#### Scenario: sendero declares exactly two beats, in order

- GIVEN `sendero.closingBeat`
- WHEN read
- THEN it MUST be an array of length 2, whose first `line` is the
  footprints line and whose second `line` is the magnifier line, in that
  order

#### Scenario: The magnifier line is carried forward verbatim

- GIVEN `sendero.closingBeat[1].line`
- WHEN compared to the pre-existing `sand` row's closing line, before
  this change
- THEN they MUST be character-for-character identical

#### Scenario: No pre-existing closingBeat-less adventure gains one

- GIVEN every adventure row other than the four entrance rows (e.g.
  `duck-trail`, `sheep-hill`, `night`, `snake`, `bee`, `hedgehog`)
- WHEN `closingBeat` is read
- THEN it MUST remain absent, unchanged from before this change

### Requirement: entrada's Level Ids Keep Their Identity and Per-Family Order, and Play in Narrative Order

`entrada.adventureIds` (a LEVEL-id list, per this field's existing
misnomer, `zoo/sectors.ts:334`) MUST continue to hold exactly the same
eight level ids as before this change — no id renamed, added or removed —
and MUST preserve each surface family's internal order (`glass1` before
`glass2` before `glass3` before `glass4`; the same for `sand1..sand4`),
because `levels/catalog.ts` asserts a monotonic difficulty ladder per
family. `entrada.unlockedWhen` MUST continue to always return `true`.

The flat order of the list is NOT byte-identical to before this change,
and MUST NOT be asserted as such. `resolveNextAction` returns
`{ type: 'exit' }` for every level a zoo sector owns
(`screen/GameScreen.tsx:223`), so finishing an entrance level always
returns to the map and the next level is chosen by `nextAdventure`, which
takes the first unfiled id in THIS list (`zoo/sectors.ts:495-497`).
The list is therefore the play order, and it MUST be
`glass1, glass2, sand1, sand2, glass3, glass4, sand3, sand4` so the four
enclosures play in the order `docs/16` §9's script requires: peces,
tortugas, monos, sendero. Left in its previous flat order the child would
meet `monos` second and `tortugas` third, contradicting both the script
and the difficulty ladder `docs/16` §5 lays out.

#### Scenario: the eight level ids survive the regrouping with their families intact

- GIVEN `entrada.adventureIds`
- WHEN read after this change
- THEN it MUST contain exactly the same eight ids as before this change,
  with `glass1, glass2, glass3, glass4` in that relative order and
  `sand1, sand2, sand3, sand4` in that relative order, and
  `entrada.unlockedWhen` MUST still return `true` for every input

#### Scenario: the list orders the four enclosures the way the script tells them

- GIVEN a child with no filed entrance levels
- WHEN they tap `entrada` on the map, finish each level, and tap again
- THEN `nextAdventure` MUST hand them `glass1, glass2, sand1, sand2,
  glass3, glass4, sand3, sand4` in that order, so the adventures they
  meet are `peces`, then `tortugas`, then `monos`, then `sendero`

### Requirement: isFiled('sand4') Still Unlocks estanque, Unaffected by the Regrouping

`estanque.unlockedWhen` MUST remain exactly `isFiled(records, 'sand4')`,
byte-identical to before this change. `sand4` remains the last level id
of the `sendero` adventure's `levelIds` (per "Adventure Identifiers
Regroup the Entrance Into Four Enclosures"), so this condition is
satisfiable exactly as before — which `AdventureId` a level belongs to is
irrelevant to this unlock check, which reads only the level id itself.

#### Scenario: Filing sand4 still opens the estanque

- GIVEN `Records` where `sand4` is filed
- WHEN `estanque.unlockedWhen(records)` is evaluated
- THEN it MUST return `true`, exactly as before this change

#### Scenario: estanque.unlockedWhen's source is untouched by this change

- GIVEN `estanque.unlockedWhen`'s implementation
- WHEN compared before and after this change
- THEN it MUST be byte-identical

---

**Accepted deviation:** this delta exceeds the skill's 650-word cap, the
same deviation this project's other capability specs already record under
`delivery_strategy: exception-ok`. Extending the hand-enumerated guards
(`zoo/adventures.test.ts`, `levels/catalog.test.ts`) rather than deleting
them (the change's highest-likelihood risk) needs exactly the explicit
union/order and unchanged-unlock assertions this delta writes down.
