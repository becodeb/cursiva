// Per-level persistence contract (docs/08 section 4). The store NEVER throws:
// a child losing progress is bad, a child facing a blank screen is worse.
import { describe, expect, it } from 'vitest'
import { LEVELS, nextLevelId } from '../levels/catalog'
import { LEVEL_PROGRESS_KEY, LevelProgressStore } from './LevelProgressStore'
import { APPROVALS_TO_UNLOCK, EMPTY_RECORD } from './types'
import type { StorageLike } from './LevelProgressStore'
import type { LevelRecord } from './types'

/** In-memory storage double, with the raw payload readable for assertions. */
function fakeStorage(seed?: string): StorageLike & { raw(): string | null } {
  let value: string | null = seed ?? null
  return {
    getItem: () => value,
    setItem: (_key, v) => {
      value = v
    },
    raw: () => value,
  }
}

function record(over: Partial<LevelRecord> = {}): LevelRecord {
  return { ...EMPTY_RECORD, ...over }
}

const FIRST = LEVELS[0].id
const SECOND = LEVELS[1].id

describe('LevelProgressStore — reads and writes', () => {
  it('returns an empty record for an unknown level', () => {
    expect(new LevelProgressStore(fakeStorage()).get('f1-libre')).toEqual(EMPTY_RECORD)
    expect(new LevelProgressStore(fakeStorage()).get('no-existe')).toEqual(EMPTY_RECORD)
  })

  it('does not hand out the shared EMPTY_RECORD instance', () => {
    const store = new LevelProgressStore(fakeStorage())
    expect(store.get('f1-libre')).not.toBe(EMPTY_RECORD)
  })

  it('round-trips a saved record', () => {
    const store = new LevelProgressStore(fakeStorage())
    const saved = record({ bestAccuracy: 88, attempts: 4, approvals: 2, widthFactor: 0.85 })
    store.save('f1-travesia', saved)
    expect(store.get('f1-travesia')).toEqual(saved)
  })

  it('keeps levels isolated', () => {
    const store = new LevelProgressStore(fakeStorage())
    store.save('f1-libre', record({ approvals: 3 }))
    expect(store.get('f1-travesia')).toEqual(EMPTY_RECORD)
  })

  it('persists under the versioned key and reloads', () => {
    const storage = fakeStorage()
    const store = new LevelProgressStore(storage)
    store.save('f2-bucles', record({ bestFluency: 61 }))
    expect(LEVEL_PROGRESS_KEY).toBe('cursiva.levels.v1')
    expect(JSON.parse(storage.raw() ?? '{}')['f2-bucles'].bestFluency).toBe(61)
    expect(new LevelProgressStore(storage).get('f2-bucles').bestFluency).toBe(61)
  })

  it('returns every stored record from all(), as copies', () => {
    const store = new LevelProgressStore(fakeStorage())
    store.save('f1-libre', record({ approvals: 1 }))
    store.save('f1-travesia', record({ approvals: 2 }))
    const all = store.all()
    expect(Object.keys(all).sort()).toEqual(['f1-libre', 'f1-travesia'])
    all['f1-libre'].approvals = 99
    expect(store.get('f1-libre').approvals).toBe(1) // the copy was mutated, not us
  })

  it('does not keep a live reference to the saved record', () => {
    const store = new LevelProgressStore(fakeStorage())
    const mutable = record({ approvals: 1 })
    store.save('f1-libre', mutable)
    mutable.approvals = 99
    expect(store.get('f1-libre').approvals).toBe(1)
  })
})

describe('LevelProgressStore — defensiveness', () => {
  it('reads a corrupt payload as empty', () => {
    for (const payload of ['not json', '[]', 'null', '"a string"', '{"f1-libre": 42}']) {
      const store = new LevelProgressStore(fakeStorage(payload))
      expect(store.get('f1-libre')).toEqual(EMPTY_RECORD)
      expect(() => store.all()).not.toThrow()
    }
  })

  it('repairs a partially corrupt record instead of dropping the session', () => {
    const store = new LevelProgressStore(
      fakeStorage('{"f1-libre":{"approvals":2,"widthFactor":"oops"}}'),
    )
    expect(store.get('f1-libre').approvals).toBe(2)
    expect(store.get('f1-libre').widthFactor).toBe(1) // sane fallback, not NaN
  })

  it('overwrites a corrupt payload on the next write', () => {
    const storage = fakeStorage('not json')
    const store = new LevelProgressStore(storage)
    store.save('f1-libre', record({ approvals: 1 }))
    expect(JSON.parse(storage.raw() ?? '{}')['f1-libre'].approvals).toBe(1)
  })

  it('works entirely in memory when there is no storage', () => {
    // Uses `FIRST`/`SECOND` (`LEVELS[0]`/`LEVELS[1]`), not a hardcoded
    // `'f1-libre'` — this test's own pre-existing deviation from every other
    // test in this file's convention, exposed once the reveal grid stopped
    // `f1-libre` from being `LEVELS[0]` (design.md §5.1, ratified amendment
    // A1): the literal saved approvals onto the WRONG level's predecessor
    // once `LEVELS[0]` became `glass1`, so `SECOND` never unlocked.
    const store = new LevelProgressStore(null)
    store.save(FIRST, record({ approvals: 2 }))
    expect(store.get(FIRST).approvals).toBe(2)
    expect(store.isUnlocked(SECOND)).toBe(true)
  })

  it('never throws when the storage itself throws', () => {
    const hostile: StorageLike = {
      getItem: () => {
        throw new Error('privacy mode')
      },
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }
    let store!: LevelProgressStore
    expect(() => {
      store = new LevelProgressStore(hostile)
    }).not.toThrow()
    expect(() => store.save('f1-libre', record({ approvals: 1 }))).not.toThrow()
    expect(() => store.reset()).not.toThrow()
    expect(store.get('f1-libre')).toEqual(EMPTY_RECORD) // reset cleared the memory copy
  })

  it('constructs without arguments outside a browser', () => {
    expect(() => new LevelProgressStore()).not.toThrow()
    expect(new LevelProgressStore().get('f1-libre')).toEqual(EMPTY_RECORD)
  })
})

describe('LevelProgressStore — unlocking', () => {
  it('always unlocks the first level of the catalog', () => {
    expect(new LevelProgressStore(fakeStorage()).isUnlocked(FIRST)).toBe(true)
  })

  it('locks the next level until the previous one has two approvals', () => {
    const store = new LevelProgressStore(fakeStorage())
    expect(store.isUnlocked(SECOND)).toBe(false)

    store.save(FIRST, record({ approvals: 1 }))
    expect(store.isUnlocked(SECOND)).toBe(false) // one pass can be luck

    store.save(FIRST, record({ approvals: APPROVALS_TO_UNLOCK }))
    expect(store.isUnlocked(SECOND)).toBe(true)
  })

  it('needs exactly APPROVALS_TO_UNLOCK approvals', () => {
    expect(APPROVALS_TO_UNLOCK).toBe(2)
    const store = new LevelProgressStore(fakeStorage())
    store.save(FIRST, record({ approvals: 5 }))
    expect(store.isUnlocked(SECOND)).toBe(true)
  })

  it('unlocks only the immediate next level, never a further one', () => {
    const store = new LevelProgressStore(fakeStorage())
    store.save(FIRST, record({ approvals: 2 }))
    expect(store.isUnlocked(SECOND)).toBe(true)
    const third = nextLevelId(SECOND)
    expect(third).not.toBeNull()
    expect(store.isUnlocked(third as string)).toBe(false)
  })

  it('walks the whole catalog open as each level is approved twice', () => {
    const store = new LevelProgressStore(fakeStorage())
    for (const level of LEVELS) {
      expect(store.isUnlocked(level.id)).toBe(true)
      store.save(level.id, record({ approvals: 2 }))
    }
  })

  it('does not unlock an unknown level, and does not throw', () => {
    const store = new LevelProgressStore(fakeStorage())
    expect(store.isUnlocked('no-existe')).toBe(false)
  })
})

describe('LevelProgressStore — reset', () => {
  it('wipes every level and the stored payload', () => {
    const storage = fakeStorage()
    const store = new LevelProgressStore(storage)
    store.save(FIRST, record({ approvals: 2 }))
    store.save(SECOND, record({ approvals: 2 }))

    store.reset()

    expect(store.all()).toEqual({})
    expect(store.get(FIRST)).toEqual(EMPTY_RECORD)
    expect(store.isUnlocked(SECOND)).toBe(false)
    expect(JSON.parse(storage.raw() ?? 'null')).toEqual({})
  })
})
