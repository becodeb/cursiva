// The seam between the backdrop registry and the paper places: a surface hands over
// the registry picture it always used and gets a scene when it has one, the PNG
// otherwise (`ArtFigure.tsx` does the same for characters). A scene is static paths,
// with CSS keyframes on a few groups when it may breathe: no JS clock, no ticker.
import { memo, type CSSProperties, type Ref } from 'react'
import {
  SECTOR_BACKGROUND_ART,
  ZOO_MAP_ART,
} from '../../detective/assets'
import { PAPER_SHADOW_FILL } from '../rig'
import { cutScene, SCENE_SHADOW_TRANSFORM, type CutScene } from './engine'
import { ZOO_MAP_SCENE } from './zooMap'
import { SCENES, type SceneName } from './scenes'

export const SCENE_CSS = `
@keyframes cv-scene-sway { 0%, 100% { transform: rotate(-1.1deg); } 50% { transform: rotate(1.1deg); } }
@keyframes cv-scene-drift { 0%, 100% { transform: translateX(-22px); } 50% { transform: translateX(22px); } }
@keyframes cv-scene-rays { 0%, 100% { transform: rotate(-1.6deg); opacity: .78; } 50% { transform: rotate(1.6deg); opacity: 1; } }
@keyframes cv-scene-bob { 0%, 100% { transform: translateY(-6px); } 50% { transform: translateY(6px); } }
.cv-scene-sway { animation: cv-scene-sway 5.4s ease-in-out infinite; }
.cv-scene-drift { animation: cv-scene-drift 16s ease-in-out infinite; }
.cv-scene-rays { animation: cv-scene-rays 9s ease-in-out infinite; }
.cv-scene-bob { animation: cv-scene-bob 4.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cv-scene-sway, .cv-scene-drift, .cv-scene-rays, .cv-scene-bob { animation: none; }
}
`

const SCENE_BY_HREF: ReadonlyMap<string, SceneName> = new Map<string, SceneName>([
  [SECTOR_BACKGROUND_ART.lagoon.href, 'lagoon'],
  [SECTOR_BACKGROUND_ART.slope.href, 'slope'],
  [SECTOR_BACKGROUND_ART.range.href, 'range'],
  [SECTOR_BACKGROUND_ART.forest.href, 'forest'],
  [SECTOR_BACKGROUND_ART.aquarium.href, 'aquarium'],
  [SECTOR_BACKGROUND_ART.sand.href, 'sand'],
  [SECTOR_BACKGROUND_ART.monkeys.href, 'monkeys'],
  [SECTOR_BACKGROUND_ART.path.href, 'path'],
  [SECTOR_BACKGROUND_ART.night.href, 'night'],
  [SECTOR_BACKGROUND_ART.nightZoo.href, 'nightZoo'],
])

const cutScenes = new Map<string, CutScene>()

function cut(key: string, make: () => CutScene): CutScene {
  let scene = cutScenes.get(key)
  if (!scene) {
    scene = make()
    cutScenes.set(key, scene)
  }
  return scene
}

/** The cut scene that stands in for a registry picture, if it has one. */
export function sceneFor(art: { readonly href: string }): CutScene | undefined {
  if (art.href === ZOO_MAP_ART.href) return cut('map', () => cutScene(ZOO_MAP_SCENE, 5))
  const name = SCENE_BY_HREF.get(art.href)
  if (!name) return undefined
  return cut(name, () => cutScene(SCENES[name], 11 + name.length))
}

export function hasScene(art: { readonly href: string }): boolean {
  return art.href === ZOO_MAP_ART.href || SCENE_BY_HREF.has(art.href)
}

export interface SceneLayersProps {
  scene: CutScene
  /** Nothing moves: the trace screen's own rule (`docs/01` §5). */
  still: boolean
}

/** One `<g>` per layer, shadow first. Memoised: a parent re-render during a trace
 *  costs nothing, and its output never changes for a scene and a `still`. */
export const SceneLayers = memo(function SceneLayers({ scene, still }: SceneLayersProps) {
  return (
    <>
      {scene.layers.map((layer, i) => {
        const moving = !still && layer.motion
        const style: CSSProperties | undefined = moving
          ? {
              transformOrigin: layer.origin ? `${layer.origin[0]}px ${layer.origin[1]}px` : undefined,
              animationDelay: layer.delay ? `${-layer.delay}s` : undefined,
            }
          : undefined
        return (
          <g key={i} className={moving ? `cv-scene-${layer.motion}` : undefined} style={style}>
            {!layer.flat && (
              <g transform={SCENE_SHADOW_TRANSFORM} fill={PAPER_SHADOW_FILL}>
                {layer.pieces.map((piece, j) => (
                  <path key={j} d={piece.d} />
                ))}
              </g>
            )}
            {layer.pieces.map((piece, j) => (
              <path key={j} d={piece.d} fill={piece.c} />
            ))}
          </g>
        )
      })}
    </>
  )
})

export interface ScenePictureProps {
  scene: CutScene
  still?: boolean
  x?: number
  y?: number
  width?: number | string
  height?: number | string
  className?: string
  style?: CSSProperties
  /** A camera level moves the scene with its own window, through `x`. */
  svgRef?: Ref<SVGSVGElement>
  /** Which registry picture this scene stands in for, as a puppet says too. */
  artHref?: string
}

/** A scene as an `<svg>` of its own: nested in a level's sheet or standing alone on
 *  an HTML screen. `slice` here does what the PNG's `object-fit: cover` did, and an
 *  `<svg>` clips itself with no `clipPath`. */
export function ScenePicture({ scene, still = false, x, y, width = '100%', height = '100%', className, style, svgRef, artHref }: ScenePictureProps) {
  return (
    <svg
      ref={svgRef}
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={`0 0 ${scene.w} ${scene.h}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
      data-scene=""
      data-art={artHref}
    >
      <rect x={-scene.w} y={-scene.h} width={scene.w * 3} height={scene.h * 3} fill={scene.base} />
      <SceneLayers scene={scene} still={still} />
    </svg>
  )
}

export interface ArtBackdropProps {
  art: { readonly href: string }
  still?: boolean
  className?: string
}

/** For HTML surfaces: a scene, or the `<img>` it replaces. Breathes by default: only
 *  the trace screen asks for it `still`, and it does not come through here. */
export function ArtBackdrop({ art, still = false, className }: ArtBackdropProps) {
  const scene = sceneFor(art)
  if (!scene) return <img className={className} src={art.href} alt="" />
  return <ScenePicture scene={scene} still={still} className={className} artHref={art.href} />
}
