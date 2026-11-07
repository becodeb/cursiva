// Writing without a corridor (`docs/25` 4.4, the copy and memory steps). Nothing on
// the page says where the letter goes, so a good `o` written a little to the side,
// or a little big, must not be read as off the route. The stroke is brought onto
// the model's box, kept in proportion, and only then judged, so what is measured
// is the shape and the way it was made. Pure.
import type { Point } from '../letters/types'

/** A scale past these is a different size of thing, not the same letter: a dot
 *  blown up to letter size must not pass as a letter. */
const MIN_SCALE = 0.55
const MAX_SCALE = 1.6

interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function boxOf(points: Iterable<Point>): Box | null {
  let box: Box | null = null
  for (const p of points) {
    if (!box) box = { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }
    else {
      box.minX = Math.min(box.minX, p.x)
      box.minY = Math.min(box.minY, p.y)
      box.maxX = Math.max(box.maxX, p.x)
      box.maxY = Math.max(box.maxY, p.y)
    }
  }
  return box
}

export function alignFreehand<P extends Point>(
  strokes: ReadonlyArray<ReadonlyArray<P>>,
  model: ReadonlyArray<Point>,
): P[][] {
  const drawn = boxOf(strokes.flat())
  const target = boxOf(model)
  if (!drawn || !target) return strokes.map((stroke) => [...stroke])
  const drawnW = drawn.maxX - drawn.minX
  const drawnH = drawn.maxY - drawn.minY
  const targetW = target.maxX - target.minX
  const targetH = target.maxY - target.minY
  const fit = Math.min(drawnW > 0 ? targetW / drawnW : MAX_SCALE, drawnH > 0 ? targetH / drawnH : MAX_SCALE)
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fit))
  const fromX = (drawn.minX + drawn.maxX) / 2
  const fromY = (drawn.minY + drawn.maxY) / 2
  const toX = (target.minX + target.maxX) / 2
  const toY = (target.minY + target.maxY) / 2
  return strokes.map((stroke) =>
    stroke.map((p) => ({ ...p, x: toX + (p.x - fromX) * scale, y: toY + (p.y - fromY) * scale })),
  )
}
