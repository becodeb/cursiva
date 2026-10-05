// Speech-bubble content fit (prewriting-stage-completion T18). Node
// environment, no DOM — the same convention `bubblePlacement.test.ts`
// already uses for this same kind of pure placement math.
import { describe, expect, it } from 'vitest'
import {
  assignFloatingWordColumns,
  assignWordColumns,
  bubbleContentBox,
  CONTENT_HEIGHT_FRAC,
  CONTENT_WIDTH_FRAC,
  fitBubbleContent,
  IMAGE_MAX_WIDTH_FRAC,
  MAX_FONT_FRAC,
  placeAndFitBubble,
  TEXT_AREA_MARGIN_FRAC,
  wrapLineCount,
  ZOO_SPEECH_BUBBLE_LEFT_CONTENT,
  ZOO_SPEECH_BUBBLE_LEFT_TEXT_AREA,
  ZOO_SPEECH_BUBBLE_TEXT_AREA,
} from './bubbleFit'
import { ZOO_SPEECH_BUBBLE_LEFT_TAIL, ZOO_SPEECH_BUBBLE_TAIL } from './bubblePlacement'
import {
  OCTOPUS_CORNER_INSET,
  PROLOGUE_OCTOPUS_SIZE_PCT,
  octopusBoxAtCorner,
  stageBubbleFrame,
  stageSizePx,
  stanceBubbleSide,
} from './pulpitoStance'
import { placeStageBubble } from './stageBubble'
import { STAGE_VIEWPORTS, stageBubbleCases } from '../testing/stageBubbleCases'
import { ADVENTURES } from '../zoo/adventures'
import { PROLOGUE_PLATES } from '../zoo/prologue'
import { ZOO_CARETAKER_ART } from '../detective/assets'
import type { ArtImage } from '../detective/assets'
import { DETECTIVE_CASES } from '../detective/cases'
import { DEDUCTION_BUBBLE_MARGIN_FRAC, DEDUCTION_OPENING_LINE, deductionBubble, deductionBubbleLines } from './Deduction'
import { deductionFramePx } from './deductionLayout'

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

// [T51] The content box is the MEASURED text area (`bubbleArt.test.ts`
// proves every pixel of it is the bubble's white inside) inset by the same
// width-relative margin on every side.
describe('bubbleContentBox — the measured text area minus the inner margin', () => {
  for (const [name, area, tail] of [
    ['zoo-speech-bubble.png', ZOO_SPEECH_BUBBLE_TEXT_AREA, ZOO_SPEECH_BUBBLE_TAIL],
    ['zoo-speech-bubble-left.png', ZOO_SPEECH_BUBBLE_LEFT_TEXT_AREA, ZOO_SPEECH_BUBBLE_LEFT_TAIL],
  ] as const) {
    it(`${name}: the box sits TEXT_AREA_MARGIN_FRAC of the bubble width inside the area on every side`, () => {
      const box = bubbleContentBox(area, tail.aspect)
      const bubbleW = 100
      const bubbleH = bubbleW * tail.aspect
      const margin = TEXT_AREA_MARGIN_FRAC * bubbleW
      expect((box.left - area.left) * bubbleW).toBeCloseTo(margin, 9)
      expect((area.left + area.width - box.left - box.width) * bubbleW).toBeCloseTo(margin, 9)
      expect((box.top - area.top) * bubbleH).toBeCloseTo(margin, 9)
      expect((area.top + area.height - box.top - box.height) * bubbleH).toBeCloseTo(margin, 9)
    })
  }

  it('the left bubble uses its own box: a long line fits it at the font that box allows, not the old one', () => {
    const line = 'Alguien dejó lana enganchada en el alambrado de la ladera. ¿Vamos a ver?'
    const w = 80
    const fit = fitBubbleContent(line, undefined, w, w * ZOO_SPEECH_BUBBLE_LEFT_TAIL.aspect, ZOO_SPEECH_BUBBLE_LEFT_CONTENT)
    expect(fit.fits).toBe(true)
    expect(fit.captionWidth).toBeCloseTo(w * ZOO_SPEECH_BUBBLE_LEFT_CONTENT.width, 9)
    expect(fit.blockHeight).toBeLessThanOrEqual(w * ZOO_SPEECH_BUBBLE_LEFT_TAIL.aspect * ZOO_SPEECH_BUBBLE_LEFT_CONTENT.height + 1e-9)
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

describe('fitBubbleContent — art absent (T21 follow-up round 3): a TEXT-ONLY bubble', () => {
  // The exact regression this mode exists to fix: a real browser rendered
  // "La vaca no tiene plumas: no fue ella." (screen/Deduction.tsx's own
  // feather-clue hint, paired with the feather art, aspect ~2.5) BELOW the
  // drawn bubble oval even though fitBubbleContent's own float/stack model
  // reported fits: true — the model's character-count wrap and the real
  // CSS float interaction quietly disagreed for a tall, narrow image.
  // Passing no `art` at all removes every float/wrap interaction this
  // computation ever had to get exactly right.
  const HINT = 'La vaca no tiene plumas: no fue ella.'
  const bubbleWidth = 78
  const bubbleHeight = bubbleWidth * (372 / 488)

  it('reports a zero-size image — nothing to float, nothing to push the caption down', () => {
    const fit = fitBubbleContent(HINT, undefined, bubbleWidth, bubbleHeight)
    expect(fit.imageWidth).toBe(0)
    expect(fit.imageHeight).toBe(0)
  })

  it('fits, using the FULL content width for every line (no narrow column at all)', () => {
    const fit = fitBubbleContent(HINT, undefined, bubbleWidth, bubbleHeight)
    expect(fit.fits).toBe(true)
    expect(fit.captionWidth).toBeCloseTo(bubbleWidth * CONTENT_WIDTH_FRAC, 6)
  })

  it('the wrapped block height, at the FULL content width, is comfortably under the content box (the real overflow this mode fixes)', () => {
    const fit = fitBubbleContent(HINT, undefined, bubbleWidth, bubbleHeight)
    const contentHeight = bubbleHeight * CONTENT_HEIGHT_FRAC
    expect(fit.lineCount * fit.fontSize * fit.lineHeight).toBeLessThanOrEqual(contentHeight + 1e-6)
  })

  it('never breaks a word, the same contract an image-carrying bubble keeps', () => {
    const fit = fitBubbleContent(HINT, undefined, bubbleWidth, bubbleHeight)
    const assignments = assignWordColumns(HINT, fit.fontSize, fit.captionWidth)
    expect(assignments.map((a) => a.word)).toEqual(HINT.split(' ').filter((w) => w.length > 0))
    for (const { width, columnWidth } of assignments) {
      expect(width).toBeLessThanOrEqual(columnWidth + 1e-6)
    }
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

// T34 (`odd/tasks/prewriting-stage-completion.md`): the closing bubble's own
// reported bug — a short rescue line sat at the TOP of the oval with empty
// space below it, because nothing ever reported how much of the content box
// the block actually used. `blockHeight` is the field `bubbleCssVars.ts`
// reads to center it.
describe('fitBubbleContent — blockHeight (T34, centering the content block)', () => {
  const bubbleWidth = 78
  const bubbleHeight = bubbleWidth * (372 / 488)
  const contentHeight = bubbleHeight * CONTENT_HEIGHT_FRAC

  it('a short, text-only line (the rescue beat\'s own case) reports a block far shorter than the content box — the gap `bubbleCssVars.ts` centers away', () => {
    const fit = fitBubbleContent('¡Lo encontramos!', undefined, bubbleWidth, bubbleHeight)
    expect(fit.layout).toBe('float')
    expect(fit.blockHeight).toBeCloseTo(fit.lineCount * fit.fontSize * fit.lineHeight, 6)
    expect(fit.blockHeight).toBeLessThan(contentHeight * 0.6)
  })

  it('FLOAT: blockHeight is the taller of the image and the wrapped text, never their sum', () => {
    const fit = fitBubbleContent('Hola', SQUARE_ART, bubbleWidth, bubbleHeight)
    expect(fit.layout).toBe('float')
    const textHeight = fit.lineCount * fit.fontSize * fit.lineHeight
    expect(fit.blockHeight).toBeCloseTo(Math.max(fit.imageHeight, textHeight), 6)
    expect(fit.blockHeight).toBeLessThan(fit.imageHeight + textHeight)
  })

  it('STACK: blockHeight is the image plus the gap plus the wrapped text (they genuinely add up)', () => {
    const longLine =
      'Encontramos todas las pistas del pato en el sendero y ahora sabemos exactamente a quién rescatamos hoy, así que volvamos al zoológico'
    const fit = fitBubbleContent(longLine, SQUARE_ART, bubbleWidth, bubbleHeight)
    expect(fit.layout).toBe('stack')
    const textHeight = fit.lineCount * fit.fontSize * fit.lineHeight
    expect(fit.blockHeight).toBeCloseTo(fit.imageHeight + bubbleWidth * 0.04 + textHeight, 6)
  })

  it('never exceeds the content box height when fits is true (the box centering leans on)', () => {
    for (const [text, art] of [
      ['Hola', undefined],
      ['¡Encontramos al pato en el sendero!', SQUARE_ART],
      ['La vaca no tiene plumas: no fue ella.', undefined],
    ] as const) {
      const fit = fitBubbleContent(text, art, bubbleWidth, bubbleHeight)
      if (fit.fits) expect(fit.blockHeight).toBeLessThanOrEqual(contentHeight + 1e-6)
    }
  })
})

// [T51] Every entry/closing line through `placeStageBubble`, the one call
// both screens render (the old sweep restated their geometry by hand, and so
// missed the left bubble's own text area): at every required size, in both
// stances, the text fits the left bubble's MEASURED text area with at least
// 8 px of margin, at a readable font, and no word ever breaks.
describe('placeStageBubble — every real intro/closing line in the registry, at every required viewport', () => {
  const cases = stageBubbleCases()

  it('the registry sweep actually covers every shipped adventure (sanity: not accidentally empty)', () => {
    expect(cases.length).toBeGreaterThanOrEqual(ADVENTURES.length)
  })

  for (const corner of ['left', 'right'] as const) {
    for (const viewport of STAGE_VIEWPORTS) {
      const size = `${viewport.width}x${viewport.height}`
      it(`corner=${corner} viewport=${size}: every line fits inside the text area with an 8 px margin, at a readable font size`, () => {
        const framePx = stageSizePx(viewport.width, viewport.height)
        for (const { id, text, art, figure } of cases) {
          const { placement, content } = placeStageBubble({ figure, corner, viewport, text, art })
          const fontPx = (content.fontSize / 100) * framePx
          expect(content.fits, `${id} (fontPx=${fontPx.toFixed(1)})`).toBe(true)
          expect(content.blockHeight, id).toBeLessThanOrEqual(placement.height * ZOO_SPEECH_BUBBLE_LEFT_CONTENT.height + 1e-6)
          // 11px is the floor at 844x390 (this app's tightest tier).
          expect(fontPx, `${id} (${size})`).toBeGreaterThanOrEqual(11)
          const marginPx = TEXT_AREA_MARGIN_FRAC * (placement.width / 100) * framePx
          expect(marginPx, `${id} (${size}) margin`).toBeGreaterThanOrEqual(8)
        }
      })

      // Orchestrator follow-up (T18): a word must NEVER break inside a line —
      // this is an app for children learning to read. Checked PER WORD,
      // against the exact column the wrap the fit chose placed it on.
      it(`corner=${corner} viewport=${size}: no word ever breaks inside a line`, () => {
        for (const { id, text, art, figure } of cases) {
          const { placement, content } = placeStageBubble({ figure, corner, viewport, text, art })
          const wideWidth = placement.width * ZOO_SPEECH_BUBBLE_LEFT_CONTENT.width
          const assignments =
            content.layout === 'float'
              ? assignFloatingWordColumns(text, content.fontSize, content.captionWidth, wideWidth, content.imageHeight, content.lineHeight)
              : assignWordColumns(text, content.fontSize, content.captionWidth)
          expect(assignments.length, id).toBe(text.split(' ').filter((w) => w.length > 0).length)
          for (const { word, width, columnWidth } of assignments) {
            expect(width, `${id} (${corner}, ${size}): "${word}" vs its own column`).toBeLessThanOrEqual(columnWidth + 1e-6)
          }
        }
      })
    }
  }

  it('never leaves the screen: the bubble stays inside the stage top and the screen right edge', () => {
    for (const viewport of STAGE_VIEWPORTS) {
      const frame = stageBubbleFrame(viewport)
      for (const { id, text, art, figure } of cases) {
        const { placement } = placeStageBubble({ figure, corner: 'left', viewport, text, art })
        expect(placement.top, id).toBeGreaterThanOrEqual(3 - 1e-6)
        expect(placement.left + placement.width, id).toBeLessThanOrEqual(frame.w - 3 + 1e-6)
      }
    }
  })

  it('without a viewport (SSR) the bubble stays inside the plain square stage', () => {
    for (const { id, text, art, figure } of cases) {
      const { placement } = placeStageBubble({ figure, corner: 'left', viewport: undefined, text, art })
      expect(placement.left + placement.width, id).toBeLessThanOrEqual(97 + 1e-6)
    }
  })
})

// T36 (`odd/tasks/prewriting-stage-completion.md`, docs/18 D3):
// screen/PrologueOpening.tsx now calls this SAME engine, but with its own
// geometry — the caretaker (`ZOO_CARETAKER_ART`) sized BY HEIGHT
// (`PROLOGUE_OCTOPUS_SIZE_PCT`), always in the LEFT corner, never varied —
// the same "build the exact octopusBoxAtCorner/frame-size pair the screen
// actually renders with" precedent `screen/Deduction.tsx`'s own dedicated
// block below already establishes, restated here rather than folded into
// the generic sweep above (this file's own comment on why, above).
describe("placeAndFitBubble — screen/PrologueOpening.tsx's own bubble lines, at its own real stage size", () => {
  const REQUIRED_VIEWPORTS: ReadonlyArray<readonly [number, number]> = [
    [1024, 768],
    [1180, 820],
    [768, 1024],
    [1920, 911],
    [844, 390],
  ]

  it('the registry sweep actually covers every shipped plate (sanity: not accidentally empty)', () => {
    expect(PROLOGUE_PLATES.length).toBeGreaterThanOrEqual(3)
  })

  const octopusBox = octopusBoxAtCorner(ZOO_CARETAKER_ART, {
    corner: 'left',
    sizeBy: 'height',
    size: PROLOGUE_OCTOPUS_SIZE_PCT,
    bottom: 2,
    inset: OCTOPUS_CORNER_INSET,
  })
  const side = stanceBubbleSide('left')

  for (const [vw, vh] of REQUIRED_VIEWPORTS) {
    it(`viewport=${vw}x${vh}: every plate fits, at a readable font size, no word ever breaks`, () => {
      const frame = { w: 100, h: 100 }
      const framePx = stageSizePx(vw, vh)

      for (const plate of PROLOGUE_PLATES) {
        const { placement, content } = placeAndFitBubble({
          frame,
          headBox: octopusBox,
          tail: ZOO_SPEECH_BUBBLE_TAIL,
          side,
          text: plate.line,
          art: plate.art,
        })
        const fontPx = (content.fontSize / 100) * framePx
        expect(content.fits, `${plate.line} (fontPx=${fontPx.toFixed(1)})`).toBe(true)
        expect(fontPx, `${plate.line} (${vw}x${vh})`).toBeGreaterThanOrEqual(11)
        // [T51] the measured text area's margin, in real px.
        expect(TEXT_AREA_MARGIN_FRAC * (placement.width / 100) * framePx, `${plate.line} margin`).toBeGreaterThanOrEqual(8)

        const wideWidth = placement.width * CONTENT_WIDTH_FRAC
        const assignments =
          content.layout === 'float'
            ? assignFloatingWordColumns(plate.line, content.fontSize, content.captionWidth, wideWidth, content.imageHeight, content.lineHeight)
            : assignWordColumns(plate.line, content.fontSize, content.captionWidth)
        expect(assignments.length, plate.line).toBe(plate.line.split(' ').filter((w) => w.length > 0).length)
        for (const { word, width, columnWidth } of assignments) {
          expect(width, `${plate.line} (${vw}x${vh}): "${word}" vs its own column`).toBeLessThanOrEqual(columnWidth + 1e-6)
        }
      }
    })
  }
})

// [T21 follow-up round 3, orchestrator screenshot review 2026-09-26: "every
// deduction line must pass the SAME fit check T18's test uses... make sure
// its model matches the deduction layout you ship"] screen/Deduction.tsx's
// own Pulpito stage is a DIFFERENT, smaller size than every screen the sweep
// above validates (its own exported DEDUCTION_STAGE_DVH/
// DEDUCTION_OCTOPUS_SIZE_PCT, sizeBy: 'height', corner always 'left', never
// varied) — this block builds the EXACT same octopusBoxAtCorner/frame-size
// pair that screen actually renders with, text only (no `art`, matching
// deductionHint's own return type), so a drifted geometry here is a drifted
// geometry the shipped screen would ALSO hit.
describe("placeAndFitBubble — screen/Deduction.tsx's own bubble lines, at its own real stage size", () => {
  const REQUIRED_VIEWPORTS: ReadonlyArray<readonly [number, number]> = [
    [1024, 768],
    [1180, 820],
    [768, 1024],
    [1920, 911],
    [844, 390],
  ]

  const lines: { readonly id: string; readonly text: string }[] = [
    { id: 'opening', text: DEDUCTION_OPENING_LINE },
  ]
  for (const kase of DETECTIVE_CASES) {
    // [T46] The case's own question and solved line too (deductionBubbleLines,
    // the same list the screen's layout keeps clear), plus every hint the
    // registry carries, including the night case's off-lineup candidates.
    deductionBubbleLines(kase).forEach((text, i) => lines.push({ id: `${kase.id} line ${i}`, text }))
    for (const [animal, hintText] of Object.entries(kase.hint)) {
      if (hintText) lines.push({ id: `${kase.id} hint (${animal})`, text: hintText })
    }
  }

  it('the sweep actually covers every shipped case (sanity: not accidentally empty)', () => {
    expect(lines.length).toBeGreaterThanOrEqual(DETECTIVE_CASES.length * 2)
  })

  // [T51] Through `deductionBubble` itself, the exact call the screen makes.
  for (const [vw, vh] of REQUIRED_VIEWPORTS) {
    it(`viewport=${vw}x${vh}: every line fits inside the drawn oval, at a readable font size, no word ever breaks`, () => {
      // [T46] The frame's px side comes from the SAME function the screen
      // positions it with (deductionLayout.ts), never a restated formula.
      const framePx = deductionFramePx({ w: vw, h: vh })

      for (const { id, text } of lines) {
        const { placement, content } = deductionBubble(text)
        const fontPx = (content.fontSize / 100) * framePx
        expect(content.fits, `${id} (fontPx=${fontPx.toFixed(1)})`).toBe(true)
        expect(fontPx, `${id} (${vw}x${vh})`).toBeGreaterThanOrEqual(11)
        // [T51] Inside the measured text area by this screen's own smaller
        // margin (`DEDUCTION_BUBBLE_MARGIN_FRAC`, T51's 8 px brief covers the
        // entry, closing and prologue screens): never touching it.
        expect(DEDUCTION_BUBBLE_MARGIN_FRAC * (placement.width / 100) * framePx, `${id} margin`).toBeGreaterThanOrEqual(3)

        const assignments = assignWordColumns(text, content.fontSize, content.captionWidth)
        expect(assignments.length, id).toBe(text.split(' ').filter((w) => w.length > 0).length)
        for (const { word, width, columnWidth } of assignments) {
          expect(width, `${id} (${vw}x${vh}): "${word}" vs its own column`).toBeLessThanOrEqual(columnWidth + 1e-6)
        }
      }
    })
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
