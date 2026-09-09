// migratePhase1 — level-engine spec "Level Progress Copy-Forward Migration".
// Node-only, no DOM. The `isUnlocked` regression tests below mock
// `../levels/catalog` to a synthetic four-trail catalog (the shape S6/Phase
// 10-11 will eventually ship) so this slice can prove D3 (no-demotion)
// end-to-end WITHOUT depending on `catalog.ts`, which is out of this
// slice's scope.
import { describe, expect, it, vi } from 'vitest'
import type { LevelConfig } from '../levels/types'
import { EMPTY_RECORD, DETECTIVE_TRAIL_IDS, APPROVALS_TO_UNLOCK } from './types'
import type { LevelRecord } from './types'
import { migratePhase1, PHASE_1_FORWARD } from './migratePhase1'

function makeRecord(over: Partial<LevelRecord> = {}): LevelRecord {
  return { ...EMPTY_RECORD, ...over }
}

describe('PHASE_1_FORWARD', () => {
  it('carries the four documented removed→trail pairs, in unlock-chain order', () => {
    expect(PHASE_1_FORWARD).toEqual([
      ['f1-travesia', DETECTIVE_TRAIL_IDS[0]],
      ['f1-pelotas', DETECTIVE_TRAIL_IDS[1]],
      ['f1-paseo', DETECTIVE_TRAIL_IDS[2]],
      ['f1-pasillo', DETECTIVE_TRAIL_IDS[3]],
    ])
  })

  it('omits f1-ondas and f1-espiral — no successor trail to seed', () => {
    const oldIds = PHASE_1_FORWARD.map(([oldId]) => oldId)
    expect(oldIds).not.toContain('f1-ondas')
    expect(oldIds).not.toContain('f1-espiral')
  })
})

describe('migratePhase1 — task 9.4: mid-phase-1 payload loads with no loss', () => {
  it('migrates f1-paseo into trail3 with matching values, source untouched', () => {
    const before: Record<string, LevelRecord> = {
      'f1-paseo': makeRecord({ approvals: 2, attempts: 5, bestAccuracy: 80, bestFluency: 75 }),
    }

    const changed = migratePhase1(before)

    expect(changed.trail3).toEqual(
      makeRecord({ approvals: 2, attempts: 5, bestAccuracy: 80, bestFluency: 75 }),
    )
    // The source record is a snapshot, not the live object: proving the
    // function never mutated it, not just that a stale reference looks OK.
    expect(before['f1-paseo']).toEqual(
      makeRecord({ approvals: 2, attempts: 5, bestAccuracy: 80, bestFluency: 75 }),
    )
    // Only the one changed pair is reported — migratePhase1 never invents
    // entries for pairs whose source has no record.
    expect(Object.keys(changed)).toEqual(['trail3'])
  })

  it("the hand-built mid-phase-1 payload from this slice's own brief: f1-travesia approved twice, f1-pelotas approved once, the rest untouched", () => {
    const before: Record<string, LevelRecord> = {
      'f1-travesia': makeRecord({
        bestAccuracy: 92,
        bestFluency: 88,
        attempts: 4,
        approvals: 2,
        streakPass: 2,
        widthFactor: 0.85, // narrowed once by three clean nominal passes
      }),
      'f1-pelotas': makeRecord({
        bestAccuracy: 70,
        bestFluency: 60,
        attempts: 3,
        approvals: 1,
        streakPass: 0,
        streakFail: 1,
      }),
    }
    const beforeSnapshot = structuredClone(before)

    const changed = migratePhase1(before)

    // No loss: every field the child actually earned survives the trip.
    expect(changed.trail1?.bestAccuracy).toBe(92)
    expect(changed.trail1?.bestFluency).toBe(88)
    expect(changed.trail1?.attempts).toBe(4)
    expect(changed.trail1?.approvals).toBe(2)
    // widthFactor is field-wise MAX against EMPTY_RECORD's nominal 1: a
    // record narrowed to 0.85 eases back to nominal on the brand new trail,
    // "wider is more forgiving, so max never punishes" (design.md).
    expect(changed.trail1?.widthFactor).toBe(1)

    expect(changed.trail2?.approvals).toBe(1)
    expect(changed.trail2?.attempts).toBe(3)

    // No demotion: neither migrated approval count is LOWER than the source.
    expect(changed.trail1!.approvals).toBeGreaterThanOrEqual(before['f1-travesia'].approvals)
    expect(changed.trail2!.approvals).toBeGreaterThanOrEqual(before['f1-pelotas'].approvals)

    // The rest (f1-paseo, f1-pasillo, f1-ondas, f1-espiral) were never
    // recorded in this payload and stay untouched — no invented entries.
    expect(changed.trail3).toBeUndefined()
    expect(changed.trail4).toBeUndefined()

    // Source records are byte-for-byte unchanged — the rollback plan
    // (proposal.md) depends on this staying true.
    expect(before).toEqual(beforeSnapshot)
  })
})

describe('migratePhase1 — task 9.5: no locked dead end for a mid-campaign child', () => {
  it('a migrated predecessor unlocks the trail that replaced the next unplayed level', async () => {
    // A synthetic four-trail catalog matching the shape S6 will ship
    // (f1-libre kept at index 0, unchanged; design.md "Migration / Rollout").
    // Only `id` matters to `isUnlocked` (`LEVELS.findIndex`), so every other
    // field is a minimal but fully-typed fixture.
    const fakeCatalog: LevelConfig[] = ['f1-libre', ...DETECTIVE_TRAIL_IDS].map((id) => ({
      id,
      phase: 1,
      title: id,
      kind: 'path',
      surface: 'blank',
      maze: false,
      resetOnContact: false,
      carrier: false,
      feedback: { tone: false, haptics: false, metronomeBpm: 0, rail: false },
      hint: '',
      paths: ['M100,300 L500,300 L900,300'],
      corridorWidth: 100,
      rules: { mustBeContinuous: false, enforceOrder: false, minFluency: 0, minAccuracy: 0 },
      showGuide: true,
      letters: [],
    }))

    vi.resetModules()
    vi.doMock('../levels/catalog', () => ({ LEVELS: fakeCatalog }))
    const { LevelProgressStore } = await import('./LevelProgressStore')

    // A payload where f1-pelotas (→ trail2) was approved twice under the OLD
    // catalog — enough, under the shipped APPROVALS_TO_UNLOCK rule, to have
    // unlocked whatever came after it.
    const seed: Record<string, LevelRecord> = {
      'f1-pelotas': makeRecord({ approvals: APPROVALS_TO_UNLOCK, attempts: 6 }),
    }
    const memory = new Map<string, string>([['cursiva.levels.v1', JSON.stringify(seed)]])
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
    }

    const store = new LevelProgressStore(storage)

    // BEFORE migration: trail2's record does not exist yet, so trail3 —
    // its successor in the new catalog — is locked despite the child's real
    // progress. A test that could not fail this way would prove nothing.
    expect(store.isUnlocked('trail3')).toBe(false)

    const changed = migratePhase1(store.all())
    for (const [id, record] of Object.entries(changed)) store.save(id, record)

    // AFTER migration: trail2 now carries the migrated approvals, so trail3
    // is reachable — the no-locked-dead-end guarantee D3 requires.
    expect(store.isUnlocked('trail3')).toBe(true)

    vi.doUnmock('../levels/catalog')
    vi.resetModules()
  })
})

describe('migratePhase1 — task 9.6: migration does not repeat or destroy the source record', () => {
  it('a second run over the already-migrated store performs no write and leaves the source alone', () => {
    const before: Record<string, LevelRecord> = {
      'f1-travesia': makeRecord({ approvals: 2, attempts: 4, bestAccuracy: 90 }),
    }
    const beforeSnapshot = structuredClone(before)

    const firstRun = migratePhase1(before)
    expect(firstRun.trail1).toBeDefined()

    // Simulate the store write: merge the changed entries in, exactly as
    // GameScreen's store initialiser does via `store.save`.
    const afterFirstRun: Record<string, LevelRecord> = { ...before, ...firstRun }

    const secondRun = migratePhase1(afterFirstRun)

    // No second write: the pair is already migrated (trail1 has a record),
    // so nothing further is reported changed.
    expect(secondRun).toEqual({})
    // Running twice cannot have double-counted attempts, because there was
    // no second write to double them with.
    expect(afterFirstRun.trail1?.attempts).toBe(4)
    // The source id's own record is untouched across both runs.
    expect(afterFirstRun['f1-travesia']).toEqual(beforeSnapshot['f1-travesia'])
  })

  it('a destination that already carries a genuinely-played record is never overwritten by a stronger or weaker source', () => {
    const destinationAlreadyPlayed = makeRecord({ approvals: 2, attempts: 10, bestAccuracy: 99 })
    const before: Record<string, LevelRecord> = {
      'f1-travesia': makeRecord({ approvals: 2, attempts: 4, bestAccuracy: 50 }),
      trail1: destinationAlreadyPlayed,
    }

    const changed = migratePhase1(before)

    expect(changed.trail1).toBeUndefined()
  })
})

describe('migratePhase1 — task 9.7: unrelated ids remain untouched', () => {
  it('an id with no defined replacement is left exactly as stored', () => {
    const before: Record<string, LevelRecord> = {
      'f1-ondas': makeRecord({ approvals: 2, attempts: 7, bestAccuracy: 65 }),
    }
    const beforeSnapshot = structuredClone(before)

    const changed = migratePhase1(before)

    expect(changed['f1-ondas']).toBeUndefined()
    expect(Object.keys(changed)).toHaveLength(0)
    expect(before).toEqual(beforeSnapshot)
  })

  it('mixes a migratable id with an unrelated one — only the migratable one changes', () => {
    const before: Record<string, LevelRecord> = {
      'f1-pasillo': makeRecord({ approvals: 2, attempts: 8 }),
      'f1-espiral': makeRecord({ approvals: 1, attempts: 2 }),
    }

    const changed = migratePhase1(before)

    expect(Object.keys(changed)).toEqual(['trail4'])
    expect(changed['f1-espiral']).toBeUndefined()
  })
})

describe('migratePhase1 — never throws', () => {
  it('an empty payload yields no changes', () => {
    expect(migratePhase1({})).toEqual({})
  })

  it('a payload with only unrelated data produces no changes and does not throw', () => {
    expect(() => migratePhase1({ 'some-unrelated-level': makeRecord() })).not.toThrow()
  })
})
