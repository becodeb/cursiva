// Goal marker placement (docs/03 §7). The one property that matters is that it
// marks where the child STOPS WRITING — which on a multi-segment word is not
// where `target.polyline` ends.
import { describe, expect, it } from 'vitest'
import { buildLevelTarget } from '../levels/buildLevel'
import { LEGACY_PHASE_1, LEVELS, getLevel } from '../levels/catalog'
import { goalMarkerOf } from './goalMarker'
import type { LevelTarget } from '../levels/types'

/**
 * Every level that HAS a route, derived from the catalog rather than listed by
 * hand. These two properties are claimed of "every catalog level", so pinning a
 * hardcoded list made them quietly narrower than they read — and it broke the
 * moment a phase-1 level was renamed, which is a fact about the list and not
 * about the goal marker.
 */
const ROUTED_LEVEL_IDS = LEVELS.filter((l) => l.kind === 'path').map((l) => l.id)

describe('goalMarkerOf', () => {
  it('is the last point of the route on a single-path level', () => {
    // f1-travesia is retired behind LEGACY_PHASE_1 (detective-mode Phase 11)
    // but still a real, unchanged single-path fixture.
    const travesia = LEGACY_PHASE_1.find((l) => l.id === 'f1-travesia')
    if (!travesia) throw new Error('LEGACY_PHASE_1 lost f1-travesia')
    const target = buildLevelTarget(travesia)
    const goal = goalMarkerOf(target)!
    const end = target.polyline[target.polyline.length - 1]
    expect(goal.x).toBeCloseTo(end.x, 6)
    expect(goal.y).toBeCloseTo(end.y, 6)
  })

  it('every catalog level is in fact a SINGLE continuous path today', () => {
    // Worth pinning: cursive words are written without lifting the pen, so
    // `mustBeContinuous` levels ship one path and `polyline` happens to end
    // where the child stops. The multi-path branch below is therefore not dead
    // code being exercised by the catalog — it is a guard for the day a level
    // needs a pen lift (a `t` crossbar, an `i` dot).
    for (const id of ['f4-la', 'f4-ma', 'f5-ala', 'f5-mama', 'f3-a']) {
      expect(buildLevelTarget(getLevel(id)).paths).toHaveLength(1)
    }
  })

  it('follows the LAST path, not the main polyline, when a level does lift the pen', () => {
    // `polyline` is only ever paths[0] (buildLevel), so a segmented level would
    // otherwise plant the goal where the FIRST segment ends.
    const base = buildLevelTarget(getLevel('f3-l'))
    const segmented = {
      ...base,
      paths: ['M 100 300 L 200 300 L 300 300', 'M 700 400 L 800 400 L 900 400'],
    } as LevelTarget
    const goal = goalMarkerOf(segmented)!
    expect(goal.x).toBeCloseTo(900, 6)
    expect(goal.y).toBeCloseTo(400, 6)
  })

  it('lands ON the route: every catalog level puts the goal inside the sheet', () => {
    for (const id of ROUTED_LEVEL_IDS) {
      const target = buildLevelTarget(getLevel(id))
      const goal = goalMarkerOf(target)!
      expect(goal.x).toBeGreaterThanOrEqual(0)
      expect(goal.x).toBeLessThanOrEqual(target.viewBoxWidth)
      expect(goal.y).toBeGreaterThanOrEqual(0)
      expect(goal.y).toBeLessThanOrEqual(600)
    }
  })

  it('is undefined for a level with no route at all (kind: free)', () => {
    const target = buildLevelTarget(getLevel('f1-libre'))
    expect(goalMarkerOf(target)).toBeUndefined()
  })

  it('is undefined for an empty target rather than throwing', () => {
    expect(goalMarkerOf({ paths: [], polyline: [] } as unknown as LevelTarget)).toBeUndefined()
  })

  it('is clear of the start dot on every level, including the closed o', () => {
    // The goal is drawn hollow so that an overlap would NEST rather than
    // occlude, but it turns out no catalog level needs that today: `f3-o` was
    // the suspected case and its exit stroke carries the end ~270 units away
    // from the start. Pinned so a re-authored `o` that really did close on
    // itself would show up here rather than as two marks on top of each other.
    for (const id of ROUTED_LEVEL_IDS) {
      const target = buildLevelTarget(getLevel(id))
      const goal = goalMarkerOf(target)!
      const start = target.polyline[0]
      const apart = Math.hypot(goal.x - start.x, goal.y - start.y)
      // 56 = the start dot's r=22 plus the goal's 34 half-diagonal: below this
      // the two marks would visibly interpenetrate.
      expect(apart, `${id} goal sits on the start dot`).toBeGreaterThan(56)
    }
  })
})
