import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'
import MainScreen from './screen/MainScreen'
import type { ProgressStore } from './progress/ProgressStore'

/** Minimal store stub — the shell never writes progress in these renders. */
function fakeStore(): ProgressStore {
  const values = new Map<string, number>()
  return {
    getProgress: (letterId) => values.get(letterId) ?? 0,
    setProgress: (letterId, value) => {
      values.set(letterId, value)
    },
  }
}

describe('App shell', () => {
  it('renders the trace canvas surface without throwing', () => {
    const html = renderToString(<App />)
    expect(html).toContain('cursiva')
    // trace-canvas "Guides sit on the viewBox grid" scenario (SSR markup):
    expect(html).toContain('viewBox="0 0 1000 600"')
    expect(html).toContain('y1="180"')
    expect(html).toContain('y1="420"')
  })

  it('renders the checkpoint overlay toggle and Borrar, with no combo picker (main-screen)', () => {
    const html = renderToString(<App />)
    expect(html).not.toContain('aria-label="Combinaciones"')
    expect(html).not.toContain('Combinación ac')
    expect(html).toContain('Mostrar puntos del trazo')
    expect(html).toContain('Borrar')
    // The current-word label renders while the word is non-empty (SSR splits
    // the interpolated char with comment markers, so assert the fragment).
    expect(html).toContain('palabra:')
  })

  it('an empty word renders the placeholder: no canvas, no current-word label', () => {
    const html = renderToString(<MainScreen store={fakeStore()} initialWord={[]} />)
    expect(html).toContain('Elegí una letra o escribí con el teclado para empezar')
    expect(html).not.toContain('y1="180"') // no canvas → no ruled guides
    expect(html).not.toContain('palabra:')
  })
})