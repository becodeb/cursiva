// Corridor-wall distance contract (`detective-mode` defect fix: "the corridor
// walls do nothing"). Pinned against the REAL catalog geometry for all four
// maze trails, exactly like `directionArrow.test.ts` pins the arrow math —
// the shape of these paths (a wide sine wave, a tight spiral, sharp-corner
// triangular/square waves) is what made the old whole-cloud check fail in
// the first place, so a synthetic straight-line fixture would not prove
// anything.
import { describe, expect, it } from 'vitest'
import { buildLevelTarget } from '../levels/buildLevel'
import { LEVELS } from '../levels/catalog'
import { pointAtArcLength } from '../letters/svgLetter'
import type { Point } from '../letters/types'
import type { LevelTarget } from '../levels/types'
import { corridorTick, CORRIDOR_TRACK_START } from './corridorTrack'

function trailTarget(id: string): LevelTarget {
  const level = LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`Level not found: ${id}`)
  return buildLevelTarget(level)
}

/** A point offset perpendicular to the route at arc length `arc`, `offset`
 * units off the centreline — the same perpendicular-band construction
 * `buildLevel.ts`'s `pushBand` uses for the ideal cloud itself, built here
 * from the public arc-length API so the fixture needs no internals. */
function offPoint(target: LevelTarget, arc: number, offset: number): Point {
  const polyline = target.polyline as Point[]
  const point = pointAtArcLength(polyline, arc)
  const ahead = pointAtArcLength(polyline, Math.min(target.length, arc + 20))
  const dx = ahead.x - point.x
  const dy = ahead.y - point.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  return { x: point.x + nx * offset, y: point.y + ny * offset }
}

/**
 * The OLD, buggy check `LevelPlay.tsx` used before this fix: nearest distance
 * to the WHOLE ideal cloud (every path, every arm, unioned — exactly what
 * `neighbourhoodNearest` over `buildIdealGrid` computed), against the SAME
 * `> corridorWidth / 2` threshold. Kept here, deliberately, only to prove the
 * new local check below can fail: a wavy or spiralled route puts a stray arm
 * of the cloud within reach of a point that is genuinely far outside the
 * LOCAL corridor, so this reports "inside" when it should not.
 */
function oldWholeCloudOut(target: LevelTarget, x: number, y: number): boolean {
  let best = Infinity
  for (const [px, py] of target.ideal) {
    const d = Math.hypot(x - px, y - py)
    if (d < best) best = d
  }
  return best > target.corridorWidth / 2
}

describe('corridorTick — local wall distance (defect 1)', () => {
  const trails = ['trail1', 'trail2', 'trail3', 'trail4'] as const

  it.each(trails)('%s: flags out at/just past the wall, not while inside', (id) => {
    const target = trailTarget(id)
    const half = target.corridorWidth / 2
    const arc = target.length / 2

    for (const offset of [0, half / 2]) {
      const p = offPoint(target, arc, offset)
      const sample = corridorTick(target.polyline, target.length, { arc }, p.x, p.y)
      expect(sample.distance).toBeLessThanOrEqual(half)
    }
    for (const offset of [half + 3, half * 2, half * 4]) {
      const p = offPoint(target, arc, offset)
      const sample = corridorTick(target.polyline, target.length, { arc }, p.x, p.y)
      expect(sample.distance).toBeGreaterThan(half)
    }
  })

  it('measures perpendicular distance monotonically with the offset (regression: the old cloud check was not even monotonic)', () => {
    const target = trailTarget('trail1')
    const arc = target.length / 2
    const offsets = [0, 20, 45, 68, 90, 180]
    const distances = offsets.map((offset) => {
      const p = offPoint(target, arc, offset)
      return corridorTick(target.polyline, target.length, { arc }, p.x, p.y).distance
    })
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThan(distances[i - 1])
    }
  })

  it('the OLD whole-cloud check misses a trace 4x past the wall on trail1 — proof the new test is not vacuous', () => {
    const target = trailTarget('trail1')
    const half = target.corridorWidth / 2
    const arc = target.length / 2
    const farOut = offPoint(target, arc, half * 4)

    // The bug this change fixes: the old whole-cloud check reads this as
    // INSIDE (some other arm of the wave is close enough), while the new
    // local check correctly reads it as outside.
    expect(oldWholeCloudOut(target, farOut.x, farOut.y)).toBe(false)
    const sample = corridorTick(target.polyline, target.length, { arc }, farOut.x, farOut.y)
    expect(sample.distance).toBeGreaterThan(half)
  })

  it('advances the track forward as the fingertip follows the route', () => {
    const target = trailTarget('trail1')
    let track = CORRIDOR_TRACK_START
    let lastArc = -1
    // Steps within `CORRIDOR_WINDOW_FORWARD` (260) — a realistic per-sample
    // advance. A jump larger than the window is a fingertip teleporting, not
    // something a ~30 Hz sampler needs to track through.
    for (const arc of [0, 150, 300, 450, 600, 750, 900]) {
      const p = pointAtArcLength(target.polyline as Point[], arc)
      const sample = corridorTick(target.polyline, target.length, track, p.x, p.y)
      expect(sample.distance).toBeLessThan(1)
      expect(sample.track.arc).toBeGreaterThan(lastArc)
      lastArc = sample.track.arc
      track = sample.track
    }
  })

  it('returns Infinity for a route-less target (kind: free) rather than throwing', () => {
    const sample = corridorTick([], 0, CORRIDOR_TRACK_START, 10, 10)
    expect(sample.distance).toBe(Infinity)
  })
})
