import { letraA } from './letra_a'
import { letraC } from './letra_c'
import type { LetterConfig } from './types'
import { loadSvgLetters } from './svgLetter'
import { buildOrderedPairs } from './combinations'

const svgLetters = loadSvgLetters()

// Single access point for letter configs (docs/07 section 4). Hand-drawn SVG
// letters take PRIORITY over the Kalam fallback seeds (a, c): the later spread
// wins, so a user-provided `<char>.svg` overrides the bundled glyph. With no
// SVGs ingested, svgLetters is {} and behavior is unchanged from the seeds.
export const LETTER_REGISTRY: Record<string, LetterConfig> = {
  ...{ a: letraA, c: letraC }, // Kalam fallback
  ...svgLetters, // user SVGs override the fallback
}

// Combination registry (letter-combinations "Ordered-Pair Registry"): every
// ordered pair of the hand-drawn SINGLE-SUBPATH svg letters, same zone —
// `combo_ac`, `combo_ca`, … (12 with a–f: media a,c,e → 6; alta b,d,f → 6).
// Built from svgLetters ONLY (design decision 6): the Kalam seeds are closed
// contours whose stored `d` does not start at the entry anchor, so rebuilding
// a seam with them would jump. With no SVGs, {} — single letters unaffected.
export const COMBO_REGISTRY: Record<string, LetterConfig> = Object.fromEntries(
  buildOrderedPairs(svgLetters).map((cfg) => [cfg.id, cfg]),
)

export function getLetterConfig(char: string): LetterConfig {
  const config = LETTER_REGISTRY[char.toLowerCase()]
  if (!config) {
    throw new Error(`Letra no configurada: ${char}`)
  }
  return config
}