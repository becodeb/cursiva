// The whole cast, row by row: what a side-by-side capture cannot keep guarding once
// the parent has read it.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ACT_NAMES, createActor, type ActName, type RigState } from './actor'
import { puppetFigureFor } from './ArtFigure'
import { getRig, PUPPET_NAMES, puppetView, type PuppetName } from './characters'
import { GOAL_MEDUSA_ART, HEDGEHOG_ART, MONKEY_FAMILY_ART, PROMISED_ANIMAL_ART, SECTOR_ADVENTURE_ART, type ArtImage } from '../detective/assets'
import Puppet from './Puppet'
import { computeFrame, frameBounds, placementTransform, type Rig } from './rig'

const REGISTRY: readonly (readonly [PuppetName, ArtImage])[] = [
  ['mono', MONKEY_FAMILY_ART[0]],
  ['oveja', SECTOR_ADVENTURE_ART.sheep],
  ['llama', SECTOR_ADVENTURE_ART.llama],
  ['pez', PROMISED_ANIMAL_ART.pez],
  ['medusa', GOAL_MEDUSA_ART],
  ['tortuga', PROMISED_ANIMAL_ART.tortuga],
  ['erizo', HEDGEHOG_ART.profile],
  ['erizo', HEDGEHOG_ART.curled],
  ['erizo', HEDGEHOG_ART.uncurling],
  ['vibora', SECTOR_ADVENTURE_ART.snakeSmall],
  ['vibora', SECTOR_ADVENTURE_ART.snakeMedium],
  ['vibora', SECTOR_ADVENTURE_ART.snakeLarge],
]

function frameOf(rig: Rig, act: ActName | null, state?: RigState, t = 0.37) {
  const actor = createActor(7, undefined, state)
  if (act) actor.acts[act] = 1
  actor.t = t
  return computeFrame(rig, actor, false)
}

describe.each(REGISTRY)('%s in its PNG box', (name, art) => {
  const state = puppetFigureFor(art)?.state

  it('is wired through the seam', () => {
    expect(puppetFigureFor(art)?.name).toBe(name)
  })

  it('fills the box like the picture did: placement measured on it stays true', () => {
    const rig = getRig(name)
    const bounds = frameBounds(rig, computeFrame(rig, createActor(7, undefined, state), true))
    const view = puppetView(name, art.w / art.h, state)
    expect(view.w / view.h).toBeCloseTo(art.w / art.h, 6)
    expect((bounds.maxX - bounds.minX) / view.w).toBeGreaterThan(0.78)
    expect((bounds.maxY - bounds.minY) / view.h).toBeGreaterThan(0.78)
    expect(view.y + view.h).toBeCloseTo(bounds.maxY, 6)
  })
})

describe('the monkey family', () => {
  it('stands in one frame at one scale, so the three poses line up on a level', () => {
    const views = MONKEY_FAMILY_ART.map((art) => puppetView(puppetFigureFor(art)!.name, art.w / art.h, puppetFigureFor(art)!.state))
    expect(views[1]).toEqual(views[0])
    expect(views[2]).toEqual(views[0])
  })

  it('has one rig for its three pictures, and the banana only when sitting', () => {
    const rig = getRig('mono')
    const banana = (pose: number) => frameOf(rig, null, { pose }).parts.get('bananaHeld')!.sx
    expect(banana(1)).toBe(1)
    expect(banana(0)).toBe(0)
    expect(banana(2)).toBe(0)
  })
})

describe('the hedgehog', () => {
  const rig = getRig('erizo')
  it('bristles on a fright even with its quills down', () => {
    expect(frameOf(rig, null, { curl: 0, quills: 0 }).parts.get('coatLayer')!.sx).toBe(0)
    expect(frameOf(rig, 'scare', { curl: 0, quills: 0 }).parts.get('coatLayer')!.sx).toBe(1)
    const calm = frameBounds(rig, frameOf(rig, null, { curl: 0, quills: 1 }))
    const scared = frameBounds(rig, frameOf(rig, 'scare', { curl: 0, quills: 1 }))
    expect(scared.minY).toBeLessThan(calm.minY - 10)
  })

  it('hides its feet when it curls, and shows them to walk', () => {
    expect(frameOf(rig, null, { curl: 1, quills: 0 }).parts.get('footF1')!.sy).toBeLessThan(0.01)
    expect(frameOf(rig, null, { curl: 0, quills: 1 }).parts.get('footF1')!.sy).toBe(1)
  })
})

describe('the snake', () => {
  const rig = getRig('vibora')
  it('is one rig: length only changes how thin and how many waves', () => {
    const a = frameBounds(rig, frameOf(rig, null, { length: 0 }))
    const c = frameBounds(rig, frameOf(rig, null, { length: 2 }))
    expect(Math.abs(a.maxX - a.minX - (c.maxX - c.minX))).toBeLessThan(40)
  })

  it('slithers: the body changes from one moment to the next', () => {
    expect(frameOf(rig, null, { length: 1 }, 0.1).dyn[0]).not.toBe(frameOf(rig, null, { length: 1 }, 0.6).dyn[0])
  })
})

describe.each(PUPPET_NAMES)('the %s acts', (name) => {
  const rig = getRig(name)

  it.each(ACT_NAMES)('%s moves it', (act) => {
    const print = (a: ActName | null): string => {
      const frame = frameOf(rig, a)
      return JSON.stringify([[...frame.parts], frame.dyn])
    }
    const rest = print(null)
    const acting = print(act)
    expect(acting).not.toBe(rest)
  })

  it('stays near its own box while acting, so a neighbour on screen is not hit', () => {
    const still = frameBounds(rig, frameOf(rig, null))
    const size = Math.max(still.maxX - still.minX, still.maxY - still.minY)
    for (const act of ACT_NAMES) {
      const b = frameBounds(rig, frameOf(rig, act))
      expect(b.maxX - still.maxX, `${act} right`).toBeLessThan(size * 0.45)
      expect(still.minX - b.minX, `${act} left`).toBeLessThan(size * 0.45)
      expect(still.minY - b.minY, `${act} top`).toBeLessThan(size * 0.45)
    }
  })

  it('renders with no banned reference', () => {
    expect(renderToString(<Puppet name={name} still />)).not.toMatch(/url\(|<mask|<clipPath|<pattern|<filter|Gradient/)
  })
})

describe('placing a puppet from outside', () => {
  it('flips about the feet, so a flip leaves it on the spot', () => {
    const t = placementTransform({ facing: -1 }, { x: 50, y: 100 })
    expect(t).toBe('translate(50.0 100.0)rotate(0.0)scale(-1 1)translate(-50.0 -100.0)')
  })

  it('moves by an offset in the parent units', () => {
    expect(placementTransform({ x: 30, y: -4 }, { x: 50, y: 100 })).toContain('translate(80.0 96.0)')
  })

  it('renders the first placement in the markup, in both worlds', () => {
    const inSvg = renderToString(
      <svg>
        <Puppet name="oveja" still box={{ x: 0, y: 0, width: 100, height: 100 }} placement={{ x: 10, facing: -1 }} />
      </svg>,
    )
    expect(inSvg).toContain('scale(-1 1)')
    const alone = renderToString(<Puppet name="oveja" still placement={{ x: 12, facing: -1 }} />)
    expect(alone).toContain('scaleX(-1)')
    expect(alone).toContain('translate(12.0px,0.0px)')
  })
})
