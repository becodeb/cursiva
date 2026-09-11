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

  it('throws a descriptive error for an unregistered (non-letter) char and returns nothing', () => {
    // All 26 lowercase letters are registered (every hand-drawn SVG lands in
    // svg/), so the unregistered sentinel must be a NON-letter char.
    expect(() => getLetterConfig('0')).toThrow(/Letra no configurada: 0/)
    expect(() => getLetterConfig('')).toThrow(/Letra no configurada/)
  })

  // Registry sweep (letter-model "Elliptical Arc Ingestion" / "Fail-Loud
  // Unsupported Path Commands"): every hand-drawn SVG in svg/ must load
  // without throwing, and no NaN may leak into any config — the fail-loud
  // guard for arc conversion, H/V shorthand, and non-finite tokens.
  describe('26-letter sweep (svg-glyph-fixes fail-loud guard)', () => {
    const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'

    it('registers all 26 lowercase letters', () => {
      const keys = Object.keys(LETTER_REGISTRY)
      for (const ch of ALPHABET) expect(keys).toContain(ch)
    })

    function assertFiniteDeep(value: unknown, path: string): void {
      if (typeof value === 'number') {
        expect(Number.isFinite(value), `${path} must be finite, got ${value}`).toBe(true)
        return
      }
      if (Array.isArray(value)) {
        value.forEach((v, i) => assertFiniteDeep(v, `${path}[${i}]`))
        return
      }
      if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) assertFiniteDeep(v, `${path}.${k}`)
      }
    }

    it('no config contains NaN/Infinity anywhere (points, checkpoints, anchors, d)', () => {
      for (const ch of ALPHABET) {
        const cfg = getLetterConfig(ch)
        assertFiniteDeep(cfg.anchors, `${ch}.anchors`)
        assertFiniteDeep(cfg.pathDefinition.checkpoints, `${ch}.checkpoints`)
        assertFiniteDeep(cfg.pathDefinition.ideal, `${ch}.ideal`)
        if (cfg.pathDefinition.mainEndArc !== undefined) {
          expect(Number.isFinite(cfg.pathDefinition.mainEndArc)).toBe(true)
        }
        expect(cfg.pathDefinition.d).not.toMatch(/NaN|Infinity/)
        for (const seg of cfg.pathDefinition.segments ?? []) {
          expect(seg).not.toMatch(/NaN|Infinity/)
        }
      }
    })
  })
})