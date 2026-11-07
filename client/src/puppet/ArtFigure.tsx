// The one seam between the PNG registry and the puppets: a surface hands over the
// registry art it always used, and gets a puppet when that art has one and the PNG
// otherwise. The puppet stands in the PNG's exact box, so every placement measured
// against that box keeps working, and characters migrate one registry entry at a
// time just by adding a row to `PUPPET_FIGURES`.
import type { CSSProperties, ReactNode, Ref } from 'react'
import {
  ANIMAL_ART,
  CARRIER_LENS_ART,
  DUCKLING_ART,
  GOAL_MEDUSA_ART,
  HEDGEHOG_ART,
  MONKEY_FAMILY_ART,
  OCTOPUS_ART,
  OCTOPUS_EMPTY_HANDED_ART,
  PROMISED_ANIMAL_ART,
  PULPITO_POSE_ART,
  SECTOR_ADVENTURE_ART,
  TRANSITION_LENS_ART,
  ZOO_CARETAKER_ART,
  ZOO_OCTOPUS_BACKPACK_ART,
} from '../detective/assets'
import type { TracePaper } from '../canvas/TraceCanvas'
import type { ActName, RigState } from './actor'
import { markTransform, MARK_EDGE_PAPER, MARK_EDGE_WIDTH, paperMarkFor } from './marks'
import { paperPropFor } from './props'
import { SceneLayers, sceneFor } from './scene/Scene'
import type { CutScene } from './scene/engine'
import type { PuppetName } from './characters'
import Puppet, { type PuppetAccessories, type PuppetHandle } from './Puppet'
import { lookAccessories, lookColours, type PulpitoLook } from '../zoo/pulpitoLook'
import { usePulpitoLook } from './useLook'

export interface PuppetFigure {
  readonly name: PuppetName
  readonly accessories?: PuppetAccessories
  readonly state?: RigState
}

/** The lens comes out only where the registry's own drawing holds it. */
const PUPPET_FIGURES: ReadonlyMap<string, PuppetFigure> = new Map<string, PuppetFigure>([
  [OCTOPUS_ART.href, { name: 'pulpo', accessories: { lens: true } }],
  [OCTOPUS_EMPTY_HANDED_ART.href, { name: 'pulpo' }],
  [PULPITO_POSE_ART.points.href, { name: 'pulpo' }],
  [PULPITO_POSE_ART.cheers.href, { name: 'pulpo' }],
  [PULPITO_POSE_ART.thinks.href, { name: 'pulpo' }],
  // No backpack on the engine yet: the map's figure wears what the others wear.
  [ZOO_OCTOPUS_BACKPACK_ART.href, { name: 'pulpo' }],
  [ZOO_CARETAKER_ART.href, { name: 'pulpo' }],
  [ANIMAL_ART.pato.href, { name: 'pato' }],
  [SECTOR_ADVENTURE_ART.sheep.href, { name: 'oveja' }],
  [SECTOR_ADVENTURE_ART.llama.href, { name: 'llama' }],
  [PROMISED_ANIMAL_ART.pez.href, { name: 'pez' }],
  [GOAL_MEDUSA_ART.href, { name: 'medusa' }],
  [PROMISED_ANIMAL_ART.tortuga.href, { name: 'tortuga' }],
  [MONKEY_FAMILY_ART[0].href, { name: 'mono', state: { pose: 0 } }],
  [MONKEY_FAMILY_ART[1].href, { name: 'mono', state: { pose: 1 } }],
  [MONKEY_FAMILY_ART[2].href, { name: 'mono', state: { pose: 2 } }],
  // One rig: the spine-drawing poses are the same body with its quills down.
  [HEDGEHOG_ART.profile.href, { name: 'erizo', state: { curl: 0, quills: 0 } }],
  [HEDGEHOG_ART.curled.href, { name: 'erizo', state: { curl: 1, quills: 0 } }],
  [HEDGEHOG_ART.uncurling.href, { name: 'erizo', state: { curl: 0.85, quills: 1 } }],
  [SECTOR_ADVENTURE_ART.snakeSmall.href, { name: 'vibora', state: { length: 0 } }],
  [SECTOR_ADVENTURE_ART.snakeMedium.href, { name: 'vibora', state: { length: 1 } }],
  [SECTOR_ADVENTURE_ART.snakeLarge.href, { name: 'vibora', state: { length: 2 } }],
  [SECTOR_ADVENTURE_ART.bee.href, { name: 'abeja' }],
  [SECTOR_ADVENTURE_ART.dolphin.href, { name: 'delfin' }],
  [SECTOR_ADVENTURE_ART.snail.href, { name: 'caracol' }],
  [ANIMAL_ART.gallina.href, { name: 'gallina' }],
  [ANIMAL_ART.vaca.href, { name: 'vaca' }],
  [ANIMAL_ART.gato.href, { name: 'gato' }],
  [DUCKLING_ART[0].href, { name: 'patito', state: { pose: 0 } }],
  [DUCKLING_ART[1].href, { name: 'patito', state: { pose: 1 } }],
  [DUCKLING_ART[2].href, { name: 'patito', state: { pose: 2 } }],
  // See-through: whatever is under the fingertip stays visible through the glass.
  [CARRIER_LENS_ART.href, { name: 'lupa' }],
  // The big glass of a screen change: its ring lands on the hole `lupaWipe` measured.
  [TRANSITION_LENS_ART.href, { name: 'lupa', accessories: { glass: false } }],
])

export function puppetFigureFor(art: { readonly href: string }): PuppetFigure | undefined {
  return PUPPET_FIGURES.get(art.href)
}

/** The Pulpito wears what the child chose wherever he appears. What a picture's own
 *  story has him hold (the lens) goes on top of that choice. */
function dressed(figure: PuppetFigure, look: PulpitoLook): { accessories?: PuppetAccessories; colors?: Readonly<Record<string, string>> } {
  if (figure.name !== 'pulpo') return { accessories: figure.accessories }
  return { accessories: { ...lookAccessories(look), ...figure.accessories }, colors: lookColours(look) }
}

interface ArtPicture {
  readonly href: string
  readonly w: number
  readonly h: number
}

/** How a figure behaves. `still` is the default: only a caller that knows it is
 *  not on a trace screen asks for life. */
export interface FigureLife {
  readonly still?: boolean
  readonly entrance?: { act: ActName; seconds?: number }
  readonly holding?: ActName
  readonly followPointer?: boolean
  /** Reaches a puppet's acts and eyes. Stays empty while the art is still a PNG,
   *  so a caller's reaction simply does nothing until its puppet arrives. */
  readonly puppetRef?: Ref<PuppetHandle>
}

export interface ArtImgProps extends FigureLife {
  art: ArtPicture
  /** A puppet's outline in this one colour, for an animal not found yet. */
  silhouette?: string
  className?: string
  style?: CSSProperties
}

/** For HTML surfaces: a puppet `<svg>`, or the `<img>` it replaces. */
export function ArtImg({ art, className, style, still = true, entrance, holding, followPointer, puppetRef, silhouette }: ArtImgProps) {
  const look = usePulpitoLook()
  const figure = puppetFigureFor(art)
  if (!figure) {
    const thing = paperPropFor(art)
    if (thing) {
      return (
        <svg viewBox={`0 0 ${thing.w} ${thing.h}`} className={className} style={{ overflow: 'visible', ...style }} data-art={art.href} aria-hidden="true" focusable="false">
          <SceneLayers scene={thing} still />
        </svg>
      )
    }
    const mark = paperMarkFor(art)
    if (mark) {
      return (
        <svg viewBox="-60 -60 120 120" className={className} style={style} data-art={art.href} aria-hidden="true" focusable="false">
          <path d={mark.d} fill={mark.fill} stroke={MARK_EDGE_PAPER} strokeWidth={MARK_EDGE_WIDTH} strokeLinejoin="round" paintOrder="stroke" />
        </svg>
      )
    }
    return <img src={art.href} alt="" className={className} style={style} />
  }
  return (
    <Puppet
      ref={puppetRef}
      name={figure.name}
      {...dressed(figure, look)}
      state={figure.state}
      aspect={art.w / art.h}
      artHref={silhouette ? undefined : art.href}
      silhouette={silhouette}
      className={className}
      style={style}
      still={still}
      entrance={entrance}
      holding={holding}
      followPointer={followPointer}
    />
  )
}

export interface ArtBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ArtInSvgProps extends FigureLife {
  art: ArtPicture
  box: ArtBox
}

function PropInSvg({ art, thing, box }: { art: ArtPicture; thing: CutScene; box: ArtBox }) {
  return (
    <svg x={box.x} y={box.y} width={box.width} height={box.height} viewBox={`0 0 ${thing.w} ${thing.h}`} overflow="visible" data-art={art.href} aria-hidden="true" focusable="false">
      <SceneLayers scene={thing} still />
    </svg>
  )
}

/** For SVG surfaces: a puppet `<g>` filling `box`, or the `<image>` it replaces. */
export function ArtInSvg({ art, box, still = true, entrance, holding, followPointer, puppetRef }: ArtInSvgProps) {
  const look = usePulpitoLook()
  const figure = puppetFigureFor(art)
  if (!figure) {
    const thing = paperPropFor(art)
    if (thing) return <PropInSvg art={art} thing={thing} box={box} />
    const scene = sceneFor(art)
    if (scene) {
      // A whole place as a small picture: still, and cropped to the box it was given.
      return (
        <svg x={box.x} y={box.y} width={box.width} height={box.height} viewBox={`0 0 ${scene.w} ${scene.h}`} preserveAspectRatio="xMidYMid slice" data-art={art.href} aria-hidden="true" focusable="false">
          <rect width={scene.w} height={scene.h} fill={scene.base} />
          <SceneLayers scene={scene} still />
        </svg>
      )
    }
    const mark = paperMarkFor(art)
    if (mark) {
      return (
        <path
          d={mark.d}
          fill={mark.fill}
          stroke={MARK_EDGE_PAPER}
          strokeWidth={MARK_EDGE_WIDTH}
          strokeLinejoin="round"
          paintOrder="stroke"
          data-art={art.href}
          transform={markTransform(mark, box.x + box.width / 2, box.y + box.height / 2, 0, box.height, 0)}
        />
      )
    }
    return <image href={art.href} {...box} preserveAspectRatio="xMidYMid meet" />
  }
  return (
    <Puppet
      ref={puppetRef}
      name={figure.name}
      {...dressed(figure, look)}
      state={figure.state}
      box={box}
      artHref={art.href}
      still={still}
      entrance={entrance}
      holding={holding}
      followPointer={followPointer}
    />
  )
}

/** For `TraceCanvas`, which holds no registry: the drawing a standing figure
 *  renders in its box, or `undefined` to keep the canvas's own `<image>`. One
 *  function per picture, so its identity is stable across renders. */
const standingRenderers = new Map<string, (box: ArtBox) => ReactNode>()

export function standingFigure(art: ArtPicture, puppetRef?: Ref<PuppetHandle>): ((box: ArtBox) => ReactNode) | undefined {
  if (!puppetFigureFor(art)) return undefined
  // A caller that wants to reach the figure keeps its own function stable.
  if (puppetRef) return (box) => <ArtInSvg art={art} box={box} still puppetRef={puppetRef} />
  let render = standingRenderers.get(art.href)
  if (!render) {
    render = (box) => <ArtInSvg art={art} box={box} still />
    standingRenderers.set(art.href, render)
  }
  return render
}

/** What a level screen hands `TraceCanvas`, so the sheet draws its art in paper. */
export const TRACE_PAPER: TracePaper = {
  // A prop wins over a puppet here: on the sheet a snake is the corridor itself, and
  // it has to lie on the measured spine rather than on the puppet's own wave.
  art: (art, box) => {
    const thing = paperPropFor(art)
    return thing ? <PropInSvg art={art} thing={thing} box={box} /> : <ArtInSvg art={art} box={box} />
  },
  mark: (mark, index) => {
    const paper = paperMarkFor(mark)
    if (!paper) return null
    return (
      <path
        d={paper.d}
        fill={paper.fill}
        stroke={MARK_EDGE_PAPER}
        strokeWidth={MARK_EDGE_WIDTH}
        strokeLinejoin="round"
        paintOrder="stroke"
        data-art={mark.href}
        transform={markTransform(paper, mark.x, mark.y, mark.angle, mark.size, index)}
      />
    )
  },
}
