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

The glass adventure (`glass1..4`) MUST resolve the aquarium backdrop; the
sand adventure (`sand1..4`) MUST resolve the sand backdrop; the night
adventure (`night1..4`) MUST resolve the night backdrop — each via
`backdropFor(levelId)` → `adventureFor(levelId).id`, the same lookup shipped
for sheep/llama. The night backdrop's registered `brightest` sample MUST be
`nightfall()`'s derived output measured directly, not `fondo bosque.png`'s
own unmodified sample. The night backdrop's registry entry MUST reference
only the built file `sector-night-background.png`, never `bosque` or
`forest` directly, so that swapping the source PNG in `build_art.py`'s
`PASSTHROUGHS` table changes no TypeScript file.

#### Scenario: backdropFor resolves each new adventure to its own backdrop

- GIVEN a `glass`, a `sand`, and a `night` level id
- WHEN `backdropFor` is called for each
- THEN each MUST return its own registered backdrop

#### Scenario: The night backdrop's brightest reflects the derivation, not the source

- GIVEN the night backdrop's registered `brightest` and the un-derived
  forest source's own sampled brightest
- WHEN compared
- THEN they MUST differ, proving the sample was taken post-transform

#### Scenario: The night backdrop entry names no source file

- GIVEN the night backdrop's registry entry
- WHEN its referenced file names are inspected
- THEN none MUST equal `bosque` or `forest` — only the built
  `sector-night-background.png` MUST appear

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
