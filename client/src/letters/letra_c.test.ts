import { describe, expect, it } from 'vitest'
import { letraC } from './letra_c'
import { pathEndpoints } from './pathEndpoints'

describe('letra_c (La Ola del Mar)', () => {
  it('replicates docs/07 verbatim: identity, zone and theme', () => {
    expect(letraC.id).toBe('letra_c')
    expect(letraC.character).toBe('c')
    expect(letraC.family).toBe('ola')
    expect(letraC.baselineZone).toBe('media')
    expect(letraC.pathDefinition.strokeWidth).toBe(16)
    expect(letraC.theme.backgroundColor).toBe('rgba(224, 242, 254, 0.4)')
    expect(letraC.theme.watermarkAssetSvg).toBe('/assets/themes/mar_ola_c.svg')
    expect(letraC.theme.soundEffectUrl).toBe('/assets/audio/ola_suave.mp3')
  })

  it('keeps the docs/07 path string verbatim', () => {
    expect(letraC.pathDefinition.d).toBe(
      'M 400 420 C 440 340, 480 230, 520 200 C 470 200, 410 260, 410 330 C 410 390, 450 420, 500 420 C 530 420, 560 400, 580 380',
    )
  })

  it('carries 5 checkpoints: orders exactly 1-5, radii 40/35/40/40/45', () => {
    const checkpoints = letraC.pathDefinition.checkpoints
    expect(checkpoints).toHaveLength(5)
    expect(checkpoints.map((c) => c.order)).toEqual([1, 2, 3, 4, 5])
    expect(checkpoints.map((c) => c.radius)).toEqual([40, 35, 40, 40, 45])
  })

  it('names checkpoints exactly as docs/07', () => {
    expect(letraC.pathDefinition.checkpoints.map((c) => c.name)).toEqual([
      'inicio_subida',
      'cresta_ola',
      'retorno_agua',
      'apoyo_tierra',
      'salida_gancho',
    ])
  })

  it('keeps the 4-step docs/07 animation timeline', () => {
    expect(letraC.animationTimeline.map((s) => `${s.id}:${s.type}`)).toEqual([
      'sube_mar_base:slide_in',
      'ola_lateral:slide_in',
      'trazo_tinta_c:draw_path',
      'desvanecer_a_guia:fade_out',
    ])
  })

  it('visits every checkpoint in ascending order along `d`', () => {
    const checkpoints = letraC.pathDefinition.checkpoints
    const endpoints = pathEndpoints(letraC.pathDefinition.d)
    expect(endpoints.length).toBe(checkpoints.length)
    checkpoints.forEach((cp, index) => {
      const [x, y] = endpoints[index]
      expect([x, y]).toEqual([cp.x, cp.y])
    })
  })
})