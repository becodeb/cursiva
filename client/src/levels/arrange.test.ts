// Shape contract for the arrange mechanic (object-arrange spec). Every
// export runs with no DOM — the whole point, since this repo's harness is
// node with no jsdom and no testing-library.
import { describe, expect, it } from 'vitest'
import type { ArtBox } from '../canvas/placeArt'
import {
  arrangeRenderPieces,
  arrangeTick,
  debugArrange,
  grabPiece,
  initialArrange,
  isArranged,
  pieceBox,
  seedArrange,
  type ArrangeConfig,
  type ArrangeState,
} from './arrange'

const CFG: ArrangeConfig = {
  from: [
    { x: 100, y: 500 },
    { x: 300, y: 500 },
    { x: 500, y: 500 },
  ],
  snapRadius: 40,
}

const HOME_BOXES: readonly ArtBox[] = [
  { x: 80, y: 260, width: 100, height: 40 },
  { x: 260, y: 250, width: 120, height: 50 },
  { x: 440, y: 240, width: 140, height: 60 },
]

describe('initialArrange', () => {
  it('scatters every piece with nothing held', () => {
    const state = initialArrange(CFG)
    expect(state.placed).toEqual([null, null, null])
    expect(state.held).toBeNull()
    expect(state.offset).toEqual({ x: 0, y: 0 })
  })
})

describe('grabPiece', () => {
  it('a point inside exactly one box returns that piece', () => {
    const state = initialArrange(CFG)
    const boxes: ArtBox[] = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 100, y: 100, width: 10, height: 10 },
      { x: 200, y: 200, width: 10, height: 10 },
    ]
    expect(grabPiece(state, boxes, { x: 105, y: 105 })).toBe(1)
  })

  it('a point inside two overlapping boxes returns the TOPMOST (last rendered)', () => {
    const state = initialArrange(CFG)
    const boxes: ArtBox[] = [
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 20, y: 20, width: 50, height: 50 },
    ]
    expect(grabPiece(state, boxes, { x: 30, y: 30 })).toBe(1)
  })

  it('a point inside no box returns null', () => {
    const state = initialArrange(CFG)
    const boxes: ArtBox[] = [{ x: 0, y: 0, width: 10, height: 10 }]
    expect(grabPiece(state, boxes, { x: 500, y: 500 })).toBeNull()
  })

  it('a piece already placed in its own slot is not grabbable', () => {
    const state: ArrangeState = { placed: [0, null, null], held: null, offset: { x: 0, y: 0 } }
    const boxes: ArtBox[] = [{ x: 0, y: 0, width: 50, height: 50 }]
    expect(grabPiece(state, boxes, { x: 10, y: 10 })).toBeNull()
  })
})

describe('arrangeTick', () => {
  it('returns the SAME reference on an idle re-pass (no-op contract)', () => {
    const state = initialArrange(CFG)
    const next = arrangeTick(state, HOME_BOXES, { x: -1000, y: -1000 }, false, CFG)
    expect(next).toBe(state)
  })

  it('a press over a scattered piece grabs it', () => {
    const state = initialArrange(CFG)
    const next = arrangeTick(state, HOME_BOXES, CFG.from[0], true, CFG)
    expect(next.held).toBe(0)
  })

  it('dragging a held piece follows the pointer (offset tracks it exactly)', () => {
    let state = initialArrange(CFG)
    state = arrangeTick(state, HOME_BOXES, CFG.from[0], true, CFG)
    const dragged = arrangeTick(state, HOME_BOXES, { x: 150, y: 480 }, true, CFG)
    expect(dragged.offset).toEqual({ x: 150 - CFG.from[0].x, y: 480 - CFG.from[0].y })
  })

  it('a drop within snapRadius of a free slot occupies it', () => {
    let state = initialArrange(CFG)
    state = arrangeTick(state, HOME_BOXES, CFG.from[0], true, CFG)
    // Drag it near slot 0's own centre.
    const slot0Centre = { x: HOME_BOXES[0].x + HOME_BOXES[0].width / 2, y: HOME_BOXES[0].y + HOME_BOXES[0].height / 2 }
    state = arrangeTick(state, HOME_BOXES, slot0Centre, true, CFG)
    const released = arrangeTick(state, HOME_BOXES, slot0Centre, false, CFG)
    expect(released.placed[0]).toBe(0)
    expect(released.held).toBeNull()
    expect(released.offset).toEqual({ x: 0, y: 0 })
  })

  it('a drop outside every slot\'s snapRadius returns the piece to its scatter point', () => {
    let state = initialArrange(CFG)
    state = arrangeTick(state, HOME_BOXES, CFG.from[0], true, CFG)
    // Drag it somewhere far from every slot.
    state = arrangeTick(state, HOME_BOXES, { x: 900, y: 900 }, true, CFG)
    const released = arrangeTick(state, HOME_BOXES, { x: 900, y: 900 }, false, CFG)
    expect(released.placed).toEqual([null, null, null])
    expect(released.held).toBeNull()
    expect(released.offset).toEqual({ x: 0, y: 0 })
  })

  it('a drop nearest an OCCUPIED slot does not displace its occupant and returns to scatter', () => {
    let state: ArrangeState = { placed: [0, null, null], held: null, offset: { x: 0, y: 0 } }
    // Grab piece 1 and drop it right on slot 0's centre, already occupied by piece 0.
    state = arrangeTick(state, HOME_BOXES, CFG.from[1], true, CFG)
    const slot0Centre = { x: HOME_BOXES[0].x + HOME_BOXES[0].width / 2, y: HOME_BOXES[0].y + HOME_BOXES[0].height / 2 }
    state = arrangeTick(state, HOME_BOXES, slot0Centre, true, CFG)
    const released = arrangeTick(state, HOME_BOXES, slot0Centre, false, CFG)
    expect(released.placed[0]).toBe(0) // occupant untouched
    expect(released.placed[1]).toBeNull() // returned to scatter, not displaced
  })
})

describe('isArranged', () => {
  it('true iff every placed[i] === i', () => {
    expect(isArranged({ placed: [0, 1, 2], held: null, offset: { x: 0, y: 0 } })).toBe(true)
  })

  it('false on a swapped pair', () => {
    expect(isArranged({ placed: [1, 0, 2], held: null, offset: { x: 0, y: 0 } })).toBe(false)
  })

  it('false on a partial fill', () => {
    expect(isArranged({ placed: [0, null, 2], held: null, offset: { x: 0, y: 0 } })).toBe(false)
  })
})

describe('debugArrange', () => {
  it('places exactly the first k pieces home, the rest scattered', () => {
    const state = debugArrange(CFG, 2)
    expect(state.placed).toEqual([0, 1, null])
    expect(state.held).toBeNull()
  })

  it('k=0 scatters everything, k >= length homes everything', () => {
    expect(debugArrange(CFG, 0).placed).toEqual([null, null, null])
    expect(debugArrange(CFG, 99).placed).toEqual([0, 1, 2])
  })
})

describe('pieceBox', () => {
  it("a scattered piece's box is centred on its own scatter point", () => {
    const state = initialArrange(CFG)
    const box = pieceBox(state, 0, HOME_BOXES, CFG)
    expect(box.x + box.width / 2).toBeCloseTo(CFG.from[0].x, 6)
    expect(box.y + box.height / 2).toBeCloseTo(CFG.from[0].y, 6)
    expect(box.width).toBe(HOME_BOXES[0].width)
    expect(box.height).toBe(HOME_BOXES[0].height)
  })

  it("a placed piece's box is centred on its slot's own centre", () => {
    const state: ArrangeState = { placed: [0, null, null], held: null, offset: { x: 0, y: 0 } }
    const box = pieceBox(state, 0, HOME_BOXES, CFG)
    expect(box.x).toBeCloseTo(HOME_BOXES[0].x, 6)
    expect(box.y).toBeCloseTo(HOME_BOXES[0].y, 6)
  })
})

describe('seedArrange (task 8.7/8.8 regression: the debug seed must survive every reset site)', () => {
  it('with no debug count, seeds the plain scattered state', () => {
    expect(seedArrange(CFG, null)).toEqual(initialArrange(CFG))
  })

  it('with a debug count, seeds debugArrange instead — every reset site must call THIS, not initialArrange directly', () => {
    expect(seedArrange(CFG, 2)).toEqual(debugArrange(CFG, 2))
    expect(seedArrange(CFG, 2)).not.toEqual(initialArrange(CFG))
  })
})

describe('arrangeRenderPieces (task 8.7/8.8 regression: a placed piece must render at its authored rotation)', () => {
  const PIECES = [
    { href: '/art/small.png', rotate: -90 },
    { href: '/art/medium.png', rotate: -90 },
    { href: '/art/large.png', rotate: -90 },
  ]

  it('a SCATTERED piece renders with no rotation', () => {
    const state = initialArrange(CFG)
    const rendered = arrangeRenderPieces(state, PIECES, HOME_BOXES, CFG)
    expect(rendered[0].rotate).toBeUndefined()
  })

  it('a HELD piece (mid-drag) renders with no rotation', () => {
    let state = initialArrange(CFG)
    state = arrangeTick(state, HOME_BOXES, CFG.from[0], true, CFG)
    expect(state.held).toBe(0)
    const rendered = arrangeRenderPieces(state, PIECES, HOME_BOXES, CFG)
    expect(rendered[0].rotate).toBeUndefined()
  })

  it('a PLACED piece renders at its own authored rotation, matching the hollow it fills', () => {
    const state: ArrangeState = { placed: [0, null, null], held: null, offset: { x: 0, y: 0 } }
    const rendered = arrangeRenderPieces(state, PIECES, HOME_BOXES, CFG)
    expect(rendered[0].rotate).toBe(-90)
    // The other two, still scattered, stay unrotated.
    expect(rendered[1].rotate).toBeUndefined()
    expect(rendered[2].rotate).toBeUndefined()
  })

  it('every piece keeps its own href regardless of arrange state', () => {
    const state = initialArrange(CFG)
    const rendered = arrangeRenderPieces(state, PIECES, HOME_BOXES, CFG)
    expect(rendered.map((r) => r.href)).toEqual(PIECES.map((p) => p.href))
  })
})

describe('every export runs with no DOM', () => {
  it('requires no window access or component context', () => {
    expect(typeof window).toBe('undefined')
    const state = initialArrange(CFG)
    const next = arrangeTick(state, HOME_BOXES, { x: 0, y: 0 }, true, CFG)
    expect(isArranged(next)).toBe(false)
    expect(debugArrange(CFG, 1)).toBeDefined()
    expect(grabPiece(state, HOME_BOXES, { x: 0, y: 0 })).toBeDefined()
  })
})
