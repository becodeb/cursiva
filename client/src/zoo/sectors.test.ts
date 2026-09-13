// Sector registry tests (zoo-map spec: "Sector Registry Data Shape",
// "Sector Geometry Invariants", "Fog Containment Invariant",
// "Sector-to-Adventure Mapping", "Estanque Starts Discovered", "nextAdventure
// Resolution", "Recovered Animal Placement"). Node environment, no DOM —
// every function under test is pure over plain data (design.md §5's table).
import { describe, expect, it } from 'vitest'
import { LEVELS } from '../levels/catalog'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
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

  it("estanque's eight adventures are in the exact documented order", () => {
    expect(estanque.adventureIds).toEqual([
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
      'f2-guirnalda',
      'f2-agua2',
      'f2-agua3',
      'f2-agua4',
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

  it("entrada's eight levels are glass then sand, and entrada is never fogged (zoo-map spec)", () => {
    expect(entrada.adventureIds).toEqual([
      'glass1', 'glass2', 'glass3', 'glass4', 'sand1', 'sand2', 'sand3', 'sand4',
    ])
    for (const records of [{}, filed('sand4'), filed('glass1', 'glass2', 'glass3', 'glass4')]) {
      expect(entrada.unlockedWhen(records)).toBe(true)
    }
  })

  it('nocturna stays fogged until llama-peak4 is filed (zoo-map spec)', () => {
    expect(nocturna.adventureIds).toEqual(['night1', 'night2', 'night3', 'night4'])
    expect(nocturna.unlockedWhen({})).toBe(false)
    expect(nocturna.unlockedWhen(filed('sheep-hill4'))).toBe(false)
    expect(nocturna.unlockedWhen(filed('llama-peak4'))).toBe(true)
  })

  it('bosque and arena remain empty and fogged for every input (zoo-map spec)', () => {
    const bosque = SECTORS.find((s) => s.id === 'bosque')!
    const arena = SECTORS.find((s) => s.id === 'arena')!
    for (const sector of [bosque, arena]) {
      expect(sector.adventureIds, sector.id).toEqual([])
      for (const records of [{}, filed('sand4', 'night4', 'llama-peak4')]) {
        expect(sector.unlockedWhen(records), sector.id).toBe(false)
      }
    }
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

  it('bosque, arena and the scenery-only sendero carry no adventures and stay fogged for any input', () => {
    // `montañas` was promoted OUT of this set by row C (`docs/13` §8), and
    // `entrada`/`nocturna` are promoted out by row D (`docs/13` §8 row D,
    // zoo-map spec "Sector-to-Adventure Mapping") — only `bosque`, `arena`
    // and the scenery-only `sendero` remain undeveloped.
    for (const sector of SECTORS.filter((s) => s.id === 'bosque' || s.id === 'arena' || s.id === 'sendero')) {
      expect(sector.adventureIds, sector.id).toEqual([])
      expect(
        sector.unlockedWhen(filed('duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4', 'sand4', 'night4')),
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

  it('opens once sand4 is filed, never before', () => {
    expect(estanque.unlockedWhen(filed('sand4'))).toBe(true)
    expect(isOpen(estanque, filed('sand4'))).toBe(true)
    expect(estanque.unlockedWhen(filed('glass1', 'glass2', 'glass3', 'glass4'))).toBe(false)
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

  it('returns the LAST adventure once every one is filed', () => {
    const records = filed(...estanque.adventureIds)
    expect(nextAdventure(estanque, records)).toBe('f2-agua4')
  })

  it('returns null for a sector with no adventures', () => {
    expect(nextAdventure(sendero, {})).toBeNull()
    const fogged1 = SECTORS.find((s) => s.id === 'bosque')!
    expect(nextAdventure(fogged1, {})).toBeNull()
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
    // entrada still has seven unfiled ids — not to `null`.
    expect(recentlyDiscovered(attempted('glass1'))?.id).toBe('entrada')
  })

  it('resolves to null once every open sector is fully filed', () => {
    // Filing entrada's own eight ids opens the estanque (`sand4`); filing
    // the estanque's `duck-trail4` opens `montañas`; filing `montañas`'
    // `llama-peak4` opens `nocturna` — every sector this chain reaches is
    // fully filed, so there is genuinely no unfinished work left anywhere.
    expect(
      recentlyDiscovered(
        filed(...entrada.adventureIds, ...estanque.adventureIds, ...montanas.adventureIds, ...nocturna.adventureIds),
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
