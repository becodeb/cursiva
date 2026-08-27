import { describe, expect, it } from 'vitest'
import { letraC } from './letra_c'
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

describe('letra_c (real Kalam glyph)', () => {
  it('replicates identity, zone and theme from the Kalam extraction', () => {
    expect(letraC.id).toBe('letra_c')
    expect(letraC.character).toBe('c')
    expect(letraC.family).toBe('ola')
    expect(letraC.baselineZone).toBe('media')
    expect(letraC.pathDefinition.strokeWidth).toBe(14)
    expect(letraC.theme.backgroundColor).toBe('rgba(224, 242, 254, 0.4)')
    expect(letraC.theme.watermarkAssetSvg).toBe('/assets/themes/mar_ola_c.svg')
  })

  it('authors a Q-command ductus starting at inicio and closing on itself', () => {
    const d = letraC.pathDefinition.d
    expect(d.startsWith('M485.85 413.16')).toBe(true)
    const eps = pathEndpoints(d)
    const start = eps[0]
    const end = eps[eps.length - 1]
    expect(Math.hypot(start[0] - 485.85, start[1] - 413.16)).toBeLessThanOrEqual(0.5)
    expect(Math.hypot(end[0] - 485.85, end[1] - 413.16)).toBeLessThanOrEqual(0.5)
    expect(d).toContain('Q') // quadratic-Bézier real glyph contour
  })

  it('ships a dense area cloud (>1000 points) as the scoring ideal', () => {
    expect(letraC.pathDefinition.ideal.length).toBeGreaterThan(1000)
  })

  it('carries 5 checkpoints: orders exactly 1-5, radii 50/45/45/50/50', () => {
    const checkpoints = letraC.pathDefinition.checkpoints
    expect(checkpoints).toHaveLength(5)
    expect(checkpoints.map((c) => c.order)).toEqual([1, 2, 3, 4, 5])
    expect(checkpoints.map((c) => c.radius)).toEqual([50, 45, 45, 50, 50])
  })

  it('names checkpoints exactly as the Kalam extraction', () => {
    expect(letraC.pathDefinition.checkpoints.map((c) => c.name)).toEqual([
      'inicio_subida',
      'retorno_agua',
      'cresta_ola',
      'gancho_salida',
      'apoyo_tierra',
    ])
  })

  it('every checkpoint is reachable on the ductus (nearest on-curve point ≤ 2px)', () => {
    const d = letraC.pathDefinition.d
    for (const cp of letraC.pathDefinition.checkpoints) {
      const idx = nearestEndpointIndex(d, cp)
      const [x, y] = pathEndpoints(d)[idx]
      expect(Math.hypot(x - cp.x, y - cp.y)).toBeLessThanOrEqual(2)
    }
  })

  it('keeps the 3-step animation timeline', () => {
    expect(letraC.animationTimeline.map((s) => `${s.id}:${s.type}`)).toEqual([
      'sube_mar_base:slide_in',
      'trazo_tinta_c:draw_path',
      'desvanecer_a_guia:fade_out',
    ])
  })
})
