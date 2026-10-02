// The deduction screen's own geometry (`odd/tasks/prewriting-stage-
// completion.md` T46: "the collected clues presented BIG ... clearly
// separated from the choices ... must fit 1024x768, 768x1024 and a
// landscape phone with no overlap or overflow, Pulpito and bubble never
// covering evidence or cards"). Pure, no React, no DOM: every rectangle the
// screen draws is decided here, in CSS px, from the viewport and the case's
// counts, so `deductionLayout.test.ts` can prove "nothing overlaps, nothing
// leaves the screen" for every shipped case at every required viewport
// without a browser, and the browser check only has to confirm the DOM
// agrees with these numbers.
//
// The screen has four parts:
//  - Pulpito's corner stage (octopus + speech bubble), bottom-left, sized and
//    placed by the SAME `octopusBoxAtCorner`/`placeAndFitBubble` engine every
//    narrative screen uses. Its occupied rectangle is the union of the
//    octopus and EVERY bubble the case can show (opening question, each wrong
//    pick's reason, the solved line), so the cards never jump when the line
//    changes.
//  - The evidence board: the clues the child collected, as big pinned
//    "photos" on a kraft-paper board with Pulpito's lens on its top edge.
//  - The choice group: a prompt pill ("Tocá quién fue", with a pointing
//    hand) above the option cards.
//  - For a `comparison` case only, an "=" badge between the sample on the
//    board and the candidates, so the screen reads "this = which of these?".
//
// `deductionLayout` tries two arrangements (board ABOVE the choices, or
// board BESIDE them), each at a sweep of split positions and in each free
// region the corner stage leaves, and keeps the one whose smaller picture
// (clue tile or option picture) is largest. Board-above is preferred for
// silhouette/sign cases (evidence first, then the question), board-beside
// for comparisons (the sample next to its candidates).
import type { DeductionForm } from '../detective/cases'
import type { Box, BubblePlacement } from './bubblePlacement'
import { STAGE_MARGIN_PCT } from './pulpitoStance'

export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface Viewport {
  readonly w: number
  readonly h: number
}

/** Pulpito's corner frame: a square of `DEDUCTION_STAGE_DVH`% of the
 *  viewport's height (the octopus is `DEDUCTION_OCTOPUS_SIZE_PCT`% of it,
 *  ~24% of the screen: he narrates here, he is not the star). */
export const DEDUCTION_STAGE_DVH = 48
export const DEDUCTION_OCTOPUS_SIZE_PCT = 50
/** A floor under the frame's own size, in real px — without it a SHORT
 *  landscape phone (844x390) scales the frame down until its bubble's font
 *  drops under the 11px readability floor `bubbleFit.test.ts` enforces. */
export const DEDUCTION_STAGE_MIN_PX = 280
/** [T46] A cap by WIDTH too: on a portrait tablet 48dvh is 491px, half the
 *  sheet's width, and the evidence and the choices need that room more than
 *  the narrator does. Inactive on every landscape viewport. */
export const DEDUCTION_STAGE_MAX_VW = 50

/** The frame's side in px: `min(100vw, max(280px, min(48dvh, 50vw)))`. */
export function deductionFramePx(vp: Viewport): number {
  const preferred = Math.min((vp.h * DEDUCTION_STAGE_DVH) / 100, (vp.w * DEDUCTION_STAGE_MAX_VW) / 100)
  return Math.min(vp.w, Math.max(DEDUCTION_STAGE_MIN_PX, preferred))
}

/** The frame's own rectangle: bottom-left, `STAGE_MARGIN_PCT`% of the
 *  viewport's height above the bottom edge. */
export function deductionFrameRect(vp: Viewport): Rect {
  const side = deductionFramePx(vp)
  return { x: 0, y: vp.h - (vp.h * STAGE_MARGIN_PCT) / 100 - side, w: side, h: side }
}

function frameToPx(frame: Rect, box: { x: number; y: number; w: number; h: number }): Rect {
  return {
    x: frame.x + (box.x / 100) * frame.w,
    y: frame.y + (box.y / 100) * frame.h,
    w: (box.w / 100) * frame.w,
    h: (box.h / 100) * frame.h,
  }
}

export function unionRect(rects: readonly Rect[]): Rect {
  const x0 = Math.min(...rects.map((r) => r.x))
  const y0 = Math.min(...rects.map((r) => r.y))
  const x1 = Math.max(...rects.map((r) => r.x + r.w))
  const y1 = Math.max(...rects.map((r) => r.y + r.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * Everything Pulpito's corner stage paints, in viewport px: the octopus box
 * and every bubble placement the case can show (percent-of-frame boxes, the
 * units `octopusBoxAtCorner`/`placeAndFitBubble` already return).
 */
export function pulpitoZonePx(vp: Viewport, octopusBox: Box, bubbles: readonly BubblePlacement[]): Rect {
  const frame = deductionFrameRect(vp)
  const rects = [frameToPx(frame, octopusBox)]
  for (const b of bubbles) rects.push(frameToPx(frame, { x: b.left, y: b.top, w: b.width, h: b.height }))
  return unionRect(rects)
}

/** Spacing, px. A short landscape phone (height <= 520, the same breakpoint
 *  `LevelPlay`'s chrome tightens at) gets the compact set. */
export interface DeductionMetrics {
  readonly compact: boolean
  /** Distance kept from the viewport's left/right/bottom edges. */
  readonly margin: number
  /** The top band the back and speak buttons live in. */
  readonly top: number
  /** Between the board, the choice group and Pulpito's stage. */
  readonly gap: number
  readonly boardPad: number
  /** Pulpito's lens badge, straddling the board's top edge. */
  readonly badge: number
  readonly clueGap: number
  readonly promptHeight: number
  readonly promptGap: number
  readonly cardPadX: number
  readonly cardPadTop: number
  /** Includes the card's thick bottom "lip" (`.animal-btn`'s own CSS). */
  readonly cardPadBottom: number
  readonly cardGap: number
  /** The comparison "=" badge's side. */
  readonly relation: number
  readonly minCaptionFont: number
  readonly maxCaptionFont: number
  readonly maxClue: number
  readonly maxPicture: number
  readonly promptFont: number
}

export function deductionMetrics(vp: Viewport): DeductionMetrics {
  const compact = vp.h <= 520
  const short = Math.min(vp.w, vp.h)
  return compact
    ? {
        compact,
        margin: 12,
        top: 56,
        gap: 10,
        boardPad: 10,
        badge: 40,
        clueGap: 10,
        promptHeight: 34,
        promptGap: 8,
        cardPadX: 8,
        cardPadTop: 8,
        cardPadBottom: 14,
        cardGap: 10,
        relation: 40,
        minCaptionFont: 13,
        maxCaptionFont: 18,
        maxClue: Math.round(short * 0.34),
        maxPicture: Math.round(short * 0.36),
        promptFont: 17,
      }
    : {
        compact,
        margin: 16,
        top: 64,
        gap: 16,
        boardPad: 14,
        badge: 52,
        clueGap: 14,
        promptHeight: 46,
        promptGap: 12,
        cardPadX: 12,
        cardPadTop: 12,
        cardPadBottom: 16,
        cardGap: 16,
        relation: 56,
        minCaptionFont: 15,
        maxCaptionFont: 24,
        maxClue: Math.round(short * 0.27),
        maxPicture: Math.round(short * 0.3),
        promptFont: 22,
      }
}

/** The caption's font for a picture of side `picture`: scales with it, so a
 *  word never outgrows its own picture, inside the metrics' floor/cap. */
export function captionFontFor(picture: number, m: DeductionMetrics): number {
  return Math.round(Math.min(m.maxCaptionFont, Math.max(m.minCaptionFont, picture * 0.13)))
}

/** The caption row's height (one line, `line-height: 1.2`, plus the small
 *  gap above it). */
function captionRowHeight(picture: number, m: DeductionMetrics): number {
  return Math.ceil(captionFontFor(picture, m) * 1.2) + 6
}

export function cardSizeFor(picture: number, m: DeductionMetrics): { w: number; h: number } {
  return {
    w: picture + 2 * m.cardPadX,
    h: m.cardPadTop + picture + captionRowHeight(picture, m) + m.cardPadBottom,
  }
}

interface GridFit {
  readonly size: number
  readonly cols: number
  readonly rows: number
}

/** The biggest square tile `n` items reach inside `w`x`h` in any column
 *  count, capped at `max`. */
function bestTileGrid(n: number, w: number, h: number, gap: number, max: number): GridFit {
  let best: GridFit = { size: 0, cols: n, rows: 1 }
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    const size = Math.min((w - (cols - 1) * gap) / cols, (h - (rows - 1) * gap) / rows, max)
    if (size > best.size) best = { size, cols, rows }
  }
  return best
}

/** The biggest option picture `k` cards reach inside `w`x`h` (one row, or
 *  two when that is bigger), capped at the metrics' own maximum. */
function bestCardGrid(k: number, w: number, h: number, m: DeductionMetrics): GridFit {
  let best: GridFit = { size: 0, cols: k, rows: 1 }
  for (let rows = 1; rows <= Math.min(2, k); rows++) {
    const cols = Math.ceil(k / rows)
    let size = Math.min((w - (cols - 1) * m.cardGap) / cols - 2 * m.cardPadX, m.maxPicture)
    // The card's height is not linear in the picture (the caption font is
    // clamped), so shrink until the rows fit.
    while (size > 0 && rows * cardSizeFor(size, m).h + (rows - 1) * m.cardGap > h) size -= 1
    if (size > best.size) best = { size, cols, rows }
  }
  return best
}

/** Lay `count` equal tiles of `size` out in `cols` columns, every row
 *  centred on `cx`, starting at `y`. */
function gridRects(
  count: number,
  cols: number,
  tileW: number,
  tileH: number,
  gap: number,
  cx: number,
  y: number,
): Rect[] {
  const rects: Rect[] = []
  const rows = Math.ceil(count / cols)
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, count - r * cols)
    const rowW = inRow * tileW + (inRow - 1) * gap
    for (let c = 0; c < inRow; c++) {
      rects.push({ x: cx - rowW / 2 + c * (tileW + gap), y: y + r * (tileH + gap), w: tileW, h: tileH })
    }
  }
  return rects
}

export type DeductionArrangement = 'stacked' | 'side'

export interface DeductionLayout {
  readonly arrangement: DeductionArrangement
  readonly metrics: DeductionMetrics
  /** The evidence board (border box). */
  readonly board: Rect
  /** Pulpito's lens, centred on the board's top edge. */
  readonly badge: Rect
  /** One pinned photo per collected clue (unrotated; the tilt the CSS adds
   *  stays inside the board's padding). */
  readonly clues: readonly Rect[]
  readonly clueSize: number
  /** The "Tocá quién fue" pill, centred over the cards. */
  readonly prompt: Rect
  readonly promptFont: number
  /** One card per option, in `kase.options` order. */
  readonly cards: readonly Rect[]
  /** Side of the square well each option picture is fitted into. */
  readonly picture: number
  readonly captionFont: number
  /** The comparison's "=" badge, between the sample and the candidates. */
  readonly relation: Rect | null
}

export interface DeductionLayoutInput {
  readonly viewport: Viewport
  readonly clueCount: number
  readonly optionCount: number
  readonly form: DeductionForm
  /** `pulpitoZonePx`'s rectangle: nothing else may enter it. */
  readonly pulpito: Rect
  /** The prompt pill's label length, in characters — its font shrinks
   *  before the pill would ever be wider than the cards under it. */
  readonly promptChars: number
}

/** The pill's estimated width at `font`: hand icon + text + padding. Nunito
 *  bold averages ~0.56em per character; the pill CSS keeps the text on one
 *  line (`white-space: nowrap`), so this estimate is what keeps it from
 *  overflowing the cards' span. */
export function promptWidthFor(chars: number, font: number): number {
  return Math.ceil(font * 1.6 + chars * font * 0.58 + font * 1.6)
}

interface Candidate {
  readonly arrangement: DeductionArrangement
  readonly boardRegion: Rect
  readonly cardsRegion: Rect
}

const SPLITS = 40

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function inside(a: Rect, outer: Rect): boolean {
  const eps = 0.5
  return (
    a.x >= outer.x - eps &&
    a.y >= outer.y - eps &&
    a.x + a.w <= outer.x + outer.w + eps &&
    a.y + a.h <= outer.y + outer.h + eps
  )
}

function inflate(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by }
}

function rect(x0: number, y0: number, x1: number, y1: number): Rect {
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** The rectangles the screen draws that must never overlap each other or
 *  Pulpito's zone, and must stay on screen. */
export function layoutRects(layout: DeductionLayout): { name: string; rect: Rect }[] {
  const out: { name: string; rect: Rect }[] = [
    { name: 'board', rect: layout.board },
    { name: 'badge', rect: layout.badge },
    { name: 'prompt', rect: layout.prompt },
  ]
  layout.cards.forEach((r, i) => out.push({ name: `card ${i}`, rect: r }))
  if (layout.relation) out.push({ name: 'relation', rect: layout.relation })
  return out
}

/**
 * Every problem with a layout, as readable strings (empty = valid): a part
 * off screen, two parts overlapping (the badge is allowed onto the board it
 * sits on), a clue outside its board, anything entering Pulpito's zone or
 * the top button band.
 */
export function layoutProblems(layout: DeductionLayout, vp: Viewport, pulpito: Rect): string[] {
  const problems: string[] = []
  const screen: Rect = { x: 0, y: 0, w: vp.w, h: vp.h }
  // The back button (56px, 48px compact) and the speak button live here.
  const band: Rect = { x: 0, y: 0, w: vp.w, h: layout.metrics.top - 8 }
  const parts = layoutRects(layout)
  for (const { name, rect: r } of parts) {
    if (!inside(r, screen)) problems.push(`${name} leaves the screen`)
    if (overlaps(r, pulpito)) problems.push(`${name} enters Pulpito's zone`)
    if (overlaps(r, band)) problems.push(`${name} enters the top button band`)
  }
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const pair = [parts[i].name, parts[j].name].sort().join('+')
      if (pair === 'badge+board') continue
      if (overlaps(parts[i].rect, parts[j].rect)) problems.push(`${parts[i].name} overlaps ${parts[j].name}`)
    }
  }
  layout.clues.forEach((c, i) => {
    if (!inside(c, layout.board)) problems.push(`clue ${i} leaves the board`)
    if (overlaps(c, layout.badge)) problems.push(`clue ${i} under the badge`)
    layout.clues.forEach((d, j) => {
      if (j > i && overlaps(c, d)) problems.push(`clue ${i} overlaps clue ${j}`)
    })
  })
  return problems
}

/**
 * The deduction screen's layout for one case at one viewport (this file's
 * own header). Never returns an empty layout: if no candidate is valid (a
 * viewport far smaller than any this app supports), the best-scoring one is
 * returned anyway and `layoutProblems` names what is wrong.
 */
export function deductionLayout(input: DeductionLayoutInput): DeductionLayout {
  const { viewport: vp, pulpito } = input
  const m = deductionMetrics(vp)
  const comparison = input.form === 'comparison'
  const between = comparison ? m.relation + 2 * m.gap : m.gap
  const left = m.margin
  const right = vp.w - m.margin
  const bottom = vp.h - m.margin
  const boardTop = m.top + m.badge / 2
  const zoneTop = pulpito.y - m.gap
  const zoneRight = pulpito.x + pulpito.w + m.gap

  const candidates: Candidate[] = []
  // Board above the choices: the board may span the full width while it
  // stays above Pulpito; the choices either fit above him too, or sit to his
  // right all the way down.
  for (let i = 1; i < SPLITS; i++) {
    const ys = boardTop + ((bottom - boardTop) * i) / SPLITS
    const boardX0 = ys <= zoneTop ? left : zoneRight
    const boardRegion = rect(boardX0, boardTop, right, ys)
    const cardsY0 = ys + between
    if (zoneTop > cardsY0) candidates.push({ arrangement: 'stacked', boardRegion, cardsRegion: rect(left, cardsY0, right, zoneTop) })
    candidates.push({ arrangement: 'stacked', boardRegion, cardsRegion: rect(zoneRight, cardsY0, right, bottom) })
  }
  // Board beside the choices, in the band above Pulpito or the band to his
  // right.
  const bands = [rect(left, boardTop, right, zoneTop), rect(zoneRight, boardTop, right, bottom)]
  for (const bandRect of bands) {
    if (bandRect.w <= 0 || bandRect.h <= 0) continue
    for (let i = 1; i < SPLITS; i++) {
      const xs = bandRect.x + (bandRect.w * i) / SPLITS
      candidates.push({
        arrangement: 'side',
        boardRegion: rect(bandRect.x, bandRect.y, xs, bandRect.y + bandRect.h),
        cardsRegion: rect(xs + between, m.top, bandRect.x + bandRect.w, bandRect.y + bandRect.h),
      })
    }
  }

  let best: { layout: DeductionLayout; score: number; valid: boolean } | undefined
  for (const c of candidates) {
    const layout = buildLayout(c, input, m, between)
    if (!layout) continue
    const valid = layoutProblems(layout, vp, pulpito).length === 0
    const small = Math.min(layout.clueSize, layout.picture)
    let score = small + 0.3 * (layout.clueSize + layout.picture)
    // One row of cards reads as "pick one of these"; a lone card on a second
    // row reads as a different thing. Only worth it when much bigger.
    if (layout.cards.length > 1 && layout.cards[layout.cards.length - 1].y > layout.cards[0].y) score *= 0.8
    if (comparison ? c.arrangement === 'side' : c.arrangement === 'stacked') score *= 1.12
    if (!best || (valid && !best.valid) || (valid === best.valid && score > best.score)) {
      best = { layout, score, valid }
    }
  }
  if (!best) throw new Error('deductionLayout: no candidate region at all')
  return best.layout
}

function buildLayout(c: Candidate, input: DeductionLayoutInput, m: DeductionMetrics, between: number): DeductionLayout | null {
  const { boardRegion: br, cardsRegion: cr } = c
  if (br.w <= 0 || br.h <= 0 || cr.w <= 0 || cr.h <= 0) return null
  const padTop = m.badge / 2 + m.boardPad / 2
  const innerW = br.w - 2 * m.boardPad
  const innerH = br.h - padTop - m.boardPad
  const choiceH = cr.h - m.promptHeight - m.promptGap
  if (innerW <= 0 || innerH <= 0 || choiceH <= 0) return null

  const clueGrid = bestTileGrid(input.clueCount, innerW, innerH, m.clueGap, m.maxClue)
  const cardGrid = bestCardGrid(input.optionCount, cr.w, choiceH, m)
  if (clueGrid.size < 24 || cardGrid.size < 24) return null
  // A comparison's sample is shown at the SAME size as the candidates it is
  // compared with (a tile's art is ~80% of the tile, `DEDUCTION_CSS`).
  const clueSize = Math.floor(input.form === 'comparison' ? Math.min(clueGrid.size, cardGrid.size / 0.8) : clueGrid.size)
  const picture = Math.floor(cardGrid.size)

  const card = cardSizeFor(picture, m)
  const groupW = cardGrid.cols * card.w + (cardGrid.cols - 1) * m.cardGap
  const cardsH = cardGrid.rows * card.h + (cardGrid.rows - 1) * m.cardGap
  const groupH = m.promptHeight + m.promptGap + cardsH
  const boardW = clueGrid.cols * clueSize + (clueGrid.cols - 1) * m.clueGap + 2 * m.boardPad
  const boardH = clueGrid.rows * clueSize + (clueGrid.rows - 1) * m.clueGap + padTop + m.boardPad

  let boardX: number
  let boardY: number
  let groupX: number
  let groupY: number
  if (c.arrangement === 'stacked') {
    groupX = cr.x + (cr.w - groupW) / 2
    // The board centres over the choices when its region allows it, so the
    // evidence reads as belonging to the question right under it.
    boardX = Math.min(Math.max(groupX + groupW / 2 - boardW / 2, br.x), br.x + br.w - boardW)
    const split = br.y + br.h
    boardY = split - boardH
    groupY = split + between
    // Centre the pair vertically in whatever slack the regions leave.
    const slackAbove = boardY - br.y
    const slackBelow = cr.y + cr.h - (groupY + groupH)
    const shift = Math.max(-slackAbove, Math.min(slackBelow, (slackBelow - slackAbove) / 2))
    const keepOut = inflate(input.pulpito, m.gap)
    for (const s of [shift, shift / 2, 0]) {
      const board = { x: boardX, y: boardY + s, w: boardW, h: boardH }
      const group = { x: groupX, y: groupY + s, w: groupW, h: groupH }
      if (s === 0 || (!overlaps(board, keepOut) && !overlaps(group, keepOut))) {
        boardY += s
        groupY += s
        break
      }
    }
  } else {
    const bandX0 = br.x
    const bandX1 = cr.x + cr.w
    const totalW = boardW + between + groupW
    boardX = bandX0 + (bandX1 - bandX0 - totalW) / 2
    groupX = boardX + boardW + between
    const bandY0 = br.y
    const bandY1 = br.y + br.h
    groupY = Math.min(Math.max(bandY0 + (bandY1 - bandY0 - groupH) / 2, cr.y), cr.y + cr.h - groupH)
    // The sample's own centre level with the candidates' pictures.
    const picturesCy = groupY + m.promptHeight + m.promptGap + cardsH / 2
    const innerHalf = (boardH - padTop - m.boardPad) / 2
    boardY = Math.min(Math.max(picturesCy - padTop - innerHalf, bandY0), bandY1 - boardH)
  }

  const board: Rect = { x: boardX, y: boardY, w: boardW, h: boardH }
  const badge: Rect = { x: boardX + boardW / 2 - m.badge / 2, y: boardY - m.badge / 2, w: m.badge, h: m.badge }
  const clues = gridRects(
    input.clueCount,
    clueGrid.cols,
    clueSize,
    clueSize,
    m.clueGap,
    boardX + boardW / 2,
    boardY + padTop,
  )
  let promptFont = m.promptFont
  while (promptFont > 12 && promptWidthFor(input.promptChars, promptFont) > groupW) promptFont -= 1
  const promptW = Math.min(groupW, promptWidthFor(input.promptChars, promptFont))
  const prompt: Rect = { x: groupX + groupW / 2 - promptW / 2, y: groupY, w: promptW, h: m.promptHeight }
  const cards = gridRects(
    input.optionCount,
    cardGrid.cols,
    card.w,
    card.h,
    m.cardGap,
    groupX + groupW / 2,
    groupY + m.promptHeight + m.promptGap,
  )
  let relation: Rect | null = null
  if (input.form === 'comparison') {
    const r = m.relation
    relation =
      c.arrangement === 'side'
        ? { x: boardX + boardW + (between - r) / 2, y: boardY + padTop + (boardH - padTop - m.boardPad) / 2 - r / 2, w: r, h: r }
        : { x: groupX + groupW / 2 - r / 2, y: boardY + boardH + (between - r) / 2, w: r, h: r }
  }
  return {
    arrangement: c.arrangement,
    metrics: m,
    board,
    badge,
    clues,
    clueSize,
    prompt,
    promptFont,
    cards,
    picture,
    captionFont: captionFontFor(picture, m),
    relation,
  }
}
