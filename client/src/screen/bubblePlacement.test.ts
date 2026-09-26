// Node env, no DOM — every function under test is pure over plain numbers
// (this repo's own convention, restated by every other `*.test.ts` in
// `screen/`).
import { describe, expect, it } from 'vitest'
import { octopusBoxBySize, placeSpeechBubble, ZOO_SPEECH_BUBBLE_TAIL, type Box } from './bubblePlacement'

const FRAME = { w: 100, h: 100 }

/** Where the tail tip ACTUALLY renders, given a placement — the box's own
 *  left/top plus the tail's fraction into its own width/height, mirrored
 *  when the placement says so. Used by every "does it point at the
 *  octopus" assertion below instead of re-deriving the formula inline. */
function tailTip(p: ReturnType<typeof placeSpeechBubble>) {
  const fx = p.mirrored ? 1 - ZOO_SPEECH_BUBBLE_TAIL.tailX : ZOO_SPEECH_BUBBLE_TAIL.tailX
  return { x: p.left + fx * p.width, y: p.top + ZOO_SPEECH_BUBBLE_TAIL.tailY * p.height }
}

describe('octopusBoxBySize', () => {
  it('sizes by height for a portrait figure (PrologueOpening\'s caretaker, 235x320)', () => {
    const box = octopusBoxBySize({ w: 235, h: 320 }, { sizeBy: 'height', size: 44, bottom: 2 })
    expect(box.h).toBeCloseTo(44, 5)
    expect(box.w).toBeCloseTo(44 * (235 / 320), 5)
    expect(box.x).toBeCloseTo(50 - box.w / 2, 5) // horizontally centred
    expect(box.y).toBeCloseTo(100 - 2 - 44, 5) // bottom: 2%
  })

  it('sizes by width for a near-square figure (the backpack octopus, 442x448)', () => {
    const box = octopusBoxBySize({ w: 442, h: 448 }, { sizeBy: 'width', size: 44, bottom: 2 })
    expect(box.w).toBeCloseTo(44, 5)
    expect(box.h).toBeCloseTo(44 * (448 / 442), 5)
    expect(box.x).toBeCloseTo(50 - 22, 5)
  })
})

describe('placeSpeechBubble — tail tip actually lands on the target, not the box centre', () => {
  const octopusBox = octopusBoxBySize({ w: 442, h: 448 }, { sizeBy: 'width', size: 44, bottom: 2 })

  it('the tail tip sits beside the head, well off the box\'s own horizontal centre', () => {
    const placed = placeSpeechBubble({ frame: FRAME, headBox: octopusBox, tail: ZOO_SPEECH_BUBBLE_TAIL })
    const tip = tailTip(placed)
    const boxCentreX = placed.left + placed.width / 2
    // Regression guard for the exact defect the user reported: a bubble
    // centred on the frame (left: 50%, translateX(-50%)) put the box's own
    // centre near the octopus's centre while the tail — off in a corner of
    // the art — pointed at empty space well away from either. The fix must
    // not just move the box: the TAIL, not the box centre, has to be near
    // the head.
    expect(Math.abs(tip.x - boxCentreX)).toBeGreaterThan(5)
    expect(tip.x).toBeGreaterThan(octopusBox.x)
    expect(tip.x).toBeLessThan(octopusBox.x + octopusBox.w)
  })

  it('the tail tip sits just above the head, not overlapping it, for both sides', () => {
    for (const side of ['left', 'right'] as const) {
      const placed = placeSpeechBubble({ frame: FRAME, headBox: octopusBox, tail: ZOO_SPEECH_BUBBLE_TAIL, side })
      const tip = tailTip(placed)
      expect(tip.y).toBeLessThan(octopusBox.y) // above the head's own top edge
      expect(tip.y).toBeGreaterThan(octopusBox.y - 15) // "just" above, not far off
    }
  })

  it('a centred head needs no mirroring on the LEFT side (the art\'s own tail is already bottom-left)', () => {
    const placed = placeSpeechBubble({ frame: FRAME, headBox: octopusBox, tail: ZOO_SPEECH_BUBBLE_TAIL, side: 'left' })
    expect(placed.mirrored).toBe(false)
  })

  it('mirrors when the requested side needs the tail on the box\'s own right instead', () => {
    const placed = placeSpeechBubble({ frame: FRAME, headBox: octopusBox, tail: ZOO_SPEECH_BUBBLE_TAIL, side: 'right' })
    expect(placed.mirrored).toBe(true)
    const tip = tailTip(placed)
    const boxCentreX = placed.left + placed.width / 2
    expect(Math.abs(tip.x - boxCentreX)).toBeGreaterThan(5)
  })
})

describe('placeSpeechBubble — never off-screen (the task\'s own hard requirement)', () => {
  const margin = 3

  function assertOnScreen(placed: ReturnType<typeof placeSpeechBubble>, frame: { w: number; h: number }) {
    expect(placed.left).toBeGreaterThanOrEqual(margin - 1e-6)
    expect(placed.top).toBeGreaterThanOrEqual(margin - 1e-6)
    expect(placed.left + placed.width).toBeLessThanOrEqual(frame.w - margin + 1e-6)
    expect(placed.top + placed.height).toBeLessThanOrEqual(frame.h - margin + 1e-6)
  }

  it('stays on-screen across a sweep of head positions, both sides, at the four required viewports\' aspect', () => {
    // The three stage screens' own frame is always square (aspect-ratio:
    // 1/1) regardless of the viewport — 1024x768, 1180x820, 768x1024 and
    // 844x390 all resolve to a square frame via `min(100%, 620px, 84dvh)`
    // (`PrologueOpening.tsx`'s own header) — so a 100x100 percent frame is
    // the one shape every real caller ever passes. Swept anyway, plus one
    // deliberately non-square frame, so the guarantee holds even if that
    // assumption ever changes.
    const frames = [FRAME, { w: 100, h: 60 }, { w: 60, h: 100 }]
    for (const frame of frames) {
      for (const headX of [5, 20, 35, 50, 65, 80, 95]) {
        const headBox: Box = { x: headX - 15, w: 30, y: 40, h: 30 }
        for (const side of ['left', 'right'] as const) {
          const placed = placeSpeechBubble({ frame, headBox, tail: ZOO_SPEECH_BUBBLE_TAIL, side, margin })
          assertOnScreen(placed, frame)
        }
      }
    }
  })

  it('never produces a negative or zero-width/height box even under an absurdly tight frame', () => {
    const placed = placeSpeechBubble({
      frame: { w: 20, h: 20 },
      headBox: { x: 5, w: 10, y: 15, h: 5 },
      tail: ZOO_SPEECH_BUBBLE_TAIL,
      margin: 3,
    })
    expect(placed.width).toBeGreaterThan(0)
    expect(placed.height).toBeGreaterThan(0)
  })
})

describe('placeSpeechBubble — the three real stage screens (golden values, regression guard)', () => {
  it('PrologueOpening: the caretaker (235x320, sized by height)', () => {
    const box = octopusBoxBySize({ w: 235, h: 320 }, { sizeBy: 'height', size: 44, bottom: 2 })
    const placed = placeSpeechBubble({ frame: FRAME, headBox: box, tail: ZOO_SPEECH_BUBBLE_TAIL })
    expect(placed.mirrored).toBe(false)
    expect(placed.width).toBeGreaterThan(40)
    expect(placed.width).toBeLessThan(78)
    expect(placed.top).toBeGreaterThanOrEqual(3)
    expect(placed.top).toBeLessThan(15)
  })

  it('AdventureIntro/AdventureClosing: the backpack octopus (442x448, sized by width)', () => {
    const box = octopusBoxBySize({ w: 442, h: 448 }, { sizeBy: 'width', size: 44, bottom: 2 })
    const placed = placeSpeechBubble({ frame: FRAME, headBox: box, tail: ZOO_SPEECH_BUBBLE_TAIL })
    expect(placed.mirrored).toBe(false)
    expect(placed.width).toBeGreaterThan(40)
    expect(placed.width).toBeLessThan(78)
    expect(placed.top).toBeGreaterThanOrEqual(3)
    expect(placed.top).toBeLessThan(15)
  })

  it('a closing beat with a taller custom figure still fits and still points at the head', () => {
    // `AdventureClosing.tsx`'s `beat.figure` can be any registered `ArtImage`
    // — a noticeably taller/narrower one than the backpack octopus must not
    // break the guarantee. 235x450 is deliberately taller than every figure
    // actually shipped (`docs/09` §3 caps art around a ~1.36 aspect, the
    // caretaker's own 235x320) without being an unrealistic figure whose own
    // box already falls off the top of the frame — this function is not
    // responsible for an asset absurd enough to do that on its own.
    const box = octopusBoxBySize({ w: 235, h: 450 }, { sizeBy: 'width', size: 44, bottom: 2 })
    const placed = placeSpeechBubble({ frame: FRAME, headBox: box, tail: ZOO_SPEECH_BUBBLE_TAIL })
    // The on-screen guarantee is unconditional — this holds even here, where
    // the tall figure leaves barely any room above its own top edge.
    expect(placed.left).toBeGreaterThanOrEqual(3 - 1e-6)
    expect(placed.top).toBeGreaterThanOrEqual(3 - 1e-6)
    expect(placed.left + placed.width).toBeLessThanOrEqual(97 + 1e-6)
    expect(placed.top + placed.height).toBeLessThanOrEqual(97 + 1e-6)
    // "Points at the head with no overlap" is NOT unconditional: `minWidth`
    // is a floor under legibility, and here the vertical room above the
    // head (`gap` past `box.y`) is narrower than what `minWidth` needs —
    // `topBound` alone would ask for a ~11.5-wide bubble, well under the
    // 20-wide floor. The floor wins, on purpose (an unreadably thin bubble
    // is worse than a few units of overlap with a tall figure's own head),
    // so the tail tip lands a few units INTO the head's box rather than
    // strictly above it. Bounded, not unbounded: still well inside the
    // frame, and still near the head, not off pointing at nothing.
    expect(placed.width).toBeGreaterThanOrEqual(20 - 1e-6)
  })
})

describe('ZOO_SPEECH_BUBBLE_TAIL — measured off the shipped PNG, not eyeballed', () => {
  it('sits in the bottom-left corner of the unflipped art (measured: pixel (59, 371) of 488x372)', () => {
    expect(ZOO_SPEECH_BUBBLE_TAIL.tailX).toBeCloseTo(59 / 488, 2)
    expect(ZOO_SPEECH_BUBBLE_TAIL.tailY).toBeCloseTo(371 / 372, 2)
    expect(ZOO_SPEECH_BUBBLE_TAIL.aspect).toBeCloseTo(372 / 488, 5)
  })
})
