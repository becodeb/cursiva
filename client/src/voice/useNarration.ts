// The shared narration lifecycle (docs/18 D1/T7): speak a line when it
// first appears, speak it again if it ever changes under the same mounted
// screen, and stop speaking the moment that screen goes away. Every dialogue
// screen this task wires (`PrologueOpening`, `AdventureIntro`,
// `AdventureClosing`) calls this exactly once with its own current line;
// `screen/ZooMap.tsx`'s map bubble and `screen/LevelPlay.tsx`'s level hint
// each have their own show/hide rules that do not fit "speak on mount, speak
// again on change" (the SAME bubble text can reappear after being dismissed,
// with the line itself unchanged) and call `speak()` directly instead — this
// hook is for the simpler, more common case, not the only entry point into
// narration.
import { useEffect } from 'react'
import { canAutoSpeak, speak, stopSpeaking } from './narrator'

export interface UseNarrationOptions {
  /**
   * Speak automatically (subject to `canAutoSpeak()` — a browser refuses
   * speech before the page has seen a user gesture) whenever `line` first
   * mounts or changes. Default `true`. A caller passes `false` only when a
   * line must be reachable SOLELY through its own `SpeakButton`, never on
   * its own — no screen in this task needs that today, but the option
   * exists so a future silent-by-default screen never has to bypass this
   * hook to get it.
   */
  auto?: boolean
}

/**
 * Wire `line` into the narrator for as long as the calling component stays
 * mounted. `line` changing (a new prologue plate, a new closing beat) speaks
 * the new sentence exactly like a fresh mount would — both are the SAME
 * dependency-array transition from React's point of view, and pedagogically
 * both ARE "a new sentence just appeared, read it".
 */
export function useNarration(line: string, options: UseNarrationOptions = {}): void {
  const { auto = true } = options
  useEffect(() => {
    if (auto && canAutoSpeak()) speak(line)
    return () => stopSpeaking()
  }, [line, auto])
}
