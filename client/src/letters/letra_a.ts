import type { LetterConfig } from './types'

// Authored seed per design.md ("Ideal `a` path" decision): the `d` visits all
// six checkpoints in ascending order, INCLUDING revisiting the apex (480,200)
// at cierre_ovalo(4). docs/02 pathBézier never revisits the apex, so a literal
// copy would break the ascending-indices contract — deliberate, flagged
// deviation (design-vs-spec flag 1). Radii 40/40/45/40/35/45 per the
// TOLERANT ruling (a keystone, c-range 35-45).
export const letraA: LetterConfig = {
  id: 'letra_a',
  character: 'a',
  family: 'ola',
  baselineZone: 'media',
  theme: {
    backgroundColor: 'rgba(224, 242, 254, 0.4)',
    watermarkAssetSvg: '/assets/themes/mar_ola_a.svg',
  },
  pathDefinition: {
    // 350,420 → 480,200 → 330,300 → 480,200 → 480,420 → 550,400
    d: 'M 350 420 C 420 300, 440 230, 480 200 C 430 205, 360 220, 330 300 C 380 250, 420 225, 480 200 C 500 280, 500 360, 480 420 C 485 425, 520 415, 550 400',
    strokeWidth: 16,
    checkpoints: [
      { order: 1, x: 350, y: 420, radius: 40, name: 'inicio_enganche' },
      { order: 2, x: 480, y: 200, radius: 40, name: 'cresta_ola' },
      { order: 3, x: 330, y: 300, radius: 45, name: 'retorno_curva' },
      { order: 4, x: 480, y: 200, radius: 40, name: 'cierre_ovalo' },
      { order: 5, x: 480, y: 420, radius: 35, name: 'bajada_pie' },
      { order: 6, x: 550, y: 400, radius: 45, name: 'gancho_salida' },
    ],
  },
  animationTimeline: [
    // Simplified analog of the `c` timeline (design.md "`a` timeline"): tint → draw_path → fade.
    {
      id: 'sube_mar_base',
      type: 'slide_in',
      target: 'background_theme',
      duration: 600,
      properties: { y: [100, 0], opacity: [0, 0.8] },
    },
    {
      id: 'trazo_tinta_a',
      type: 'draw_path',
      target: 'ink_demonstration',
      delay: 1000,
      duration: 1200,
    },
    {
      id: 'desvanecer_a_guia',
      type: 'fade_out',
      target: 'thematic_asset',
      delay: 2400,
      duration: 600,
      properties: { opacity: 0.08 },
    },
  ],
}