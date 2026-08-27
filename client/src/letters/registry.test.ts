import { describe, expect, it } from 'vitest'
import { LETTER_REGISTRY, getLetterConfig } from './registry'

describe('letter registry', () => {
  it('ships exactly the a and c seeds, both ola/media', () => {
    expect(Object.keys(LETTER_REGISTRY).sort()).toEqual(['a', 'c'])
    for (const config of Object.values(LETTER_REGISTRY)) {
      expect(config.family).toBe('ola')
      expect(config.baselineZone).toBe('media')
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