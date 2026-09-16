# Delta for Trace Canvas

## ADDED Requirements

### Requirement: The Monos and Sendero Backdrop Rows Clear the 55-Luma Law

The two NEW backdrop rows this change introduces — `monos`'s leaf veil
and `sendero`'s mud veil (`peces` and `tortugas` reuse the pre-existing
`glass`/`sand` literals unchanged, per the `zoo-map` delta's "Entrance and
Night Backdrops Resolve Through the Adventure-Keyed Registry") — MUST
each clear the pre-existing `tile ?? channel ?? SHEET_PAPER` luma-law's
applicable comparisons by at least 55 luma units: `tile` vs. `INK_COLOR`,
and, since both are opaque `PASSTHROUGHS` backgrounds with no drawn
channel, `tile` vs. `SHEET_PAPER` wherever a paper-channel comparison
applies. The exact fill colours chosen for `monos`'s and `sendero`'s
`tile` values, and the two new placeholder background art rows'
`quiet`/`brightest` literals, MUST be read off the REBUILT
`manifest.json` after `python3 scripts/art/build_art.py` runs — never
hand-guessed — the same standing rule pasos C/D/E already established.

#### Scenario: Both new rows clear 55 luma units against ink

- GIVEN the `monos` and `sendero` rows' `tile` values and `INK_COLOR`
- WHEN the luma difference is computed for each
- THEN both MUST be at least 55

#### Scenario: Both new rows clear 55 luma units against the paper channel

- GIVEN the `monos` and `sendero` rows' `tile` values and `SHEET_PAPER`
- WHEN the luma difference is computed for each
- THEN both MUST be at least 55

#### Scenario: The literals are measured, not hand-guessed

- GIVEN the `monos` and `sendero` rows' `quiet`/`brightest` literals
- WHEN traced to their source
- THEN each MUST match a value present in the rebuilt `manifest.json`,
  with no literal introduced that does not appear there

### Requirement: The Registry-Completeness Guard Extends to the Four Re-Keyed Entrance Rows With No Code Change to the Guard

The pre-existing completeness guard ("Backdrop Luma Law Coverage Is
Asserted Over the Whole Registry", this capability, asserting the luma
loop's declared groups union-equal `Object.keys(ADVENTURE_BACKDROP)`)
MUST require NO code change to accommodate the `glass`/`sand` → `peces`/
`tortugas`/`monos`/`sendero` re-key: the guard is already keyed off
whatever `ADVENTURE_BACKDROP` currently exports, so the four new keys are
covered automatically once they exist in the loop's groups. This
requirement exists to make that coverage an asserted fact of THIS change,
not an unverified assumption.

#### Scenario: The four entrance keys are covered by the completeness guard

- GIVEN `ADVENTURE_BACKDROP`'s keys after this change (`peces`,
  `tortugas`, `monos`, `sendero`, and every pre-existing key minus
  `glass` and `sand`)
- WHEN the guard's declared-groups union is compared to this key set
- THEN they MUST be equal

#### Scenario: A row left out of every group still fails loudly

- GIVEN one of the four new rows hypothetically added to none of the
  loop's declared groups
- WHEN the completeness guard runs
- THEN it MUST fail, proving the guard still catches an unrouted row
  after the re-key

---

**Accepted deviation:** this delta exceeds the skill's 650-word cap, the
same deviation this project's other capability specs already record under
`delivery_strategy: exception-ok`.
