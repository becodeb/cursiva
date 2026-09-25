// ScreenTransition SSR tests (prewriting-stage-completion T8 item 4). Node
// environment, no DOM: `renderToString` on the HTML string, the same
// convention every other screen test in this repo uses. `renderToString`
// never runs an animation and never observes a `key`-driven remount (React
// does not serialise `key` into the HTML at all) — these tests assert the
// STATIC structure the brief asks for directly: the wrapper class and its
// CSS (including the reduced-motion override) are present, and the caller's
// children render through unchanged.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ScreenTransition from './ScreenTransition'

describe('ScreenTransition (prewriting-stage-completion T8 item 4)', () => {
  it('wraps its children in the fade class, unchanged otherwise', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map">
        <p>hola</p>
      </ScreenTransition>,
    )
    expect(html).toContain('class="cv-screen-fade"')
    expect(html).toContain('<p>hola</p>')
  })

  it('carries its own fade-in animation and a reduced-motion override that disables it', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map">
        <p>hola</p>
      </ScreenTransition>,
    )
    expect(html).toContain('cv-screen-fade-in')
    expect(html).toContain('@media (prefers-reduced-motion: reduce) { .cv-screen-fade { animation: none; } }')
  })

  it('opacity only — no transform anywhere in its own CSS (layout-measuring children must not be offset mid-fade)', () => {
    const html = renderToString(
      <ScreenTransition screenKey="map">
        <p>hola</p>
      </ScreenTransition>,
    )
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/)
    expect(styleMatch).not.toBeNull()
    expect(styleMatch![1]).not.toContain('transform')
  })
})
