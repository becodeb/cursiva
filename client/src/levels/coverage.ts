// Coverage scoring for a `kind: 'free'` level (docs/08 section 5).
//
// A free level has NO target path, so accuracy in the usual sense does not
// exist: there is nothing to be near. What the warm-up actually trains is the
// opposite of precision — moving the whole arm over the whole sheet before any
// route asks the child to stay inside anything (docs/01 phase 1, "control
// tónico"). So the pillar measures REACH: how much of the paper the stroke
// visited.
//
// The sheet is divided into a coarse grid and the score is the percentage of
// cells the polyline passes through. Coarse on purpose: a fine grid would score
// stroke DENSITY (scribbling one corner black), and a child who fills one
// corner has not moved the arm at all. 12x8 = 96 cells means one cell is about
// a hand's width on a tablet, so a cell is only reachable by actually going
// there.
import type { Point } from '../letters/types'

/** Grid columns across the sheet width. */
export const COVERAGE_COLUMNS = 12
/** Grid rows down the sheet height. */
export const COVERAGE_ROWS = 8
/** Sheet height (docs/02 section 3). The width varies; the height never does. */
const SHEET_HEIGHT = 600

function clampIndex(v: number, max: number): number {
  return Math.max(0, Math.min(max, v))
}

/**
 * Percentage (0-100, integer) of the sheet's grid cells the strokes reached.
 *
 * `strokes` are the captured strokes in temporal order; pen lifts do NOT join
 * up — the gap between two strokes is not drawn, so it is not covered either.
 * `viewBoxWidth` is the level's sheet width, so the grid always spans exactly
 * the paper the child was shown, whatever its width.
 *
 * Consecutive samples are joined by walking the segment in steps of half a
 * cell: a fast swipe reports few points far apart, and taking only the reported
 * points would skip the cells the finger actually crossed and under-score an
 * energetic child, which is the exact opposite of what this level rewards.
 *
 * Points outside the sheet clamp to the edge cell instead of being dropped, so
 * a stroke that runs off the paper still gets credit for the edge it reached.
 */
export function coverageScore(
  strokes: ReadonlyArray<ReadonlyArray<Point>>,
  viewBoxWidth: number,
): number {
  const total = COVERAGE_COLUMNS * COVERAGE_ROWS
  const width = viewBoxWidth > 0 ? viewBoxWidth : 1
  const cellWidth = width / COVERAGE_COLUMNS
  const cellHeight = SHEET_HEIGHT / COVERAGE_ROWS
  const step = Math.min(cellWidth, cellHeight) / 2

  const visited = new Set<number>()
  const mark = (x: number, y: number): void => {
    const column = clampIndex(Math.floor(x / cellWidth), COVERAGE_COLUMNS - 1)
    const row = clampIndex(Math.floor(y / cellHeight), COVERAGE_ROWS - 1)
    visited.add(row * COVERAGE_COLUMNS + column)
  }

  for (const stroke of strokes) {
    if (stroke.length === 0) continue
    mark(stroke[0].x, stroke[0].y)
    for (let i = 1; i < stroke.length; i++) {
      const from = stroke[i - 1]
      const to = stroke[i]
      const distance = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(1, Math.ceil(distance / step))
      for (let s = 1; s <= steps; s++) {
        const t = s / steps
        mark(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)
      }
    }
  }

  return Math.round((100 * visited.size) / total)
}
