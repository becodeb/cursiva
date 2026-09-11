// Per-level progress persistence (docs/08 section 4: "El progreso se guarda por
// nivel en localStorage, con el mejor puntaje de cada pilar"). Mirrors
// LocalProgressStore's defensiveness exactly: a corrupt payload reads as EMPTY
// and is overwritten on the next write, an absent or throwing storage (SSR,
// privacy mode) degrades to in-memory, and NOTHING here ever throws. A child
// losing their progress is bad; a child facing a blank screen is worse.
import { APPROVALS_TO_UNLOCK, EMPTY_RECORD } from './types'
import type { LevelRecord } from './types'
import { LEVELS } from '../levels/catalog'

export const LEVEL_PROGRESS_KEY = 'cursiva.levels.v1'
/** Test-drive flag: unlocks every level so the whole progression can be walked
 * out of order while the mechanics are being evaluated (docs/04 section 1). It
 * is deliberately separate from progress, so turning it off restores the real
 * unlock state instead of destroying it. */
export const LEVEL_TESTMODE_KEY = 'cursiva.levels.testmode.v1'

/** Minimal storage surface — `localStorage` implements it exactly. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** localStorage when available; null in SSR / privacy modes. */
function defaultStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null
    const ls = window.localStorage
    return ls == null ? null : ls
  } catch {
    return null // privacy mode: the accessor itself throws
  }
}

/** Finite number or the fallback — a corrupt field never poisons a record. */
function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Coerce an unknown payload entry into a valid LevelRecord. */
function toRecord(raw: unknown): LevelRecord | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  return {
    bestAccuracy: num(r.bestAccuracy, 0),
    bestFluency: num(r.bestFluency, 0),
    attempts: num(r.attempts, 0),
    approvals: num(r.approvals, 0),
    streakFail: num(r.streakFail, 0),
    streakPass: num(r.streakPass, 0),
    widthFactor: num(r.widthFactor, 1),
  }
}

export class LevelProgressStore {
  private readonly memory = new Map<string, LevelRecord>()
  private readonly storage: StorageLike | null
  private testMode = false

  constructor(storage: StorageLike | null = defaultStorage()) {
    this.storage = storage
    this.load()
  }

  /** Parse the stored payload; corrupt/unreadable ⇒ empty map. */
  private load(): void {
    this.memory.clear()
    if (!this.storage) return
    try {
      const raw = this.storage.getItem(LEVEL_PROGRESS_KEY)
      if (raw === null) return
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return
      for (const [id, value] of Object.entries(parsed)) {
        const record = toRecord(value)
        if (record) this.memory.set(id, record)
      }
    } catch {
      this.memory.clear() // corrupt payload ⇒ empty
    }
    try {
      this.testMode = this.storage.getItem(LEVEL_TESTMODE_KEY) === '1'
    } catch {
      this.testMode = false
    }
  }

  /** Flush the in-memory map; a storage that throws mid-session is ignored. */
  private persist(): void {
    if (!this.storage) return
    try {
      this.storage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(Object.fromEntries(this.memory)))
    } catch {
      // unavailable mid-session: keep the in-memory copy, never throw
    }
  }

  /** The level's record, or a fresh EMPTY_RECORD when it has never been played. */
  get(levelId: string): LevelRecord {
    return this.memory.get(levelId) ?? { ...EMPTY_RECORD }
  }

  save(levelId: string, record: LevelRecord): void {
    this.memory.set(levelId, { ...record })
    this.persist()
  }

  /** Every stored record, keyed by level id (a copy — callers cannot mutate us). */
  all(): Record<string, LevelRecord> {
    const out: Record<string, LevelRecord> = {}
    for (const [id, record] of this.memory) out[id] = { ...record }
    return out
  }

  /**
   * Is the level reachable? The first level of the catalog ALWAYS is; any other
   * needs its predecessor approved `APPROVALS_TO_UNLOCK` times — "el desbloqueo
   * pide 2 aprobaciones, no una: una sola puede ser suerte" (docs/08 section 4).
   *
   * An unknown id is not unlocked, and never throws.
   */
  isUnlocked(levelId: string): boolean {
    const index = LEVELS.findIndex((l) => l.id === levelId)
    if (index < 0) return false
    if (this.testMode) return true
    if (index === 0) return true
    return this.get(LEVELS[index - 1].id).approvals >= APPROVALS_TO_UNLOCK
  }

  /** Is the whole catalog unlocked for a test drive? */
  isTestMode(): boolean {
    return this.testMode
  }

  /** Turn the test drive on or off. Progress is never touched either way. */
  setTestMode(on: boolean): void {
    this.testMode = on
    if (!this.storage) return
    try {
      this.storage.setItem(LEVEL_TESTMODE_KEY, on ? '1' : '0')
    } catch {
      // unavailable mid-session: keep the in-memory copy, never throw
    }
  }

  /** Wipe every level's progress (dev tooling / a fresh child on a shared tablet). */
  reset(): void {
    this.memory.clear()
    this.persist()
  }
}
