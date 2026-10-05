// notebookDiscovery tests (`odd/tasks/prewriting-stage-completion.md` T31).
// Node environment, no DOM.
import { describe, expect, it } from 'vitest'
import { hasOpenedNotebookOnce, markNotebookOpenedOnce, NOTEBOOK_HINT_LINE, type StorageLike } from './notebookDiscovery'
import { placeAndFitBubble } from './bubbleFit'
import {
  OCTOPUS_CORNER_INSET,
  octopusBoxAtCorner,
  RESCUE_OCTOPUS_ART,
  stageOctopusSizing,
  stageSizePx,
  stanceBubbleSide,
} from './pulpitoStance'
import { ZOO_SPEECH_BUBBLE_LEFT_TAIL } from './bubblePlacement'
import { ADVENTURES } from '../zoo/adventures'

/** An in-memory fake, the same shape `window.localStorage` exposes for the
 *  two methods this module ever calls. */
function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

function throwingStorage(): StorageLike {
  return {
    getItem: () => {
      throw new Error('boom')
    },
    setItem: () => {
      throw new Error('boom')
    },
  }
}

describe('hasOpenedNotebookOnce / markNotebookOpenedOnce', () => {
  it('is false for a fresh storage', () => {
    expect(hasOpenedNotebookOnce(fakeStorage())).toBe(false)
  })

  it('marking it records the discovery, read back true afterwards', () => {
    const storage = fakeStorage()
    expect(hasOpenedNotebookOnce(storage)).toBe(false)
    markNotebookOpenedOnce(storage)
    expect(hasOpenedNotebookOnce(storage)).toBe(true)
  })

  it('marking it twice is idempotent', () => {
    const storage = fakeStorage()
    markNotebookOpenedOnce(storage)
    markNotebookOpenedOnce(storage)
    expect(hasOpenedNotebookOnce(storage)).toBe(true)
  })

  it('is false for null/undefined storage (SSR, no window) — never throws', () => {
    expect(hasOpenedNotebookOnce(null)).toBe(false)
    expect(hasOpenedNotebookOnce(undefined)).toBe(false)
    expect(() => markNotebookOpenedOnce(null)).not.toThrow()
    expect(() => markNotebookOpenedOnce(undefined)).not.toThrow()
  })

  it('is false, and never throws, for a storage that throws on every access (private browsing / full quota)', () => {
    const storage = throwingStorage()
    expect(hasOpenedNotebookOnce(storage)).toBe(false)
    expect(() => markNotebookOpenedOnce(storage)).not.toThrow()
  })

  it('does not read another key\'s value as a false positive', () => {
    const storage = fakeStorage({ 'cv-notebook-opened-once': 'yes-please' })
    expect(hasOpenedNotebookOnce(storage)).toBe(false)
  })
})

// "it must pass the bubbleFit sweep" (the task's own brief): the SAME fit
// engine `bubbleFit.test.ts`'s own registry sweep runs, applied to the
// WORST CASE this hint is ever appended to — the longest real animal-
// recovering closing line in the registry (dolphin's, at 65 characters) —
// at every required viewport and both Pulpito corners, text-only (no `art`,
// matching AdventureClosing.tsx's own rescue-beat call: `art: isRescue ?
// undefined : beat.art`).
describe('NOTEBOOK_HINT_LINE — fits the closing bubble even appended to the longest real rescue line', () => {
  const REQUIRED_VIEWPORTS: ReadonlyArray<readonly [number, number]> = [
    [1024, 768],
    [1180, 820],
    [768, 1024],
    [844, 390],
  ]

  const rescueLines = ADVENTURES.filter((a) => a.animal !== undefined).flatMap(
    (a) => a.closingBeat?.map((b) => b.line) ?? [],
  )

  it('the registry sweep actually covers at least one rescue line (sanity: not accidentally empty)', () => {
    expect(rescueLines.length).toBeGreaterThan(0)
  })

  const longestLine = rescueLines.reduce((longest, line) => (line.length > longest.length ? line : longest), '')
  const combined = `${longestLine} ${NOTEBOOK_HINT_LINE}`

  for (const corner of ['left', 'right'] as const) {
    for (const [vw, vh] of REQUIRED_VIEWPORTS) {
      it(`corner=${corner} viewport=${vw}x${vh}: the longest rescue line + the hint still fits, at a readable font size`, () => {
        const frame = { w: 100, h: 100 }
        const headBox = octopusBoxAtCorner(RESCUE_OCTOPUS_ART, {
          corner,
          ...stageOctopusSizing(RESCUE_OCTOPUS_ART),
          bottom: 2,
          inset: OCTOPUS_CORNER_INSET,
        })
        const side = stanceBubbleSide(corner)
        const framePx = stageSizePx(vw, vh)
        const { content } = placeAndFitBubble({ frame, headBox, tail: ZOO_SPEECH_BUBBLE_LEFT_TAIL, side, text: combined })
        const fontPx = (content.fontSize / 100) * framePx
        expect(content.fits, `fontPx=${fontPx.toFixed(1)}`).toBe(true)
        expect(fontPx, `${vw}x${vh}`).toBeGreaterThanOrEqual(11)
      })
    }
  }
})
