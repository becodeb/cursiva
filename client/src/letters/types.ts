// Letter model contracts — canonical shapes reconciled from docs/02
// (puntosClave / pathBézier) and docs/07 (pathDefinition / checkpoints).
// All coordinates live in normalized viewBox `0 0 1000 600` space.

export interface Point {
  x: number
  y: number
}

export type LetterFamily = 'ola' | 'rulo' | 'colina' | 'cima' | 'enlazada'

export type BaselineZone = 'media' | 'alta' | 'baja' | 'mixta'

export interface LetterCheckpoint {
  x: number
  y: number
  /** Strict temporal sequence: unique integer, strictly increasing from 1. */
  order: number
  /** Tolerance radius in virtual px. */
  radius: number
  name?: string
}

export interface AnimationStep {
  id: string
  type: 'fade_in' | 'slide_in' | 'draw_path' | 'fade_out' | 'custom_css'
  target: 'background_theme' | 'thematic_asset' | 'ink_demonstration' | 'guide_layer'
  /** Duration in milliseconds. */
  duration: number
  /** Delay before starting, in milliseconds. */
  delay?: number
  properties?: Record<string, unknown>
}

export interface LetterTheme {
  backgroundColor: string
  watermarkAssetSvg: string
  soundEffectUrl?: string
}

export interface LetterConfig {
  id: string
  character: string
  family: LetterFamily
  baselineZone: BaselineZone
  theme: LetterTheme
  pathDefinition: {
    /** SVG path data ("M 400 420 C ..."). The ductus: the natural single-pass
     * stroke centerline used for the demo and as the visible guide line. */
    d: string
    /** Full glyph contour (incl. counter-holes) for the evenodd FILL layer of
     * the guide. Optional until a glyph provides a separate contour. */
    guideD?: string
    /** Dense area point cloud of the REAL glyph (Kalam-derived) — the scoring
     * target. A trace scores by distance to this cloud (area-cloud model). */
    ideal: ReadonlyArray<readonly [number, number]>
    /** Virtual stroke width. */
    strokeWidth: number
    checkpoints: LetterCheckpoint[]
  }
  animationTimeline: AnimationStep[]
}

export type PointerType = 'mouse' | 'pen' | 'touch'

export interface TraceResult {
  points: Point[]
  resampled: Point[] | null
  pointerType: PointerType
}

export interface EvaluationResult {
  orderPassed: boolean
  isContinuous: boolean
  score: number
  approved: boolean
  wrongDirection: boolean
  /** Checkpoint orders activated during the trace. */
  activated: number[]
}