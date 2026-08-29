import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('renders the trace canvas surface without throwing', () => {
    const html = renderToString(<App />)
    expect(html).toContain('cursiva')
    // trace-canvas "Guides sit on the viewBox grid" scenario (SSR markup):
    expect(html).toContain('viewBox="0 0 1000 600"')
    expect(html).toContain('y1="180"')
    expect(html).toContain('y1="420"')
  })

  it('renders the checkpoint overlay toggle and no combo picker (main-screen)', () => {
    const html = renderToString(<App />)
    expect(html).not.toContain('aria-label="Combinaciones"')
    expect(html).not.toContain('Combinación ac')
    expect(html).toContain('Mostrar puntos del trazo')
  })
})