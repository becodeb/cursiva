import type { LetterConfig } from './types'

// VERBATIM transcription of docs/07 section 3 ("La Ola del Mar").
// Do not modernize: radii 40/35/40/40/45, orders 1-5, the path string, theme
// and the 4-step timeline are the canonical contract of the letter-model spec.
export const letraC: LetterConfig = {
  id: 'letra_c',
  character: 'c',
  family: 'ola',
  baselineZone: 'media',
  theme: {
    backgroundColor: 'rgba(224, 242, 254, 0.4)', // Azul celeste muy suave
    watermarkAssetSvg: '/assets/themes/mar_ola_c.svg',
    soundEffectUrl: '/assets/audio/ola_suave.mp3',
  },
  pathDefinition: {
    // Coordenadas en viewBox 0 0 1000 600 (Renglón medio entre Y:180 y Y:420)
    d: 'M 400 420 C 440 340, 480 230, 520 200 C 470 200, 410 260, 410 330 C 410 390, 450 420, 500 420 C 530 420, 560 400, 580 380',
    strokeWidth: 16,
    checkpoints: [
      { order: 1, x: 400, y: 420, radius: 40, name: 'inicio_subida' },
      { order: 2, x: 520, y: 200, radius: 35, name: 'cresta_ola' },
      { order: 3, x: 410, y: 330, radius: 40, name: 'retorno_agua' },
      { order: 4, x: 500, y: 420, radius: 40, name: 'apoyo_tierra' },
      { order: 5, x: 580, y: 380, radius: 45, name: 'salida_gancho' },
    ],
  },
  animationTimeline: [
    {
      id: 'sube_mar_base',
      type: 'slide_in',
      target: 'background_theme',
      duration: 600,
      properties: { y: [100, 0], opacity: [0, 0.8] },
    },
    {
      id: 'ola_lateral',
      type: 'slide_in',
      target: 'thematic_asset',
      delay: 200,
      duration: 800,
      properties: { x: [-120, 0], opacity: [0, 1] },
    },
    {
      id: 'trazo_tinta_c',
      type: 'draw_path',
      target: 'ink_demonstration',
      delay: 1000,
      duration: 1200, // 1.2s para recorrer el ductus
    },
    {
      id: 'desvanecer_a_guia',
      type: 'fade_out',
      target: 'thematic_asset',
      delay: 2400,
      duration: 600,
      properties: { opacity: 0.08 }, // Queda como marca de agua casi invisible
    },
  ],
}