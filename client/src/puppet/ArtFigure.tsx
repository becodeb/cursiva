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
  ZOO_OCTOPUS_BACKPACK_ART,
} from '../detective/assets'
import type { ActName, RigState } from './actor'
import type { PuppetName } from './characters'
import Puppet, { type PuppetAccessories, type PuppetHandle } from './Puppet'

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
])

export function puppetFigureFor(art: { readonly href: string }): PuppetFigure | undefined {
  return PUPPET_FIGURES.get(art.href)
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
  className?: string
  style?: CSSProperties
}

/** For HTML surfaces: a puppet `<svg>`, or the `<img>` it replaces. */
export function ArtImg({ art, className, style, still = true, entrance, holding, followPointer, puppetRef }: ArtImgProps) {
  const figure = puppetFigureFor(art)
  if (!figure) return <img src={art.href} alt="" className={className} style={style} />
  return (
    <Puppet
      ref={puppetRef}
      name={figure.name}
      accessories={figure.accessories}
      state={figure.state}
      aspect={art.w / art.h}
      artHref={art.href}
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

/** For SVG surfaces: a puppet `<g>` filling `box`, or the `<image>` it replaces. */
export function ArtInSvg({ art, box, still = true, entrance, holding, followPointer, puppetRef }: ArtInSvgProps) {
  const figure = puppetFigureFor(art)
  if (!figure) return <image href={art.href} {...box} preserveAspectRatio="xMidYMid meet" />
  return (
    <Puppet
      ref={puppetRef}
      name={figure.name}
      accessories={figure.accessories}
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
