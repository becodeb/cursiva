import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('renders the placeholder page without throwing', () => {
    const html = renderToString(<App />)
    expect(html).toContain('cursiva')
    expect(html).toContain('Scaffold ready')
  })
})