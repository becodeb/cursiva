// Where the rescue animal's own big image goes (prewriting-stage-completion
// T24 follow-up, coordinator review 2026-09-26): "in your own screenshot the
// big duck COVERS the bubble text at 1024x768... compute the animal's box
// from the bubble's and Pulpito's actual placement". The original cut placed
// the animal at a hand-picked `top: 3%; left: 50%` — it happened to clear
// the bubble at 844x390 (a short bubble there) but not at 1024x768 (the SAME
// percent geometry, a taller bubble there, `AdventureClosing.tsx`'s own
// header on the fix commit before this one). This module computes the
// animal's box FROM the bubble's and Pulpito's own real placement instead of
// a guess, so "does it overlap" is answered by construction, not by eye.
//
// Pure, DOM-free — the same split every other placement module in this
// screen family keeps (`bubbleFit.ts`, `pulpitoStance.ts`,
// `bubblePlacement.ts`): `AdventureClosing.tsx` hands this plain numbers and
// reads back a plain box, never the other way around. `stageSizePx` is
// reused (not re-derived) from `pulpitoStance.ts` for the one piece of this
// math that genuinely needs the real viewport: the task's own "up to ~40vh"
// cap, converted into percent-of-frame (see `resolveRescueAnimalBox`'s own
// header for why that conversion cannot be a single static percent).
import { stageSizePx } from './pulpitoStance'
import type { Box } from './bubblePlacement'

export interface RescueBox {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** A bubble's own placed box (`placeAndFitBubble`'s `placement`), restated
 *  as a plain reader interface so this module never has to import
 *  `BubblePlacement` just to read four of its fields. */
export interface RescueBubbleBox {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

/**
 * Two axis-aligned percent-of-frame boxes never overlap. Touching edges
 * (one box's right edge exactly at the other's left edge) count as NOT
 * intersecting — the margin `rescueFreeRegion` applies is what keeps a
 * touching edge from reading as cramped, not this predicate. Exported so
 * the test suite can assert it directly against real `octopusBoxAtCorner`/
 * `placeAndFitBubble` outputs, rather than re-deriving an equivalent check
 * inline for every case.
 */
export function boxesIntersect(a: RescueBox, b: RescueBox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/**
 * The free region: the COLUMN opposite Pulpito's own corner (found by
 * measuring, not the first cut's guess — a real bubble at its DEFAULT size
 * already grows wide, ~69% of the frame's own width at 1024x768 for the
 * duck's own line, `rescueAnimalPlacement.test.ts`'s own debug trace — a
 * plain left-half/right-half split leaves that column only ~4% wide once
 * the bubble's own right edge is counted, nowhere near enough for the
 * animal). Pulpito is always in a BOTTOM corner (`pulpitoStance.ts`'s own
 * rule 2, "siempre una esquina de abajo") and the bubble always opens
 * INWARD from him (rule 3), so the OPPOSITE corner's full column, from his
 * own far edge to the frame's far edge, never contains him — but the wide
 * bubble usually still reaches INTO that column from above, so the free
 * region only starts below the bubble's own bottom edge WITHIN that column
 * (and only there — if the bubble's own right/left edge does not reach
 * into the far column at all, the free region keeps the column's full
 * height instead of clipping it for nothing).
 *
 * Pulpito's own corner is inferred from `octopusBox.x` against the frame's
 * own midline, rather than threading a separate `corner` parameter: a
 * corner stance is ALWAYS one bottom corner or the other by construction
 * (`pulpitoStance.ts`'s `octopusBoxAtCorner`), so the box's own position
 * already carries that information.
 */
export function rescueFreeRegion(
  frame: { readonly w: number; readonly h: number },
  octopusBox: Box,
  bubbleBox: RescueBubbleBox,
  margin = 3,
): RescueBox {
  const onLeft = octopusBox.x < frame.w / 2
  const farX = onLeft ? octopusBox.x + octopusBox.w : 0
  const farWidth = onLeft ? frame.w - farX : octopusBox.x
  const bubbleRight = bubbleBox.left + bubbleBox.width
  // Does the bubble's own box reach into the far column at all?
  const bubbleReachesFarColumn = onLeft ? bubbleRight > farX : bubbleBox.left < farX + farWidth
  const y = bubbleReachesFarColumn ? bubbleBox.top + bubbleBox.height + margin : margin
  return {
    x: farX + margin,
    y,
    w: Math.max(0, farWidth - 2 * margin),
    h: Math.max(0, frame.h - y - margin),
  }
}

export interface RescueAnimalBoxOptions {
  /** The stage's own frame, percent units — every real caller passes
   *  `{ w: 100, h: 100 }` (the same square every placement in this family
   *  reasons about, `placeAndFitBubble`'s own `frame` option). */
  readonly frame: { readonly w: number; readonly h: number }
  /** Pulpito's own rendered box (`octopusBoxAtCorner`), percent of `frame`. */
  readonly octopusBox: Box
  /** The bubble's own placement (`placeAndFitBubble`'s `placement`), percent
   *  of `frame`. */
  readonly bubbleBox: RescueBubbleBox
  /** The animal's own art dimensions (`ZOO_ANIMAL_ART[id]`'s `w`/`h`) — the
   *  aspect ratio the big image is sized along. */
  readonly artAspect: { readonly w: number; readonly h: number }
  /** The real viewport, CSS px — only used to resolve the task's own
   *  "up to ~40vh" cap into a percent-of-frame number: the stage's own px
   *  side is a CLAMP (`min(100%, 620px, 84dvh)`, `pulpitoStance.ts`'s
   *  `STAGE_MAX_PX`/`STAGE_MAX_VH_FRAC`), not a fixed fraction of the
   *  viewport, so this conversion is different at every viewport —
   *  `bubbleFit.test.ts`'s own registry sweep already reasons about real px
   *  sizes the same way, at the same four required viewports. */
  readonly viewport: { readonly width: number; readonly height: number }
  /** Gap between the animal and the bubble/Pulpito's own union box, and
   *  between the animal and the frame's own edges — percent of `frame`.
   *  Defaults to 3, matching this screen family's own margins
   *  (`STAGE_MARGIN_PCT`, `OCTOPUS_CORNER_INSET`). */
  readonly margin?: number
  /** The size cap, as a fraction of the viewport's own height — the task's
   *  own "up to ~40vh". Defaults to 0.4. */
  readonly maxHeightVhFrac?: number
}

/**
 * The animal's own final box: as large as `rescueFreeRegion` allows while
 * keeping `artAspect`'s own ratio, capped by `maxHeightVhFrac` of the real
 * viewport height (converted through `stageSizePx`). Centred within the
 * free region on both axes. By construction (the free region already
 * excludes the octopus+bubble union, and this box never exceeds the free
 * region), the result never intersects either — `rescueAnimalPlacement.
 * test.ts` proves this against real placement outputs at the task's own
 * four required viewports, it is not merely asserted here.
 */
export function resolveRescueAnimalBox(opts: RescueAnimalBoxOptions): RescueBox {
  const { frame, octopusBox, bubbleBox, artAspect, viewport, margin = 3, maxHeightVhFrac = 0.4 } = opts
  const free = rescueFreeRegion(frame, octopusBox, bubbleBox, margin)
  const aspectHOverW = artAspect.h / artAspect.w
  const stagePx = stageSizePx(viewport.width, viewport.height)
  const vhCapPct = stagePx > 0 ? ((maxHeightVhFrac * viewport.height) / stagePx) * 100 : free.h

  let h = Math.min(free.h, vhCapPct)
  let w = h / aspectHOverW
  if (w > free.w) {
    w = free.w
    h = w * aspectHOverW
  }
  const x = free.x + (free.w - w) / 2
  const y = free.y + (free.h - h) / 2
  return { x, y, w, h }
}
