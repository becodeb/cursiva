// The map's life, the album's partner on the same screen, and the wardrobe. The motion
// itself is `zoo/mapLife.test.ts`; `MapLife` here is driven by hand, with no ticker.
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ZOO_ANIMAL_ART } from '../detective/assets'
import { auditCaptions } from '../detective/captionAudit'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import type { PuppetHandle } from '../puppet/Puppet'
import { ADVENTURES } from '../zoo/adventures'
import { WEARABLES } from '../zoo/backpack'
import { PULPITO_COLOURS } from '../zoo/pulpitoLook'
import type { Records } from '../zoo/sectors'
import { KeepsakeLine, MapLife, type LivingAnimal } from './LivingAnimals'
import PulpitoWardrobe from './PulpitoWardrobe'
import ZooMap from './ZooMap'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, attempts: 1, approvals: 1 }
  return out
}

const allLevels = ADVENTURES.flatMap((a) => a.levelIds)
const DUCK: LivingAnimal = { id: 'pato', art: ZOO_ANIMAL_ART.pato, box: { x: 100, y: 100, width: 80, height: 80 } }

describe('the map, in its rendered markup', () => {
  it('gives every rescued animal its own tap, and none to one not found yet', () => {
    const none = renderToString(<ZooMap records={{}} onEnter={() => {}} debug={false} />)
    expect(none).not.toContain('data-map-animal=')
    const all = renderToString(<ZooMap records={filed(...allLevels)} onEnter={() => {}} debug={false} />)
    expect((all.match(/data-map-animal="/g) ?? []).length).toBe(10)
  })

  it('has a pictured way to dress him, with no word on it', () => {
    const html = renderToString(<ZooMap records={{}} onEnter={() => {}} debug={false} />)
    expect(html).toContain('aria-label="Vestir al Pulpito"')
    expect(auditCaptions(html).uncaptioned).toEqual([])
  })

  it('makes the green button itself tappable, wherever it had to go', () => {
    const html = renderToString(<ZooMap records={{}} onEnter={() => {}} debug={false} />)
    expect((html.match(/data-play-target="true"/g) ?? []).length).toBe(1)
  })
})

describe('the keepsake on the map', () => {
  it('draws the child\'s line as a smooth ribbon, and nothing with no line', () => {
    const line = { levelId: 'duck-trail4', w: 1, h: 0.3, strokes: [[[0, 0], [0.5, 0.3], [1, 0.1]]] } as const
    const html = renderToString(<svg><KeepsakeLine animal={{ ...DUCK, line }} /></svg>)
    expect(html).toContain('data-map-keepsake="pato"')
    expect(html).toMatch(/d="M[^"]*C/)
    expect(renderToString(<svg><KeepsakeLine animal={DUCK} /></svg>)).not.toContain('data-map-keepsake')
  })
})

describe('MapLife', () => {
  const handle = (): PuppetHandle => ({ act: vi.fn(), hold: vi.fn(), lookAt: vi.fn(), place: vi.fn(), setState: vi.fn() })

  it('under reduced motion subscribes to nothing, and a tap still reacts', () => {
    const life = new MapLife([DUCK], () => true)
    const puppet = handle()
    life.connect('pato', { handle: puppet })
    // The ticker asks `window` for a frame the moment anyone subscribes: not here.
    expect(() => life.start()).not.toThrow()
    life.tap('pato')
    expect(puppet.act).toHaveBeenCalledWith('cheer', 1.4)
    expect(puppet.place).not.toHaveBeenCalled()
  })
})

describe('the wardrobe', () => {
  it('offers every colour and every gift, earned or still on its way', () => {
    const html = renderToString(<PulpitoWardrobe records={filed('duck-trail4')} onClose={() => {}} />)
    expect((html.match(/data-cv-colour="/g) ?? []).length).toBe(PULPITO_COLOURS.length)
    expect((html.match(/data-cv-garment="/g) ?? []).length).toBe(WEARABLES.length)
  })

  it('has nothing to buy: no price, no number, no word on the page', () => {
    const html = renderToString(<PulpitoWardrobe records={{}} onClose={() => {}} />)
    const body = html.slice(html.indexOf('</style>'))
    expect(auditCaptions(html).uncaptioned).toEqual([])
    expect(body.replace(/<[^>]*>/g, '').trim()).toBe('')
  })

  it('never draws a gift as earned before its animal is home', () => {
    const before = renderToString(<PulpitoWardrobe records={{}} onClose={() => {}} />)
    expect(before).not.toContain('data-cv-garment-earned="true"')
    const after = renderToString(<PulpitoWardrobe records={filed(...allLevels)} onClose={() => {}} />)
    expect(after).not.toContain('data-cv-garment-earned="false"')
  })
})
