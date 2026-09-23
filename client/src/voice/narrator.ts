// Speech narration for a pre-reader (docs/18_DIAGNOSTICO_Y_REDISENO_PEDAGOGICO.md
// §3 "Todo se escucha" / D1, D24, D26; adventure-flow-and-map-guidance T7).
//
// The whole diagnosis in one line: every instruction and every line of the
// zoo's story is TEXT, and a first grader does not read fluently — so today
// the story and the consigna are simply lost on the exact child this app is
// for. Matific's own public pattern is the model this module follows: every
// dialogue line has audio, played automatically from kindergarten through
// 2nd grade. This file is the mechanism (speech synthesis today, a per-line
// recorded clip whenever one is authored); `useNarration.ts`/`SpeakButton.tsx`/
// `VoiceToggle.tsx` are the React glue that call into it from each screen.
//
// Defensive by construction, the same spirit `game/LevelProgressStore.ts`
// documents for progress: `speechSynthesis` does not exist in the node test
// environment, is missing on some engines, and a browser also REFUSES to
// speak before the page has seen a user gesture at all (`canAutoSpeak`,
// below) — none of that may ever throw or otherwise break the screen a
// narration call was decorating. Every exported function here is pure or
// best-effort; nothing in this module owns a live subscription or a class
// instance, because there is nothing here worth caching — a mute flag is one
// boolean, and re-reading it on every call is cheaper than keeping it in
// sync with whatever else might change it.

/** The one settings flag this module persists — the child (or the grown-up
 *  with them) turning the narrator off entirely, independent of any single
 *  screen's own SpeakButton, which always works regardless of this flag. */
export interface VoiceSettings {
  muted: boolean
}

const DEFAULT_SETTINGS: VoiceSettings = { muted: false }

export const VOICE_SETTINGS_KEY = 'cursiva.voice.v1'

/** Minimal storage surface — `localStorage` implements it exactly, and a
 *  test can pass an in-memory fake instead (the same contract
 *  `game/LevelProgressStore.ts`'s own `StorageLike` states). */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** localStorage when available; `null` in SSR / privacy modes — never throws,
 *  because the accessor itself can (`LevelProgressStore.ts`'s own
 *  `defaultStorage`, restated here rather than imported: this module must
 *  stay free-standing so a future extraction into its own package, or a
 *  future rewrite of the progress store, never has to consider a narration
 *  dependency it does not otherwise need). */
function defaultStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null
    const ls = window.localStorage
    return ls == null ? null : ls
  } catch {
    return null // privacy mode: the accessor itself throws
  }
}

/** Coerce an unknown parsed payload into a valid `VoiceSettings` — a missing
 *  or wrongly-typed `muted` field falls back to the default rather than
 *  poisoning the whole record, the same per-field repair
 *  `LevelProgressStore.ts`'s own `toRecord` does for a level record. */
function toSettings(raw: unknown): VoiceSettings {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ...DEFAULT_SETTINGS }
  const r = raw as Record<string, unknown>
  return { muted: typeof r.muted === 'boolean' ? r.muted : DEFAULT_SETTINGS.muted }
}

/** Read the persisted settings; a missing key, a corrupt payload, or a
 *  throwing storage all read as the default (`{ muted: false }`) rather than
 *  crashing the screen that asked. */
export function loadVoiceSettings(storage: StorageLike | null = defaultStorage()): VoiceSettings {
  if (!storage) return { ...DEFAULT_SETTINGS }
  try {
    const raw = storage.getItem(VOICE_SETTINGS_KEY)
    if (raw === null) return { ...DEFAULT_SETTINGS }
    return toSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SETTINGS } // corrupt payload ⇒ default, never a throw
  }
}

/** Persist the settings; a storage that is absent or throws mid-session is
 *  silently ignored — `VoiceToggle` still updates its own on-screen state
 *  either way, the same "keep the in-memory copy, never throw" convention
 *  `LevelProgressStore.ts`'s `persist` follows. */
export function saveVoiceSettings(settings: VoiceSettings, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return
  try {
    storage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // unavailable mid-session: never throw
  }
}

/** es-AR first (Rioplatense, this app's own child-facing voseo), then the
 *  closest neighbours, then any Spanish at all. Exported so a call site can
 *  narrow or reorder the list (a future per-country build, say) without
 *  reaching into this module's internals. */
export const SPANISH_LANG_PREFS: readonly string[] = ['es-AR', 'es-419', 'es-US', 'es-MX', 'es-ES', 'es']

/** The minimal shape `pickVoice` needs — real `SpeechSynthesisVoice` objects
 *  satisfy this structurally, and a test can hand it a plain object literal
 *  instead of standing up the real (absent, in node) Web Speech API. */
export interface NarratorVoice {
  readonly lang: string
  readonly localService?: boolean
}

/**
 * The best voice for this app out of whatever the engine offers, pure and
 * therefore directly testable with hand-built fixtures — no `window`, no
 * `speechSynthesis`, no async "voices changed" event to wait for.
 *
 * Tries each preference IN ORDER; the first one with at least one matching
 * voice (by language-prefix, case-insensitive — `es-AR` also matches an
 * engine that reports `es-AR-x`) wins, and among ITS matches a
 * `localService` (on-device, no network round trip, no delay) voice is
 * preferred over a remote one on a tie. `undefined` when nothing in `voices`
 * is Spanish at all under any listed preference — the caller
 * (`speak`, below) leaves `SpeechSynthesisUtterance.voice` at the engine's
 * own default in that case rather than forcing a wrong-language voice.
 */
export function pickVoice<V extends NarratorVoice>(
  voices: readonly V[],
  prefs: readonly string[] = SPANISH_LANG_PREFS,
): V | undefined {
  for (const pref of prefs) {
    const prefLower = pref.toLowerCase()
    const matches = voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefLower))
    if (matches.length === 0) continue
    return matches.find((voice) => voice.localService === true) ?? matches[0]
  }
  return undefined
}

/**
 * Exact line → recorded audio URL. EMPTY today — every line in this app is
 * still synthetic speech — but named and shipped now so the day a real
 * recorded voice is authored (docs/18 §3: "Más adelante, voz grabada"), every
 * call site that already routes through `speak()` picks it up with no
 * further change: this registry, not the call sites, is the one place that
 * grows.
 *
 * Keyed by the exact line rather than by a screen/id pair on purpose: the
 * same sentence never needs two different recordings, and a line reused
 * across screens (there are none today, but nothing forbids it) gets its
 * clip once.
 */
export const VOICE_CLIPS: Readonly<Record<string, string>> = {}

/** The recorded clip for `line`, or `undefined` when none is registered yet
 *  — pure and total, so it is testable without ever touching `Audio`. */
export function clipFor(line: string): string | undefined {
  return VOICE_CLIPS[line]
}

/**
 * Is this app currently ALLOWED to start speaking with no tap of its own —
 * i.e. has the page already seen a user gesture? Every major engine refuses
 * `speechSynthesis.speak()` before one, exactly the same policy that blocks
 * autoplaying audio/video (docs/18 §3's own Matific citation: "de K a 2º
 * grado se reproduce solo" only works because SOME earlier gesture — loading
 * the activity, tapping into it — already happened).
 *
 * `navigator.userActivation` is the standard, synchronous way to ask; it is
 * newer than `speechSynthesis` itself, so an engine that lacks it gets the
 * PERMISSIVE default (`true`) rather than being silenced by a feature test
 * that says nothing about the actual policy. `PrologueOpening`'s first plate
 * is the one screen in this app that can genuinely mount before any gesture
 * at all — its own `SpeakButton` (a tap IS a gesture) is what covers that
 * case; every plate/screen after it is reached by tapping something, so
 * `canAutoSpeak()` is true by the time any other screen's narration effect
 * runs.
 */
export function canAutoSpeak(): boolean {
  if (typeof navigator === 'undefined') return true
  const hasBeenActive = navigator.userActivation?.hasBeenActive
  return hasBeenActive ?? true
}

/**
 * Speak `line` out loud — the one function every screen in T7 calls,
 * directly or through `useNarration`/`SpeakButton`. No-ops (never throws)
 * when the line is empty, when the narrator is muted, or when this engine
 * has no `window`/`speechSynthesis` at all (SSR, the node test
 * environment, an engine that never shipped the Web Speech API).
 *
 * A registered clip (`clipFor`) wins over synthesis outright — playing a
 * real recording is strictly better than a synthetic voice, so once one
 * exists for a line, `speechSynthesis` is never even consulted for it. Until
 * then (today, for every line) this always falls through to synthesis.
 *
 * Synthesis itself: cancels whatever the engine is already speaking first
 * (a child tapping a second SpeakButton before the first sentence finishes
 * must hear the NEW line, not both overlapping), then speaks `line` in
 * Rioplatense Spanish, a touch slower and a touch higher than the engine's
 * own default — closer to how an adult actually reads to a six-year-old
 * than the flat, fast default most engines ship.
 *
 * `storage` is injectable ONLY so a test can assert the muted no-op without
 * touching real `localStorage` — every production call site omits it and
 * gets the real settings.
 */
export function speak(line: string, storage: StorageLike | null = defaultStorage()): void {
  if (!line) return
  if (loadVoiceSettings(storage).muted) return
  if (typeof window === 'undefined') return

  const clip = clipFor(line)
  if (clip) {
    try {
      // `.play()` returns a promise that rejects when the browser still
      // refuses autoplay even for a real `<audio>` element — best-effort,
      // exactly like every other channel in this app (docs/02 §7.2's own
      // haptics precedent): a silent level is bad, a thrown level is worse.
      void new Audio(clip).play().catch(() => {})
    } catch {
      // `Audio` missing or throwing outright (an ancient engine, a hostile
      // test double): fall through to nothing rather than to synthesis —
      // a registered clip means synthesis is the WRONG voice to fall back
      // to, not a safety net for this branch.
    }
    return
  }

  const synth = window.speechSynthesis
  if (!synth) return
  try {
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(line)
    utterance.lang = 'es-AR'
    utterance.rate = 0.95
    utterance.pitch = 1.05
    const voice = pickVoice(synth.getVoices())
    if (voice) utterance.voice = voice
    synth.speak(utterance)
  } catch {
    // best-effort: narration must never break the screen it decorates
  }
}

/** Stop whatever is currently being spoken — `useNarration`'s unmount
 *  cleanup, so leaving a screen mid-sentence never lets it run over the
 *  NEXT screen's own line. Never throws, and a no-op wherever `speak` itself
 *  would already be one. */
export function stopSpeaking(): void {
  if (typeof window === 'undefined') return
  const synth = window.speechSynthesis
  if (!synth) return
  try {
    synth.cancel()
  } catch {
    // best-effort
  }
}
