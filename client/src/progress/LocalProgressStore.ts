// LocalProgressStore (progress-store spec, T6.1): persists per-letter
// progress as a JSON map `{"a":85,"c":40}` under `cursiva.progress.v1`.
// Design-fixed semantics: values CLAMP to 0–100, letters stay ISOLATED, and
// registration is MONOTONIC best-of `max(stored, clamp(value))` — mastery,
// not last attempt (design.md Progress % row). A corrupt payload reads as
// empty and is overwritten on the next write; a throwing storage (privacy
// mode) degrades to in-memory storage and NEVER throws.
import type { ProgressStore } from './ProgressStore'

export const PROGRESS_STORAGE_KEY = 'cursiva.progress.v1'

/** Minimal storage surface — `localStorage` implements it exactly. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const clamp = (v: number): number => (v < 0 ? 0 : v > 100 ? 100 : v)

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

export class LocalProgressStore implements ProgressStore {
  private readonly memory = new Map<string, number>()
  private readonly storage: StorageLike | null

  constructor(storage: StorageLike | null = defaultStorage()) {
    this.storage = storage
    this.load()
  }

  /** Parse the stored payload; corrupt/unreadable ⇒ empty map (overwritten on the next write). */
  private load(): void {
    this.memory.clear()
    if (!this.storage) return
    try {
      const raw = this.storage.getItem(PROGRESS_STORAGE_KEY)
      if (raw === null) return
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return
      for (const [id, value] of Object.entries(parsed)) {
        const n = Number(value)
        if (Number.isFinite(n)) this.memory.set(id, clamp(n))
      }
    } catch {
      this.memory.clear() // corrupt payload ⇒ empty
    }
  }

  getProgress(letterId: string): number {
    return this.memory.get(letterId) ?? 0
  }

  setProgress(letterId: string, value: number): void {
    const next = Math.max(this.getProgress(letterId), clamp(value)) // monotonic best-of
    this.memory.set(letterId, next)
    if (!this.storage) return
    try {
      this.storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.memory)))
    } catch {
      // unavailable mid-session: keep the in-memory copy, never throw
    }
  }
}