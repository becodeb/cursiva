// The detective's notebook discoverability (`odd/tasks/prewriting-stage-
// completion.md` T31, `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md` §5). The
// author's play-test note: "no sabía que esto existía; nunca lo vi, y no es
// nada intuitivo" — the backpack pill (`screen/ZooMap.tsx`) already opened
// `screen/DetectiveNotebook.tsx`, but nothing on screen ever told the child
// it was there, or that it was worth tapping.
//
// Pure persistence, the same "a plain function over a storage-shaped
// parameter, never `window.localStorage` read directly inside a component"
// convention `zoo/stars.ts`'s own session memory documents — `hasOpenedNotebookOnce`/
// `markNotebookOpenedOnce` take a `Storage`-shaped object so a `node`-
// environment test can hand in a plain in-memory fake with no DOM at all.
// Every access is wrapped in `try/catch`: a private-browsing tab or a full
// quota can make `localStorage` throw synchronously on ANY call (`getItem`
// included, not just `setItem`) — the worst that should ever happen here is
// the backpack keeps gently pulsing a session longer than strictly needed,
// never a crashed map screen.
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = 'cv-notebook-opened-once'

/** Whether the child has EVER opened the notebook, across sessions —
 *  `false` for a missing/throwing/unavailable storage (never blocks or
 *  crashes; the pulse simply keeps showing, exactly as it should for a
 *  child who genuinely has not discovered it yet). */
export function hasOpenedNotebookOnce(storage: StorageLike | null | undefined): boolean {
  try {
    return storage?.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Records the discovery, once — idempotent (writing `'1'` again is a
 *  no-op), and silently a no-op itself if `storage` throws (a full quota or
 *  a private-browsing tab must never crash the tap that opens the
 *  notebook). */
export function markNotebookOpenedOnce(storage: StorageLike | null | undefined): void {
  try {
    storage?.setItem(STORAGE_KEY, '1')
  } catch {
    // Swallowed on purpose (this file's own header): the worst outcome is
    // the pulse returns next session, never a broken tap.
  }
}

/**
 * Pulpito's own short line the first time an animal is delivered while the
 * notebook is still undiscovered (`screen/AdventureClosing.tsx`'s rescue
 * beat) — Rioplatense, short on purpose: the visual cue (the backpack's own
 * bounce/glow/badge and its lingering pulse, `screen/ZooMap.tsx`) is what
 * actually points at the backpack; this line only confirms WHAT just
 * happened, so it stays short enough to keep the fitted bubble's font
 * comfortably above the task's own 11px floor at the tightest required
 * viewport (`screen/bubbleFit.ts`'s own registry sweep) even appended to
 * the LONGEST real rescue closing line (dolphin's, 65 characters).
 */
export const NOTEBOOK_HINT_LINE = '¡Lo anoté en mi libreta!'
