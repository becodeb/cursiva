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
  type FogPatch,
  type Records,
} from './sectors'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

const estanque = SECTORS.find((s) => s.id === 'estanque')!
const sendero = SECTORS.find((s) => s.id === 'sendero')!
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

  it('the estanque and the sendero carry no fog obligation', () => {
    expect(estanque.fog).toEqual([])
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

  it('the five undeveloped sectors carry no adventures and stay fogged for any input', () => {
    for (const sector of SECTORS.filter((s) => s.id !== 'estanque' && s.id !== 'sendero')) {
      expect(sector.adventureIds, sector.id).toEqual([])
      expect(sector.unlockedWhen(filed('duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4')), sector.id).toBe(
        false,
      )
    }
  })
})

describe('Estanque Starts Discovered (D4)', () => {
  it('is open before any record exists', () => {
    expect(estanque.unlockedWhen({})).toBe(true)
    expect(isOpen(estanque, {})).toBe(true)
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

describe('recentlyDiscovered', () => {
  it('resolves to the estanque while it still has an unfinished adventure', () => {
    expect(recentlyDiscovered({})?.id).toBe('estanque')
    expect(recentlyDiscovered(filed('duck-trail1'))?.id).toBe('estanque')
  })

  it('resolves to null once every open sector is fully filed', () => {
    expect(recentlyDiscovered(filed(...estanque.adventureIds))).toBeNull()
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
