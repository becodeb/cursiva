import { describe, expect, it } from 'vitest'
import { LETTER_REGISTRY, getLetterConfig } from './registry'
import { resolveBaselineZone } from './svgLetter'

describe('letter registry', () => {
  it('ships the a and c seeds (present at least), all ola, zone per letter class', () => {
    // Presence, not an exact-key snapshot: the registry grows to all 26
    // lowercase letters as hand-drawn SVGs land in the svg/ folder.
    const keys = Object.keys(LETTER_REGISTRY)
    expect(keys).toContain('a')
    expect(keys).toContain('c')
    for (const config of Object.values(LETTER_REGISTRY)) {
      expect(config.family).toBe('ola')
      // Hand-drawn svg letters carry their own ruled zone (b/d/f are 'alta');
      // seeds resolve to 'media'.
      expect(config.baselineZone).toBe(resolveBaselineZone(config.character))
    }
  })

  it('resolves registered chars case-insensitively', () => {
    expect(getLetterConfig('a').character).toBe('a')
    expect(getLetterConfig('A').character).toBe('a')
    expect(getLetterConfig('c').character).toBe('c')
    expect(getLetterConfig('C').character).toBe('c')
  })

  it('returns the same config object as the registry entry', () => {
    expect(getLetterConfig('A')).toBe(LETTER_REGISTRY.a)
    expect(getLetterConfig('c')).toBe(LETTER_REGISTRY.c)
  })

  it('throws a descriptive error for unregistered chars and returns nothing', () => {
    expect(() => getLetterConfig('z')).toThrow(/Letra no configurada: z/)
    expect(() => getLetterConfig('')).toThrow(/Letra no configurada/)
  })
})