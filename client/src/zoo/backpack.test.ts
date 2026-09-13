// Backpack registry tests (zoo-map spec: "Backpack Registry"). Node
// environment, no DOM — pure over plain data.
import { describe, expect, it } from 'vitest'
import { ANDEAN_HAT_ART, CARRIER_LENS_ART, SECTOR_ADVENTURE_ART } from '../detective/assets'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import type { Records } from './sectors'
import { BACKPACK_ITEMS, earnedItems } from './backpack'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

describe('BACKPACK_ITEMS', () => {
  it('holds exactly three entries: the Andean hat, the lupa and the linterna (zoo-map spec "Backpack Registry")', () => {
    expect(BACKPACK_ITEMS).toHaveLength(3)
    expect(BACKPACK_ITEMS).toEqual([
      { id: 'andean-hat', art: ANDEAN_HAT_ART, grantedBy: 'montanas', earnedWhen: ['llama-peak4'] },
      { id: 'lupa', art: CARRIER_LENS_ART, grantedBy: 'entrada', earnedWhen: ['sand4'] },
      { id: 'linterna', art: SECTOR_ADVENTURE_ART.flashlight, grantedBy: 'nocturna', earnedWhen: ['night4'] },
    ])
  })
})

describe('earnedItems', () => {
  it('returns [] while none of llama-peak4/sand4/night4 is filed', () => {
    expect(earnedItems({})).toEqual([])
    expect(earnedItems(filed('sheep-hill4', 'glass4'))).toEqual([])
  })

  it('includes the Andean hat once llama-peak4 is filed, and no other item', () => {
    const items = earnedItems(filed('llama-peak4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('andean-hat')
  })

  it('includes the lupa once sand4 is filed, and neither of the other two', () => {
    const items = earnedItems(filed('sand4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('lupa')
  })

  it('includes the linterna once night4 is filed, and neither of the other two', () => {
    const items = earnedItems(filed('night4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('linterna')
  })

  it('includes all three once every earnedWhen id is filed', () => {
    const items = earnedItems(filed('llama-peak4', 'sand4', 'night4'))
    expect(items.map((i) => i.id).sort()).toEqual(['andean-hat', 'linterna', 'lupa'])
  })
})
