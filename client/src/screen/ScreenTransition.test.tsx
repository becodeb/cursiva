// ScreenTransition SSR tests (prewriting-stage-completion T8 item 4; T24
// replaces the fade with the lupa wipe). Node environment, no DOM:
// `renderToString` on the HTML string, the same convention every other
// screen test in this repo uses. `renderToString` never runs an animation
// and never observes a `key`-driven remount (React does not serialise `key`
// into the HTML at all) — these tests assert the STATIC structure the brief
// asks for directly: the wrapper class and its CSS (including the reduced-
// motion override) are present, and the caller's children render through
// unchanged.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ScreenTransition, { ROOT_VIEW_TRANSITION_CSS, ROOT_VIEW_TRANSITION_DURATION_MS } from './ScreenTransition'
import { TRANSITION_LENS_ART } from '../detective/assets'

describe('ScreenTransition (T24: the lupa wipe replaces the plain fade)', () => {
  it('wraps its children in the wipe class by default, unchanged otherwise', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map">
        <p>hola</p>
      </ScreenTransition>,
    )
    expect(html).toContain('class="cv-screen-wipe"')
    expect(html).toContain('<p>hola</p>')
  })

  it('carries its own growing-circle animation and a reduced-motion override that disables it', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map">
        <p>hola</p>
      </ScreenTransition>,
    )
    expect(html).toContain('cv-screen-wipe-in')
    expect(html).toContain('clip-path: circle(0%')
    expect(html).toContain('clip-path: circle(150%')
    expect(html).toContain(
      '@media (prefers-reduced-motion: reduce) { .cv-screen-wipe { animation: none; clip-path: none; } }',
    )
  })

  it('finishes within the task\'s own ≤350ms budget', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map">
        <p>hola</p>
      </ScreenTransition>,
    )
    const match = html.match(/cv-screen-wipe-in (\d+)ms/)
    expect(match).not.toBeNull()
    expect(Number(match![1])).toBeLessThanOrEqual(350)
  })

  it('introduces no url(#…) or SVG mask reference of its own (canvas/TraceCanvas.tsx\'s own ban — clip-path on a plain HTML element is a different mechanism, this file\'s own header)', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map">
        <p>hola</p>
      </ScreenTransition>,
    )
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/)
    expect(styleMatch).not.toBeNull()
    expect(styleMatch![1]).not.toContain('url(#')
    expect(styleMatch![1]).not.toContain('<mask')
  })

  it('defaults the wipe origin to the centre when none is given (no inline custom property set — the CSS var() fallback of 50% applies)', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map">
        <p>hola</p>
      </ScreenTransition>,
    )
    expect(html).not.toMatch(/style="[^"]*--cv-wipe-x/)
  })

  it('an explicit origin becomes the wrapper\'s own CSS custom properties', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map" origin={{ xPct: 12, yPct: 88 }}>
        <p>hola</p>
      </ScreenTransition>,
    )
    expect(html).toContain('--cv-wipe-x:12%')
    expect(html).toContain('--cv-wipe-y:88%')
  })

  it("kind='none' renders no animation class and no clip-path at all — the caller (T24's rescue flight) is the transition instead", () => {
    const html = renderToString(
      <ScreenTransition screenKey="map" kind="none">
        <p>hola</p>
      </ScreenTransition>,
    )
    expect(html).not.toContain('cv-screen-wipe')
    expect(html).not.toContain('clip-path')
    expect(html).toContain('<p>hola</p>')
  })
})

// T31 follow-up #2 (`odd/tasks/prewriting-stage-completion.md`, "the lupa
// look regressed on the View Transitions path"): `kind='native'` renders NO
// manual `.cv-screen-wipe` of its own (the native crossing already reveals
// `children` via `ROOT_VIEW_TRANSITION_CSS`, rendered globally by
// `GameScreen.tsx`) but STILL renders the rim/handle/highlight, tagged for
// the browser's own snapshot overlay to carry as its own group.
describe("ScreenTransition kind='native' (T31 follow-up #2)", () => {
  it('renders no manual wipe class and no clip-path of its own, but still renders children', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map" kind="native">
        <p>hola</p>
      </ScreenTransition>,
    )
    expect(html).not.toContain('cv-screen-wipe')
    expect(html).not.toContain('clip-path')
    expect(html).toContain('<p>hola</p>')
  })

  it('still renders the drawn magnifier (T49), tagged for the View Transition path', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map" kind="native">
        <p>hola</p>
      </ScreenTransition>,
    )
    expect(html).toContain('class="cv-lupa-rim cv-lupa-rim--vt"')
    expect(html).toContain('class="cv-lupa-circle"')
    expect(html).toContain('class="cv-lupa-lens"')
    expect(html).toContain(`src="${TRANSITION_LENS_ART.href}"`)
  })

  it('the rim renders AFTER children, so it paints above both View Transition snapshots', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map" kind="native">
        <p>hola</p>
      </ScreenTransition>,
    )
    expect(html.indexOf('<p>hola</p>')).toBeLessThan(html.indexOf('cv-lupa-rim--vt'))
  })

  it('an explicit origin still becomes the rim wrapper\'s own CSS custom properties (the same origin the root crossing would use)', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map" kind="native" origin={{ xPct: 12, yPct: 88 }}>
        <p>hola</p>
      </ScreenTransition>,
    )
    expect(html).toContain('--cv-wipe-x:12%')
    expect(html).toContain('--cv-wipe-y:88%')
  })
})

// T31 follow-up (`odd/tasks/prewriting-stage-completion.md`, "the abrupt
// night ending"): `GameScreen.tsx` renders `ROOT_VIEW_TRANSITION_CSS`
// itself, globally, whenever a native View Transition might play for a real
// screen change — never from THIS component (the test above proves
// `kind='none'` stays exactly what it always was: no animation, no
// clip-path, of ITS own).
describe('ROOT_VIEW_TRANSITION_CSS (T31 follow-up)', () => {
  it('keeps the outgoing snapshot static (no fade) and grows the incoming one via clip-path — never the UA default cross-fade', () => {
    expect(ROOT_VIEW_TRANSITION_CSS).toContain('::view-transition-old(root)')
    expect(ROOT_VIEW_TRANSITION_CSS).toContain('animation: none')
    expect(ROOT_VIEW_TRANSITION_CSS).toContain('::view-transition-new(root)')
    expect(ROOT_VIEW_TRANSITION_CSS).toContain('clip-path: circle(0%')
    expect(ROOT_VIEW_TRANSITION_CSS).toContain('clip-path: circle(150%')
  })

  it('carries a reduced-motion override that collapses the crossing to a direct cut', () => {
    expect(ROOT_VIEW_TRANSITION_CSS).toContain('@media (prefers-reduced-motion: reduce)')
    expect(ROOT_VIEW_TRANSITION_CSS).toContain('::view-transition-group(root)')
  })

  it('introduces no url(#…) or SVG mask reference of its own', () => {
    expect(ROOT_VIEW_TRANSITION_CSS).not.toContain('url(#')
    expect(ROOT_VIEW_TRANSITION_CSS).not.toContain('<mask')
  })

  it('the growth duration matches the constant this file exports (no drift between the two)', () => {
    expect(ROOT_VIEW_TRANSITION_CSS).toContain(`cv-root-view-transition-wipe-in ${ROOT_VIEW_TRANSITION_DURATION_MS}ms`)
  })

  it('finishes within the ≤350ms transition budget', () => {
    expect(ROOT_VIEW_TRANSITION_DURATION_MS).toBeLessThanOrEqual(350)
  })
})
