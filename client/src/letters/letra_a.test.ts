import { describe, expect, it } from 'vitest'
import { letraA } from './letra_a'
import { pathEndpoints } from './pathEndpoints'

describe('letra_a (keystone)', () => {
  it('maps the six docs/02 puntosClave in order with authored radii 40/40/45/40/35/45', () => {
    const checkpoints = letraA.pathDefinition.checkpoints
    expect(checkpoints.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6])
    expect(checkpoints.map((c) => c.radius)).toEqual([40, 40, 45, 40, 35, 45])
    expect(checkpoints.map((c) => c.name)).toEqual([
      'inicio_enganche',
      'cresta_ola',
      'retorno_curva',
      'cierre_ovalo',
      'bajada_pie',
      'gancho_salida',
    ])
    expect(checkpoints.map((c) => [c.x, c.y])).toEqual([
      [350, 420],
      [480, 200],
      [330, 300],
      [480, 200],
      [480, 420],
      [550, 400],
    ])
  })

  it('co-locates the counterclockwise oval apex at 480,200 for cresta and cierre', () => {
    const cresta = letraA.pathDefinition.checkpoints[1]
    const cierre = letraA.pathDefinition.checkpoints[3]
    expect([cresta.x, cresta.y]).toEqual([480, 200])
    expect([cierre.x, cierre.y]).toEqual([480, 200])
  })

  it('orders are exactly 1..6 with no gaps or duplicates', () => {
    const orders = letraA.pathDefinition.checkpoints.map((c) => c.order)
    expect(new Set(orders).size).toBe(orders.length)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(orders[0]).toBe(1)
    expect(orders[orders.length - 1]).toBe(orders.length)
  })

  it('authors a `d` that visits every checkpoint in ascending order', () => {
    // docs/02 pathBézier never revisits the apex, so a literal copy would
    // break the ascending-indices contract (design-vs-spec flag 1).
    const checkpoints = letraA.pathDefinition.checkpoints
    const endpoints = pathEndpoints(letraA.pathDefinition.d)
    expect(endpoints.length).toBe(checkpoints.length)
    checkpoints.forEach((cp, index) => {
      const [x, y] = endpoints[index]
      expect([x, y]).toEqual([cp.x, cp.y])
    })
  })

  it('sits in the media zone with the ola family', () => {
    expect(letraA.id).toBe('letra_a')
    expect(letraA.character).toBe('a')
    expect(letraA.family).toBe('ola')
    expect(letraA.baselineZone).toBe('media')
    expect(letraA.pathDefinition.strokeWidth).toBe(16)
  })

  it('uses a simplified 3-step timeline (tint → draw_path → fade)', () => {
    expect(letraA.animationTimeline.map((s) => `${s.id}:${s.type}`)).toEqual([
      'sube_mar_base:slide_in',
      'trazo_tinta_a:draw_path',
      'desvanecer_a_guia:fade_out',
    ])
  })
})