// Direction-hint contract (docs/03 §7). The arrow is the only thing that tells
// a pre-reader WHICH WAY to go, so its angle is pinned against the real catalog
// geometry: an arrow that points backwards teaches the wrong movement, and on
// the `a` family a reversed turn is the single most expensive cursive error
// (docs/02 §5.2).
import { describe, expect, it } from 'vitest'
import { buildLevelTarget } from '../levels/buildLevel'
import { LEGACY_PHASE_1, LEVELS, getLevel } from '../levels/catalog'
import { straight } from '../levels/paths'
import type { Point } from '../letters/types'
import type { LevelConfig } from '../levels/types'

/**
 * Looks up an id in the active `LEVELS` catalog first, falling back to
 * `LEGACY_PHASE_1` (`detective-mode` Phase 11) — `f1-travesia` and
 * `f1-espiral` are retired, unwired configs, but their geometry is preserved
 * unchanged, which is all these arrow-math fixtures need.
 */
function anyLevel(id: string): LevelConfig {
  const level = LEVELS.find((l) => l.id === id) ?? LEGACY_PHASE_1.find((l) => l.id === id)
  if (!level) throw new Error(`Level not found (active or legacy): ${id}`)
  return level
}
import { ARROW_DISTANCE, directionArrowOf, indexAtDistance, tangentAngleAt } from './directionArrow'

/** Unit vector the SVG `rotate(deg)` transform maps `(1, 0)` to. */
function headingOf(angle: number): Point {
  const rad = (angle * Math.PI) / 180
  return { x: Math.cos(rad), y: Math.sin(rad) }
}

describe('tangentAngleAt — SVG angle convention', () => {
  const line = (dx: number, dy: number): Point[] => [
    { x: 0, y: 0 },
    { x: dx, y: dy },
    { x: 2 * dx, y: 2 * dy },
  ]

  it('reads 0 along the writing direction', () => {
    expect(tangentAngleAt(line(10, 0), 0, 1)).toBeCloseTo(0, 6)
  })

  it('is POSITIVE going down-right — y grows downward and rotate() is clockwise', () => {
    expect(tangentAngleAt(line(10, 10), 0, 1)).toBeCloseTo(45, 6)
  })

  it('is NEGATIVE going up-right', () => {
    expect(tangentAngleAt(line(10, -10), 0, 1)).toBeCloseTo(-45, 6)
  })

  it('is ±180 going left and +90 going straight down', () => {
    expect(Math.abs(tangentAngleAt(line(-10, 0), 0, 1))).toBeCloseTo(180, 6)
    expect(tangentAngleAt(line(0, 10), 0, 1)).toBeCloseTo(90, 6)
  })

  it('measures over the whole span, not the next sample', () => {
    // A single noisy sample between two clean ones must not steer the hint.
    const noisy: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: -40 },
      { x: 20, y: 0 },
    ]
    expect(tangentAngleAt(noisy, 0, 2)).toBeCloseTo(0, 6)
    expect(tangentAngleAt(noisy, 0, 1)).not.toBeCloseTo(0, 1)
  })

  it('clamps the sample window inside the polyline', () => {
    const poly = line(10, 10)
    expect(tangentAngleAt(poly, 99, 1)).toBeCloseTo(45, 6)
    expect(tangentAngleAt(poly, -5, 1)).toBeCloseTo(45, 6)
  })

  it('answers 0 rather than a random angle on a degenerate pair', () => {
    const repeated: Point[] = [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ]
    expect(tangentAngleAt(repeated, 0, 1)).toBe(0)
    expect(tangentAngleAt([], 0, 1)).toBe(0)
  })
})

describe('directionArrowOf — real levels', () => {
  const arrowOf = (id: string) => {
    const arrow = directionArrowOf(buildLevelTarget(anyLevel(id)))
    expect(arrow).toBeDefined()
    return arrow!
  }

  // Geometry the ARROW MATH is pinned against, rather than a catalog id. These
  // assertions are about `directionArrowOf`, not about which sendero the
  // catalog currently ships, so they must not break when phase 1 is re-authored.
  // A real level supplies the surrounding config; only `paths` is substituted.
  // `f1-travesia` is retired behind `LEGACY_PHASE_1` (detective-mode Phase 11)
  // but still a real, unchanged fixture.
  const withPath = (d: string) => buildLevelTarget({ ...anyLevel('f1-travesia'), paths: [d] })
  const STRAIGHT = straight()

  it('sits on the path, a fixed DISTANCE from the start', () => {
    const target = withPath(STRAIGHT)
    const arrow = directionArrowOf(target)!
    const expected = target.polyline[indexAtDistance(target.polyline, ARROW_DISTANCE)]
    expect(arrow.x).toBeCloseTo(expected.x, 6)
    expect(arrow.y).toBeCloseTo(expected.y, 6)
  })

  it('keeps the SAME distance from the start on a letter and on a whole word', () => {
    // The bug this replaces: the anchor was a FRACTION of the polyline, so it
    // travelled with the length of the level. On `f5-mama` 8% landed ~290 units
    // in — past the first arch of the m, on a baseline cusp where the pen
    // doubles back — while on `f3-m` the same 8% was still in the entry stroke.
    // A pre-reader must get the same hint in the same place on both.
    for (const id of ['f3-m', 'f4-ma', 'f5-mama', 'f5-ala', 'f4-la']) {
      const target = buildLevelTarget(getLevel(id))
      const arrow = directionArrowOf(target)!
      const start = target.polyline[0]
      const away = Math.hypot(arrow.x - start.x, arrow.y - start.y)
      // Straight-line distance is <= arc length, and the entry strokes curve,
      // so allow the chord to fall short of the 70 units walked along the path.
      expect(away).toBeGreaterThan(30) // clear of the r=22 start dot
      expect(away).toBeLessThan(ARROW_DISTANCE + 5)
    }
  })

  it('points ALONG the writing direction on every letter, link and word level', () => {
    // Every one of these begins with an entry stroke that rises to the right
    // from the baseline, so the hint must head right and up. `f5-mama` is the
    // one that regressed: it used to anchor at the cusp between the first and
    // second arch of the m.
    for (const id of ['f3-l', 'f3-a', 'f3-m', 'f3-o', 'f4-la', 'f4-ma', 'f5-ala', 'f5-mama']) {
      const h = headingOf(arrowOf(id).angle)
      expect(h.x, `${id} must head right`).toBeGreaterThan(0)
      expect(h.y, `${id} must head up`).toBeLessThan(0)
    }
  })

  it('still turns the corner on a coarse polyline (zigzag)', () => {
    // A coarse zigzag whose first leg runs 144 units STRAIGHT DOWN in 36-unit
    // steps. Both the ARROW_DISTANCE anchor (70) and the end of its 25-unit
    // tangent span (95) fall inside that leg, so the hint must read straight
    // down — the span still has to advance a sample, or a zero-length
    // difference would read as "straight along the writing direction" instead.
    const legs: Array<[number, number]> = [
      [200, 324],
      [340, 180],
      [480, 324],
      [620, 180],
    ]
    let d = 'M 200 180'
    let [px, py] = [200, 180]
    for (const [x, y] of legs) {
      for (let i = 1; i <= 4; i++) {
        d += ` L ${px + ((x - px) * i) / 4} ${py + ((y - py) * i) / 4}`
      }
      ;[px, py] = [x, y]
    }
    const h = headingOf(directionArrowOf(withPath(d))!.angle)
    expect(Math.abs(h.x)).toBeLessThan(0.01)
    expect(h.y).toBeGreaterThan(0.99) // straight down into the first break
  })

  it('points RIGHT on the straight path', () => {
    expect(directionArrowOf(withPath(STRAIGHT))!.angle).toBeCloseTo(0, 6)
  })

  it('points DOWN-RIGHT into the first dip of the garland', () => {
    const h = headingOf(arrowOf('f2-guirnalda').angle)
    expect(h.x).toBeGreaterThan(0)
    expect(h.y).toBeGreaterThan(0) // y grows downward: the hand descends
  })

  it('points UP-RIGHT into the first loop of the ascenders', () => {
    const h = headingOf(arrowOf('f2-bucles').angle)
    expect(h.x).toBeGreaterThan(0)
    expect(h.y).toBeLessThan(0)
  })

  it('points along the spiral opening turn — counter-clockwise, so LEFT at the top', () => {
    const arrow = arrowOf('f1-espiral')
    const h = headingOf(arrow.angle)
    expect(h.x).toBeLessThan(0) // sweeping left across the top of the shell
    expect(arrow.y).toBeLessThan(340) // and it IS the top: above the centre
  })

  it('is undefined for a path with no direction at all', () => {
    const target = withPath('')
    expect(directionArrowOf(target)).toBeUndefined()
  })
})
