// Narrator contract tests (docs/18 D1/D24/D26; adventure-flow-and-map-
// guidance T7). Node environment, no DOM — the same `vi.stubGlobal`/
// `vi.unstubAllGlobals` convention `App.test.tsx`/`LevelPlay.test.tsx`
// already use for exercising code that reads `window` with no real browser
// underneath it, and the same in-memory fake-storage shape
// `game/levelProgress.test.ts` uses for `LevelProgressStore`.
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SPANISH_LANG_PREFS,
  VOICE_CLIPS,
  VOICE_SETTINGS_KEY,
  canAutoSpeak,
  clipFor,
  loadVoiceSettings,
  pickVoice,
  saveVoiceSettings,
  speak,
  stopSpeaking,
  type StorageLike,
} from './narrator'

/** In-memory storage double, with the raw payload readable for assertions —
 *  the same shape `game/levelProgress.test.ts`'s own `fakeStorage` uses. */
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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pickVoice', () => {
  it('picks es-AR first when the engine offers it', () => {
    const voices = [{ lang: 'en-US' }, { lang: 'es-AR' }, { lang: 'es-ES' }]
    expect(pickVoice(voices)?.lang).toBe('es-AR')
  })

  it('falls back to es-419 when there is no es-AR at all', () => {
    const voices = [{ lang: 'en-US' }, { lang: 'es-419' }, { lang: 'es-ES' }]
    expect(pickVoice(voices)?.lang).toBe('es-419')
  })

  it('falls all the way back to a bare "es" when no closer variant matches', () => {
    const voices = [{ lang: 'en-US' }, { lang: 'es-CO' }]
    expect(pickVoice(voices)?.lang).toBe('es-CO')
  })

  it('returns undefined when nothing offered is Spanish under any preference', () => {
    const voices = [{ lang: 'en-US' }, { lang: 'fr-FR' }, { lang: 'pt-BR' }]
    expect(pickVoice(voices)).toBeUndefined()
  })

  it('returns undefined for an empty voice list, rather than throwing', () => {
    expect(pickVoice([])).toBeUndefined()
  })

  it('prefers a localService voice on a tie within the same matched preference, order-independent', () => {
    const remote = { lang: 'es-AR', localService: false }
    const local = { lang: 'es-AR', localService: true }
    expect(pickVoice([remote, local])).toBe(local)
    expect(pickVoice([local, remote])).toBe(local)
  })

  it('falls back to the first match when none of them is localService', () => {
    const first = { lang: 'es-AR', localService: false }
    const second = { lang: 'es-AR', localService: false }
    expect(pickVoice([first, second])).toBe(first)
  })

  it('matches by prefix, case-insensitively', () => {
    const voices = [{ lang: 'ES-ar' }]
    expect(pickVoice(voices)?.lang).toBe('ES-ar')
  })

  it('never lets a more specific preference (es-AR) accidentally match a bare "es" voice', () => {
    // 'es'.startsWith('es-ar') is false — this is the guard against the
    // opposite (and wrong) direction of the prefix check.
    const voices = [{ lang: 'es' }]
    expect(pickVoice(voices, ['es-AR'])).toBeUndefined()
    expect(pickVoice(voices, SPANISH_LANG_PREFS)?.lang).toBe('es')
  })

  it('accepts a caller-supplied preference order instead of the default', () => {
    const voices = [{ lang: 'es-MX' }, { lang: 'es-AR' }]
    expect(pickVoice(voices, ['es-MX', 'es-AR'])?.lang).toBe('es-MX')
  })

  it('SPANISH_LANG_PREFS puts es-AR first, this app\'s own Rioplatense voice', () => {
    expect(SPANISH_LANG_PREFS[0]).toBe('es-AR')
  })
})

describe('voice settings (loadVoiceSettings / saveVoiceSettings)', () => {
  it('defaults to unmuted with no storage at all', () => {
    expect(loadVoiceSettings(null)).toEqual({ muted: false })
  })

  it('round-trips a saved setting through a fake storage', () => {
    const storage = fakeStorage()
    saveVoiceSettings({ muted: true }, storage)
    expect(loadVoiceSettings(storage)).toEqual({ muted: true })
  })

  it('persists under the documented versioned key', () => {
    const storage = fakeStorage()
    saveVoiceSettings({ muted: true }, storage)
    expect(JSON.parse(storage.raw() ?? 'null')).toEqual({ muted: true })
    expect(storage.getItem(VOICE_SETTINGS_KEY)).not.toBeNull()
  })

  it('reads a corrupt (unparsable) payload as the default rather than throwing', () => {
    const storage = fakeStorage('{not json')
    expect(() => loadVoiceSettings(storage)).not.toThrow()
    expect(loadVoiceSettings(storage)).toEqual({ muted: false })
  })

  it('repairs a payload with the wrong shape or field type instead of crashing', () => {
    expect(loadVoiceSettings(fakeStorage(JSON.stringify({ muted: 'yes' })))).toEqual({ muted: false })
    expect(loadVoiceSettings(fakeStorage(JSON.stringify([1, 2, 3])))).toEqual({ muted: false })
    expect(loadVoiceSettings(fakeStorage(JSON.stringify(null)))).toEqual({ muted: false })
    expect(loadVoiceSettings(fakeStorage(JSON.stringify('nope')))).toEqual({ muted: false })
  })

  it('overwrites a corrupt payload on the next write', () => {
    const storage = fakeStorage('{not json')
    saveVoiceSettings({ muted: true }, storage)
    expect(JSON.parse(storage.raw() ?? 'null')).toEqual({ muted: true })
  })

  it('never throws when the storage itself throws (privacy mode mid-session)', () => {
    const hostile: StorageLike = {
      getItem: () => {
        throw new Error('storage disabled')
      },
      setItem: () => {
        throw new Error('storage disabled')
      },
    }
    expect(() => loadVoiceSettings(hostile)).not.toThrow()
    expect(loadVoiceSettings(hostile)).toEqual({ muted: false })
    expect(() => saveVoiceSettings({ muted: true }, hostile)).not.toThrow()
  })

  it('constructs/reads without arguments outside a browser (no window at all)', () => {
    expect(() => loadVoiceSettings()).not.toThrow()
    expect(loadVoiceSettings()).toEqual({ muted: false })
    expect(() => saveVoiceSettings({ muted: true })).not.toThrow()
  })
})

describe('VOICE_CLIPS / clipFor', () => {
  it('is empty today — every line still falls through to speech synthesis', () => {
    expect(Object.keys(VOICE_CLIPS)).toHaveLength(0)
  })

  it('returns undefined for any line while the registry is empty', () => {
    expect(clipFor('¡Vidrio limpio!')).toBeUndefined()
    expect(clipFor('')).toBeUndefined()
  })
})

describe('speak', () => {
  it('is a no-op with no window at all (SSR / this very test environment) — never throws', () => {
    expect(() => speak('Hola')).not.toThrow()
  })

  it('is a no-op for an empty line, without even touching storage or the engine', () => {
    expect(() => speak('')).not.toThrow()
  })

  it('is a no-op when muted, even with a fully working fake engine ready to speak', () => {
    const speakSpy = vi.fn()
    const cancelSpy = vi.fn()
    vi.stubGlobal('window', {
      speechSynthesis: { speak: speakSpy, cancel: cancelSpy, getVoices: () => [] },
    })
    const mutedStorage = fakeStorage(JSON.stringify({ muted: true }))
    speak('Hola', mutedStorage)
    expect(speakSpy).not.toHaveBeenCalled()
    expect(cancelSpy).not.toHaveBeenCalled()
  })

  it('is a no-op when speechSynthesis itself is missing from window', () => {
    vi.stubGlobal('window', {})
    expect(() => speak('Hola', fakeStorage())).not.toThrow()
  })

  it('cancels whatever is speaking and speaks the line in Rioplatense Spanish, picking a voice, when unmuted', () => {
    const speakSpy = vi.fn()
    const cancelSpy = vi.fn()
    const localVoice = { lang: 'es-AR', localService: true }
    vi.stubGlobal('window', {
      speechSynthesis: { speak: speakSpy, cancel: cancelSpy, getVoices: () => [localVoice] },
    })
    // A minimal fake of the global `SpeechSynthesisUtterance` constructor —
    // `speak()` references it as a bare global, exactly like a real engine
    // exposes it, so stubbing the global (not `window.…`) is what a real
    // browser's own shape requires here.
    class FakeUtterance {
      text: string
      lang = ''
      rate = 1
      pitch = 1
      voice: unknown = null
      constructor(text: string) {
        this.text = text
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)

    speak('Hola', fakeStorage())

    expect(cancelSpy).toHaveBeenCalledTimes(1)
    expect(speakSpy).toHaveBeenCalledTimes(1)
    const utterance = speakSpy.mock.calls[0][0] as FakeUtterance
    expect(utterance.text).toBe('Hola')
    expect(utterance.lang).toBe('es-AR')
    expect(utterance.rate).toBeCloseTo(0.95)
    expect(utterance.pitch).toBeCloseTo(1.05)
    expect(utterance.voice).toBe(localVoice)
  })

  it('never throws even when the engine itself throws mid-call', () => {
    vi.stubGlobal('window', {
      speechSynthesis: {
        cancel: () => {
          throw new Error('engine unavailable')
        },
        getVoices: () => [],
        speak: vi.fn(),
      },
    })
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        constructor(_text: string) {}
      },
    )
    expect(() => speak('Hola', fakeStorage())).not.toThrow()
  })
})

describe('stopSpeaking', () => {
  it('is a no-op with no window at all — never throws', () => {
    expect(() => stopSpeaking()).not.toThrow()
  })

  it('cancels the engine when one is available', () => {
    const cancelSpy = vi.fn()
    vi.stubGlobal('window', { speechSynthesis: { cancel: cancelSpy } })
    stopSpeaking()
    expect(cancelSpy).toHaveBeenCalledTimes(1)
  })

  it('is a no-op when speechSynthesis is missing from window', () => {
    vi.stubGlobal('window', {})
    expect(() => stopSpeaking()).not.toThrow()
  })
})

describe('canAutoSpeak', () => {
  it('is permissive (true) with no navigator at all (this test environment)', () => {
    expect(canAutoSpeak()).toBe(true)
  })

  it('is permissive (true) when navigator exists but carries no userActivation', () => {
    vi.stubGlobal('navigator', {})
    expect(canAutoSpeak()).toBe(true)
  })

  it('reflects a real userActivation.hasBeenActive flag when the engine has one', () => {
    vi.stubGlobal('navigator', { userActivation: { hasBeenActive: false } })
    expect(canAutoSpeak()).toBe(false)
    vi.stubGlobal('navigator', { userActivation: { hasBeenActive: true } })
    expect(canAutoSpeak()).toBe(true)
  })
})
