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
`preserveAspectRatio="xMidYMid slice"`, mapping the 1536×1024 source PNG by
`vbX = imgX × 0.651042`, `vbY = imgY × 0.651042 − 33.333`. The document
background behind the letterboxed SVG MUST be `#76B56A` and MUST NOT be white.

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
`f2-agua4`. `entrada`, `bosque`, `montanas`, `arena`, and `nocturna` MUST have
empty `adventureIds` and MUST render fogged for every input.

#### Scenario: Estanque's eight adventures are in the exact order
- GIVEN `estanque.adventureIds`
- WHEN read
- THEN it MUST equal the eight ids above, in that order

#### Scenario: The five other sectors carry no adventures and stay fogged
- GIVEN `entrada`, `bosque`, `montanas`, `arena`, `nocturna`
- WHEN `adventureIds` and `unlockedWhen` are checked for any `Records`
- THEN `adventureIds` MUST be empty and `unlockedWhen` MUST return `false`

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

`client/src/zoo/backpack.ts` MUST export `BackpackItem`, an empty
`BACKPACK_ITEMS: readonly BackpackItem[]`, and `earnedItems(records)`, which
over the empty registry MUST return `[]`.

#### Scenario: earnedItems returns nothing today
- GIVEN any `Records`
- WHEN `earnedItems(records)` is called
- THEN it MUST return `[]`

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

The map's `discovered`-bubble phrase (rendered beside
`ZOO_OCTOPUS_PRINT_ART`, `ZooMap.tsx:341-360`) SHALL be chosen by a pure
phrase selector over `records`, not the fixed constant "¡Mirá! Las huellas
van hacia allá. ¿Vamos?". Once the discovered sector's own animal has been
recovered (per `animalPlacements`'s `appearsWhen` — the estanque's duck
appearing once `duck-trail4` is filed), the phrase MUST read as a closing
line rather than pointing the child onward to more adventures in that same
sector. Before the animal is recovered, the phrase MUST remain the
existing onward-pointing line, unchanged. The phrase MUST still render
only through `CaptionedArt`, keeping `auditCaptions` green.

#### Scenario: Before the duck is recovered, the phrase still points onward

- GIVEN `duck-trail4` unfiled and the estanque resolved as
  `recentlyDiscovered`
- WHEN the phrase selector is evaluated for the estanque
- THEN it MUST equal the existing onward-pointing phrase, "¡Mirá! Las
  huellas van hacia allá. ¿Vamos?"

#### Scenario: After the duck is recovered, the phrase closes the adventure

- GIVEN `duck-trail4` filed
- WHEN the phrase selector is evaluated for the estanque
- THEN it MUST NOT equal the onward-pointing phrase and MUST read as a
  closing line, not a further invitation to move on

#### Scenario: The closing phrase still passes the caption audit

- GIVEN the map rendered via `renderToString` with the duck recovered
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
