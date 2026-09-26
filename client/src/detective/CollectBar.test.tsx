// CollectBar SSR tests (T17, `docs/19` §2.2/§3.4). Node environment, no DOM —
// the same convention `TrailProgressBar.test.tsx` (this component's sibling)
// already follows. Full mounted coverage through a real level lives in
// `screen/LevelPlay.test.tsx`'s own "CollectBar" describe block, mirroring
// how `TrailProgressBar`'s own full coverage lives there instead of here.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import CollectBar, { accessibleCollectName } from './CollectBar'
import type { ArtImage } from './assets'

const SHEEP: ArtImage = { href: '/art/sector-sheep.png', w: 200, h: 300 }

describe('accessibleCollectName', () => {
  it('names the exact remaining count and total', () => {
    expect(accessibleCollectName([true, true, false, false])).toBe('Faltan 2 de 4')
    expect(accessibleCollectName([false, false, false])).toBe('Faltan 3 de 3')
  })

  it('celebrates once every item is collected', () => {
    expect(accessibleCollectName([true, true, true])).toBe('Juntaste todo: 3 de 3')
  })

  it('is empty for a level with no items at all', () => {
    expect(accessibleCollectName([])).toBe('')
  })
})

describe('CollectBar', () => {
  it('renders one socket per item, filled ones showing the art and empty ones not', () => {
    const html = renderToString(<CollectBar collected={[true, false, false]} art={SHEEP} />)
    expect(html.split('data-filed="true"').length - 1).toBe(1)
    expect(html.split('data-filed="false"').length - 1).toBe(2)
    expect(html.split(SHEEP.href).length - 1).toBe(1) // exactly one filled socket's own <image>
    expect(html).toContain('pistas-slot-shell-filed')
    expect(html).toContain(`aria-label="Faltan 2 de 3"`)
  })

  it('renders nothing at all for zero items (no collect config yet resolved)', () => {
    const html = renderToString(<CollectBar collected={[]} art={SHEEP} />)
    expect(html).toBe('')
  })

  it('never plays the flight pop on a level already partway collected at mount (resuming mid-run must not replay every earlier item at once)', () => {
    // `TrailProgressBar.Slot`'s own `justFiled` carries the identical
    // limitation this repo's harness imposes everywhere: `useRef`'s initial
    // value IS the first render's own `collected` prop, so nothing can ever
    // be "collected after the baseline" within a single `renderToString`
    // call — which is exactly the guarantee this asserts: an item already
    // `true` at mount is never mistaken for one just earned.
    const html = renderToString(<CollectBar collected={[true, true, false]} art={SHEEP} />)
    expect(html).not.toContain('pistas-flight')
  })
})
