import { letraA } from './letra_a'
import { letraC } from './letra_c'
import type { LetterConfig } from './types'

// Single access point for letter configs (docs/07 section 4). Resolution is
// case-insensitive; unregistered chars throw a descriptive error.
export const LETTER_REGISTRY: Record<string, LetterConfig> = {
  a: letraA,
  c: letraC,
}

export function getLetterConfig(char: string): LetterConfig {
  const config = LETTER_REGISTRY[char.toLowerCase()]
  if (!config) {
    throw new Error(`Letra no configurada: ${char}`)
  }
  return config
}