// Speech-bubble PLACEMENT (prewriting-stage-completion T16, following the
// user's tablet play-test of T8's bubble pop-in): a pure, DOM-free function
// that positions a speech bubble so its TAIL TIP lands just above and
// beside the Pulpito's head, instead of centring the whole bubble box over
// him (which is what `PrologueOpening.tsx`/`AdventureIntro.tsx`/
// `AdventureClosing.tsx` did before this task — `left: 50%` with
// `transform: translateX(-50%)` centres the IMAGE'S OWN BOUNDING BOX, but
// the tail is not at that box's centre, so a centred box always leaves the
// tail pointing at empty space beside the octopus rather than at him).
//
// Measured directly off the shipped `client/public/art/zoo-speech-bubble.png`
// (488×372, a standalone column/row scan of its opaque alpha channel, not
// eyeballed): the tail's own blob separates from the main oval body at
// y≈320 (86% of the file's height) and narrows to its tip at pixel (59,
// 371) — (12.1%, 99.7%) of the file, in its BOTTOM-LEFT corner. There is no
// bottom-right-tail variant of this art (see this task's own report on
// whether a bottom-centre variant would help a centred layout).
// `screen/ZooMap.tsx`'s own `ZOO_CSS` comment ("the tail hangs at ~10% of
// the width, near the bottom ~18% of the height") already found the same
// corner by eye; `ZOO_SPEECH_BUBBLE_TAIL` below is the same fact, measured
// exactly, shared by both call sites instead of re-approximated.

export interface Box {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface BubbleTailGeometry {
  /** The art's own height / width ratio. */
  readonly aspect: number
  /** Tail tip x, as a fraction of the UNFLIPPED art's own width (0-1). */
  readonly tailX: number
  /** Tail tip y, as a fraction of the UNFLIPPED art's own height (0-1). */
  readonly tailY: number
}

/** `zoo-speech-bubble.png`, 488×372 — see this file's own header for how
 *  the tail fractions were measured. Shared by every screen that draws this
 *  bubble (the three narrative stages, and `ZooMap.tsx`'s own tail-origin
 *  helper next to `bubbleClassName`). */
export const ZOO_SPEECH_BUBBLE_TAIL: BubbleTailGeometry = {
  aspect: 372 / 488,
  tailX: 0.121,
  tailY: 0.997,
}

export interface OctopusBoxOptions {
  /** Which CSS dimension the octopus is sized by (`PrologueOpening.tsx`'s
   *  caretaker is sized by HEIGHT — see that file's own header on why a
   *  235×320 portrait figure needs that instead of width; the backpack
   *  octopus `AdventureIntro.tsx`/`AdventureClosing.tsx` use is sized by
   *  WIDTH, near-square art where the two land in the same place anyway). */
  readonly sizeBy: 'width' | 'height'
  /** The sized dimension, as a percent of the (square) frame. */
  readonly size: number
  /** Distance from the frame's own bottom edge, as a percent of the frame —
   *  every stage screen's own `bottom: 2%` rule. */
  readonly bottom: number
}

/**
 * The octopus's own rendered box, in percent of the square frame — derived
 * from the SAME numbers each stage screen's stylesheet already uses
 * (`bottom: 2%`, `height: 44%` or `width: 44%`), not a separate guess. All
 * three stage screens centre the octopus horizontally (`left: 50%`,
 * `transform: translateX(-50%)`), so this assumes that too rather than
 * taking a fourth parameter no real caller would ever vary.
 */
export function octopusBoxBySize(art: { readonly w: number; readonly h: number }, opts: OctopusBoxOptions): Box {
  const artAspect = art.h / art.w
  const w = opts.sizeBy === 'width' ? opts.size : opts.size / artAspect
  const h = opts.sizeBy === 'width' ? opts.size * artAspect : opts.size
  return { x: 50 - w / 2, y: 100 - opts.bottom - h, w, h }
}

export interface BubblePlacement {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
  /** Whether the mirrored (`scaleX(-1)`) orientation was chosen — the tail
   *  moves from the art's own bottom-LEFT to the box's bottom-RIGHT. Callers
   *  apply this to the bubble's SHAPE image only, never to its caption
   *  (`docs/09`'s own "never a mirrored word" convention, restated by this
   *  task's own brief: "don't mirror the text"). */
  readonly mirrored: boolean
  /** The tail tip's own position, as a percent of the BUBBLE's own box
   *  (0-100 either axis) — exactly what a caller needs for
   *  `transform-origin`, so the pop-in (`BubblePop.ts`) grows out of the
   *  tail instead of the box's geometric centre. */
  readonly tailOriginX: number
  readonly tailOriginY: number
}

export interface PlaceSpeechBubbleOptions {
  /** The stage's own size, same units as `headBox` (every real caller uses
   *  a 100×100 percent frame — the stage screens' own square, aspect-ratio
   *  1/1 frame). */
  readonly frame: { readonly w: number; readonly h: number }
  /** The Pulpito's own rendered box (`octopusBoxBySize`, above, for the
   *  three stage screens). */
  readonly headBox: Box
  readonly tail: BubbleTailGeometry
  /** Which side of `headBox` the tail aims BESIDE — never its exact
   *  horizontal centre (`docs/… ` — a tail pointed at the crown reads the
   *  same as one pointed at nothing when the art's own tail sits in a
   *  corner, not centred; see this module's own header). Defaults to
   *  `'left'`, which — for a horizontally centred `headBox` — needs no
   *  mirroring at all, since the art's tail is ALREADY in its own
   *  bottom-left corner. */
  readonly side?: 'left' | 'right'
  /** How far into `headBox`'s own width, from `side`, the target sits — 0
   *  would aim at `headBox`'s own edge, 0.5 at its centre. Defaults to
   *  0.22: close enough to the head to read as pointing at it, far enough
   *  from the centre that the tail is visibly BESIDE it, not on top of it
   *  (this task's own brief). */
  readonly sideFraction?: number
  /** Vertical gap between the tail tip and `headBox`'s own top edge, so the
   *  tail does not overlap the octopus's own art. Percent of the frame. */
  readonly gap?: number
  /** Minimum distance kept from every frame edge — the "never go
   *  off-screen" guarantee. Percent of the frame. */
  readonly margin?: number
  /** The bubble's preferred width, percent of the frame — shrunk only as
   *  far as the on-screen guarantee requires. */
  readonly preferredWidth?: number
  /** Floor under `preferredWidth`'s own shrinking — never produces a bubble
   *  narrower than this even under an extreme `headBox`/`frame` pair. */
  readonly minWidth?: number
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

/**
 * The widest a bubble can be, in the given orientation, while still keeping
 * the tail tip exactly on `target` AND every edge at least `margin` inside
 * the frame. Three independent bounds — the tail must not push the box past
 * the LEFT edge, the RIGHT edge, or (since height follows width through the
 * art's own aspect ratio) past the TOP edge — and the narrowest one wins,
 * the same "smallest bound decides" shape `ZooMap.tsx`'s own
 * `bubblePlacement` uses for its four anchors. Returns `Infinity` for a
 * bound the tail's own position on that axis cannot violate (e.g. the left
 * bound when the tail sits exactly at the art's own left edge).
 */
function maxWidthFor(
  mirrored: boolean,
  target: { x: number; y: number },
  tail: BubbleTailGeometry,
  frame: { w: number; h: number },
  margin: number,
): number {
  const fx = mirrored ? 1 - tail.tailX : tail.tailX
  const leftBound = fx > 0 ? (target.x - margin) / fx : Infinity
  const rightBound = fx < 1 ? (frame.w - margin - target.x) / (1 - fx) : Infinity
  const topBound = tail.tailY > 0 ? (target.y - margin) / (tail.tailY * tail.aspect) : Infinity
  return Math.min(leftBound, rightBound, topBound)
}

/**
 * Places a speech bubble so its tail tip lands `gap` above and `sideFraction`
 * beside `headBox`'s own top edge — never centred on it (see this module's
 * own header on why a centred box leaves an off-centre tail pointing at
 * nothing). Tries the unflipped orientation and the mirrored one, picks
 * whichever allows the LARGER bubble (`maxWidthFor`), then shrinks
 * `preferredWidth` only as far as that bound requires. A final defensive
 * clamp keeps every edge inside `[margin, frame - margin]` regardless — the
 * "never go off-screen" guarantee holds even for a `headBox`/`frame` pair
 * `maxWidthFor`'s own exact-fit math cannot satisfy (e.g. `minWidth` itself
 * too wide for the frame).
 */
export function placeSpeechBubble(opts: PlaceSpeechBubbleOptions): BubblePlacement {
  const {
    frame,
    headBox,
    tail,
    side = 'left',
    sideFraction = 0.22,
    gap = 2,
    margin = 3,
    preferredWidth = 78,
    minWidth = 20,
  } = opts

  const target = {
    x: side === 'left' ? headBox.x + headBox.w * sideFraction : headBox.x + headBox.w * (1 - sideFraction),
    y: headBox.y - gap,
  }

  const widthUnmirrored = maxWidthFor(false, target, tail, frame, margin)
  const widthMirrored = maxWidthFor(true, target, tail, frame, margin)
  const mirrored = widthMirrored > widthUnmirrored
  const maxWidth = mirrored ? widthMirrored : widthUnmirrored

  let width = Math.max(minWidth, Math.min(preferredWidth, maxWidth, frame.w - 2 * margin))
  let height = width * tail.aspect
  // Defensive: only reachable when `minWidth` itself does not fit the
  // frame's own height — shrink to what the frame can hold rather than
  // violate the on-screen guarantee.
  if (height > frame.h - 2 * margin) {
    height = Math.max(0, frame.h - 2 * margin)
    width = tail.aspect > 0 ? height / tail.aspect : width
  }

  const fx = mirrored ? 1 - tail.tailX : tail.tailX
  const left = clamp(target.x - fx * width, margin, frame.w - margin - width)
  const top = clamp(target.y - tail.tailY * height, margin, frame.h - margin - height)

  return {
    left,
    top,
    width,
    height,
    mirrored,
    tailOriginX: fx * 100,
    tailOriginY: tail.tailY * 100,
  }
}
