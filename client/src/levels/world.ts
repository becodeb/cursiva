// The world / case split (design.md §1). Two ideas used to be one boolean —
// `isDetectiveTrail = !!level.clue` in `LevelPlay.tsx` — and Nivel 3 is the
// first thing in the app that needs them apart: it is drawn in the detective
// world without ever being a case trail. Pure, no React, no `detective/`
// import.
import type { LevelConfig } from './types'

/** This level belongs to a DetectiveCase: it carries a clue mark, files into
 *  the PISTAS rail, and can route to a deduction. `!!level.clue` under its
 *  real name — `LevelPlay.tsx:633`'s old `isDetectiveTrail`, unchanged. */
export function isCaseTrail(level: Pick<LevelConfig, 'clue'>): boolean {
  return !!level.clue
}

/** This level is DRAWN IN the detective world: grass and trodden earth, the
 *  octopus standing at the start with the glass on its tentacle, mud ink, the
 *  wordless shell, no result block and therefore no three stars (D6).
 *
 *  A case trail is ALWAYS in the world; the reverse is not true, and Nivel 3
 *  is the first thing in the app that needs it that way (D1). `detectiveWorld`
 *  can only WIDEN this: `detectiveWorld: false` on a level that carries a clue
 *  still returns true, so the flag can never accidentally strip a case trail
 *  of the world it lives in. That is the type-level half of what makes the
 *  split safe to roll back. */
export function inDetectiveWorld(
  level: Pick<LevelConfig, 'clue' | 'detectiveWorld'>,
): boolean {
  return isCaseTrail(level) || level.detectiveWorld === true
}
