// One requestAnimationFrame loop for every puppet on screen, running only while
// someone listens. Capped at about 30 frames per second: paper cut-outs read well
// at that rate, and it halves the work on a school tablet.

export type TickListener = (dt: number) => void

export interface FrameClock {
  request(callback: (now: number) => void): number
  cancel(handle: number): void
}

/** The longest step one frame may report: after a stall a puppet resumes, it does
 *  not jump. */
export const MAX_DT = 0.05
const MIN_FRAME_MS = 1000 / 30 - 2

export interface Ticker {
  subscribe(listener: TickListener): () => void
}

export function createTicker(clock: () => FrameClock): Ticker {
  const listeners = new Set<TickListener>()
  let handle: number | null = null
  let last: number | null = null

  const frame = (now: number): void => {
    handle = clock().request(frame)
    if (last !== null && now - last < MIN_FRAME_MS) return
    const dt = last === null ? 1 / 30 : Math.min(MAX_DT, (now - last) / 1000)
    last = now
    // A listener may unsubscribe itself while being called: iterate a copy.
    for (const listener of [...listeners]) listener(dt)
    if (listeners.size === 0 && handle !== null) {
      clock().cancel(handle)
      handle = null
      last = null
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      if (handle === null) handle = clock().request(frame)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0 && handle !== null) {
          clock().cancel(handle)
          handle = null
          last = null
        }
      }
    },
  }
}

export const puppetTicker: Ticker = createTicker(() => ({
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (handle) => window.cancelAnimationFrame(handle),
}))
