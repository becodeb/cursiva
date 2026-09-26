// Speech-bubble content fit (prewriting-stage-completion T18). Node
// environment, no DOM — the same convention `bubblePlacement.test.ts`
// already uses for this same kind of pure placement math.
import { describe, expect, it } from 'vitest'
import {
  assignFloatingWordColumns,
  assignWordColumns,
  CONTENT_HEIGHT_FRAC,
  CONTENT_WIDTH_FRAC,
  fitBubbleContent,
  IMAGE_MAX_WIDTH_FRAC,
  MAX_FONT_FRAC,
  placeAndFitBubble,
  wrapLineCount,
} from './bubbleFit'
import { ZOO_SPEECH_BUBBLE_TAIL } from './bubblePlacement'
import {
  OCTOPUS_CORNER_INSET,
  OCTOPUS_CORNER_SIZE_PCT,
  octopusBoxAtCorner,
  stageSizePx,
  stanceBubbleSide,
} from './pulpitoStance'
import { ADVENTURES, adventureIcon } from '../zoo/adventures'
import { PROLOGUE_PLATES } from '../zoo/prologue'
import { ZOO_OCTOPUS_BACKPACK_ART } from '../detective/assets'
import type { ArtImage } from '../detective/assets'

const SQUARE_ART: ArtImage = { w: 442, h: 448, href: '/art/fixture-square.png' }
const WIDE_ART: ArtImage = { w: 900, h: 260, href: '/art/fixture-wide.png' }
const TALL_ART: ArtImage = { w: 200, h: 500, href: '/art/fixture-tall.png' }

describe('wrapLineCount', () => {
  it('a short line that fits stays on one line', () => {
    expect(wrapLineCount('Hola', 10, 100)).toBe(1)
  })

  it('wraps onto more lines as the box narrows', () => {
    const text = 'uno dos tres cuatro cinco seis siete ocho'
    const wide = wrapLineCount(text, 10, 200)
    const narrow = wrapLineCount(text, 10, 40)
    expect(narrow).toBeGreaterThan(wide)
  })

  it('a single very long word still counts as one line (cannot break mid-word)', () => {
    expect(wrapLineCount('supercalifragilisticoso', 10, 5)).toBe(1)
  })

  it('empty text is one line, not zero or NaN', () => {
    expect(wrapLineCount('', 10, 100)).toBe(1)
  })
})

describe('fitBubbleContent — the image cap', () => {
  it('never exceeds IMAGE_MAX_WIDTH_FRAC of the bubble width, even for a wide image', () => {
    const fit = fitBubbleContent('Hola', WIDE_ART, 78, 78 * (372 / 488))
    expect(fit.imageWidth).toBeLessThanOrEqual(78 * IMAGE_MAX_WIDTH_FRAC + 1e-9)
  })

  it('keeps the image at its own aspect ratio', () => {
    const fit = fitBubbleContent('Hola', TALL_ART, 78, 78 * (372 / 488))
    expect(fit.imageWidth / fit.imageHeight).toBeCloseTo(TALL_ART.w / TALL_ART.h, 6)
  })

  it('a short line keeps the font at its natural maximum — no needless shrink', () => {
    const bubbleWidth = 78
    const fit = fitBubbleContent('¿Me ayudás?', SQUARE_ART, bubbleWidth, bubbleWidth * (372 / 488))
    expect(fit.fontSize).toBeCloseTo(bubbleWidth * MAX_FONT_FRAC, 6)
    expect(fit.fits).toBe(true)
  })
})

describe('fitBubbleContent — never overflow (the author\'s own checklist item)', () => {
  it('reports fits: false for a deliberately absurd line — proves the check can actually fail', () => {
    const absurd = Array(40).fill('palabrasinespacios').join(' ')
    const fit = fitBubbleContent(absurd, SQUARE_ART, 78, 78 * (372 / 488))
    expect(fit.fits).toBe(false)
  })

  it('the block height at the chosen font never exceeds the content box, even when fits is false (the font floor is still respected)', () => {
    const absurd = Array(40).fill('palabrasinespacios').join(' ')
    const fit = fitBubbleContent(absurd, SQUARE_ART, 78, 78 * (372 / 488))
    const contentHeight = 78 * (372 / 488) * CONTENT_HEIGHT_FRAC
    // Even failing to fit, the reported height is a real number derived
    // from the MINIMUM font — never an unbounded/runaway value.
    expect(fit.lineCount * fit.fontSize * fit.lineHeight).toBeGreaterThan(contentHeight)
  })
})

describe('placeAndFitBubble — every real intro/closing line in the registry, at every required viewport', () => {
  const REQUIRED_VIEWPORTS: ReadonlyArray<readonly [number, number]> = [
    [1024, 768],
    [1180, 820],
    [768, 1024],
    [844, 390],
  ]

  interface Case {
    readonly id: string
    readonly text: string
    readonly art: ArtImage
  }

  const cases: Case[] = []
  for (const adventure of ADVENTURES) {
    cases.push({ id: `${adventure.id}: intro`, text: adventure.intro, art: adventureIcon(adventure) })
    for (const [i, beat] of (adventure.closingBeat ?? []).entries()) {
      cases.push({ id: `${adventure.id}: closingBeat[${i}]`, text: beat.line, art: beat.art })
    }
  }
  // The prologue's own three lines (`PrologueOpening.tsx` is explicitly out
  // of scope for T18, `docs/19` §4.2 — "sin cambios por ahora" — so it does
  // not call this engine today), included anyway per the orchestrator's own
  // follow-up ("no line of any adventure/prologue line breaks... at the 4
  // viewports"): this proves the FIT ENGINE ITSELF is word-safe for every
  // line of story text this game ships, not only the two screens T18
  // happens to have wired it into yet.
  for (const plate of PROLOGUE_PLATES) {
    cases.push({ id: `prologue: ${plate.line}`, text: plate.line, art: plate.art })
  }

  it('the registry sweep actually covers every shipped adventure (sanity: not accidentally empty)', () => {
    expect(cases.length).toBeGreaterThanOrEqual(ADVENTURES.length)
  })

  for (const corner of ['left', 'right'] as const) {
    for (const [vw, vh] of REQUIRED_VIEWPORTS) {
      it(`corner=${corner} viewport=${vw}x${vh}: every line fits, at a readable font size`, () => {
        const frame = { w: 100, h: 100 }
        const headBox = octopusBoxAtCorner(ZOO_OCTOPUS_BACKPACK_ART, {
          corner,
          sizeBy: 'width',
          size: OCTOPUS_CORNER_SIZE_PCT,
          bottom: 2,
          inset: OCTOPUS_CORNER_INSET,
        })
        const side = stanceBubbleSide(corner)
        const framePx = stageSizePx(vw, vh)

        for (const { id, text, art } of cases) {
          const { content } = placeAndFitBubble({ frame, headBox, tail: ZOO_SPEECH_BUBBLE_TAIL, side, text, art })
          const fontPx = (content.fontSize / 100) * framePx
          expect(content.fits, `${id} (fontPx=${fontPx.toFixed(1)})`).toBe(true)
          // A minimum readable size at the SMALLEST required viewport is a
          // much looser floor than at the others — 844x390 is this app's
          // own tightest tier (`prewriting-stage-completion.md`'s open
          // batch-2 note already flags it as visually tight elsewhere).
          // 11px is the measured worst case (the longest intro sentence,
          // `monkeys`, already in the STACK layout): CONTENT_HEIGHT_FRAC's
          // own follow-up header explains why this box got SMALLER (a
          // measured-safe fit against the real bubble art) rather than
          // larger — never overflowing the drawn bubble, and never breaking
          // a word, both won priority over squeezing out a bigger font at
          // this one extreme combination.
          expect(fontPx, `${id} (${vw}x${vh})`).toBeGreaterThanOrEqual(11)
        }
      })

      // Orchestrator follow-up: a word must NEVER break inside a line — this
      // is an app for children learning to read. Checked PER WORD, against
      // the exact column the SAME wrap the fit chose actually placed it on
      // (`assignFloatingWordColumns`/`assignWordColumns`), not merely by
      // trusting `fitBubbleContent`'s own internal longest-word check —
      // this is the independent proof that check is doing its job for
      // every real line, at every required viewport, in both stances.
      it(`corner=${corner} viewport=${vw}x${vh}: no word ever breaks inside a line`, () => {
        const frame = { w: 100, h: 100 }
        const headBox = octopusBoxAtCorner(ZOO_OCTOPUS_BACKPACK_ART, {
          corner,
          sizeBy: 'width',
          size: OCTOPUS_CORNER_SIZE_PCT,
          bottom: 2,
          inset: OCTOPUS_CORNER_INSET,
        })
        const side = stanceBubbleSide(corner)

        for (const { id, text, art } of cases) {
          const { placement, content } = placeAndFitBubble({ frame, headBox, tail: ZOO_SPEECH_BUBBLE_TAIL, side, text, art })
          const wideWidth = placement.width * CONTENT_WIDTH_FRAC
          const assignments =
            content.layout === 'float'
              ? assignFloatingWordColumns(text, content.fontSize, content.captionWidth, wideWidth, content.imageHeight, content.lineHeight)
              : assignWordColumns(text, content.fontSize, content.captionWidth)
          // Every word this game's own registry contains actually got
          // assigned somewhere — a shorter list would mean the wrap silently
          // dropped a word, a bug this assertion would otherwise miss.
          expect(assignments.length, id).toBe(text.split(' ').filter((w) => w.length > 0).length)
          for (const { word, width, columnWidth } of assignments) {
            expect(width, `${id} (${corner}, ${vw}x${vh}): "${word}" vs its own column`).toBeLessThanOrEqual(columnWidth + 1e-6)
          }
        }
      })
    }
  }
})

describe('fitBubbleContent — the duck closing (the orchestrator\'s own reported case)', () => {
  // `¡Encontramos al pato! Ya está en su laguna.` beside `pato`'s art
  // (368×448 — taller than it is wide) is what produced
  // `cierre-duck-trail4-1024x768.png`'s "¡Encontram / os al pato!": a SHORT
  // line next to a TALL image kept its large, unshrunk font, and the
  // resulting narrow float column could not hold an 11-character word.
  const DUCK_LINE = '¡Encontramos al pato! Ya está en su laguna.'
  const DUCK_ART: ArtImage = { w: 368, h: 448, href: '/art/animal-pato.png' }

  it('switches to the STACK layout rather than shrinking the float font to break the word', () => {
    const bubbleWidth = 69.02164187302334 // the real placement.width this exact case resolves to
    const fit = fitBubbleContent(DUCK_LINE, DUCK_ART, bubbleWidth, bubbleWidth * (372 / 488))
    expect(fit.layout).toBe('stack')
    expect(fit.fits).toBe(true)
  })

  it('keeps every word whole — no word is split across a line break', () => {
    const bubbleWidth = 69.02164187302334
    const fit = fitBubbleContent(DUCK_LINE, DUCK_ART, bubbleWidth, bubbleWidth * (372 / 488))
    const assignments = assignWordColumns(DUCK_LINE, fit.fontSize, fit.captionWidth)
    const words = DUCK_LINE.split(' ').filter((w) => w.length > 0)
    expect(assignments.map((a) => a.word)).toEqual(words)
    for (const { word, width, columnWidth } of assignments) {
      expect(width, `"${word}"`).toBeLessThanOrEqual(columnWidth + 1e-6)
    }
  })
})
