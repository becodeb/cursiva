// placeArt tests (design.md §7; spec: trace-canvas "Carrier Art Centres On
// Its Grip, Not Its Bounding Box"). Pure function, no DOM.
import { describe, expect, it } from 'vitest'
import { CARRIER_LENS_ART } from '../detective/assets'
import { buildLevelTarget } from '../levels/buildLevel'
import { getLevel } from '../levels/catalog'
import {
  clampArtBox,
  DEFAULT_GRIP,
  placeArt,
  standBesideArtCorridor,
  STANDING_GRIP,
} from './placeArt'

describe('placeArt (design.md §7: "placeArt() lives in canvas/, takes a structural shape")', () => {
  it('with no declared grip, centres the box on `center`', () => {
    const art = { w: 100, h: 50 }
    const box = placeArt(art, 40, { x: 0, y: 0 })
    // width = height * w/h = 40 * 100/50 = 80; default grip is the box centre.
    expect(box).toEqual({ x: -40, y: -20, width: 80, height: 40 })
  })

  it('a declared grip lands EXACTLY on `center` — not the bounding-box centre', () => {
    const art = { w: 100, h: 100, grip: [0.25, 0.75] as const }
    const box = placeArt(art, 40, { x: 0, y: 0 })
    // grip point in local box space: (0.25*40, 0.75*40) = (10, 30). Placing
    // that exactly on (0,0) means the box origin is (-10, -30).
    expect(box.x).toBe(-10)
    expect(box.y).toBe(-30)
    // And that is NOT where the default grip would have put it.
    const defaultBox = placeArt({ ...art, grip: undefined }, 40, { x: 0, y: 0 })
    expect(box.x).not.toBe(defaultBox.x)
    expect(box.y).not.toBe(defaultBox.y)
  })

  it("the SHIPPED carrier-lens grip (0.603, 0.391) lands off the bbox centre — fails if the fix is ever reverted", () => {
    const center = { x: 0, y: 0 }
    const withGrip = placeArt(CARRIER_LENS_ART, 104, center)
    const bboxCentred = placeArt({ ...CARRIER_LENS_ART, grip: undefined }, 104, center)
    expect(CARRIER_LENS_ART.grip).toEqual([0.603, 0.391])
    // (0.603, 0.391) is not (0.5, 0.5): both axes must actually move.
    expect(withGrip.x).not.toBe(bboxCentred.x)
    expect(withGrip.y).not.toBe(bboxCentred.y)
    // And the grip point itself — not the box's top-left corner — is what
    // lands on `center`: x + grip[0]*width === center.x, y + grip[1]*height === center.y.
    const [gx, gy] = CARRIER_LENS_ART.grip as readonly [number, number]
    expect(withGrip.x + gx * withGrip.width).toBeCloseTo(center.x)
    expect(withGrip.y + gy * withGrip.height).toBeCloseTo(center.y)
  })

  it('holds the aspect ratio for a non-square w/h', () => {
    const art = { w: 361, h: 384 } // the real carrier-lens.png dimensions, ungripped
    const box = placeArt(art, 104, { x: 5, y: 5 })
    expect(box.width).toBeCloseTo((104 * 361) / 384)
    expect(box.height).toBe(104)
  })

  it('a zero height does not produce NaN', () => {
    const box = placeArt({ w: 100, h: 50 }, 0, { x: 1, y: 2 })
    expect(box).toEqual({ x: 1, y: 2, width: 0, height: 0 })
    expect(Number.isNaN(box.x)).toBe(false)
    expect(Number.isNaN(box.y)).toBe(false)
    expect(Number.isNaN(box.width)).toBe(false)
  })

  it('DEFAULT_GRIP is the box centre', () => {
    expect(DEFAULT_GRIP).toEqual([0.5, 0.5])
  })
})

describe('clampArtBox (standing art may not be cut in half by the edge of the sheet)', () => {
  // The real sheet every trail renders into.
  const SHEET = { x: 0, y: 0, width: 1000, height: 600 }

  it('leaves a box that already fits exactly where it was', () => {
    const box = { x: 100, y: 200, width: 104, height: 96 }
    expect(clampArtBox(box, SHEET)).toEqual(box)
  })

  it('touching an edge without crossing it is still no shift', () => {
    const box = { x: 0, y: 504, width: 104, height: 96 } // flush left, flush bottom
    expect(clampArtBox(box, SHEET)).toEqual(box)
  })

  it('shifts ONE axis when only one overflows, and by the minimum', () => {
    // `?nivel=duck-trail4`: the route starts near the left edge, so the
    // octopus placed by its feet hangs 40 units off the sheet.
    const box = { x: -40, y: 300, width: 104, height: 96 }
    const fixed = clampArtBox(box, SHEET)
    expect(fixed.x).toBe(0) // exactly the overflow, not a padded inset
    expect(fixed.y).toBe(300) // the axis that fit is untouched
    expect(fixed.width).toBe(104)
    expect(fixed.height).toBe(96)
  })

  it('shifts the RIGHT and BOTTOM edges back in by the minimum too', () => {
    const fixed = clampArtBox({ x: 960, y: 560, width: 104, height: 96 }, SHEET)
    expect(fixed.x).toBe(1000 - 104)
    expect(fixed.y).toBe(600 - 96)
  })

  it('shifts BOTH axes when both overflow', () => {
    const fixed = clampArtBox({ x: -12, y: -30, width: 104, height: 96 }, SHEET)
    expect(fixed).toEqual({ x: 0, y: 0, width: 104, height: 96 })
  })

  it('honours a CROPPED band: bounds are the visible sheet, not the full 600', () => {
    // `viewBoxY`/`viewBoxHeight` crop empty margin (TraceCanvas), and a
    // character has to fit in what is actually shown.
    const band = { x: 0, y: 120, width: 1000, height: 360 }
    expect(clampArtBox({ x: 10, y: 60, width: 104, height: 96 }, band).y).toBe(120)
    expect(clampArtBox({ x: 10, y: 460, width: 104, height: 96 }, band).y).toBe(480 - 96)
  })

  it('NEVER resizes — a character shrunk to fit would read as standing further away', () => {
    const fixed = clampArtBox({ x: -500, y: -500, width: 104, height: 96 }, SHEET)
    expect(fixed.width).toBe(104)
    expect(fixed.height).toBe(96)
  })

  it('art WIDER than the sheet pins to the near edge, never off the other side', () => {
    // No position fits, so clamping must not turn one clipped edge into two.
    const fixed = clampArtBox({ x: -200, y: 0, width: 1400, height: 96 }, SHEET)
    expect(fixed.x).toBe(0)
    // The far side overflows, which is unavoidable; the left edge is visible.
    expect(fixed.x + fixed.width).toBeGreaterThan(SHEET.width)
  })

  it('art TALLER than the band pins to its top for the same reason', () => {
    const band = { x: 0, y: 120, width: 1000, height: 200 }
    const fixed = clampArtBox({ x: 0, y: 400, width: 104, height: 400 }, band)
    expect(fixed.y).toBe(120)
  })

  it('composes with placeArt: the feet stay on the point whenever no shift is needed', () => {
    const art = { w: 384, h: 353 } // carrier-octopus.png
    const feet = { x: 500, y: 300 }
    const box = clampArtBox(placeArt({ ...art, grip: STANDING_GRIP }, 96, feet), SHEET)
    expect(box.y + box.height).toBeCloseTo(feet.y) // standing ON the point
    expect(box.x + box.width / 2).toBeCloseTo(feet.x)
  })

  it('composes with placeArt: a start against the left edge moves by less than half the art', () => {
    const art = { w: 384, h: 353 }
    const feet = { x: 12, y: 300 }
    const raw = placeArt({ ...art, grip: STANDING_GRIP }, 96, feet)
    const box = clampArtBox(raw, SHEET)
    expect(box.x).toBe(0)
    // docs/09 §2: the octopus marks WHERE YOU STARTED FROM, so the drift is
    // bounded by half its own width (~52 units on a 1000-unit sheet).
    expect(box.x - raw.x).toBeLessThanOrEqual(raw.width / 2)
    expect(box.y + box.height).toBeCloseTo(feet.y) // the vertical axis never moved
  })
})

describe('standBesideArtCorridor (N3: the start octopus must not stand ON the drawn body)', () => {
  const piece = { box: { x: 100, y: 50, width: 200, height: 80 }, rotate: 0, pivot: { x: 200, y: 90 } }

  it('for an unrotated piece, moves before the box on X and keeps the given Y', () => {
    const at = { x: 150, y: 77 }
    expect(standBesideArtCorridor(at, piece, 30, true)).toEqual({ x: piece.box.x - 30, y: at.y })
  })

  it('the opposite end (atStart: false) moves past the box’s FAR edge instead', () => {
    const at = { x: 150, y: 77 }
    expect(standBesideArtCorridor(at, piece, 30, false)).toEqual({
      x: piece.box.x + piece.box.width + 30,
      y: at.y,
    })
  })

  it('rotates the offset WITH the piece — a rotate:-90 column shifts on Y, not X', () => {
    const column = { box: { x: 0, y: 0, width: 100, height: 40 }, rotate: -90, pivot: { x: 50, y: 20 } }
    const at = { x: 50, y: 20 } // exactly on the pivot
    // Local X (the piece's own long axis) is what a `rotate: -90` piece maps
    // onto screen Y — the same axis `standBesideArtCorridor`'s own doc names.
    const result = standBesideArtCorridor(at, column, 10, true)
    expect(result.x).toBeCloseTo(50, 9)
    expect(result.y).toBeCloseTo(80, 9)
  })

  it('snake1: clears the whole small-snake box, on the open sand to its left', () => {
    const target = buildLevelTarget(getLevel('snake1'))
    const piece0 = target.artCorridor![0]
    const start = target.start!
    const at = standBesideArtCorridor(start, piece0, 112, true)
    // Before this fix, the octopus stood exactly at `start` — inside the
    // box, on the drawn body's own centreline (N3).
    expect(start.x).toBeGreaterThan(piece0.box.x)
    expect(start.x).toBeLessThan(piece0.box.x + piece0.box.width)
    // After it, the octopus's feet clear the box's own left edge...
    expect(at.x).toBeLessThan(piece0.box.x)
    // ...while staying on the sheet, and at the same height as the spine —
    // beside the snake's head, not below the whole animal.
    expect(at.x).toBeGreaterThan(0)
    expect(at.y).toBe(start.y)
  })
})

describe('STANDING_GRIP (docs/09 §3: "los animales llevan el origen en las patas")', () => {
  it('is centred horizontally and stands on the point', () => {
    expect(STANDING_GRIP).toEqual([0.5, 1])
    const box = placeArt({ w: 100, h: 100, grip: STANDING_GRIP }, 40, { x: 0, y: 0 })
    expect(box).toEqual({ x: -20, y: -40, width: 40, height: 40 })
  })
})
