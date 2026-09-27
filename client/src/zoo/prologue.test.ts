// The prologue's opening script (prologue-opening spec: "Three Plates Carry
// the docs/16 §4 Lines Verbatim, in Order"). Node environment, no DOM —
// `PROLOGUE_PLATES` and `advancePlate` are pure over plain data.
import { describe, expect, it } from 'vitest'
import { advancePlate, PROLOGUE_PLATES } from './prologue'

describe('PROLOGUE_PLATES', () => {
  it('carries docs/16 §4 lines verbatim, in order', () => {
    expect(PROLOGUE_PLATES.map((p) => p.line)).toEqual([
      '¡Hola! Soy el Pulpito y cuido este zoológico.',
      'Todas las mañanas limpio los recintos.',
      '¿Me ayudás?',
    ])
  })

  it('has exactly three plates', () => {
    expect(PROLOGUE_PLATES.length).toBe(3)
  })

  // T36 (`odd/tasks/prewriting-stage-completion.md`, docs/18 D3): "el
  // Pulpito aparece dos veces en la primera lámina" — the first plate's own
  // bubble used to carry `ZOO_CARETAKER_ART`, the SAME character already
  // standing full-body on screen (`screen/PrologueOpening.tsx`). No plate's
  // bubble may repeat him.
  it('never repeats the caretaker inside his own bubble (docs/18 D3)', () => {
    for (const plate of PROLOGUE_PLATES) {
      expect(plate.art?.href).not.toBe('/art/zoo-octopus-caretaker.png')
    }
  })

  it('the first plate is text-only — no picture competes with the big standing caretaker', () => {
    expect(PROLOGUE_PLATES[0].art).toBeUndefined()
  })
})

describe('advancePlate', () => {
  it('steps forward through the plates', () => {
    expect(advancePlate(0)).toBe(1)
    expect(advancePlate(1)).toBe(2)
  })

  it('returns null once the last plate is tapped', () => {
    expect(advancePlate(2)).toBeNull()
  })

  it('returns null for an out-of-range index', () => {
    expect(advancePlate(99)).toBeNull()
  })
})
