// rescueAnimalPlacement tests (prewriting-stage-completion T24 follow-up,
// coordinator review 2026-09-26). Node environment, no DOM — plain numbers,
// the same convention `bubbleFit.test.ts`/`pulpitoStance.ts` already use.
// Real `octopusBoxAtCorner`/`placeAndFitBubble` outputs are used throughout
// (not hand-picked fixture boxes) — the coordinator's own instruction was to
// reuse the SAME functions the closing screen calls, so a future change to
// either keeps this suite honest instead of silently drifting from what the
// screen actually renders.
import { describe, expect, it } from 'vitest'
import { boxesIntersect, rescueFreeRegion, resolveRescueAnimalBox } from './rescueAnimalPlacement'
import {
  octopusBoxAtCorner,
  OCTOPUS_CORNER_INSET,
  OCTOPUS_CORNER_SIZE_PCT,
  stanceBubbleSide,
} from './pulpitoStance'
import { placeAndFitBubble } from './bubbleFit'
import { ZOO_SPEECH_BUBBLE_TAIL } from './bubblePlacement'
import { ZOO_ANIMAL_ART, ZOO_OCTOPUS_BACKPACK_ART } from '../detective/assets'
import { ADVENTURES } from '../zoo/adventures'

const FRAME = { w: 100, h: 100 }
const REQUIRED_VIEWPORTS = [
  { width: 1024, height: 768 },
  { width: 1180, height: 820 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
] as const

const duck = ADVENTURES.find((a) => a.id === 'duck')!
const duckBeat = duck.closingBeat![0]

/** The exact two calls `AdventureClosing.tsx` makes for a given corner, text
 *  and animal — reused by every test below instead of re-deriving an
 *  equivalent pair of boxes by hand. */
function realBoxes(corner: 'left' | 'right', text: string) {
  const octopusBox = octopusBoxAtCorner(ZOO_OCTOPUS_BACKPACK_ART, {
    corner,
    sizeBy: 'width',
    size: OCTOPUS_CORNER_SIZE_PCT,
    bottom: 2,
    inset: OCTOPUS_CORNER_INSET,
  })
  // Text-only, like this follow-up's own bubble for a rescue closing (no
  // `art` — the small duplicate duck was removed from the bubble).
  const { placement } = placeAndFitBubble({
    frame: FRAME,
    headBox: octopusBox,
    tail: ZOO_SPEECH_BUBBLE_TAIL,
    side: stanceBubbleSide(corner),
    text,
  })
  return { octopusBox, bubbleBox: placement }
}

describe('boxesIntersect', () => {
  it('true for overlapping boxes', () => {
    expect(boxesIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true)
  })

  it('false for disjoint boxes', () => {
    expect(boxesIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 })).toBe(false)
  })

  it('false for boxes that only touch at an edge (not overlapping)', () => {
    expect(boxesIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false)
    expect(boxesIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 10, w: 10, h: 10 })).toBe(false)
  })
})

describe('rescueFreeRegion', () => {
  it("opens the column past Pulpito's own far edge for the default 'left' corner, starting below the bubble's own bottom edge when the (wide) bubble reaches that column", () => {
    const { octopusBox, bubbleBox } = realBoxes('left', duckBeat.line)
    const free = rescueFreeRegion(FRAME, octopusBox, bubbleBox)
    expect(free.x).toBeCloseTo(octopusBox.x + octopusBox.w + 3, 5)
    expect(free.x + free.w).toBeLessThanOrEqual(FRAME.w)
    // The duck's own bubble is wide enough (~69% of the frame) to reach past
    // Pulpito's far edge — this is the exact regression the coordinator
    // found: a plain left/right HALF split would have put the free region's
    // top at y=3 (the frame's own margin), squarely inside the bubble.
    expect(bubbleBox.left + bubbleBox.width).toBeGreaterThan(octopusBox.x + octopusBox.w)
    expect(free.y).toBeCloseTo(bubbleBox.top + bubbleBox.height + 3, 5)
  })

  it("mirrors to Pulpito's own far edge (the LEFT column) for a 'right' corner", () => {
    const { octopusBox, bubbleBox } = realBoxes('right', duckBeat.line)
    const free = rescueFreeRegion(FRAME, octopusBox, bubbleBox)
    expect(free.x).toBeCloseTo(3, 5)
    expect(free.x + free.w).toBeCloseTo(octopusBox.x - 3, 5)
  })

  it('keeps the free region\'s full height (no bubble-bottom clip) when the bubble does not reach into the far column at all', () => {
    // A short, narrow bubble (a one-word line) that never crosses the
    // frame's own midline — the far column should keep its full height.
    const octopusBox = octopusBoxAtCorner(ZOO_OCTOPUS_BACKPACK_ART, {
      corner: 'left',
      sizeBy: 'width',
      size: OCTOPUS_CORNER_SIZE_PCT,
      bottom: 2,
      inset: OCTOPUS_CORNER_INSET,
    })
    const narrowBubble = { left: 10, top: 40, width: 20, height: 15 }
    const free = rescueFreeRegion(FRAME, octopusBox, narrowBubble)
    expect(free.y).toBeCloseTo(3, 5)
  })

  it('never intersects the octopus or bubble box it was computed from', () => {
    for (const corner of ['left', 'right'] as const) {
      const { octopusBox, bubbleBox } = realBoxes(corner, duckBeat.line)
      const free = rescueFreeRegion(FRAME, octopusBox, bubbleBox)
      expect(boxesIntersect(free, octopusBox), corner).toBe(false)
      expect(boxesIntersect(free, { x: bubbleBox.left, y: bubbleBox.top, w: bubbleBox.width, h: bubbleBox.height }), corner).toBe(
        false,
      )
    }
  })
})

describe('resolveRescueAnimalBox (the coordinator\'s own regression: no intersection, at the four required viewports)', () => {
  const artAspect = { w: ZOO_ANIMAL_ART.pato.w, h: ZOO_ANIMAL_ART.pato.h }

  for (const viewport of REQUIRED_VIEWPORTS) {
    it(`never intersects the bubble or Pulpito at ${viewport.width}x${viewport.height} ('left' corner, the duck's own line)`, () => {
      const { octopusBox, bubbleBox } = realBoxes('left', duckBeat.line)
      const box = resolveRescueAnimalBox({ frame: FRAME, octopusBox, bubbleBox, artAspect, viewport })
      const bubbleAsBox = { x: bubbleBox.left, y: bubbleBox.top, w: bubbleBox.width, h: bubbleBox.height }
      expect(boxesIntersect(box, octopusBox)).toBe(false)
      expect(boxesIntersect(box, bubbleAsBox)).toBe(false)
    })

    it(`never intersects the bubble or Pulpito at ${viewport.width}x${viewport.height} ('right' corner)`, () => {
      const { octopusBox, bubbleBox } = realBoxes('right', duckBeat.line)
      const box = resolveRescueAnimalBox({ frame: FRAME, octopusBox, bubbleBox, artAspect, viewport })
      const bubbleAsBox = { x: bubbleBox.left, y: bubbleBox.top, w: bubbleBox.width, h: bubbleBox.height }
      expect(boxesIntersect(box, octopusBox)).toBe(false)
      expect(boxesIntersect(box, bubbleAsBox)).toBe(false)
    })
  }

  it('stays fully inside the 100x100 frame at every required viewport', () => {
    for (const viewport of REQUIRED_VIEWPORTS) {
      const { octopusBox, bubbleBox } = realBoxes('left', duckBeat.line)
      const box = resolveRescueAnimalBox({ frame: FRAME, octopusBox, bubbleBox, artAspect, viewport })
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w).toBeLessThanOrEqual(FRAME.w + 1e-9)
      expect(box.y + box.h).toBeLessThanOrEqual(FRAME.h + 1e-9)
    }
  })

  it('preserves the art\'s own aspect ratio', () => {
    const { octopusBox, bubbleBox } = realBoxes('left', duckBeat.line)
    const box = resolveRescueAnimalBox({ frame: FRAME, octopusBox, bubbleBox, artAspect, viewport: { width: 1024, height: 768 } })
    expect(box.h / box.w).toBeCloseTo(artAspect.h / artAspect.w, 5)
  })

  it('sweeps every shipped animal-recovering adventure\'s own line at every required viewport, both corners — never intersects', () => {
    const rescues = ADVENTURES.filter((a) => a.animal !== undefined)
    expect(rescues.length).toBeGreaterThan(0) // sanity: not accidentally empty
    for (const adventure of rescues) {
      const art = ZOO_ANIMAL_ART[adventure.animal!]
      for (const corner of ['left', 'right'] as const) {
        const { octopusBox, bubbleBox } = realBoxes(corner, adventure.closingBeat![0].line)
        for (const viewport of REQUIRED_VIEWPORTS) {
          const box = resolveRescueAnimalBox({
            frame: FRAME,
            octopusBox,
            bubbleBox,
            artAspect: { w: art.w, h: art.h },
            viewport,
          })
          const bubbleAsBox = { x: bubbleBox.left, y: bubbleBox.top, w: bubbleBox.width, h: bubbleBox.height }
          const label = `${adventure.id} ${corner} ${viewport.width}x${viewport.height}`
          expect(boxesIntersect(box, octopusBox), label).toBe(false)
          expect(boxesIntersect(box, bubbleAsBox), label).toBe(false)
        }
      }
    }
  })

  it('the ~40vh cap, taken alone, actually varies by viewport (proof the conversion is not a single static percent — a real box may still end up FREE-REGION-bound instead, which is correct: the cap is a ceiling, not a target)', () => {
    // A generously wide free region (a short, narrow fixture bubble) so the
    // vh cap — not the free region's own width — is the binding constraint
    // at every viewport, isolating exactly what this test claims.
    const octopusBox = octopusBoxAtCorner(ZOO_OCTOPUS_BACKPACK_ART, {
      corner: 'left',
      sizeBy: 'width',
      size: OCTOPUS_CORNER_SIZE_PCT,
      bottom: 2,
      inset: OCTOPUS_CORNER_INSET,
    })
    const narrowBubble = { left: 10, top: 3, width: 15, height: 10 }
    const short = resolveRescueAnimalBox({
      frame: FRAME,
      octopusBox,
      bubbleBox: narrowBubble,
      artAspect,
      viewport: { width: 844, height: 390 },
    })
    const tall = resolveRescueAnimalBox({
      frame: FRAME,
      octopusBox,
      bubbleBox: narrowBubble,
      artAspect,
      viewport: { width: 768, height: 1024 },
    })
    expect(short.h).not.toBeCloseTo(tall.h, 1)
  })
})
