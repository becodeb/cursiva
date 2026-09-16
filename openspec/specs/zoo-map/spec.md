# Zoo Map Specification

## Purpose

`docs/12_MAPA_DEL_ZOOLOGICO.md`: one drawn illustration with registered layers,
replacing the level-list entry screen. Owns the sector registry, its geometry
invariants, the layer stack, the HUD, and the `?debug=sectores` overlay.

## Requirements

### Requirement: Sector Registry Data Shape

`client/src/zoo/sectors.ts` SHALL export `SECTORS: readonly ZooSector[]`, each
entry carrying `id`, an optional `hit: Rect`, `fog: readonly FogPatch[]`,
`animalSpot: {x,y}`, `animals: readonly ZooAnimal[]`, `adventureIds: readonly
string[]` in play order, and a pure `unlockedWhen(records): boolean`.
`PLAZA: Rect` and `PLAZA_CENTRE` SHALL also be exported. `hit` MUST be absent
only for the sendero.

#### Scenario: Registry exports all seven sectors
- GIVEN `SECTORS`
- WHEN its ids are read
- THEN all seven sector ids MUST be present, sendero included

#### Scenario: hit is optional and absent only for the sendero
- GIVEN `SECTORS`
- WHEN each sector's `hit` field is checked
- THEN exactly the sendero MUST have no `hit`

### Requirement: Sector Geometry Invariants

Every sector with a `hit` MUST be at least 120×120. No two `hit` rects MAY
overlap each other, and none MAY overlap `PLAZA`. A sector without a `hit`
MUST be excluded from both checks and MUST never be tappable or fogged.

#### Scenario: Every hit meets the minimum size
- GIVEN every sector with a `hit`
- WHEN its width and height are read
- THEN both MUST be at least 120

#### Scenario: No two hits overlap or touch the plaza
- GIVEN every pair of `hit` rects, and each `hit` against `PLAZA`
- WHEN overlap is tested
- THEN no pair MUST intersect

#### Scenario: The sendero is skipped by both geometry checks
- GIVEN the sendero's entry in `SECTORS`
- WHEN the size and overlap checks run
- THEN it MUST be excluded from both, since it has no `hit`

### Requirement: Fog Containment Invariant

For every closed sector (one whose `unlockedWhen` is not unconditionally
`true`) that carries a `hit`, the union of that sector's `fogBoxes` MUST fully
contain the `hit`. A sector with no `hit` carries no fog obligation.

#### Scenario: Fog covers the whole hit for a closed sector
- GIVEN a closed sector's fog rects and its `hit`
- WHEN `coversRect` is applied
- THEN it MUST return `true`

#### Scenario: Shrinking a patch breaks coverage
- GIVEN a closed sector's fog rects with one patch's size halved
- WHEN `coversRect` is applied
- THEN it MUST return `false`

### Requirement: Image-to-ViewBox Transform and Background

The map `<image>` SHALL render inside a `0 0 1000 600` viewBox at
`preserveAspectRatio="xMidYMid slice"`, mapping the 1536×1024 source PNG
by `vbX = imgX × 0.651042`, `vbY = imgY × 0.651042 − 33.333`. The
document background behind the letterboxed SVG MUST be `#76B56A` and MUST
NOT be white. `imageToViewBox`/`viewBoxToImage` SHALL gain an optional
sheet-width parameter defaulting to `1000` (the pre-existing `STAGE_W`),
so every one of the fifteen existing callers, which pass no argument,
MUST stay byte-identical to before this change. A caller measuring a
wider sheet (e.g. `backdrops.test.ts`'s dolphin corridor check) MUST pass
its actual sheet width explicitly.

(Previously: `imageToViewBox`/`viewBoxToImage` took no sheet-width
parameter and always computed against the hardcoded `STAGE_W = 1000`.)

#### Scenario: Transform matches the measured scale factor

- GIVEN a measured point on the source PNG
- WHEN it is converted with the two transform lines
- THEN the result MUST equal the registry's corresponding `hit`
  coordinate

#### Scenario: Background renders the measured green

- GIVEN the map rendered via `renderToString`
- WHEN the outer background colour is read
- THEN it MUST equal `#76B56A`, never white

#### Scenario: Every existing caller stays byte-identical at the default width

- GIVEN each of the fifteen existing `imageToViewBox`/`viewBoxToImage`
  call sites, invoked with no sheet-width argument, before and after this
  change
- WHEN their return values are compared
- THEN they MUST be identical

#### Scenario: A caller passing a wider sheet gets a different, correct result

- GIVEN `viewBoxToImage` called once at the default width and once at a
  wider explicit sheet width, for the same viewBox point
- WHEN the two results are compared
- THEN they MUST differ, and the wider-sheet result MUST match the row
  `build_art.py`'s sampling would report for that sheet


#### Scenario: Transform matches the measured scale factor
- GIVEN a measured point on the source PNG
- WHEN it is converted with the two transform lines
- THEN the result MUST equal the registry's corresponding `hit` coordinate

#### Scenario: Background renders the measured green
- GIVEN the map rendered via `renderToString`
- WHEN the outer background colour is read
- THEN it MUST equal `#76B56A`, never white

### Requirement: Sector-to-Adventure Mapping

`estanque.adventureIds` MUST equal, in order: `duck-trail1`, `duck-trail2`,
`duck-trail3`, `duck-trail4`, `f2-guirnalda`, `f2-agua2`, `f2-agua3`,
`f2-agua4`. `montanas.adventureIds` MUST equal, in order, `sheep-hill1..4`
then `llama-peak1..4`. `entrada.adventureIds` MUST equal, in order,
`glass1..4` then `sand1..4`, and `entrada.unlockedWhen` MUST always return
`true`. `nocturna.adventureIds` MUST equal, in order, `night1..4`, and
`nocturna.unlockedWhen` MUST return `true` exactly once `llama-peak4` is
filed. `arena.adventureIds` MUST equal, in order, `snake1..4`, and
`arena.unlockedWhen` MUST return `true` exactly once `night4` is filed.
`bosque` and `sendero` MUST have empty `adventureIds` and MUST render
fogged (or, for `sendero`, have no `hit` to fog at all) for every input.

(Previously: `bosque` and `arena` were the two sectors asserted to carry
empty `adventureIds` and stay fogged for every input; `docs/13` §8 row E
promotes `arena` out of that set. `design.md` §7.1 narrows the set this
requirement asserts to `bosque` and `sendero` — row F's own sector plus
the scenery-only sendero, which has always carried empty `adventureIds`
and an always-false `unlockedWhen`.)

#### Scenario: Estanque's eight adventures are in the exact order

- GIVEN `estanque.adventureIds`
- WHEN read
- THEN it MUST equal the eight ids above, in that order

#### Scenario: Montañas' eight adventures are in the exact order

- GIVEN `montanas.adventureIds`
- WHEN read
- THEN it MUST equal `sheep-hill1..4, llama-peak1..4`, in that order

#### Scenario: Entrada's eight levels are glass then sand, and entrada is never fogged

- GIVEN `entrada.adventureIds` and `entrada.unlockedWhen`, evaluated for
  any `Records`
- WHEN read
- THEN `adventureIds` MUST equal `glass1..4, sand1..4` in that order, and
  `unlockedWhen` MUST return `true` for every input

#### Scenario: Nocturna stays fogged until llama-peak4 is filed

- GIVEN `nocturna.adventureIds` and `Records` where `llama-peak4` is
  unfiled, then filed
- WHEN `nocturna.unlockedWhen` is evaluated for each
- THEN it MUST return `false` then `true`, and `adventureIds` MUST equal
  `night1..4`

#### Scenario: Arena stays fogged until night4 is filed, then opens with snake1..4

- GIVEN `arena.adventureIds` and `Records` where `night4` is unfiled, then
  filed
- WHEN `arena.unlockedWhen` is evaluated for each
- THEN it MUST return `false` then `true`, and `adventureIds` MUST equal
  `snake1, snake2, snake3, snake4`

#### Scenario: Bosque and sendero remain empty and closed for every input

- GIVEN `bosque` and `sendero`
- WHEN `adventureIds` and `unlockedWhen` are checked for any `Records`
- THEN `adventureIds` MUST be empty and `unlockedWhen` MUST return `false`
  for both

### Requirement: Estanque Starts Discovered

`estanque.unlockedWhen` MUST return `true` for an empty `Records` object, and
the footprint trail MUST run from `PLAZA_CENTRE` to the estanque's `hit`
centre whenever it is `recentlyDiscovered`'s target.

#### Scenario: Estanque is open before any record exists
- GIVEN an empty `Records` object
- WHEN `estanque.unlockedWhen` is evaluated
- THEN it MUST return `true`

#### Scenario: Footprints originate at the plaza and end at the estanque
- GIVEN `footprintTrail(PLAZA_CENTRE, estanque.hit centre)`
- WHEN its first and last print positions are read
- THEN they MUST lie on the segment from the plaza to the estanque

### Requirement: nextAdventure Resolution

`nextAdventure(sector, records)` MUST return the first `adventureIds` entry
not yet filed; if all are filed, it MUST return the last entry; if
`adventureIds` is empty, it MUST return `null`.

#### Scenario: First unfinished adventure is returned
- GIVEN a sector with its first two adventures filed
- WHEN `nextAdventure` is called
- THEN it MUST return the third adventure's id

#### Scenario: A fully filed sector returns its last adventure
- GIVEN a sector with every adventure filed
- WHEN `nextAdventure` is called
- THEN it MUST return the last id in `adventureIds`

#### Scenario: A sector with no adventures returns null
- GIVEN a sector whose `adventureIds` is empty
- WHEN `nextAdventure` is called
- THEN it MUST return `null`

### Requirement: Recovered Animal Placement

A `ZooAnimal` MUST appear at its sector's `animalSpot` (offset by `dx`/`dy`)
exactly when every id in its own `appearsWhen` is filed. The estanque's duck
MUST appear once `duck-trail4` is filed, not when the sector's last adventure
is filed. Every placed animal MUST be positioned by `STANDING_GRIP`.

#### Scenario: Duck appears after its own trail, before the sector finishes
- GIVEN `duck-trail4` filed and `f2-agua4` unfiled
- WHEN `animalPlacements(estanque, records)` is read
- THEN the duck MUST be present

#### Scenario: Duck is absent before duck-trail4 is filed
- GIVEN `duck-trail4` unfiled
- WHEN `animalPlacements(estanque, records)` is read
- THEN the duck MUST be absent

#### Scenario: Placement uses the standing grip
- GIVEN a placed animal's box
- WHEN its bottom edge is compared to `animalSpot.y`
- THEN they MUST coincide, per `STANDING_GRIP`

### Requirement: Layer Order

The rendered SVG MUST stack, bottom to top: background, map image, fog per
closed sector, recovered animals, footprint trail, octopus-with-backpack,
sector hit-test rects, then the debug overlay when active. The HUD renders as
DOM after the SVG.

#### Scenario: Fog renders above the map and below animals
- GIVEN the rendered markup
- WHEN element order is read
- THEN the map image MUST precede fog, which MUST precede animal images

#### Scenario: HUD nodes render outside the SVG element
- GIVEN the rendered markup
- WHEN the HUD's DOM nodes are located
- THEN they MUST be siblings of, not children of, the `<svg>`

### Requirement: HUD Captioning

The backpack, the recovered-animal row, and the star count MUST render as DOM
nodes outside the `<svg>`. Every visible word, including the star count and
the octopus's phrase, MUST pass `auditCaptions`
(`CAPTION_CONTAINERS = ['cv-captioned','pistas-bar']`) — no word MAY render
without an accompanying image sibling.

#### Scenario: auditCaptions reports zero uncaptioned words
- GIVEN the map rendered via `renderToString`
- WHEN `auditCaptions` runs on the HTML string
- THEN `uncaptioned` MUST be `[]`

#### Scenario: A hand-built bare word fails the same assertion
- GIVEN a hand-built HTML string with a bare word outside any licensed container
- WHEN `auditCaptions` runs
- THEN `uncaptioned` MUST be non-empty, proving the assertion can fail

### Requirement: Star Derivation

`starsFor(record) = min(record.approvals, APPROVALS_TO_UNLOCK)`.
`totalStars(records)` MUST sum `starsFor` only over records whose key is a
real catalog level id; it MUST persist no new state and MUST NOT count
`<caseId>-deduce` pseudo-records.

#### Scenario: totalStars ignores pseudo-records
- GIVEN records including `duck-deduce` with `approvals: 1`
- WHEN `totalStars` is computed
- THEN `duck-deduce` MUST contribute nothing

#### Scenario: A record above the cap contributes only the cap
- GIVEN a real level record with `approvals: 5`
- WHEN `starsFor` is computed
- THEN it MUST return `APPROVALS_TO_UNLOCK` (2), not 5

### Requirement: Backpack Registry

`client/src/zoo/backpack.ts` MUST export `BackpackItem`, `BACKPACK_ITEMS:
readonly BackpackItem[]` holding exactly four entries — the existing
`{id: 'andean-hat', art: ANDEAN_HAT_ART, grantedBy: 'montanas',
earnedWhen: ['llama-peak4']}`, `{id: 'lupa', art: CARRIER_LENS_ART,
grantedBy: 'entrada', earnedWhen: ['sand4']}`, and `{id: 'linterna', art:
SECTOR_FLASHLIGHT_ART, grantedBy: 'nocturna', earnedWhen: ['night4']}` —
plus `{id: 'carrito', art: CART_ART, grantedBy: 'arena', earnedWhen:
['snake4']}` — and `earnedItems(records)`, which MUST return only the
subset of these four whose `earnedWhen` id is filed.

(Previously: `BACKPACK_ITEMS` held exactly three entries.)

#### Scenario: Each item is absent before its own earnedWhen id is filed

- GIVEN `Records` where none of `llama-peak4`, `sand4`, `night4`,
  `snake4` is filed
- WHEN `earnedItems(records)` is called
- THEN it MUST return `[]`

#### Scenario: The cart is present once snake4 is filed

- GIVEN `Records` where `snake4` is filed and the other three are not
- WHEN `earnedItems(records)` is called
- THEN it MUST include `carrito` and MUST NOT include `andean-hat`,
  `lupa`, or `linterna`

#### Scenario: earnedItems returns exactly the earned subset

- GIVEN `Records` where all four ids are filed
- WHEN `earnedItems(records)` is called
- THEN it MUST include all four entries and no others

### Requirement: Sector Debug Overlay

`isSectorDebug(search: string)`, exported from `canvas/devMode.ts`, MUST be a
pure function parsing `?debug=sectores`. When it returns `true`, the map MUST
paint every sector's `hit` and `animalSpot` as translucent markers. It MUST
NOT be gated by `isDevMode()` and MUST add no new caption word.

#### Scenario: The flag is parsed by a pure function
- GIVEN `isSectorDebug` called directly with a query string
- WHEN inspected
- THEN it MUST require no `window` access and no component context

#### Scenario: Enabling the flag paints translucent markers
- GIVEN `isSectorDebug('?debug=sectores')` is `true`
- WHEN the map renders
- THEN every sector's `hit` and `animalSpot` MUST render as translucent markers

#### Scenario: The flag adds no visible word
- GIVEN the debug overlay active
- WHEN `auditCaptions` runs
- THEN `uncaptioned` MUST remain `[]`

### Requirement: Fog Fade Motion

The newly-discovered sector's fog patches MUST fade once over 1.5 seconds via
an opacity CSS animation, and MUST render with `animation: none` under
`prefers-reduced-motion: reduce`.

#### Scenario: Exactly one sector's fog carries the fade class
- GIVEN `recentlyDiscovered` resolves to the estanque
- WHEN the rendered markup is inspected
- THEN only the estanque's fog patches MUST carry the fade class

#### Scenario: Reduced motion disables the animation
- GIVEN the scoped stylesheet's `@media (prefers-reduced-motion: reduce)` rule
- WHEN inspected
- THEN it MUST set `animation: none` on the fade class

### Requirement: Octopus Phrase Reads as a Closing Once the Sector's Animal Is Recovered

The map's `discovered`-bubble phrase SHALL be chosen by a pure phrase
selector over `records`. When a sector carries more than one adventure
(`montañas`: sheep, then llama), the selector MUST pick the MOST RECENTLY
recovered adventure — the last matching entry in registry order whose
animal has been placed — not merely the first adventure that matches.
Before any of a sector's adventures is recovered, the phrase MUST remain
the existing onward-pointing line. Once at least one is recovered, the
phrase MUST read as that adventure's own closing line, and MUST update to a
later adventure's closing line once that one is also recovered. The phrase
MUST still render only through `CaptionedArt`, keeping `auditCaptions`
green.

(Previously: the lookup used the first matching adventure
[`ADVENTURES.find`], which was unobservably correct only because every
sector carried at most one adventure; `montañas` now carries two, so the
lookup MUST become "most recently recovered" [`ADVENTURES.filter(...).at(-1)`]
to ever surface the second adventure's closing line.)

#### Scenario: Before any adventure is recovered, the phrase still points onward

- GIVEN `duck-trail4` unfiled and the estanque resolved as
  `recentlyDiscovered`
- WHEN the phrase selector is evaluated for the estanque
- THEN it MUST equal the existing onward-pointing phrase

#### Scenario: With one of two adventures recovered, its own closing line shows

- GIVEN `sheep-hill4` filed and `llama-peak4` unfiled, for the montañas
  sector
- WHEN the phrase selector is evaluated for montañas
- THEN it MUST equal the sheep adventure's closing line

#### Scenario: With both adventures recovered, the later one's closing line shows

- GIVEN both `sheep-hill4` and `llama-peak4` filed
- WHEN the phrase selector is evaluated for montañas
- THEN it MUST equal the llama adventure's closing line, not the sheep
  adventure's

#### Scenario: The closing phrase still passes the caption audit

- GIVEN the map rendered via `renderToString` with an adventure recovered
- WHEN `auditCaptions` runs on the resulting HTML string
- THEN `uncaptioned` MUST be `[]`


### Requirement: No url(#…) References

No element added by this change MAY reference `url(#…)` — no `<defs>`,
`<mask>`, `<clipPath>`, `<pattern>`, or filter — because `TraceCanvas.tsx:69-86`
records that such references hydrate blank on real devices.

#### Scenario: Rendered markup contains zero url(# occurrences
- GIVEN the map rendered via `renderToString`
- WHEN the HTML string is scanned for `url(#`
- THEN zero occurrences MUST be found

---

**Accepted deviation:** this spec exceeds the skill's 650-word cap, the same
deviation `proposal.md` and `design.md` recorded for this change.
`config.yaml` requires Given/When/Then and RFC 2119 keywords for every
requirement; this capability carries fifteen independently testable
invariants — the registry shape, three geometry proofs, the transform, the
adventure map, two navigation rules, one placement rule, layering, captioning,
stars, the backpack stub, the debug flag, one animation, and one prohibition —
none of which could be dropped or merged without losing an assertion the
harness (or a screenshot) can actually check.

## ADDED Requirements

### Requirement: Montañas Sector Opened With Two Adventures and Two Animals

`montañas.unlockedWhen` MUST return `true` exactly once `duck-trail4` is
filed — the first `unlockedWhen` in the registry that is neither
`alwaysOpen` nor `alwaysClosed`. Its `animals` array MUST hold `oveja`
(`appearsWhen: ['sheep-hill4']`) and `llama` (`appearsWhen:
['llama-peak4']`), each typed `ZooAnimal.id: ZooAnimalId`
(`detective-mode` "ZooAnimalId Widens the Zoo's Animal Vocabulary"). The
llama's placement offset MUST sit higher (a smaller or negative `dy`) than
the sheep's, matching the cumbre standing above the ladera.

#### Scenario: Montañas stays closed until duck-trail4 is filed

- GIVEN `Records` where `duck-trail4` is unfiled
- WHEN `montañas.unlockedWhen(records)` is evaluated
- THEN it MUST return `false`

#### Scenario: Montañas opens once duck-trail4 is filed

- GIVEN `Records` where `duck-trail4` is filed
- WHEN `montañas.unlockedWhen(records)` is evaluated
- THEN it MUST return `true`

#### Scenario: Each animal appears only after its own adventure's last level

- GIVEN `sheep-hill4` filed and `llama-peak4` unfiled
- WHEN `animalPlacements(montañas, records)` is read
- THEN the sheep MUST be present and the llama MUST be absent

#### Scenario: The llama stands higher than the sheep

- GIVEN both animals placed
- WHEN their placement offsets are compared
- THEN the llama's `dy` MUST place it higher on the sheet than the sheep's

### Requirement: Adventure Backdrop Registry Re-Keyed to the Adventure

The backdrop registry SHALL be keyed by `AdventureId`
(`Partial<Record<AdventureId, AdventureBackdrop>>`), not `SectorId`, so one
sector may carry more than one backdrop. `Adventure` SHALL gain a required
`id: AdventureId`. `backdropFor(levelId)` MUST resolve through
`adventureFor(levelId).id`. The sheep adventure MUST resolve the ladera
backdrop with `channel: CHANNEL_STONE`; the llama adventure MUST resolve
the cordillera backdrop with `channel: CHANNEL_STONE`; the duck adventure
MUST continue resolving the lagoon backdrop with no `channel` field. A
level belonging to no adventure (a medusa level, `trail1..4`) MUST continue
to resolve `undefined`.

#### Scenario: The sheep adventure resolves the ladera with the stone channel

- GIVEN `sheep-hill2`'s level id
- WHEN `backdropFor` is called
- THEN it MUST return the ladera backdrop with `channel === CHANNEL_STONE`

#### Scenario: The llama adventure resolves the cordillera with the stone channel

- GIVEN `llama-peak2`'s level id
- WHEN `backdropFor` is called
- THEN it MUST return the cordillera backdrop with `channel ===
  CHANNEL_STONE`

#### Scenario: The duck adventure is unaffected by the re-key

- GIVEN a duck trail id
- WHEN `backdropFor` is called
- THEN it MUST return the lagoon backdrop with no `channel` field, byte-
  identical to before this change

#### Scenario: Unbacked levels still resolve undefined

- GIVEN a medusa level id and `trail1`
- WHEN `backdropFor` is called for each
- THEN both MUST return `undefined`

### Requirement: recentlyDiscovered Prefers the Untouched Sector, and Falls Back to Today's Rule

`recentlyDiscovered(records)` SHALL prefer the first OPEN sector (per
`unlockedWhen`, in registry order) none of whose `adventureIds` levels has
ever been attempted, reading only the `attempts` field the store already
keeps — no new persisted key (`sectors.ts:441`'s proposed `<sector>-seen`
key is declined). When NO open sector meets that condition, it MUST fall
back to the pre-existing rule, unchanged from before this change, so the
function MUST NOT start returning no sector while any open sector has
unfinished work — every shipped `sectors.test.ts` row for the existing rule
MUST stay green.

(`design.md` §7.2 corrects the proposal's own rule the same way A1–A4
correct the proposal: "the first open sector none of whose adventures has
ever been attempted," taken as the WHOLE rule, would regress to no sector
for a child mid-way through the entrance — `entrada` already has an attempt
and `estanque` is not yet open — which the existing shipped behaviour never
does. The untouched-sector check is a PREFERENCE layered in front of the
existing rule, not a replacement of it.)

#### Scenario: A fresh install prefers the first open sector

- GIVEN empty `Records`
- WHEN `recentlyDiscovered` is evaluated
- THEN it MUST return the first sector, in registry order, whose
  `unlockedWhen` is `true` and none of whose levels has been attempted

#### Scenario: Attempting that sector's first level moves the preference onward

- GIVEN the sector from the prior scenario with its first level attempted,
  and a later sector meeting the untouched condition
- WHEN `recentlyDiscovered` is evaluated again
- THEN it MUST return that later sector, not the one just attempted

#### Scenario: No untouched sector falls back to today's rule, never to no sector

- GIVEN every open sector has at least one attempted level, with at least
  one open sector still having unfiled work
- WHEN `recentlyDiscovered` is evaluated
- THEN it MUST return the same sector the pre-existing rule would have
  returned, unchanged from before this change — it MUST NOT return no
  sector while unfinished work remains

### Requirement: Animal-less Adventures Are Excluded From the Animal-Keyed Closing Phrase

Since `entrada`'s and `nocturna`'s adventures declare no `animal`
(`zoo/adventures.ts`, `Adventure.animal?`), the map's octopus-phrase
selector (`Octopus Phrase Reads as a Closing Once the Sector's Animal Is
Recovered`) MUST NOT attempt to resolve a closing line for these two sectors
through the animal-placement check; their discovered-bubble phrase, if any,
stays the existing onward-pointing line regardless of how many of their own
levels are filed.

#### Scenario: Filing sand4 does not change entrada's map-bubble phrase

- GIVEN `sand4` filed
- WHEN the phrase selector is evaluated for `entrada`
- THEN it MUST equal the existing onward-pointing phrase, unchanged

#### Scenario: Filing night4 does not change nocturna's map-bubble phrase

- GIVEN `night4` filed
- WHEN the phrase selector is evaluated for `nocturna`
- THEN it MUST equal the existing onward-pointing phrase, unchanged

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

## ADDED Requirements (snake-drag-and-art-corridor)

### Requirement: ZooAnimalId Widens to Include the Víbora, and the Recovered Snake Stands in the Arena

`ZooAnimalId` SHALL widen to `AnimalId | 'oveja' | 'llama' | 'vibora'`.
`ZOO_ANIMAL_ART.vibora` MUST equal `SECTOR_ADVENTURE_ART.snakeMedium` —
the middle-sized snake. `arena.animals` MUST hold exactly one entry,
`{id: 'vibora', appearsWhen: ['snake4']}`, placed at `arena.animalSpot`
via `STANDING_GRIP`, the same mechanism every other recovered animal
uses.

#### Scenario: The víbora appears once snake4 is filed

- GIVEN `snake4` filed
- WHEN `animalPlacements(arena, records)` is read
- THEN the víbora MUST be present

#### Scenario: The víbora is absent before snake4 is filed

- GIVEN `snake4` unfiled
- WHEN `animalPlacements(arena, records)` is read
- THEN the víbora MUST be absent

#### Scenario: ZOO_ANIMAL_ART resolves vibora to the middle snake

- GIVEN `ZOO_ANIMAL_ART.vibora`
- WHEN compared to `SECTOR_ADVENTURE_ART.snakeMedium`
- THEN they MUST be the same art reference

### Requirement: The Snake Adventure Carries No closingBeat

The `snake` adventure row (`zoo/adventures.ts`) MUST NOT declare a
`closingBeat`, for a structural reason as well as a narrative one:
`mapBubble`'s selector filters on `a.animal !== undefined`, so ANY
adventure that recovers an animal (`AdventureSubject`'s `animal` branch)
already carries `docs/13` §5 item 6 through the shipped map bubble the
moment its animal is placed — the víbora stands in the sector and the
Pulpito's line closes it, exactly as the duck, the sheep and the llama
do, none of which carries a `closingBeat`. The once-per-story closing
screen (`main-screen`'s `close` route) stays reserved for the entrance's
sand adventure alone, which recovers no animal and therefore has no
other way to carry that beat.

#### Scenario: The snake adventure declares no closingBeat

- GIVEN the `snake` row in `ADVENTURES`
- WHEN its `closingBeat` field is read
- THEN it MUST be absent

#### Scenario: Filing snake4 changes arena's map-bubble phrase to the víbora's closing line

- GIVEN `snake4` filed
- WHEN the phrase selector (`mapBubble`) is evaluated for `arena`
- THEN it MUST equal the víbora adventure's own closing line, not the
  existing onward-pointing phrase

#### Scenario: resolveCloseAction never fires for a snake level

- GIVEN any of `snake1..4` finished
- WHEN `resolveCloseAction` (`main-screen` capability) is evaluated
- THEN it MUST return `null`, exactly as for `night4` and every other
  adventure with no `closingBeat`## ADDED Requirements

### Requirement: Bosque Sector Opens With the Bee Adventure and the Recovered Bee

`bosque.unlockedWhen` MUST return `true` exactly once `snake4` is filed,
extending the unlock ladder's next rung (`entrada → estanque ← sand4 →
montañas ← duck-trail4 → nocturna ← llama-peak4 → arena ← night4 → bosque`
— every sector unlocks off the immediately-preceding sector's last level,
never a skip). `bosque.adventureIds` MUST equal `bee1, bee2, bee3, bee4`, in
that order. `bosque.animals` MUST hold exactly one entry, `{id: 'abeja',
appearsWhen: ['bee4']}`, placed at `bosque.animalSpot` via `STANDING_GRIP`,
the same mechanism every other recovered animal uses.

#### Scenario: Bosque stays closed until snake4 is filed

- GIVEN `Records` where `snake4` is unfiled
- WHEN `bosque.unlockedWhen(records)` is evaluated
- THEN it MUST return `false`

#### Scenario: Bosque opens once snake4 is filed, with its four adventures

- GIVEN `Records` where `snake4` is filed
- WHEN `bosque.unlockedWhen(records)` is evaluated and `bosque.adventureIds`
  is read
- THEN `unlockedWhen` MUST return `true` and `adventureIds` MUST equal
  `bee1, bee2, bee3, bee4`

#### Scenario: The bee appears once bee4 is filed, and is absent before

- GIVEN `bee4` filed
- WHEN `animalPlacements(bosque, records)` is read
- THEN the bee MUST be present; with `bee4` unfiled, it MUST be absent

### Requirement: AdventureId and ZooAnimalId Widen for the Bee

`AdventureId` SHALL widen to include `'bee'`. The `ADVENTURES` row for `bee`
SHALL carry `animal: 'abeja'` and no `closingBeat` — the snake row is the
template: an animal-recovering adventure closes through the shipped map
bubble the moment its animal is placed, and the once-per-story closing
screen stays reserved for the entrance's sand adventure, which recovers no
animal. `ZooAnimalId` SHALL widen to include `'abeja'`, and
`ZOO_ANIMAL_ART.abeja` MUST equal `SECTOR_ADVENTURE_ART.bee`.

#### Scenario: The bee adventure row declares animal:'abeja' and no closingBeat

- GIVEN the `bee` row in `ADVENTURES`
- WHEN `animal` and `closingBeat` are read
- THEN `animal` MUST equal `'abeja'` and `closingBeat` MUST be absent

#### Scenario: Filing bee4 changes bosque's map-bubble phrase to the bee's closing line

- GIVEN `bee4` filed
- WHEN the phrase selector (`mapBubble`) is evaluated for `bosque`
- THEN it MUST equal the bee adventure's own closing line, not the existing
  onward-pointing phrase

#### Scenario: ZOO_ANIMAL_ART resolves abeja to the bee art

- GIVEN `ZOO_ANIMAL_ART.abeja`
- WHEN compared to `SECTOR_ADVENTURE_ART.bee`
- THEN they MUST be the same art reference

### Requirement: The Forest Backdrop Registry Entry Declares No Channel and No corridorArt

`zoo/backdrops.ts`'s forest row SHALL declare `corridorRows: (191, 926)`
(matching the rebuilt `manifest.json`) and MUST declare neither a `channel`
field nor a `corridorArt` field: the forest paints no channel because no
drawn corridor exists on a waypoint level, and it paints no ground marks
because none are drawn (`docs/13` §4 decision 3). `backdropFor` MUST
resolve every `bee*` level id to this row via the same
`adventureFor(levelId).id` lookup every other adventure already uses.

#### Scenario: The forest backdrop row declares corridorRows and neither channel nor corridorArt

- GIVEN the forest backdrop registry entry
- WHEN `corridorRows`, `channel`, and `corridorArt` are read
- THEN `corridorRows` MUST equal `(191, 926)`, and `channel` and
  `corridorArt` MUST both be absent

#### Scenario: backdropFor resolves a bee level id to the forest backdrop

- GIVEN a `bee` adventure level id
- WHEN `backdropFor` is called
- THEN it MUST return the forest backdrop row

### Requirement: Backpack Gains the Forest's Flower

`BACKPACK_ITEMS` SHALL gain a fifth entry: `{id: 'flor', art:
SECTOR_ADVENTURE_ART.flower, grantedBy: 'bosque', earnedWhen: ['bee4']}`.
`earnedItems(records)` MUST include it once `bee4` is filed and MUST NOT
include it before.

(Previously: `BACKPACK_ITEMS` held exactly four entries.)

#### Scenario: The flower item is absent before bee4 is filed

- GIVEN `Records` where `bee4` is unfiled
- WHEN `earnedItems(records)` is called
- THEN it MUST NOT include `flor`

#### Scenario: The flower item is present once bee4 is filed

- GIVEN `Records` where `bee4` is filed
- WHEN `earnedItems(records)` is called
- THEN it MUST include `flor` alongside the pre-existing four entries
## ADDED Requirements

### Requirement: Nocturna Gains a Second Adventure and Its First Recovered Animal

`nocturna.adventureIds` SHALL extend from four ids to eight:
`night1, night2, night3, night4, hedgehog1, hedgehog2, hedgehog3,
hedgehog4`, in that order. `nocturna.unlockedWhen` MUST remain unchanged —
it continues to return `true` exactly once `llama-peak4` is filed; adding a
second adventure to an already-open sector does not change when the sector
itself opens. `nocturna.animals` SHALL gain its first entry, `{id:
'erizo', appearsWhen: ['hedgehog4']}`, placed at the sector's existing
`animalSpot` via `STANDING_GRIP`, the same mechanism every other recovered
animal uses.

#### Scenario: nocturna.adventureIds equals the eight ids in order

- GIVEN `nocturna.adventureIds`
- WHEN read
- THEN it MUST equal `night1, night2, night3, night4, hedgehog1,
  hedgehog2, hedgehog3, hedgehog4`, in that order

#### Scenario: nocturna's unlock condition is unchanged

- GIVEN `Records` where `llama-peak4` is unfiled, then filed
- WHEN `nocturna.unlockedWhen` is evaluated for each
- THEN it MUST return `false` then `true`, exactly as before this change

#### Scenario: The erizo appears once hedgehog4 is filed, and is absent before

- GIVEN `hedgehog4` filed
- WHEN `animalPlacements(nocturna, records)` is read
- THEN the erizo MUST be present; with `hedgehog4` unfiled, it MUST be
  absent

### Requirement: AdventureId and ZooAnimalId Widen for the Hedgehog

`AdventureId` SHALL widen to include `'hedgehog'`. The `ADVENTURES` row for
`hedgehog` SHALL carry `animal: 'erizo'` and no `closingBeat` — the snake
and bee rows are the template: an animal-recovering adventure already
carries `docs/13` §5 item 6 through the shipped map bubble the moment its
animal is placed, because `mapBubble` filters on `a.animal !== undefined`.
The row MUST be appended at the END of `ADVENTURES`. `ZooAnimalId` SHALL
widen to include `'erizo'`, and `ZOO_ANIMAL_ART.erizo` MUST equal
`HEDGEHOG_ART.profile` — the shipped spineless profile art, flagged rather
than silently accepted: closing the adventure with a spineless animal on
the map quietly contradicts what the adventure just earned, and fixing it
needs a third drawing (`erizo con espinas.png`), which is art, not code.

#### Scenario: The hedgehog adventure row declares animal:'erizo' and no closingBeat

- GIVEN the `hedgehog` row in `ADVENTURES`
- WHEN `animal` and `closingBeat` are read
- THEN `animal` MUST equal `'erizo'` and `closingBeat` MUST be absent

#### Scenario: Filing hedgehog4 changes nocturna's map-bubble phrase to the hedgehog's closing line

- GIVEN `hedgehog4` filed
- WHEN the phrase selector (`mapBubble`) is evaluated for `nocturna`
- THEN it MUST equal the hedgehog adventure's own closing line, not the
  existing onward-pointing phrase

#### Scenario: ZOO_ANIMAL_ART resolves erizo to the spineless profile art

- GIVEN `ZOO_ANIMAL_ART.erizo`
- WHEN compared to `HEDGEHOG_ART.profile`
- THEN they MUST be the same art reference

### Requirement: Hedgehog Backdrop Resolves Through the Adventure-Keyed Registry, Reusing the Night Sector's Shipped Art

The hedgehog adventure (`hedgehog1..4`) MUST resolve its own
`ADVENTURE_BACKDROP.hedgehog` row via `backdropFor(levelId)` →
`adventureFor(levelId).id`, the same lookup shipped for every other
adventure. This row MUST reuse the night sector's shipped art and
quiet-band/brightest literals rather than declaring new ones — the
hedgehog adventure paints on the same night backdrop the `night` adventure
already paints on.

#### Scenario: backdropFor resolves a hedgehog level id to the hedgehog backdrop row

- GIVEN a `hedgehog` adventure level id
- WHEN `backdropFor` is called
- THEN it MUST return the `ADVENTURE_BACKDROP.hedgehog` row

#### Scenario: The hedgehog row's art and band literals match the night row's

- GIVEN the `hedgehog` and `night` backdrop registry rows
- WHEN their quiet-band and `brightest` literals are compared
- THEN they MUST be identical — no new measurement is introduced

### Requirement: No New Backpack Item Is Granted by the Hedgehog Adventure

`BACKPACK_ITEMS` MUST NOT gain a fifth entry for the `nocturna` sector
because of this change: the sector already grants the linterna at
`night4`, and `docs/13` §8 grants one object per sector, not per
adventure. `earnedItems(records)` MUST be unaffected by `hedgehog4` being
filed.

#### Scenario: Filing hedgehog4 does not add a new backpack item

- GIVEN `Records` where `hedgehog4` is filed
- WHEN `earnedItems(records)` is called
- THEN it MUST contain exactly the same items as if `hedgehog4` were
  unfiled, aside from any item already tied to an existing condition

### Requirement: The Unlock Ladder Is Unchanged — arena Still Opens Off night4, Not hedgehog4

`arena.unlockedWhen` MUST remain `isFiled(records, 'night4')`, unaffected
by the hedgehog adventure's insertion. Re-pointing it at `hedgehog4` would
revoke access already open for existing records, violating the *"only
ever WIDENS access"* rule.

#### Scenario: arena still opens off night4 alone

- GIVEN `Records` where `night4` is filed and `hedgehog4` is unfiled
- WHEN `arena.unlockedWhen(records)` is evaluated
- THEN it MUST return `true`

#### Scenario: hedgehog4 alone, with night4 unfiled, does not open arena

- GIVEN `Records` where `hedgehog4` is filed and `night4` is unfiled
- WHEN `arena.unlockedWhen(records)` is evaluated
- THEN it MUST return `false`

---

**Accepted deviation:** this delta exceeds the skill's 650-word cap, the
same deviation this project's other capability specs already record under
`delivery_strategy: exception-ok`.
