// One AudioContext for the whole app. Browsers cap the number of contexts a
// page may open and refuse to start any of them outside a user gesture, so the
// approval tone, the sustained corridor tone and the metronome all share this
// one and all create it LAZILY — the first sound a child triggers is what
// brings it up.
//
// Every consumer treats a `null` here as "this device has no audio" and carries
// on silently: a browser without Web Audio must never break a level.
let sharedCtx: AudioContext | null = null

/** The shared context, created on first use. `null` outside a browser (SSR and
 * the node test environment) or when construction fails. */
export function sharedAudioContext(): AudioContext | null {
  if (sharedCtx) return sharedCtx
  if (typeof window === 'undefined') return null // headless tests / SSR
  const ctor = (window as { AudioContext?: typeof AudioContext }).AudioContext
  if (typeof ctor !== 'function') return null
  try {
    sharedCtx = new ctor()
  } catch {
    sharedCtx = null
  }
  return sharedCtx
}

/** Autoplay policy: a context created before the first gesture starts
 * `suspended` and stays silent until resumed. Best-effort, never awaited. */
export function resumeAudio(ctx: AudioContext): void {
  try {
    if (typeof ctx.resume === 'function') ctx.resume().catch(() => {})
  } catch {
    // best-effort
  }
}
