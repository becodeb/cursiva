import { describe, expect, it } from 'vitest'
import { letraA } from './letra_a'
import { pathEndpoints } from './pathEndpoints'

/** Index of the ductus endpoint nearest a checkpoint (on-curve reachability). */
function nearestEndpointIndex(d: string, cp: { x: number; y: number }): number {
  const eps = pathEndpoints(d)
  let best = 0
  let bestDist = Infinity
  eps.forEach(([x, y], i) => {
    const dist = Math.hypot(x - cp.x, y - cp.y)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  })
  return best
}

describe('letra_a (real Kalam glyph)', () => {
  it('maps the six checkpoints with the Kalam-derived radii and names', () => {
    const checkpoints = letraA.pathDefinition.checkpoints
    expect(checkpoints.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6])
    expect(checkpoints.map((c) => c.radius)).toEqual([50, 45, 45, 50, 45, 50])
    expect(checkpoints.map((c) => c.name)).toEqual([
      'inicio_enganche',
      'subida_ola',
      'cresta_ola',
      'gancho_salida',
      'bajada_pie',
      'cierre_ovalo',
    ])
    expect(checkpoints.map((c) => [c.x, c.y])).toEqual([
      [467.8, 413.2],
      [406.2, 357.9],
      [538.6, 186.8],
      [593.8, 245],
      [562.7, 413.2],
      [467.8, 413.2],
    ])
  })

  it('ships a dense area cloud (>1000 points) as the scoring ideal', () => {
    expect(letraA.pathDefinition.ideal.length).toBeGreaterThan(1000)
  })

  it('orders are exactly 1..6 with no gaps or duplicates', () => {
    const orders = letraA.pathDefinition.checkpoints.map((c) => c.order)
    expect(new Set(orders).size).toBe(orders.length)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(orders[0]).toBe(1)
    expect(orders[orders.length - 1]).toBe(orders.length)
  })

  it('every checkpoint is reachable on the ductus (nearest on-curve point ≤ 2px)', () => {
    const d = letraA.pathDefinition.d
    for (const cp of letraA.pathDefinition.checkpoints) {
      const idx = nearestEndpointIndex(d, cp)
      const [x, y] = pathEndpoints(d)[idx]
      expect(Math.hypot(x - cp.x, y - cp.y)).toBeLessThanOrEqual(2)
    }
  })

  it('the co-located entry/cierre pair (both 467.8,413.2) is order-gated on one ductus point', () => {
    const d = letraA.pathDefinition.d
    const entry = letraA.pathDefinition.checkpoints[0] // order 1
    const cierre = letraA.pathDefinition.checkpoints[5] // order 6
    expect([entry.x, entry.y]).toEqual([cierre.x, cierre.y]) // co-located
    // Both orders resolve to the SAME ductus on-curve point.
    expect(nearestEndpointIndex(d, entry)).toBe(nearestEndpointIndex(d, cierre))
  })

  it('sits in the media zone with the ola family and strokeWidth 14', () => {
    expect(letraA.id).toBe('letra_a')
    expect(letraA.character).toBe('a')
    expect(letraA.family).toBe('ola')
    expect(letraA.baselineZone).toBe('media')
    expect(letraA.pathDefinition.strokeWidth).toBe(14)
  })

  it('uses a simplified 3-step timeline (tint → draw_path → fade)', () => {
    expect(letraA.animationTimeline.map((s) => `${s.id}:${s.type}`)).toEqual([
      'sube_mar_base:slide_in',
      'trazo_tinta_a:draw_path',
      'desvanecer_a_guia:fade_out',
    ])
  })
})
