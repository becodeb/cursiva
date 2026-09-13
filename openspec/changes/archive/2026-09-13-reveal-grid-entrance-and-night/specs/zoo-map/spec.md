# Delta for Zoo Map

## MODIFIED Requirements

### Requirement: Sector-to-Adventure Mapping

`estanque.adventureIds` MUST equal, in order: `duck-trail1`, `duck-trail2`,
`duck-trail3`, `duck-trail4`, `f2-guirnalda`, `f2-agua2`, `f2-agua3`,
`f2-agua4`. `montanas.adventureIds` MUST equal, in order, `sheep-hill1..4`
then `llama-peak1..4`. `entrada.adventureIds` MUST equal, in order,
`glass1..4` then `sand1..4`, and `entrada.unlockedWhen` MUST always return
`true`. `nocturna.adventureIds` MUST equal, in order, `night1..4`, and
`nocturna.unlockedWhen` MUST return `true` exactly once `llama-peak4` is
filed. `bosque` and `arena` MUST have empty `adventureIds` and MUST render
fogged for every input.

(Previously: `montanas` was grouped with `entrada`, `bosque`, `arena`, and
`nocturna` as one of five sectors required to carry empty `adventureIds` and
stay fogged for every input; `docs/13` §8 row D promotes `entrada` and
`nocturna` out of that set, leaving only `bosque` and `arena` — paso E's and
paso F's own rows.)

#### Scenario: Estanque's eight adventures are in the exact order

- GIVEN `estanque.adventureIds`
- WHEN read
- THEN it MUST equal the eight ids above, in that order

#### Scenario: Montañas' eight adventures are in the exact order

- GIVEN `montanas.adventureIds`
- WHEN read
- THEN it MUST equal `sheep-hill1..4, llama-peak1..4`, in that order

#### Scenario: Entrada's eight levels are glass then sand, and entrada is never fogged

- GIVEN `entrada.adventureIds` and `entrada.unlockedWhen`, evaluated for any
  `Records`
- WHEN read
- THEN `adventureIds` MUST equal `glass1..4, sand1..4` in that order, and
  `unlockedWhen` MUST return `true` for every input

#### Scenario: Nocturna stays fogged until llama-peak4 is filed

- GIVEN `nocturna.adventureIds` and `Records` where `llama-peak4` is unfiled,
  then filed
- WHEN `nocturna.unlockedWhen` is evaluated for each
- THEN it MUST return `false` then `true`, and `adventureIds` MUST equal
  `night1..4`

#### Scenario: Bosque and arena remain empty and fogged for every input

- GIVEN `bosque`, `arena`
- WHEN `adventureIds` and `unlockedWhen` are checked for any `Records`
- THEN `adventureIds` MUST be empty and `unlockedWhen` MUST return `false`

### Requirement: Backpack Registry

`client/src/zoo/backpack.ts` MUST export `BackpackItem`, `BACKPACK_ITEMS:
readonly BackpackItem[]` holding exactly three entries — the existing
`{id: 'andean-hat', art: ANDEAN_HAT_ART, grantedBy: 'montanas', earnedWhen:
['llama-peak4']}`, plus `{id: 'lupa', art: CARRIER_LENS_ART, grantedBy:
'entrada', earnedWhen: ['sand4']}` and `{id: 'linterna', art:
SECTOR_FLASHLIGHT_ART, grantedBy: 'nocturna', earnedWhen: ['night4']}` —
and `earnedItems(records)`, which MUST return only the subset of these three
whose `earnedWhen` id is filed.

(Previously: `BACKPACK_ITEMS` held exactly one entry, the andean hat.)

#### Scenario: Each item is absent before its own earnedWhen id is filed

- GIVEN `Records` where none of `llama-peak4`, `sand4`, `night4` is filed
- WHEN `earnedItems(records)` is called
- THEN it MUST return `[]`

#### Scenario: Each item is present once its own earnedWhen id is filed

- GIVEN `Records` where `sand4` is filed and the other two are not
- WHEN `earnedItems(records)` is called
- THEN it MUST include `lupa` and MUST NOT include `andean-hat` or
  `linterna`

#### Scenario: earnedItems returns exactly the earned subset

- GIVEN `Records` where all three ids are filed
- WHEN `earnedItems(records)` is called
- THEN it MUST include all three entries and no others

## ADDED Requirements

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
