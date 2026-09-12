// placeArt tests (design.md §7; spec: trace-canvas "Carrier Art Centres On
// Its Grip, Not Its Bounding Box"). Pure function, no DOM.
import { describe, expect, it } from 'vitest'
import { CARRIER_LENS_ART } from '../detective/assets'
import { DEFAULT_GRIP, placeArt } from './placeArt'

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
