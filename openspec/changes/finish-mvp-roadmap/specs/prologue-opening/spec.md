# Delta for prologue-opening

## ADDED Requirements

### Requirement: Approved Entrance Narrative Closures Render Exactly

MVP narrative closures MUST render only the exact approved docs/16/current-registry entrance beats: `peces` after `glass2`, `tortugas` after `sand2`, `monos` after `glass4`, and `sendero` after `sand4` with its two ordered beats.

#### Scenario: Three sign-bearing enclosure closings render verbatim
- GIVEN `peces`, `tortugas`, and `monos` complete on `glass2`, `sand2`, and `glass4`
- WHEN each closing screen renders
- THEN the lines MUST be exactly `¡Las algas, el cofre, las piedras… pero no hay ni un pez!`, `Las piedras, el tronco… ¿y las tortugas dónde están?`, and `Las sogas, las frutas… acá tampoco hay nadie.`
- AND their art MUST be `SIGN_ART.fish`, `SIGN_ART.turtles`, and `SIGN_ART.monkeys`

#### Scenario: Sendero renders footprints then lens, in order
- GIVEN `sendero` completes on `sand4`
- WHEN its closing sequence renders
- THEN beat 0 MUST be `¡Mirá! ¿Y esto? ¡Son huellas!` with `ZOO_OCTOPUS_PRINT_ART`
- AND beat 1 MUST be `¡Se fueron todos los animales! Agarrá la lupa: los vamos a buscar.` with `CARRIER_LENS_ART` and the approved figure override

#### Scenario: Unapproved closures are recorded, not invented
- GIVEN jellyfish, medusa, or any other adventure lacks exact approved closing text and art in docs/16 or `ADVENTURES`
- WHEN U10 runs
- THEN the missing content MUST be recorded as an isolated blocker
- AND no placeholder story text, beat, or asset MAY be shipped as an approved closure

#### Scenario: Prologue opening remains isolated
- GIVEN approved entrance closures are added or verified
- WHEN the prologue opening plates render
- THEN skip behavior, seen gate, and deep-link bypass MUST remain unchanged