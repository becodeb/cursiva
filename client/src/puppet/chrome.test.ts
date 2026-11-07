import { describe, expect, it } from 'vitest'
import {
  SIGN_ART,
  UI_BUTTON_ART,
  ZOO_BACKPACK_ART,
  ZOO_SPEECH_BUBBLE_ART,
  ZOO_SPEECH_BUBBLE_LEFT_ART,
  ZOO_STAR_ART,
} from '../detective/assets'
import { ZOO_SPEECH_BUBBLE_LEFT_TEXT_AREA, ZOO_SPEECH_BUBBLE_TEXT_AREA, type BubbleRect } from '../screen/bubbleFit'
import { ZOO_SPEECH_BUBBLE_LEFT_TAIL, ZOO_SPEECH_BUBBLE_TAIL } from '../screen/bubblePlacement'
import { sampleAnchored, type Vec } from './geometry'
import { BUBBLE_PAPER, BUTTON_GOLD, BUTTON_PAPER, bubbleOutline, CHROME_INK, CHROME_PROPS } from './chrome'
import { paperPropFor } from './props'

function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function inside(polygon: readonly Vec[], [x, y]: Vec): boolean {
  let hit = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i]
    const [bx, by] = polygon[j]
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit
  }
  return hit
}

describe('the furniture in paper', () => {
  it('has a drawing for every button, sign, bubble and the backpack and star', () => {
    const arts = [...Object.values(UI_BUTTON_ART), ...Object.values(SIGN_ART), ZOO_SPEECH_BUBBLE_ART, ZOO_SPEECH_BUBBLE_LEFT_ART, ZOO_STAR_ART, ZOO_BACKPACK_ART]
    for (const art of arts) expect(paperPropFor(art), art.href).toBeDefined()
  })

  it('never reaches for a def, and never paints a black outline', () => {
    for (const scene of CHROME_PROPS.values()) {
      const text = JSON.stringify(scene)
      expect(text).not.toContain('url(')
      expect(text).not.toContain('#1a1a1a')
    }
  })

  it('keeps its glyphs readable: ink on a button or a bubble clears 7:1', () => {
    expect(contrast(CHROME_INK, BUTTON_PAPER)).toBeGreaterThan(7)
    expect(contrast(CHROME_INK, BUTTON_GOLD)).toBeGreaterThan(7)
    expect(contrast(CHROME_INK, BUBBLE_PAPER)).toBeGreaterThan(7)
  })

  const BUBBLES: ReadonlyArray<readonly [string, { w: number; h: number }, BubbleRect, { tailX: number; tailY: number }]> = [
    ['map, prologue, deduction', ZOO_SPEECH_BUBBLE_ART, ZOO_SPEECH_BUBBLE_TEXT_AREA, ZOO_SPEECH_BUBBLE_TAIL],
    ['entry and closing', ZOO_SPEECH_BUBBLE_LEFT_ART, ZOO_SPEECH_BUBBLE_LEFT_TEXT_AREA, ZOO_SPEECH_BUBBLE_LEFT_TAIL],
  ]
  for (const [name, art, area, tail] of BUBBLES) {
    it(`${name}: the paper holds the whole measured text area and ends on the measured tail`, () => {
      const tip: Vec = [tail.tailX * art.w, tail.tailY * art.h]
      const outline = sampleAnchored(bubbleOutline(art.w, art.h, tip[0], tip[1], 0.965), 6)
      const x0 = area.left * art.w
      const x1 = (area.left + area.width) * art.w
      const y0 = area.top * art.h
      const y1 = (area.top + area.height) * art.h
      for (const corner of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] as Vec[]) {
        expect(inside(outline, corner), `${corner}`).toBe(true)
      }
      const outer = sampleAnchored(bubbleOutline(art.w, art.h, tip[0], tip[1]), 6)
      const nearest = Math.min(...outer.map((p) => Math.hypot(p[0] - tip[0], p[1] - tip[1])))
      expect(nearest).toBeLessThan(4)
    })
  }
})
