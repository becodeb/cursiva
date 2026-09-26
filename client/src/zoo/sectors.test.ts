// Sector registry tests (zoo-map spec: "Sector Registry Data Shape",
// "Sector Geometry Invariants", "Fog Containment Invariant",
// "Sector-to-Adventure Mapping", "Estanque Starts Discovered", "nextAdventure
// Resolution", "Recovered Animal Placement"). Node environment, no DOM —
// every function under test is pure over plain data (design.md §5's table).
import { describe, expect, it } from 'vitest'
import { LEVELS } from '../levels/catalog'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import { ZOO_ANIMAL_ART } from '../detective/assets'
import { adventureFor } from './adventures'
import { totalStars } from './stars'
import {
  PLAZA,
  PLAZA_CENTRE,
  SECTORS,
  animalPlacements,
  coversRect,
  fogBoxes,
  footprintTrail,
  hitCentre,
  imageToViewBox,
  isFiled,
  isOpen,
  nextAdventure,
  recentlyDiscovered,
  sectorOf,
  viewBoxToImage,
  type FogPatch,
  type Records,
} from './sectors'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  // `attempts: 1` alongside `approvals: 1` — a filed level was necessarily
  // attempted at least once (the real store never files a level with zero
  // attempts), which is what makes `recentlyDiscovered`'s `attempts`-based
  // untouched check meaningful against this fixture.
  for (const id of ids) out[id] = { ...EMPTY_RECORD, attempts: 1, approvals: 1 }
  return out
}

/** A level the child has TRIED but not necessarily approved — `attempts`,
 * not `approvals`, is what `recentlyDiscovered`'s untouched-sector
 * preference reads (design.md §7.2, `attempts` is the field the store
 * already keeps). */
function attempted(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, attempts: 1 }
  return out
}

const estanque = SECTORS.find((s) => s.id === 'estanque')!
const entrada = SECTORS.find((s) => s.id === 'entrada')!
const nocturna = SECTORS.find((s) => s.id === 'nocturna')!
const sendero = SECTORS.find((s) => s.id === 'sendero')!
const montanas = SECTORS.find((s) => s.id === 'montanas')!
const arena = SECTORS.find((s) => s.id === 'arena')!
const bosque = SECTORS.find((s) => s.id === 'bosque')!
const withHit = SECTORS.filter((s) => s.hit)
// "Closed" per the spec means `unlockedWhen` is not unconditionally true AND
// the sector carries a `hit` — the sendero has neither an unlock rule worth
// asking nor a `hit` to cover, so it is excluded here the same way the
// requirement excludes it (zoo-map spec "Fog Containment Invariant").
const fogged = SECTORS.filter((s) => s.hit && !s.unlockedWhen({}))

describe('Registry Data Shape', () => {
  it('exports all seven sectors, sendero included', () => {
    const ids = SECTORS.map((s) => s.id).sort()
    expect(ids).toEqual(
      ['arena', 'bosque', 'entrada', 'estanque', 'montanas', 'nocturna', 'sendero'].sort(),
    )
  })

  it('hit is absent ONLY for the sendero', () => {
    const withoutHit = SECTORS.filter((s) => !s.hit).map((s) => s.id)
    expect(withoutHit).toEqual(['sendero'])
  })
})

describe('Sector Geometry Invariants', () => {
  it('every hit is at least 120×120', () => {
    for (const sector of withHit) {
      expect(sector.hit!.w, sector.id).toBeGreaterThanOrEqual(120)
      expect(sector.hit!.h, sector.id).toBeGreaterThanOrEqual(120)
    }
  })

  function overlaps(a: { x: number; y: number; w: number; h: number }, b: typeof a): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  }

  it('no two hits overlap each other', () => {
    for (let i = 0; i < withHit.length; i++) {
      for (let j = i + 1; j < withHit.length; j++) {
        expect(overlaps(withHit[i].hit!, withHit[j].hit!), `${withHit[i].id}/${withHit[j].id}`).toBe(
          false,
        )
      }
    }
  })

  it('no hit overlaps the plaza', () => {
    for (const sector of withHit) {
      expect(overlaps(sector.hit!, PLAZA), sector.id).toBe(false)
    }
  })

  it('the sendero is excluded from both checks (no hit to measure)', () => {
    expect(sendero.hit).toBeUndefined()
  })
})

describe('Fog Containment Invariant', () => {
  it('the union of fog rects contains the whole hit, for every closed sector', () => {
    for (const sector of fogged) {
      expect(coversRect(fogBoxes(sector), sector.hit!), sector.id).toBe(true)
    }
  })

  it('shrinking one patch breaks coverage (falsifiability)', () => {
    for (const sector of fogged) {
      const shrunk = fogBoxes(sector).map((box, i) =>
        i === 0 ? { ...box, width: box.width * 0.5, height: box.height * 0.5 } : box,
      )
      expect(coversRect(shrunk, sector.hit!), sector.id).toBe(false)
    }
  })

  it('the estanque now carries a real fog obligation (row D); the sendero still carries none', () => {
    // D4 shipped the estanque discovered (`fog: []`); row D closes it for
    // real (design.md §7.1) — `closedFog(ESTANQUE_HIT, 2)` is asserted by
    // the containment/bbox/centring checks above, which already include the
    // estanque via the dynamically-computed `fogged` set.
    expect(estanque.fog.length).toBeGreaterThan(0)
    expect(sendero.fog).toEqual([])
  })

  // The shipped regression this replaces, stated as the number it was:
  // `closedFog` used to size TWO patches at `1.06 × hit.h` and place them at
  // the width quadrants, but `size` is the HEIGHT and the width follows the
  // art's aspect — so a near-square sector got patches far WIDER than
  // itself. Bosque (300 × 300) drew two boxes ≈355 wide each, a union
  // ≈670 units across for a 300-unit sector: on screen the map read as a
  // field of giant grey balloons spilling over the plaza, the paths and
  // each other. Containment alone could never catch that — a patch the size
  // of the whole map contains every hit perfectly. This is the other half
  // of the invariant: the fog must cover its sector AND stay near it.
  // 1.35, not 1.25: closing the corner holes raised `FOG_OVERLAP` from 1.06
  // to 1.3, and a single-row sector's union is exactly one patch tall, so its
  // height ratio IS the overlap — 1.300 for entrada, montañas and nocturna.
  // The measured worst case across all five is 1.300, so this leaves a real
  // but small margin. What it still forbids is the regression it was written
  // for: the shipped quadrant construction put bosque at 2.23×.
  const FOG_BBOX_SLACK = 1.35
  it('fog does not extend absurdly past the sector it covers', () => {
    for (const sector of fogged) {
      const boxes = fogBoxes(sector)
      const hit = sector.hit!
      const union = {
        x0: Math.min(...boxes.map((b) => b.x)),
        x1: Math.max(...boxes.map((b) => b.x + b.width)),
        y0: Math.min(...boxes.map((b) => b.y)),
        y1: Math.max(...boxes.map((b) => b.y + b.height)),
      }
      expect(union.x1 - union.x0, `${sector.id} fog width`).toBeLessThanOrEqual(
        hit.w * FOG_BBOX_SLACK,
      )
      expect(union.y1 - union.y0, `${sector.id} fog height`).toBeLessThanOrEqual(
        hit.h * FOG_BBOX_SLACK,
      )
    }
  })

  it('every patch is centred inside its own sector, on a grid of its cells', () => {
    // The grid construction's own structural claim: no patch CENTRE ever
    // leaves the `hit` (the centres are cell centres, and the cells tile the
    // hit exactly), and a sector tiles into `cols × rows` patches rather
    // than an arbitrary hand-placed number. Together with containment and
    // the bbox bound above, this pins the construction rather than just its
    // outcome.
    for (const sector of fogged) {
      const hit = sector.hit!
      const cols = Math.max(1, Math.round(hit.w / 130))
      const rows = Math.max(1, Math.round(hit.h / 130))
      // `cols × rows` grid patches, plus one on each INTERIOR junction where
      // four cells meet. The junction patches are not part of the containment
      // proof — the grid covers the hit on its own — they close the hole the
      // four transparent blob corners leave at a junction, which the box
      // geometry these tests read cannot see. A sector tiling to a single row
      // or column has no interior junction and gets none.
      expect(sector.fog.length, `${sector.id} patch count`).toBe(
        cols * rows + Math.max(0, cols - 1) * Math.max(0, rows - 1),
      )
      for (const patch of sector.fog) {
        expect(patch.x, `${sector.id} patch x`).toBeGreaterThan(hit.x)
        expect(patch.x, `${sector.id} patch x`).toBeLessThan(hit.x + hit.w)
        expect(patch.y, `${sector.id} patch y`).toBeGreaterThan(hit.y)
        expect(patch.y, `${sector.id} patch y`).toBeLessThan(hit.y + hit.h)
      }
    }
  })
})

describe('Registry↔Catalog Structural Consistency', () => {
  const catalogIds = new Set(LEVELS.map((l) => l.id))

  it("estanque's twelve adventures are in the exact documented order (patos → medusa → delfines)", () => {
    expect(estanque.adventureIds).toEqual([
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
      'f2-guirnalda',
      'f2-agua2',
      'f2-agua3',
      'f2-agua4',
      'dolphin1',
      'dolphin2',
      'dolphin3',
      'dolphin4',
    ])
  })

  it("montañas' eight adventures are sheep-hill1..4 then llama-peak1..4, in order", () => {
    expect(montanas.adventureIds).toEqual([
      'sheep-hill1',
      'sheep-hill2',
      'sheep-hill3',
      'sheep-hill4',
      'llama-peak1',
      'llama-peak2',
      'llama-peak3',
      'llama-peak4',
    ])
  })

  // (Previously: `entrada.adventureIds` held eight ids, glass and sand each
  // interleaved two-per-enclosure, in the docs/16 §9 narrative order
  // peces/tortugas/monos/sendero. Adventure-flow-and-map-guidance T1
  // narrows every enclosure to its easier level alone, so the list shrinks
  // to exactly those four ids — the SAME narrative order survives, just one
  // id per stop instead of two. The dropped twins never appear here again;
  // see the dedicated dropped-ids test below.)
  it("entrada's four levels are one per enclosure, in the narrative play order peces/tortugas/monos/sendero — and entrada is never fogged (zoo-map spec)", () => {
    expect(entrada.adventureIds).toEqual(['glass1', 'sand1', 'glass3', 'sand3'])
    for (const records of [{}, filed('sand3'), filed('glass1', 'sand1', 'glass3', 'sand3')]) {
      expect(entrada.unlockedWhen(records)).toBe(true)
    }
  })

  it('the four dropped enclosure ids (glass2, sand2, glass4, sand4) belong to no sector any more (T1) — reachable only through the dev ?nivel= deep link', () => {
    for (const id of ['glass2', 'sand2', 'glass4', 'sand4']) {
      expect(sectorOf(id), id).toBeUndefined()
    }
  })

  // Walking `nextAdventure` from empty records, filing each returned id in
  // turn, must yield the four ids in narrative order, so the adventures a
  // child meets are peces, then tortugas, then monos, then sendero — never
  // monos second and tortugas third. (Previously: eight ids, two per
  // enclosure; adventure-flow-and-map-guidance T1 narrows this to exactly
  // one id per enclosure, so each adventure now surfaces only once.)
  it('walking nextAdventure from empty records yields the ids in narrative order (peces, tortugas, monos, sendero)', () => {
    const order: string[] = []
    let records: Records = {}
    for (let i = 0; i < entrada.adventureIds.length; i++) {
      const next = nextAdventure(entrada, records)
      expect(next, `step ${i}`).not.toBeNull()
      order.push(next!)
      records = { ...records, ...filed(next!) }
    }
    expect(order).toEqual(['glass1', 'sand1', 'glass3', 'sand3'])
    expect(order.map((id) => adventureFor(id)?.id)).toEqual(['peces', 'tortugas', 'monos', 'sendero'])
  })

  it('nocturna stays fogged until llama-peak4 is filed (zoo-map spec)', () => {
    // `radial-spines` design.md §8.2 extends this to eight ids: night1..4
    // then hedgehog1..4, its second adventure. `unlockedWhen` is UNCHANGED
    // (zoo-map spec, "nocturna's unlock condition is unchanged") — a second
    // adventure joining an already-open sector never moves when it opens.
    expect(nocturna.adventureIds).toEqual([
      'night1',
      'night2',
      'night3',
      'night4',
      'hedgehog1',
      'hedgehog2',
      'hedgehog3',
      'hedgehog4',
    ])
    expect(nocturna.unlockedWhen({})).toBe(false)
    expect(nocturna.unlockedWhen(filed('sheep-hill4'))).toBe(false)
    expect(nocturna.unlockedWhen(filed('llama-peak4'))).toBe(true)
  })

  it('bosque stays fogged until snake4 is filed, then opens with bee1..4 then monkey1..4 (free-trail-waypoints design.md §9; promised-animals P4)', () => {
    // `bosque` was promoted OUT of the "stays fogged for every input" set by
    // `free-trail-waypoints` — the forest's new last rung of the ladder.
    // `monkey1..4` (P4) is a SECOND adventure on this already-open sector,
    // appended after the bee's own four — `unlockedWhen` is unaffected.
    expect(bosque.adventureIds).toEqual([
      'bee1', 'bee2', 'bee3', 'bee4',
      'monkey1', 'monkey2', 'monkey3', 'monkey4',
    ])
    for (const records of [{}, filed('sand4', 'night4', 'llama-peak4')]) {
      expect(bosque.unlockedWhen(records)).toBe(false)
    }
    expect(bosque.unlockedWhen(filed('snake4'))).toBe(true)
  })

  it('the bee appears once bee4 is filed, and is absent before', () => {
    const before = animalPlacements(bosque, filed('snake4'))
    expect(before).toEqual([])
    const after = animalPlacements(bosque, filed('snake4', 'bee4'))
    expect(after).toHaveLength(1)
    expect(after[0].art).toBe(ZOO_ANIMAL_ART.abeja)
  })

  it('arena stays fogged until night4 is filed, then opens with snake1..4 then turtle1..4 (promised-animals P3)', () => {
    const arena = SECTORS.find((s) => s.id === 'arena')!
    // `turtle1..4` (P3) is a SECOND adventure on this already-open sector,
    // appended after the snake's own four — `unlockedWhen` is unaffected.
    expect(arena.adventureIds).toEqual([
      'snake1', 'snake2', 'snake3', 'snake4',
      'turtle1', 'turtle2', 'turtle3', 'turtle4',
    ])
    expect(arena.unlockedWhen({})).toBe(false)
    expect(arena.unlockedWhen(filed('llama-peak4'))).toBe(false)
    expect(arena.unlockedWhen(filed('night4'))).toBe(true)
  })

  it('every adventureIds and appearsWhen entry is a real catalog level id', () => {
    for (const sector of SECTORS) {
      for (const id of sector.adventureIds) expect(catalogIds.has(id), id).toBe(true)
      for (const animal of sector.animals) {
        for (const id of animal.appearsWhen) expect(catalogIds.has(id), id).toBe(true)
      }
    }
  })

  it('no level id appears in two sectors', () => {
    const seen = new Set<string>()
    for (const sector of SECTORS) {
      for (const id of sector.adventureIds) {
        expect(seen.has(id), id).toBe(false)
        seen.add(id)
      }
    }
  })

  it('the scenery-only sendero carries no adventures and stays fogged for any input', () => {
    // `montañas` was promoted OUT of this set by row C (`docs/13` §8),
    // `entrada`/`nocturna` are promoted out by row D (zoo-map spec
    // "Sector-to-Adventure Mapping"), `arena` is promoted out by
    // `snake-drag-and-art-corridor` (design.md §7.1), and `bosque` is
    // promoted out by `free-trail-waypoints` (design.md §9) — only the
    // scenery-only `sendero` remains undeveloped.
    for (const sector of SECTORS.filter((s) => s.id === 'sendero')) {
      expect(sector.adventureIds, sector.id).toEqual([])
      expect(
        sector.unlockedWhen(
          filed('duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4', 'sand4', 'night4', 'snake4'),
        ),
        sector.id,
      ).toBe(false)
    }
  })
})

describe('Estanque — the real stake of migrateEntrance (row D, design.md §7.1, amendment A4)', () => {
  it('is closed before any record exists — D4 shipped this discovered; row D closes it for real', () => {
    expect(estanque.unlockedWhen({})).toBe(false)
    expect(isOpen(estanque, {})).toBe(false)
  })

  // `sand3` is the sendero's own level after adventure-flow-and-map-
  // guidance T1 narrowed it to one; `sand4` stays admissible too — a
  // widening, never a replacement — for a returning child who has it filed
  // instead (the sendero's own old last level, or `migrateEntrance`'s own
  // seed for a pre-entrance legacy child).
  it('opens once sand3 is filed, never before', () => {
    expect(estanque.unlockedWhen(filed('sand3'))).toBe(true)
    expect(isOpen(estanque, filed('sand3'))).toBe(true)
    expect(estanque.unlockedWhen(filed('glass1', 'sand1', 'glass3'))).toBe(false)
  })

  it('also opens on a legacy sand4-only record, never regressing a returning child who has it filed instead of sand3', () => {
    expect(estanque.unlockedWhen(filed('sand4'))).toBe(true)
    expect(isOpen(estanque, filed('sand4'))).toBe(true)
  })

  it('footprints originate at the plaza and end near the estanque, never on either endpoint', () => {
    const marks = footprintTrail(PLAZA_CENTRE, hitCentre(estanque.hit!))
    expect(marks.length).toBeGreaterThan(0)
    const dist = Math.hypot(
      hitCentre(estanque.hit!).x - PLAZA_CENTRE.x,
      hitCentre(estanque.hit!).y - PLAZA_CENTRE.y,
    )
    for (const mark of marks) {
      const arc = Math.hypot(mark.x - PLAZA_CENTRE.x, mark.y - PLAZA_CENTRE.y)
      expect(arc).toBeGreaterThan(0)
      expect(arc).toBeLessThan(dist)
    }
  })
})

describe('footprintTrail (pitch and alternation)', () => {
  it('places marks at exactly 40-unit arcs, none on an endpoint', () => {
    const marks = footprintTrail({ x: 0, y: 0 }, { x: 200, y: 0 })
    // dist=200, step=40: arcs at 40,80,120,160 (≤ 200-40=160) — 4 marks.
    expect(marks).toHaveLength(4)
  })

  it('consecutive marks alternate sides of the line', () => {
    const marks = footprintTrail({ x: 0, y: 0 }, { x: 200, y: 0 })
    // A horizontal segment's normal is vertical, so alternation shows in y.
    expect(marks[0].y).toBeGreaterThan(0)
    expect(marks[1].y).toBeLessThan(0)
    expect(marks[2].y).toBeGreaterThan(0)
  })

  it('a segment shorter than two steps places nothing', () => {
    expect(footprintTrail({ x: 0, y: 0 }, { x: 30, y: 0 })).toEqual([])
  })
})

describe('nextAdventure Resolution (OD2)', () => {
  it('returns the first unfinished adventure', () => {
    const records = filed('duck-trail1', 'duck-trail2')
    expect(nextAdventure(estanque, records)).toBe('duck-trail3')
  })

  it('returns the FIRST adventure once every one is filed, so a finished sector replays from the start (D10)', () => {
    const records = filed(...estanque.adventureIds)
    expect(nextAdventure(estanque, records)).toBe('duck-trail1')
  })

  it('returns null for a sector with no adventures', () => {
    // `bosque` used to be this fixture's second example (zero adventures);
    // `free-trail-waypoints` gave it the bee family, so `sendero` — the
    // scenery-only sector that carries none by construction — is now the
    // ONLY sector this claim can be checked against.
    expect(nextAdventure(sendero, {})).toBeNull()
  })

  it('returns the first unfiled bee adventure, and replays from bee1 once bosque is fully done (D10)', () => {
    expect(nextAdventure(bosque, filed('snake4'))).toBe('bee1')
    expect(nextAdventure(bosque, filed('snake4', 'bee1', 'bee2'))).toBe('bee3')
    expect(nextAdventure(bosque, filed('snake4', ...bosque.adventureIds))).toBe('bee1')
  })
})

describe('Progression consistency (finish-mvp-roadmap U2)', () => {
  it('uses the same entrada records for stars, estanque unlock, map focus, and next adventure', () => {
    const records = filed(...entrada.adventureIds)

    expect(totalStars(records)).toBe(entrada.adventureIds.length)
    expect(isOpen(estanque, records)).toBe(true)
    expect(recentlyDiscovered(records)?.id).toBe('estanque')
    expect(nextAdventure(estanque, records)).toBe('duck-trail1')
    expect(animalPlacements(estanque, records)).toEqual([])
  })

  it('uses the same pond records for stars, recovered animal, next adventure, and sector unlock', () => {
    const records = filed(...entrada.adventureIds, 'duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4')

    expect(totalStars(records)).toBe(entrada.adventureIds.length + 4)
    expect(animalPlacements(estanque, records).map((p) => p.art)).toEqual([ZOO_ANIMAL_ART.pato])
    expect(nextAdventure(estanque, records)).toBe('f2-guirnalda')
    expect(isOpen(montanas, records)).toBe(true)
  })
})

describe('sectorOf', () => {
  it('resolves a wired id to its sector', () => {
    expect(sectorOf('duck-trail4')?.id).toBe('estanque')
    expect(sectorOf('f2-agua4')?.id).toBe('estanque')
  })

  it('returns undefined for a level no sector has adopted', () => {
    expect(sectorOf('trail4')).toBeUndefined()
    expect(sectorOf('f1-libre')).toBeUndefined()
  })
})

describe('recentlyDiscovered (design.md §7.2: preference layered in front of the pre-existing rule)', () => {
  it('a fresh install prefers the first open sector, entrada — none of its levels attempted yet', () => {
    expect(recentlyDiscovered({})?.id).toBe('entrada')
  })

  it("attempting entrada's first level moves the preference onward, to the estanque once sand4 is filed", () => {
    // `glass1` attempted (not filed) disqualifies entrada from the
    // untouched check; `sand4` filed opens the estanque, whose own eight
    // ids carry zero attempts — the next untouched OPEN sector.
    const records: Records = { ...attempted('glass1'), ...filed('sand4') }
    expect(recentlyDiscovered(records)?.id).toBe('estanque')
  })

  it("falls back to today's rule (never no sector) once entrada is attempted and nothing else has opened", () => {
    // No untouched sector qualifies (entrada is attempted, no other sector
    // is open yet), so this must fall back to the pre-existing rule —
    // entrada still has three unfiled ids (T1 narrowed it to four total) —
    // not to `null`.
    expect(recentlyDiscovered(attempted('glass1'))?.id).toBe('entrada')
  })

  it('resolves to null once every open sector is fully filed', () => {
    // Filing entrada's own four ids opens the estanque (`sand3`); filing
    // the estanque's `duck-trail4` opens `montañas`; filing `montañas`'
    // `llama-peak4` opens `nocturna`; filing `nocturna`'s `night4` opens
    // `arena` (`snake-drag-and-art-corridor` design.md §0 A1); filing
    // `arena`'s `snake4` opens `bosque` (`free-trail-waypoints` design.md
    // §9) — every sector this chain reaches is fully filed, so there is
    // genuinely no unfinished work left anywhere.
    expect(
      recentlyDiscovered(
        filed(
          ...entrada.adventureIds,
          ...estanque.adventureIds,
          ...montanas.adventureIds,
          ...nocturna.adventureIds,
          ...arena.adventureIds,
          ...bosque.adventureIds,
        ),
      ),
    ).toBeNull()
  })

  it("every shipped row for the pre-existing fallback rule stays green: resolves to the estanque while it still has an unfinished adventure, once open", () => {
    // Filing entrada opens the estanque and leaves every one of ITS OWN
    // ids attempted-zero — that would normally win the untouched
    // preference, so this attempts `duck-trail1` too, which makes the
    // fallback rule (not the preference) the one actually exercised here.
    const records: Records = { ...filed(...entrada.adventureIds), ...attempted('duck-trail1') }
    expect(recentlyDiscovered(records)?.id).toBe('estanque')
  })
})

describe('Recovered Animal Placement', () => {
  it('the duck is absent before duck-trail4 is filed', () => {
    expect(animalPlacements(estanque, filed('duck-trail1', 'duck-trail2', 'duck-trail3'))).toEqual([])
  })

  it('the duck appears once duck-trail4 is filed, even before the sector finishes', () => {
    const placed = animalPlacements(estanque, filed('duck-trail4'))
    expect(placed).toHaveLength(1)
  })

  it('placement uses the standing grip: the box bottom edge sits on animalSpot.y', () => {
    const [placed] = animalPlacements(estanque, filed('duck-trail4'))
    expect(placed.box.y + placed.box.height).toBeCloseTo(estanque.animalSpot.y, 6)
  })

  it('the dolphin is absent before dolphin4 is filed, and appears alongside the duck once it is', () => {
    expect(animalPlacements(estanque, filed('duck-trail4', 'dolphin1', 'dolphin2', 'dolphin3'))).toEqual(
      animalPlacements(estanque, filed('duck-trail4')),
    )
    expect(animalPlacements(estanque, filed('duck-trail4', 'dolphin4'))).toHaveLength(2)
  })

  it("Z1 (design.md §8): the delfin's box is inside ESTANQUE_HIT, clear of the reed island, and disjoint from the duck's own box", () => {
    const [duck, delfin] = animalPlacements(estanque, filed('duck-trail4', 'dolphin4'))
    // `ESTANQUE_HIT`, read off the sector's own registered `hit` rect.
    const hit = estanque.hit!
    const insideHit = (box: { x: number; y: number; width: number; height: number }): boolean =>
      box.x >= hit.x && box.y >= hit.y && box.x + box.width <= hit.x + hit.w && box.y + box.height <= hit.y + hit.h
    expect(insideHit(delfin.box)).toBe(true)

    // The reed island, `estanque.animalSpot`'s own measured neighbour
    // (design.md §1): x ∈ [768, 833], y ∈ [130, 182].
    const reed = { x: 768, y: 130, w: 833 - 768, h: 182 - 130 }
    const disjointFrom = (
      box: { x: number; y: number; width: number; height: number },
      r: { x: number; y: number; w: number; h: number },
    ): boolean =>
      box.x + box.width <= r.x || box.x >= r.x + r.w || box.y + box.height <= r.y || box.y >= r.y + r.h
    expect(disjointFrom(delfin.box, reed)).toBe(true)

    // Disjoint from the duck's own box, computed from the REAL
    // `ANIMAL_ART.pato` dimensions — the literal is retunable, the
    // constraint is not.
    expect(
      delfin.box.x + delfin.box.width <= duck.box.x ||
        delfin.box.x >= duck.box.x + duck.box.width ||
        delfin.box.y + delfin.box.height <= duck.box.y ||
        delfin.box.y >= duck.box.y + duck.box.height,
    ).toBe(true)
    expect(delfin.art).toBe(ZOO_ANIMAL_ART.delfin)
  })

  // The prologue's promise, kept (P2, `odd/tasks/promised-animals.md`): a
  // rescued animal goes back to its OWN enclosure, so the fish's own
  // placement lives on `entrada` — where the prologue showed the empty
  // pecera — not on `estanque`, where the four `f2-*` garland levels that
  // rescue it actually run.
  it('the fish is absent before f2-agua4 is filed, even once the other three garland levels are', () => {
    expect(animalPlacements(entrada, filed('f2-guirnalda', 'f2-agua2', 'f2-agua3'))).toEqual([])
  })

  it('the fish appears at the entrance once f2-agua4 is filed', () => {
    const placed = animalPlacements(entrada, filed('f2-agua4'))
    expect(placed).toHaveLength(1)
    expect(placed[0].art).toBe(ZOO_ANIMAL_ART.pez)
  })

  it("the fish's own box sits inside ENTRADA_HIT, on the left third of the spot — clear of the turtle and monkey (P3, P4)", () => {
    const [placed] = animalPlacements(entrada, filed('f2-agua4'))
    const hit = entrada.hit!
    expect(placed.box.x).toBeGreaterThanOrEqual(hit.x)
    expect(placed.box.y).toBeGreaterThanOrEqual(hit.y)
    expect(placed.box.x + placed.box.width).toBeLessThanOrEqual(hit.x + hit.w)
    expect(placed.box.y + placed.box.height).toBeLessThanOrEqual(hit.y + hit.h)
    // Standing grip: feet on `animalSpot`, same law `duck`/`delfin` above
    // assert.
    expect(placed.box.y + placed.box.height).toBeCloseTo(entrada.animalSpot.y, 6)
    // Left of centre, not past the spot's own midline — the turtle's own
    // `dx: 0` slot starts right where this box ends (see the registry's own
    // worked measurement, `zoo/sectors.ts`).
    expect(placed.box.x + placed.box.width).toBeLessThanOrEqual(entrada.animalSpot.x)
  })

  // The turtles' own rescue (P3, `odd/tasks/promised-animals.md`): same
  // reasoning as the fish above — the recovered turtle stands in `entrada`,
  // not `arena`, where `turtle1..4` are actually played.
  it('the turtle is absent before turtle4 is filed, and appears at the entrance once it is', () => {
    expect(animalPlacements(entrada, filed('turtle1', 'turtle2', 'turtle3'))).toEqual([])
    const placed = animalPlacements(entrada, filed('turtle4'))
    expect(placed).toHaveLength(1)
    expect(placed[0].art).toBe(ZOO_ANIMAL_ART.tortuga)
  })

  // The monkeys' own rescue (P4). Same reasoning, `bosque` is where
  // `monkey1..4` are played, `entrada` is where the recovered monkey stands.
  it('the monkey is absent before monkey4 is filed, and appears at the entrance once it is', () => {
    expect(animalPlacements(entrada, filed('monkey1', 'monkey2', 'monkey3'))).toEqual([])
    const placed = animalPlacements(entrada, filed('monkey4'))
    expect(placed).toHaveLength(1)
    expect(placed[0].art).toBe(ZOO_ANIMAL_ART.mono)
  })

  it('the fish, turtle and monkey all stand together at the entrance once every rescue is done — three boxes, all inside ENTRADA_HIT, none overlapping', () => {
    const placed = animalPlacements(entrada, filed('f2-agua4', 'turtle4', 'monkey4'))
    expect(placed).toHaveLength(3)
    const hit = entrada.hit!
    const insideHit = (box: { x: number; y: number; width: number; height: number }): boolean =>
      box.x >= hit.x &&
      box.y >= hit.y &&
      box.x + box.width <= hit.x + hit.w &&
      box.y + box.height <= hit.y + hit.h
    for (const p of placed) expect(insideHit(p.box), p.art.href).toBe(true)
    const disjoint = (
      a: { x: number; y: number; width: number; height: number },
      b: { x: number; y: number; width: number; height: number },
    ): boolean => a.x + a.width <= b.x || a.x >= b.x + b.width || a.y + a.height <= b.y || a.y >= b.y + b.height
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        expect(disjoint(placed[i].box, placed[j].box), `${placed[i].art.href} vs ${placed[j].art.href}`).toBe(true)
      }
    }
  })
})

describe('isFiled', () => {
  it('true once a level has at least one approval', () => {
    expect(isFiled(filed('duck-trail1'), 'duck-trail1')).toBe(true)
  })

  it('false for zero approvals or an absent record', () => {
    expect(isFiled({}, 'duck-trail1')).toBe(false)
  })
})

describe('rot is pinned to the literal 0 (design.md §4)', () => {
  it('a non-zero rot is a type error, proven only by npm run build', () => {
    // @ts-expect-error — `rot` is typed as the literal `0`; a rotated fog
    // patch cannot be proven sound by `coversRect` (design.md §4). If this
    // line ever stops erroring, the guard is gone, and only `npm run build`
    // — never this vitest run — would notice.
    const bad: FogPatch = { art: 0, x: 0, y: 0, size: 10, rot: 15 }
    expect(bad).toBeTruthy()
  })
})

describe('Image-to-ViewBox Transform', () => {
  // zoo-map spec: "Transform matches the measured scale factor". This
  // requirement used to be prose only — the factor lived in comments and in
  // design.md and in nothing that could fail. Every `hit` in the registry is
  // downstream of it, so an unasserted transform means unasserted geometry.

  it('covers the stage by the WIDTH ratio, the larger of the two', () => {
    // 1000/1536 = 0.651042 beats 600/1024 = 0.585938. Picking the smaller one
    // is `meet`, not `slice`: it would letterbox the map inside the stage
    // instead of cropping it, and every y below would be wrong by 33 units.
    expect(imageToViewBox(1536, 0).x).toBeCloseTo(1000, 6)
    expect(imageToViewBox(768, 0).x).toBeCloseTo(500, 6)
  })

  it('crops 33.33 units off the top and the bottom alike', () => {
    // The image renders 1024 x 0.651042 = 666.67 tall on a 600 stage, centred.
    expect(imageToViewBox(0, 0).y).toBeCloseTo(-33.333, 2)
    expect(imageToViewBox(0, 1024).y).toBeCloseTo(633.333, 2)
    // Symmetric: the stage's own midline is the image's own midline.
    expect(imageToViewBox(0, 512).y).toBeCloseTo(300, 6)
  })

  it("the nocturna hit contains the night sky's measured source bbox", () => {
    // Provenance, not arithmetic. The navy sky `#496A93` was region-sampled on
    // the shipped PNG at image pixels (136, 90)-(527, 360); pushing those two
    // corners through the transform has to land inside the rect the registry
    // declares, or the rect is not describing the thing it names. This is the
    // one invariant the geometry tests cannot express: they prove the rects
    // are disjoint and fogged, never that a rect sits on its own DRAWING.
    // The rest of that job belongs to the `?debug=sectores` capture.
    const nocturna = SECTORS.find((s) => s.id === 'nocturna')
    const hit = nocturna?.hit
    expect(hit).toBeDefined()
    if (!hit) return
    const tl = imageToViewBox(136, 90)
    const br = imageToViewBox(527, 360)
    expect(tl.x).toBeGreaterThanOrEqual(hit.x)
    expect(tl.y).toBeGreaterThanOrEqual(hit.y)
    expect(br.x).toBeLessThanOrEqual(hit.x + hit.w)
    expect(br.y).toBeLessThanOrEqual(hit.y + hit.h)
  })
})

describe('viewBoxToImage (the exact inverse of imageToViewBox)', () => {
  it('round-trips imageToViewBox → viewBoxToImage back to the source pixel', () => {
    for (const [x, y] of [[0, 0], [1536, 1024], [768, 512], [136, 90], [527, 360]] as const) {
      const back = viewBoxToImage(imageToViewBox(x, y).x, imageToViewBox(x, y).y)
      expect(back.x).toBeCloseTo(x, 6)
      expect(back.y).toBeCloseTo(y, 6)
    }
  })

  it('round-trips the other way too: viewBoxToImage → imageToViewBox', () => {
    for (const [vbX, vbY] of [[0, 0], [1000, 600], [500, 300], [90, 135], [910, 505]] as const) {
      const back = imageToViewBox(viewBoxToImage(vbX, vbY).x, viewBoxToImage(vbX, vbY).y)
      expect(back.x).toBeCloseTo(vbX, 6)
      expect(back.y).toBeCloseTo(vbY, 6)
    }
  })
})

describe('imageToViewBox/viewBoxToImage — optional stageWidth parameter (zoo-map spec, design.md §3.2/§3.4)', () => {
  it('defaults to STAGE_W (1000) — every existing caller stays byte-identical with no argument', () => {
    for (const [x, y] of [[0, 0], [1536, 1024], [768, 512], [136, 90], [527, 360]] as const) {
      expect(imageToViewBox(x, y, 1000)).toEqual(imageToViewBox(x, y))
    }
    for (const [vbX, vbY] of [[0, 0], [1000, 600], [500, 300], [90, 135], [910, 505]] as const) {
      expect(viewBoxToImage(vbX, vbY, 1000)).toEqual(viewBoxToImage(vbX, vbY))
    }
  })

  it('W = 1560 (dolphin3): the channel row table (design.md §3.2)', () => {
    // scale = max(1560/1536, 600/1024) = 1.015625.
    expect(viewBoxToImage(0, 92, 1560).y).toBeCloseTo(307.2, 1)
    expect(viewBoxToImage(0, 508, 1560).y).toBeCloseTo(716.8, 1)
  })

  it('W = 2120 (dolphin4): the channel row table (design.md §3.2)', () => {
    // scale = max(2120/1536, 600/1024) = 1.380208.
    expect(viewBoxToImage(0, 98, 2120).y).toBeCloseTo(365.6, 1)
    expect(viewBoxToImage(0, 502, 2120).y).toBeCloseTo(658.4, 1)
  })

  it('the 161-row lie: the default-width transform validates rows the render never shows at a wide sheet', () => {
    const atDefault = viewBoxToImage(0, 98, 1000).y
    const atDolphin4Width = viewBoxToImage(0, 98, 2120).y
    // The same viewBox row maps to a wildly different source row once the
    // sheet is actually 2120 wide — the whole reason the parameter exists:
    // `backdrops.test.ts` must validate the row the render ACTUALLY shows,
    // not the row a hardcoded 1000-wide transform reports.
    expect(Math.abs(atDolphin4Width - atDefault)).toBeGreaterThan(150)
  })

  it('a wider explicit sheet round-trips exactly like the default one does', () => {
    for (const [vbX, vbY] of [[0, 0], [1560, 600], [780, 300]] as const) {
      const img = viewBoxToImage(vbX, vbY, 1560)
      const back = imageToViewBox(img.x, img.y, 1560)
      expect(back.x).toBeCloseTo(vbX, 6)
      expect(back.y).toBeCloseTo(vbY, 6)
    }
  })
})

describe('imageToViewBox/viewBoxToImage — optional imgW/imgH parameters (T22, wide backdrops)', () => {
  it('defaults to the map size (1536x1024) — every existing caller stays byte-identical', () => {
    for (const [x, y] of [[0, 0], [1536, 1024], [768, 512], [136, 90]] as const) {
      expect(imageToViewBox(x, y, 1000, 1536, 1024)).toEqual(imageToViewBox(x, y))
    }
    for (const [vbX, vbY] of [[0, 0], [1000, 600], [500, 300]] as const) {
      expect(viewBoxToImage(vbX, vbY, 1000, 1536, 1024)).toEqual(viewBoxToImage(vbX, vbY))
    }
  })

  it('a 2:1 backdrop (2048x1024) scales by the WIDTH ratio at a 4:3-ish 1000-wide stage — cropping its SIDES, not its top/bottom', () => {
    // scale = max(1000/2048, 600/1024) = max(0.488281, 0.585938) = 0.585938
    // (the HEIGHT ratio wins here, unlike the 1536-wide map/3:2 backdrops
    // above where the width ratio always wins) — the image renders its FULL
    // height and MORE than its full width would need, i.e. its sides are
    // what a squarer stage crops, exactly the author's own framing ("wider
    // art crops only its sides on squarer screens").
    const scale = Math.max(1000 / 2048, 600 / 1024)
    expect(scale).toBeCloseTo(600 / 1024, 6)
    expect(imageToViewBox(0, 0, 1000, 2048, 1024).y).toBeCloseTo(0, 6)
    expect(imageToViewBox(0, 1024, 1000, 2048, 1024).y).toBeCloseTo(600, 6)
    // The image is 2048 * scale = 1200 wide on the 1000-wide stage, centred:
    // 100 units cropped off each side.
    expect(imageToViewBox(0, 0, 1000, 2048, 1024).x).toBeCloseTo(-100, 6)
    expect(imageToViewBox(2048, 0, 1000, 2048, 1024).x).toBeCloseTo(1100, 6)
  })

  it('a 2:1 backdrop round-trips through both directions, same as every other size', () => {
    for (const [vbX, vbY] of [[0, 0], [1000, 600], [500, 300], [-50, 120]] as const) {
      const img = viewBoxToImage(vbX, vbY, 1000, 2048, 1024)
      const back = imageToViewBox(img.x, img.y, 1000, 2048, 1024)
      expect(back.x).toBeCloseTo(vbX, 6)
      expect(back.y).toBeCloseTo(vbY, 6)
    }
  })

  it("the same corridor row, pushed through a 2:1 image instead of a 3:2 one, lands on a different source pixel — proving the conversion actually reads imgW/imgH rather than ignoring them (the stage MIDLINE always maps to the image's own vertical midpoint regardless of width, so this needs an off-centre row to tell the two scales apart)", () => {
    const at32 = viewBoxToImage(0, 100, 1000, 1536, 1024).y
    const at21 = viewBoxToImage(0, 100, 1000, 2048, 1024).y
    expect(at32).toBeCloseTo(204.8, 1)
    expect(at21).toBeCloseTo(170.667, 1)
    expect(at32).not.toBeCloseTo(at21, 1)
  })
})
