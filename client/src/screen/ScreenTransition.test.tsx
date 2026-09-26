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
import ScreenTransition from './ScreenTransition'

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
