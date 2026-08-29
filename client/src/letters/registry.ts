import { letraA } from './letra_a'
import { letraC } from './letra_c'
import type { LetterConfig } from './types'
import { loadSvgLetters } from './svgLetter'

const svgLetters = loadSvgLetters()

// Single access point for letter configs (docs/07 section 4). Hand-drawn SVG
// letters take PRIORITY over the Kalam fallback seeds (a, c): the later spread
// wins, so a user-provided `<char>.svg` overrides the bundled glyph. With no
// SVGs ingested, svgLetters is {} and behavior is unchanged from the seeds.
export const LETTER_REGISTRY: Record<string, LetterConfig> = {
  ...{ a: letraA, c: letraC }, // Kalam fallback
  ...svgLetters, // user SVGs override the fallback
}

export function getLetterConfig(char: string): LetterConfig {
  const config = LETTER_REGISTRY[char.toLowerCase()]
  if (!config) {
    throw new Error(`Letra no configurada: ${char}`)
  }
  return config
}