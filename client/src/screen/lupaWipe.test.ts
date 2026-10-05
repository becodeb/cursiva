// lupaWipe geometry tests (`odd/tasks/prewriting-stage-completion.md` T31).
// Pure functions/constants, no DOM — the actual markup is exercised through
// `ScreenTransition.test.tsx`.
import { describe, expect, it } from 'vitest'
import {
  LUPA_LENS_PLACEMENT,
  LUPA_RIM_FINAL_DIAMETER_VMAX,
  LUPA_VT_BASE_DIAMETER_PX,
  LUPA_VT_CSS,
  LUPA_VT_NAME,
  LUPA_VT_ACTIVE_SELECTOR,
  LUPA_WIPE_CSS,
  LUPA_WIPE_DURATION_MS,
  lupaLensPlacement,
  lupaRimOriginStyle,
} from './lupaWipe'
import { TRANSITION_LENS_ART } from '../detective/assets'

describe('lupaLensPlacement — the drawn magnifier\'s measured glass lands on the growing box (T49)', () => {
  it('puts the hole centre on the box centre and the hole edge on the box edge', () => {
    const art = { w: 200, h: 300, hole: { cx: 0.5, cy: 0.3, r: 0.4 } }
    const p = lupaLensPlacement(art)
    // Box side D = 2r = 160 image px; the image is 200/160 boxes wide.
    expect(p.widthPct).toBeCloseTo(125, 9)
    // Hole centre (100, 90) image px lands at (left + 100/160, top + 90/160)
    // boxes = the box centre (50%, 50%).
    expect(p.leftPct + (100 / 160) * 100).toBeCloseTo(50, 9)
    expect(p.topPct + (90 / 160) * 100).toBeCloseTo(50, 9)
  })

  it('is what LUPA_WIPE_CSS positions the shipped TRANSITION_LENS_ART with', () => {
    expect(LUPA_LENS_PLACEMENT).toEqual(lupaLensPlacement(TRANSITION_LENS_ART))
    expect(LUPA_WIPE_CSS).toContain(`width: ${LUPA_LENS_PLACEMENT.widthPct.toFixed(3)}%`)
    // The hole is a real fraction of the drawing, not a placeholder.
    expect(TRANSITION_LENS_ART.hole.r).toBeGreaterThan(0.2)
    expect(TRANSITION_LENS_ART.hole.r).toBeLessThan(0.5)
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
