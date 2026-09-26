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
      { id: 'andean-hat', art: ANDEAN_HAT_ART, grantedBy: 'montanas', earnedWhen: ['sheep-hill4'] },
      {
        id: 'lupa',
        art: CARRIER_LENS_ART,
        grantedBy: 'entrada',
        earnedWhen: ['sand3'],
        earnedWhenLegacy: ['sand4'],
      },
      { id: 'linterna', art: SECTOR_ADVENTURE_ART.flashlight, grantedBy: 'nocturna', earnedWhen: ['llama-peak4'] },
      { id: 'carrito', art: CART_ART, grantedBy: 'arena', earnedWhen: ['snake4'] },
      { id: 'flor', art: SECTOR_ADVENTURE_ART.flower, grantedBy: 'bosque', earnedWhen: ['bee4'] },
    ])
  })
})

describe('earnedItems', () => {
  it('returns [] while none of sheep-hill4/sand4/llama-peak4/snake4/bee4 is filed', () => {
    expect(earnedItems({})).toEqual([])
    expect(earnedItems(filed('duck-trail4', 'glass4'))).toEqual([])
  })

  // [T23, `odd/tasks/prewriting-stage-completion.md`, `docs/19` §5.1] Moved
  // from `llama-peak4` (earned at the end of the adventure that USES the
  // hat) to `sheep-hill4` (earned at the end of the adventure BEFORE it) —
  // "antes de la aventura que la usa", not after.
  it('includes the Andean hat once sheep-hill4 is filed, and no other item — not yet earned by llama-peak4 alone', () => {
    const items = earnedItems(filed('sheep-hill4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('andean-hat')
  })

  it('includes the lupa once sand3 is filed (the sendero\'s own level after T1), and neither of the other four', () => {
    const items = earnedItems(filed('sand3'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('lupa')
  })

  it('also includes the lupa on a legacy sand4-only record, never regressing a returning child who has it filed instead of sand3', () => {
    const items = earnedItems(filed('sand4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('lupa')
  })

  // [T23] Moved from `night4` (the END of the adventure that uses it) to
  // `llama-peak4` — the exact level that unlocks `nocturna`
  // (`zoo/sectors.ts`'s own `unlockedWhen`), so the linterna sits in the
  // backpack before `night1` is ever reachable, not after `night4`.
  it('includes the linterna once llama-peak4 is filed alone (sheep-hill4 not filed), and none of the other three', () => {
    const items = earnedItems(filed('llama-peak4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('linterna')
  })

  it('does not yet include the linterna on night4 alone (it must already be earned by llama-peak4 before night1 is reachable)', () => {
    const items = earnedItems(filed('night4'))
    expect(items.map((i) => i.id)).not.toContain('linterna')
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
    const items = earnedItems(filed('sheep-hill4', 'llama-peak4', 'sand4', 'snake4', 'bee4'))
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

  it("filing hedgehog4 grants no second nocturna item — one object per SECTOR, not per adventure (radial-spines design.md §9 item 4, zoo-map spec)", () => {
    expect(earnedItems(filed('hedgehog4'))).toEqual(earnedItems({}))
    expect(BACKPACK_ITEMS.filter((item) => item.grantedBy === 'nocturna')).toHaveLength(1)
  })
})
