// lupaWipe geometry tests (`odd/tasks/prewriting-stage-completion.md` T31).
// Pure functions/constants, no DOM — the actual markup is exercised through
// `ScreenTransition.test.tsx`.
import { describe, expect, it } from 'vitest'
import {
  LUPA_HANDLE_ANCHOR,
  LUPA_HANDLE_ANGLE_DEG,
  LUPA_RIM_FINAL_DIAMETER_VMAX,
  LUPA_VT_BASE_DIAMETER_PX,
  LUPA_VT_CSS,
  LUPA_VT_NAME,
  LUPA_VT_ACTIVE_SELECTOR,
  LUPA_WIPE_CSS,
  LUPA_WIPE_DURATION_MS,
  lupaEdgeAnchorPercent,
  lupaRimOriginStyle,
} from './lupaWipe'

describe('lupaEdgeAnchorPercent — the point on a growing box\'s own edge at a given angle', () => {
  it('0deg (straight right of centre) is the box\'s own right-centre edge', () => {
    const p = lupaEdgeAnchorPercent(0)
    expect(p.leftPct).toBeCloseTo(100, 6)
    expect(p.topPct).toBeCloseTo(50, 6)
  })

  it('90deg (straight down) is the box\'s own bottom-centre edge', () => {
    const p = lupaEdgeAnchorPercent(90)
    expect(p.leftPct).toBeCloseTo(50, 6)
    expect(p.topPct).toBeCloseTo(100, 6)
  })

  it('180deg (straight left) is the box\'s own left-centre edge', () => {
    const p = lupaEdgeAnchorPercent(180)
    expect(p.leftPct).toBeCloseTo(0, 6)
    expect(p.topPct).toBeCloseTo(50, 6)
  })

  it('is independent of box size by construction (a plain fraction of the box, this file\'s own header derivation)', () => {
    // The whole point of expressing the anchor as a PERCENT is that it never
    // needs to be recomputed as the box's own width/height animate — this
    // assertion just re-derives the formula independently (cos/sin), rather
    // than trusting the implementation unchecked.
    for (const angle of [0, 30, 45, 60, 90, 135, 200, 315]) {
      const p = lupaEdgeAnchorPercent(angle)
      const rad = (angle * Math.PI) / 180
      expect(p.leftPct).toBeCloseTo(50 + 50 * Math.cos(rad), 9)
      expect(p.topPct).toBeCloseTo(50 + 50 * Math.sin(rad), 9)
    }
  })
})

describe('LUPA_HANDLE_ANCHOR — the handle sticks out at ~45deg, down-right of the growing lens', () => {
  it('is exactly lupaEdgeAnchorPercent(45deg): ~85.355% on both axes', () => {
    expect(LUPA_HANDLE_ANGLE_DEG).toBe(45)
    expect(LUPA_HANDLE_ANCHOR.leftPct).toBeCloseTo(50 + 50 * Math.SQRT1_2, 9)
    expect(LUPA_HANDLE_ANCHOR.topPct).toBeCloseTo(50 + 50 * Math.SQRT1_2, 9)
    expect(LUPA_HANDLE_ANCHOR.leftPct).toBeGreaterThan(84)
    expect(LUPA_HANDLE_ANCHOR.leftPct).toBeLessThan(87)
  })
})

describe('LUPA_RIM_FINAL_DIAMETER_VMAX — the rim always finishes bigger than the worst-case viewport diagonal', () => {
  it('its own final RADIUS (half the diameter) clears the 1:1-aspect diagonal (141.4vmax, the largest a diagonal can be relative to vmax)', () => {
    const finalRadiusVmax = LUPA_RIM_FINAL_DIAMETER_VMAX / 2
    const worstCaseDiagonalVmax = Math.sqrt(2) * 100 // a square viewport: vmax = vw = vh, diagonal = sqrt(2)*vmax
    expect(finalRadiusVmax).toBeGreaterThan(worstCaseDiagonalVmax)
  })
})

describe('LUPA_WIPE_DURATION_MS — within the task\'s own ≤400ms budget', () => {
  it('is at most 400ms', () => {
    expect(LUPA_WIPE_DURATION_MS).toBeLessThanOrEqual(400)
  })
})

describe('LUPA_WIPE_CSS — no mask/clipPath/pattern/filter/url(#…) of any kind (the repo-wide ban)', () => {
  it('introduces no url(#), <mask, <clipPath, or <pattern', () => {
    expect(LUPA_WIPE_CSS).not.toContain('url(#')
    expect(LUPA_WIPE_CSS).not.toContain('<mask')
    expect(LUPA_WIPE_CSS).not.toContain('<clipPath')
    expect(LUPA_WIPE_CSS).not.toContain('<pattern')
    expect(LUPA_WIPE_CSS).not.toContain('clip-path')
    expect(LUPA_WIPE_CSS).not.toContain('filter:')
  })

  it('carries a reduced-motion override that hides the whole rim', () => {
    expect(LUPA_WIPE_CSS).toContain('@media (prefers-reduced-motion: reduce) { .cv-lupa-rim { display: none; } }')
  })

  it('the rim animation duration matches LUPA_WIPE_DURATION_MS (no drift between the two)', () => {
    expect(LUPA_WIPE_CSS).toContain(`cv-lupa-grow ${LUPA_WIPE_DURATION_MS}ms`)
  })
})

// T31 follow-up #2 (`odd/tasks/prewriting-stage-completion.md`, "the lupa
// look regressed on the View Transitions path"): the rim's own SEPARATE
// `::view-transition-group`, captured and animated independently of `root`
// so it stays visible (and painted above both root snapshots) for the
// whole crossing on a browser that takes the native path — this file's own
// header has the full derivation.
describe('LUPA_VT_CSS (T31 follow-up #2)', () => {
  it('gives the captured circle its own view-transition-name, distinct from root', () => {
    expect(LUPA_VT_CSS).toContain(`view-transition-name: ${LUPA_VT_NAME};`)
    expect(LUPA_VT_NAME).not.toBe('root')
  })

  it('captures the rim at a fixed, non-animating size — never a near-zero sliver frozen mid-keyframe', () => {
    expect(LUPA_VT_CSS).toContain(`width: ${LUPA_VT_BASE_DIAMETER_PX}px;`)
    expect(LUPA_VT_CSS).toContain(`height: ${LUPA_VT_BASE_DIAMETER_PX}px;`)
    expect(LUPA_VT_CSS).toContain('animation: none;')
  })

  it('the captured diameter fits comfortably inside the smallest required viewport (844x390), so nothing gets cropped before capture', () => {
    const SMALLEST_REQUIRED_VIEWPORT_HEIGHT = 390
    expect(LUPA_VT_BASE_DIAMETER_PX).toBeLessThan(SMALLEST_REQUIRED_VIEWPORT_HEIGHT)
  })

  it('suppresses the OLD snapshot entirely — every crossing starts as a fresh pop-in, regardless of what a previous transition left the live rim at', () => {
    expect(LUPA_VT_CSS).toContain(`::view-transition-old(${LUPA_VT_NAME}) { display: none; }`)
  })

  it('grows via a transform: scale() keyframe that reaches the SAME final on-screen diameter the manual path targets', () => {
    expect(LUPA_VT_CSS).toContain('0% { transform: scale(0.001); }')
    expect(LUPA_VT_CSS).toContain(
      `100% { transform: scale(calc(${LUPA_RIM_FINAL_DIAMETER_VMAX}vmax / ${LUPA_VT_BASE_DIAMETER_PX}px)); }`,
    )
  })

  it('the group animation duration matches LUPA_WIPE_DURATION_MS (no drift between the manual and native paths)', () => {
    expect(LUPA_VT_CSS).toContain(`cv-lupa-vt-grow ${LUPA_WIPE_DURATION_MS}ms`)
  })

  it('carries a reduced-motion override that collapses the group\'s own grow to a direct cut', () => {
    expect(LUPA_VT_CSS).toContain('@media (prefers-reduced-motion: reduce)')
    expect(LUPA_VT_CSS).toContain(`::view-transition-group(${LUPA_VT_NAME}) { animation-duration: 0.01ms !important; }`)
  })

  it('introduces no url(#…), <mask, <clipPath, or <pattern of its own', () => {
    expect(LUPA_VT_CSS).not.toContain('url(#')
    expect(LUPA_VT_CSS).not.toContain('<mask')
    expect(LUPA_VT_CSS).not.toContain('<clipPath')
    expect(LUPA_VT_CSS).not.toContain('<pattern')
  })
})

describe('lupaRimOriginStyle', () => {
  it('is undefined for the default (centred) origin — the CSS var() fallback applies, same as ScreenTransition.tsx\'s own originStyle', () => {
    expect(lupaRimOriginStyle(undefined)).toBeUndefined()
  })

  it('carries the same --cv-wipe-x/--cv-wipe-y custom properties an explicit origin gives ScreenTransition.tsx\'s own wrapper', () => {
    const style = lupaRimOriginStyle({ xPct: 12, yPct: 88 })
    expect(style).toEqual({ '--cv-wipe-x': '12%', '--cv-wipe-y': '88%' })
  })
})

// T38 (`odd/tasks/prewriting-stage-completion.md`, "hay una lupa en el centro
// de la pantalla ... se queda siempre"): the live `.cv-lupa-rim--vt` element is
// drawn at full size for capture, so without a gate it stayed painted in the
// centre of every screen — after a native crossing, and on a screen reached
// with no native crossing at all (map -> intro, via App's manual wipe).
describe('LUPA_VT_CSS — the capture rim is visible only during a native View Transition (T38)', () => {
  const rules = (css: string) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2].trim() }))

  it('no native transition: the wrapper defaults to visibility: hidden', () => {
    expect(rules(LUPA_VT_CSS)).toContainEqual({ selector: '.cv-lupa-rim--vt', body: 'visibility: hidden;' })
  })

  it('the ONLY rule that shows it is gated on an active View Transition', () => {
    const showing = rules(LUPA_VT_CSS).filter((r) => r.body.includes('visibility: visible'))
    expect(showing).toEqual([{ selector: LUPA_VT_ACTIVE_SELECTOR, body: 'visibility: visible;' }])
    expect(LUPA_VT_ACTIVE_SELECTOR).toContain(':active-view-transition')
  })

  it('nothing else in the rim CSS un-hides it (no opacity/display toggles, no timed step)', () => {
    expect(LUPA_VT_CSS).not.toContain('cv-lupa-vt-settle')
    expect(LUPA_WIPE_CSS).not.toContain('cv-lupa-rim--vt')
  })

  it('the visibility gate sits on the wrapper, so the captured circle keeps its own view-transition-name untouched', () => {
    const gate = rules(LUPA_VT_CSS).filter((r) => r.body.startsWith('visibility'))
    for (const r of gate) expect(r.body).not.toContain('view-transition-name')
    expect(LUPA_VT_CSS).toContain(`view-transition-name: ${LUPA_VT_NAME};`)
  })
})
