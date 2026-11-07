// The cast on the engine. A rig is immutable, so one is built per character and
// seed and shared by every puppet on screen.
import { RigBuilder, computeFrame, figureView, frameBounds, type Bounds, type Rig, type RigUpdate, type ViewBox } from '../rig'
import { createActor } from '../actor'
import { drawPato, PATO_PALETTE } from './pato'
import { drawPulpo, PULPO_PALETTE } from './pulpo'

export type PuppetName = 'pulpo' | 'pato'

interface CharacterDef {
  readonly draw: (b: RigBuilder) => RigUpdate
  readonly palette: Readonly<Record<string, string>>
  /** The x a figure stands centred on: a symmetric body keeps its own axis, so
   *  the head stays put when an accessory comes off. `null` centres its box. */
  readonly centreX: number | null
}

const CHARACTERS: Readonly<Record<PuppetName, CharacterDef>> = {
  pulpo: { draw: drawPulpo, palette: PULPO_PALETTE, centreX: 200 },
  pato: { draw: drawPato, palette: PATO_PALETTE, centreX: null },
}

export const DEFAULT_SEED = 7

const rigs = new Map<string, Rig>()
const stillBounds = new Map<PuppetName, Bounds>()

export function getRig(name: PuppetName, seed: number = DEFAULT_SEED): Rig {
  const key = `${name}:${seed}`
  let rig = rigs.get(key)
  if (!rig) {
    const def = CHARACTERS[name]
    const builder = new RigBuilder(seed)
    const update = def.draw(builder)
    rig = { nodes: builder.nodes, dynamics: builder.dynamics, eyes: builder.eyes, palette: def.palette, update }
    rigs.set(key, rig)
  }
  return rig
}

/** The window onto `name` for a box of `aspect`, from its fully dressed still
 *  pose. Every costume of a character shares it, so taking the lens away neither
 *  moves nor resizes him. */
export function puppetView(name: PuppetName, aspect: number | null): ViewBox {
  let bounds = stillBounds.get(name)
  if (!bounds) {
    const rig = getRig(name)
    bounds = frameBounds(rig, computeFrame(rig, createActor(DEFAULT_SEED), true))
    stillBounds.set(name, bounds)
  }
  return figureView(bounds, CHARACTERS[name].centreX, aspect)
}
