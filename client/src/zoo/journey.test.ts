// JOURNEY / nextJourneyStep tests (adventure-flow-and-map-guidance T4).
// Node environment, no DOM — every function under test is pure over plain
// data, the same convention `sectors.test.ts`/`adventures.test.ts` use.
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import { ADVENTURES, adventureFor } from './adventures'
import { JOURNEY, nextJourneyStep } from './journey'
import { SECTORS, type Records } from './sectors'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, attempts: 1, approvals: 1 }
  return out
}

/** Test-local mirror of `journey.ts`'s own (unexported) `stepLevelIds`,
 *  written independently rather than imported — importing it would make the
 *  walking test below tautological against the very function it exercises. */
function idsFor(entryLevel: string): readonly string[] {
  const adventure = adventureFor(entryLevel)
  if (adventure) return adventure.levelIds
  if (entryLevel === 'f2-guirnalda') return ['f2-guirnalda', 'f2-agua2', 'f2-agua3', 'f2-agua4']
  throw new Error(`test fixture missing ids for ${entryLevel}`)
}

describe('JOURNEY (guard: every ADVENTURES row start and every no-row block start appears exactly once)', () => {
  it('matches exactly the set independently derived from ADVENTURES and SECTORS', () => {
    const expected = new Set<string>()
    for (const adventure of ADVENTURES) expected.add(adventure.levelIds[0])
    for (const sector of SECTORS) {
      // A "no-row block start" is the first id, in a sector's own
      // `adventureIds`, of a maximal run of ids no `ADVENTURES` row claims —
      // today only the estanque's `f2-guirnalda`.
      let previousClaimed = true
      for (const id of sector.adventureIds) {
        const claimed = adventureFor(id) !== undefined
        if (!claimed && previousClaimed) expected.add(id)
        previousClaimed = claimed
      }
    }
    expect(new Set(JOURNEY)).toEqual(expected)
  })

  it('carries no duplicate stop', () => {
    expect(JOURNEY.length).toBe(new Set(JOURNEY).size)
  })

  it("every stop's sector, read off zoo/sectors.ts's own adventureIds, agrees with the ADVENTURES row that claims it (when one does)", () => {
    for (const entryLevel of JOURNEY) {
      const sector = SECTORS.find((s) => s.adventureIds.includes(entryLevel))
      expect(sector, entryLevel).toBeDefined()
      const claimedSector = adventureFor(entryLevel)?.sector
      if (claimedSector) expect(sector!.id, entryLevel).toBe(claimedSector)
    }
  })

  it('is exactly the 13 documented stops, in narrative order', () => {
    expect(JOURNEY).toEqual([
      'glass1',
      'sand1',
      'glass3',
      'sand3',
      'duck-trail1',
      'sheep-hill1',
      'llama-peak1',
      'night1',
      'hedgehog1',
      'snake1',
      'bee1',
      'f2-guirnalda',
      'dolphin1',
    ])
  })
})

describe('nextJourneyStep', () => {
  it('walks the whole JOURNEY, in order, as each stop is filed in turn — ending at null', () => {
    let records: Records = {}
    for (const entryLevel of JOURNEY) {
      const step = nextJourneyStep(records)
      expect(step?.entryLevel, entryLevel).toBe(entryLevel)
      records = { ...records, ...filed(...idsFor(entryLevel)) }
    }
    expect(nextJourneyStep(records)).toBeNull()
  })

  it('a fresh install points at the entrance (glass1)', () => {
    const step = nextJourneyStep({})
    expect(step?.entryLevel).toBe('glass1')
    expect(step?.sector.id).toBe('entrada')
  })

  // The documented defect (`odd/tasks/adventure-flow-and-map-guidance.md`,
  // "2026-09-23"): `recentlyDiscovered`'s own fallback (first open sector
  // with unfinished work, in REGISTRY order) re-elects the estanque here,
  // because its medusa/dolphin blocks are still unfiled — even though the
  // story has already moved on to the mountains. `nextJourneyStep` must
  // not repeat that: the llama, not the pond.
  it('after the sheep is done, the step is the llama in montañas — never back to the estanque', () => {
    const entrada = SECTORS.find((s) => s.id === 'entrada')!
    const records: Records = filed(
      ...entrada.adventureIds,
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
      'sheep-hill1',
      'sheep-hill2',
      'sheep-hill3',
      'sheep-hill4',
    )
    const step = nextJourneyStep(records)
    expect(step?.entryLevel).toBe('llama-peak1')
    expect(step?.sector.id).toBe('montanas')
  })

  it('returns null once every sector the ladder reaches is fully filed', () => {
    const entrada = SECTORS.find((s) => s.id === 'entrada')!
    const estanque = SECTORS.find((s) => s.id === 'estanque')!
    const montanas = SECTORS.find((s) => s.id === 'montanas')!
    const nocturna = SECTORS.find((s) => s.id === 'nocturna')!
    const arena = SECTORS.find((s) => s.id === 'arena')!
    const bosque = SECTORS.find((s) => s.id === 'bosque')!
    const records = filed(
      ...entrada.adventureIds,
      ...estanque.adventureIds,
      ...montanas.adventureIds,
      ...nocturna.adventureIds,
      ...arena.adventureIds,
      ...bosque.adventureIds,
    )
    expect(nextJourneyStep(records)).toBeNull()
  })
})
