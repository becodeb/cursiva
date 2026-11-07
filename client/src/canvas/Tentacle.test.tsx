// The demonstration arm: it draws the model and never covers it.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TENTACLE_PAPER } from '../puppet/tentacle'
import { TentacleDemoArm } from './Tentacle'

describe('TentacleDemoArm', () => {
  it('paints the arm under the blue line', () => {
    const html = renderToString(
      <svg>
        <TentacleDemoArm root={[10, 10]} demos={[{ d: 'M0 0L100 0', strokeWidth: 8, delay: 0, duration: 1 }]} strokeColour="#0284c7" />
      </svg>,
    )
    expect(html.indexOf(TENTACLE_PAPER)).toBeGreaterThan(-1)
    expect(html.indexOf(TENTACLE_PAPER)).toBeLessThan(html.indexOf('#0284c7'))
  })
})
