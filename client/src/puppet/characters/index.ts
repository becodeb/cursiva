// The cast on the engine. A rig is immutable, so one is built per character and
// seed and shared by every puppet on screen.
import { RigBuilder, computeFrame, figureView, frameBounds, type Bounds, type Rig, type RigUpdate, type RootMotion, type ViewBox } from '../rig'
import { createActor, type RigState } from '../actor'
import { drawLlama, LLAMA_PALETTE } from './llama'
import { drawMedusa, MEDUSA_PALETTE } from './medusa'
import { drawOveja, OVEJA_PALETTE } from './oveja'
import { drawPato, PATO_PALETTE } from './pato'
import { drawPez, PEZ_PALETTE } from './pez'
import { drawPulpo, PULPO_PALETTE } from './pulpo'

import { drawTortuga, TORTUGA_PALETTE } from './tortuga'

export type PuppetName = 'pulpo' | 'pato' | 'oveja' | 'llama' | 'pez' | 'medusa' | 'tortuga'

interface CharacterDef {
  readonly draw: (b: RigBuilder) => RigUpdate
  readonly palette: Readonly<Record<string, string>>
  /** The x a figure stands centred on: a symmetric body keeps its own axis, so
   *  the head stays put when an accessory comes off. `null` centres its box. */
  readonly centreX: number | null
  readonly motion?: RootMotion
  /** Which state the window is measured on, when the states must share one scale
   *  (the monkey family stands in one frame). Absent: each state has its own. */
  readonly viewState?: RigState
}

const CHARACTERS: Readonly<Record<PuppetName, CharacterDef>> = {
  pulpo: { draw: drawPulpo, palette: PULPO_PALETTE, centreX: 200 },
  pato: { draw: drawPato, palette: PATO_PALETTE, centreX: null },
  oveja: { draw: drawOveja, palette: OVEJA_PALETTE, centreX: null, motion: { pivot: [224, 372] } },
  llama: { draw: drawLlama, palette: LLAMA_PALETTE, centreX: null, motion: { pivot: [140, 442] } },
  pez: { draw: drawPez, palette: PEZ_PALETTE, centreX: null, motion: { pivot: [226, 200], hop: 0.7 } },
  medusa: { draw: drawMedusa, palette: MEDUSA_PALETTE, centreX: null, motion: { pivot: [178, 200], hop: 0.6, squash: 0.4 } },
  tortuga: { draw: drawTortuga, palette: TORTUGA_PALETTE, centreX: null, motion: { pivot: [190, 290], hop: 0.5, shake: 0.5, tilt: 0.5 } },
}

export const DEFAULT_SEED = 7

export const PUPPET_NAMES = Object.keys(CHARACTERS) as PuppetName[]

const rigs = new Map<string, Rig>()
const stillBounds = new Map<string, Bounds>()

export function getRig(name: PuppetName, seed: number = DEFAULT_SEED): Rig {
  const key = `${name}:${seed}`
  let rig = rigs.get(key)
  if (!rig) {
    const def = CHARACTERS[name]
    const builder = new RigBuilder(seed)
    const update = def.draw(builder)
    rig = { nodes: builder.nodes, dynamics: builder.dynamics, eyes: builder.eyes, palette: def.palette, update, motion: def.motion }
    rigs.set(key, rig)
  }
  return rig
}

/** The window onto `name` for a box of `aspect`, from its fully dressed still
 *  pose. Every costume of a character shares it, so taking the lens away neither
 *  moves nor resizes him. */
export function puppetView(name: PuppetName, aspect: number | null, state?: RigState): ViewBox {
  const def = CHARACTERS[name]
  const measured = def.viewState ?? state
  const key = measured ? `${name}:${JSON.stringify(measured)}` : name
  let bounds = stillBounds.get(key)
  if (!bounds) {
    const rig = getRig(name)
    bounds = frameBounds(rig, computeFrame(rig, createActor(DEFAULT_SEED, undefined, measured), true))
    stillBounds.set(key, bounds)
  }
  return figureView(bounds, def.centreX, aspect)
}
