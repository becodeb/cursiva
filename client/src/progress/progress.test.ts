// T6.1 scenario tests (progress-store spec): round trip, clamping, per-letter
// isolation, reload survival, unavailable-storage fallback, corrupt-payload
// recovery, and the design-fixed monotonic best-of `max(stored, score)`.
import { describe, expect, it } from 'vitest'
import { LocalProgressStore, PROGRESS_STORAGE_KEY, type StorageLike } from './LocalProgressStore'

/** Fake localStorage — share one instance across stores to simulate reloads. */
class FakeStorage implements StorageLike {
  private readonly data = new Map<string, string>()
  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
  seed(key: string, value: string): void {
    this.data.set(key, value)
  }
}

/** Storage that throws on every access — privacy-mode simulation. */
class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('storage blocked')
  }
  setItem(): void {
    throw new Error('storage blocked')
  }
}

describe('LocalProgressStore (T6.1)', () => {
  it('round-trips a stored value through a fresh instance', () => {
    const ls = new FakeStorage()
    ls.seed(PROGRESS_STORAGE_KEY, JSON.stringify({ a: 85 }))
    expect(new LocalProgressStore(ls).getProgress('a')).toBe(85)
  })

  it('clamps values to the 0–100 range', () => {
    const store = new LocalProgressStore(new FakeStorage())
    store.setProgress('c', 140)
    store.setProgress('a', -5)
    expect(store.getProgress('c')).toBe(100)
    expect(store.getProgress('a')).toBe(0)
  })

  it('isolates letters: updating one never touches another', () => {
    const ls = new FakeStorage()
    ls.seed(PROGRESS_STORAGE_KEY, JSON.stringify({ a: 85, c: 40 }))
    const store = new LocalProgressStore(ls)
    store.setProgress('c', 60)
    expect(store.getProgress('a')).toBe(85)
    expect(store.getProgress('c')).toBe(60)
  })

  it('survives reload: a fresh instance reads the persisted value', () => {
    const ls = new FakeStorage()
    new LocalProgressStore(ls).setProgress('a', 90)
    expect(new LocalProgressStore(ls).getProgress('a')).toBe(90)
  })

  it('never throws when storage is unavailable and falls back to memory', () => {
    const store = new LocalProgressStore(new ThrowingStorage())
    expect(() => store.setProgress('a', 75)).not.toThrow()
    expect(store.getProgress('a')).toBe(75) // in-memory fallback
    expect(new LocalProgressStore(new ThrowingStorage()).getProgress('a')).toBe(0)
  })

  it('treats a corrupt payload as empty and overwrites it on the next write', () => {
    const ls = new FakeStorage()
    ls.seed(PROGRESS_STORAGE_KEY, 'not-json{{{')
    const store = new LocalProgressStore(ls)
    expect(store.getProgress('a')).toBe(0)
    expect(store.getProgress('c')).toBe(0)
    store.setProgress('a', 50)
    expect(JSON.parse(ls.getItem(PROGRESS_STORAGE_KEY) ?? '')).toEqual({ a: 50 }) // overwritten
  })

  it('is monotonic best-of: a lower score never overwrites a higher one', () => {
    const store = new LocalProgressStore(new FakeStorage())
    store.setProgress('a', 70)
    store.setProgress('a', 40) // worse attempt
    expect(store.getProgress('a')).toBe(70)
  })

  it('rounds to whole percentages so perfect traces persist as exactly 100', () => {
    // A runtime-perfect trace scores ~99.99 (float CTM noise); bloom requires
    // exactly 100, so the store rounds — the design's "perfect = 100" holds.
    const store = new LocalProgressStore(new FakeStorage())
    store.setProgress('a', 99.994)
    store.setProgress('c', 78.84)
    expect(store.getProgress('a')).toBe(100)
    expect(store.getProgress('c')).toBe(79)
  })

  it('reads 0 for unknown letters', () => {
    expect(new LocalProgressStore(new FakeStorage()).getProgress('z')).toBe(0)
  })
})