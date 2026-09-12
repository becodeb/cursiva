# Delta for Zoo Map

## ADDED Requirements

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
