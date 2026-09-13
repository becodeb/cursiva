// Backpack registry tests (zoo-map spec: "Backpack Registry"). Node
// environment, no DOM — pure over plain data.
import { describe, expect, it } from 'vitest'
import { ANDEAN_HAT_ART } from '../detective/assets'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import type { Records } from './sectors'
import { BACKPACK_ITEMS, earnedItems } from './backpack'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

describe('BACKPACK_ITEMS', () => {
  it('holds exactly one entry: the Andean hat, granted by montanas once llama-peak4 is filed', () => {
    expect(BACKPACK_ITEMS).toHaveLength(1)
    expect(BACKPACK_ITEMS[0]).toEqual({
      id: 'andean-hat',
      art: ANDEAN_HAT_ART,
      grantedBy: 'montanas',
      earnedWhen: ['llama-peak4'],
    })
  })
})

describe('earnedItems', () => {
  it('returns [] while llama-peak4 is unfiled', () => {
    expect(earnedItems({})).toEqual([])
    expect(earnedItems(filed('sheep-hill4'))).toEqual([])
  })

  it('includes the Andean hat once llama-peak4 is filed', () => {
    const items = earnedItems(filed('llama-peak4'))
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('andean-hat')
  })
})
