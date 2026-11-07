import { describe, expect, it } from 'vitest'
import { PULPO_PALETTE } from '../puppet/characters/pulpo'
import { earnedWearables, WEARABLES } from './backpack'
import { NOTEBOOK_ANIMAL_IDS } from './notebook'
import { SECTORS, type Records } from './sectors'
import {
  DEFAULT_LOOK,
  loadLook,
  lookAccessories,
  lookColours,
  parseLook,
  pendingGifts,
  PULPITO_COLOURS,
  PULPITO_LOOK_KEY,
  receiveGifts,
  saveLook,
  toggleWorn,
} from './pulpitoLook'
import type { StorageLike } from './tracedLine'

function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const memory = (initial?: string): StorageLike & { data: Record<string, string> } => {
  const data: Record<string, string> = initial === undefined ? {} : { [PULPITO_LOOK_KEY]: initial }
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }
}

const recordsFiling = (ids: readonly string[]): Records =>
  Object.fromEntries(ids.map((id) => [id, { bestAccuracy: 90, bestFluency: 90, attempts: 1, approvals: 1, streakFail: 0, streakPass: 1, widthFactor: 1, durationsMs: [] }])) as unknown as Records

const appearsWhen = (animal: string): readonly string[] =>
  SECTORS.flatMap((s) => s.animals).find((a) => a.id === animal)!.appearsWhen

describe('his colours', () => {
  it('never lose his face: eyes, mouth and apron stay readable on every body', () => {
    for (const { id, colours } of PULPITO_COLOURS) {
      expect(contrast(colours.body, '#ffffff'), `${id} eye`).toBeGreaterThanOrEqual(2.5)
      expect(contrast(colours.body, PULPO_PALETTE.ink), `${id} mouth`).toBeGreaterThanOrEqual(3)
      expect(contrast(colours.body, PULPO_PALETTE.cream), `${id} apron`).toBeGreaterThanOrEqual(2)
      expect(contrast(colours.body, colours.shade), `${id} back arms`).toBeGreaterThan(1.2)
    }
  })

  it('starts as the orange everyone knows, with no override at all', () => {
    expect(lookColours(DEFAULT_LOOK)).toBeUndefined()
    expect(PULPITO_COLOURS[0].colours.body).toBe(PULPO_PALETTE.body)
  })
})

describe('reading what is stored', () => {
  it.each([
    ['not JSON', '{oops'],
    ['a number', '12'],
    ['an array', '[1,2]'],
    ['null', 'null'],
  ])('a corrupt value (%s) is the default Pulpito', (_, raw) => {
    expect(loadLook(memory(raw))).toEqual(DEFAULT_LOOK)
  })

  it('drops what it does not know and keeps what it does', () => {
    const look = parseLook({ colour: 'plaid', worn: ['hat', 'jetpack', 3, 'hat'], given: 'all' })
    expect(look).toEqual({ colour: 'naranja', worn: ['hat'], given: [] })
  })

  it('never wears two things on one slot, however it was stored', () => {
    expect(parseLook({ colour: 'azul', worn: ['hat', 'crown', 'bow'], given: [] }).worn).toEqual(['crown', 'bow'])
  })

  it('survives a storage that throws', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('full')
      },
    }
    expect(loadLook(broken)).toEqual(DEFAULT_LOOK)
    expect(() => saveLook(DEFAULT_LOOK, broken)).not.toThrow()
  })

  it('reads back what it saved', () => {
    const storage = memory()
    const look = { colour: 'violeta', worn: ['bow'], given: ['bow'] } as const
    saveLook(look, storage)
    expect(loadLook(storage)).toEqual(look)
  })
})

describe('gifts', () => {
  it('gives exactly one for each rescued animal, and every animal gives one', () => {
    expect(new Set(WEARABLES.map((w) => w.rescuedBy))).toEqual(new Set(NOTEBOOK_ANIMAL_IDS))
    expect(WEARABLES).toHaveLength(NOTEBOOK_ANIMAL_IDS.length)
  })

  it('is earned by the level records alone', () => {
    expect(earnedWearables(recordsFiling([]))).toEqual([])
    expect(earnedWearables(recordsFiling(appearsWhen('pato'))).map((w) => w.id)).toEqual(['backpack'])
  })

  it('one new gift goes straight on, and only arrives once', () => {
    const records = recordsFiling(appearsWhen('pato'))
    const gifts = pendingGifts(DEFAULT_LOOK, records)
    expect(gifts.map((g) => g.id)).toEqual(['backpack'])
    const after = receiveGifts(DEFAULT_LOOK, gifts)
    expect(after.worn).toEqual(['backpack'])
    expect(pendingGifts(after, records)).toEqual([])
  })

  it('a profile older than this feature receives them all without being dressed for it', () => {
    const records = recordsFiling([...appearsWhen('pato'), ...appearsWhen('oveja')])
    const after = receiveGifts(DEFAULT_LOOK, pendingGifts(DEFAULT_LOOK, records))
    expect(after.worn).toEqual([])
    expect(after.given).toHaveLength(2)
  })
})

describe('wearing', () => {
  it('something on his head takes the cap off, something else leaves it on', () => {
    expect(lookAccessories({ ...DEFAULT_LOOK, worn: ['bow'] })).toEqual({ bow: true })
    expect(lookAccessories({ ...DEFAULT_LOOK, worn: ['crown'] })).toEqual({ crown: true, cap: false })
  })

  it('a second tap takes it off, a new one on the same slot replaces it', () => {
    const on = toggleWorn(DEFAULT_LOOK, 'hat')
    expect(on.worn).toEqual(['hat'])
    expect(toggleWorn(on, 'hat').worn).toEqual([])
    expect(toggleWorn(on, 'crown').worn).toEqual(['crown'])
  })
})
