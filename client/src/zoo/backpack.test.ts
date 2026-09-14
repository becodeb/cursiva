// Backpack registry tests (zoo-map spec: "Backpack Registry"). Node
// environment, no DOM — pure over plain data.
import { describe, expect, it } from 'vitest'
import { ANDEAN_HAT_ART, CARRIER_LENS_ART, CART_ART, SECTOR_ADVENTURE_ART } from '../detective/assets'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import type { Records } from './sectors'
import { BACKPACK_ITEMS, earnedItems } from './backpack'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

describe('BACKPACK_ITEMS', () => {
  it('holds exactly five entries: the Andean hat, the lupa, the linterna, the carrito and the flor (zoo-map spec "Backpack Registry"; free-trail-waypoints design.md §9)', () => {
    expect(BACKPACK_ITEMS).toHaveLength(5)
    expect(BACKPACK_ITEMS).toEqual([
      { id: 'andean-hat', art: ANDEAN_HAT_ART, grantedBy: 'montanas', earnedWhen: ['llama-peak4'] },
      { id: 'lupa', art: CARRIER_LENS_ART, grantedBy: 'entrada', earnedWhen: ['sand4'] },
      { id: 'linterna', art: SECTOR_ADVENTURE_ART.flashlight, grantedBy: 'nocturna', earnedWhen: ['night4'] },
      { id: 'carrito', art: CART_ART, grantedBy: 'arena', earnedWhen: ['snake4'] },
      { id: 'flor', art: SECTOR_ADVENTURE_ART.flower, grantedBy: 'bosque', earnedWhen: ['bee4'] },
    ])
  })
})

describe('earnedItems', () => {
  it('returns [] while none of llama-peak4/sand4/night4/snake4/bee4 is filed', () => {
    expect(earnedItems({})).toEqual([])
    expect(earnedItems(filed('sheep-hill4', 'glass4'))).toEqual([])
  })

  it('includes the Andean hat once llama-peak4 is filed, and no other item', () => {
    const items = earnedItems(filed('llama-peak4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('andean-hat')
  })

  it('includes the lupa once sand4 is filed, and neither of the other three', () => {
    const items = earnedItems(filed('sand4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('lupa')
  })

  it('includes the linterna once night4 is filed, and neither of the other three', () => {
    const items = earnedItems(filed('night4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('linterna')
  })

  it('includes the carrito once snake4 is filed, and none of the other four (snake-drag-and-art-corridor)', () => {
    const items = earnedItems(filed('snake4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('carrito')
  })

  it('includes the flor once bee4 is filed, and none of the other four (free-trail-waypoints)', () => {
    const items = earnedItems(filed('bee4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('flor')
  })

  it('includes all five once every earnedWhen id is filed', () => {
    const items = earnedItems(filed('llama-peak4', 'sand4', 'night4', 'snake4', 'bee4'))
    expect(items.map((i) => i.id).sort()).toEqual(['andean-hat', 'carrito', 'flor', 'linterna', 'lupa'])
  })

  it("never returns an entry with grantedBy === 'estanque' — the pond grants no backpack item (zoo-map spec, this change)", () => {
    // Explicit author decision, recorded rather than invented: the duck row
    // shipped without one, and this change grants none either.
    expect(earnedItems(filed('duck-trail4'))).not.toContainEqual(
      expect.objectContaining({ grantedBy: 'estanque' }),
    )
    expect(
      earnedItems(filed('duck-trail4', 'dolphin1', 'dolphin2', 'dolphin3', 'dolphin4')),
    ).not.toContainEqual(expect.objectContaining({ grantedBy: 'estanque' }))
    expect(BACKPACK_ITEMS.some((item) => item.grantedBy === 'estanque')).toBe(false)
  })
})
