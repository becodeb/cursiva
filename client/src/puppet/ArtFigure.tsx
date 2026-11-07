// The one seam between the PNG registry and the puppets: a surface hands over the
// registry art it always used, and gets a puppet when that art has one and the PNG
// otherwise. The puppet stands in the PNG's exact box, so every placement measured
// against that box keeps working, and characters migrate one registry entry at a
// time just by adding a row to `PUPPET_FIGURES`.
import type { CSSProperties, ReactNode, Ref } from 'react'
import {
  ANIMAL_ART,
  OCTOPUS_ART,
  OCTOPUS_EMPTY_HANDED_ART,
  PULPITO_POSE_ART,
  ZOO_OCTOPUS_BACKPACK_ART,
} from '../detective/assets'
import type { ActName } from './actor'
import type { PuppetName } from './characters'
import Puppet, { type PuppetAccessories, type PuppetHandle } from './Puppet'

export interface PuppetFigure {
  readonly name: PuppetName
  readonly accessories?: PuppetAccessories
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

export function standingFigure(art: ArtPicture): ((box: ArtBox) => ReactNode) | undefined {
  if (!puppetFigureFor(art)) return undefined
  let render = standingRenderers.get(art.href)
  if (!render) {
    render = (box) => <ArtInSvg art={art} box={box} still />
    standingRenderers.set(art.href, render)
  }
  return render
}
