# Delta for Zoo Map

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
