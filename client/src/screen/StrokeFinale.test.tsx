import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { ADVENTURES, type Adventure } from '../zoo/adventures'
import { ANIMAL_ART, CART_ART, ZOO_ANIMAL_ART } from '../detective/assets'
import { forgetSessionLines, recordApprovedStroke, type TracedLine } from '../zoo/tracedLine'
import { composeFinale, FINALE_STAGE } from './strokeFinale'
import StrokeFinale, { FinaleGate, FinaleSceneView, finaleSceneFor } from './StrokeFinale'

const row = (id: string): Adventure => ADVENTURES.find((a) => a.id === id)!

const line: TracedLine = {
  levelId: 'l',
  w: 1,
  h: 0.4,
  strokes: [Array.from({ length: 30 }, (_, i): [number, number] => [i / 29, 0.2 + Math.sin(i / 3) * 0.2])],
}

describe('FinaleSceneView', () => {
  it('a character with a puppet comes through the seam as a puppet', () => {
    const scene = composeFinale({ kind: 'water' }, line, 1)!
    const html = renderToString(<FinaleSceneView scene={scene} art={ANIMAL_ART.pato} reducedMotion={false} />)
    expect(html).toContain('data-finale-kind="water"')
    expect(html).toContain('data-puppet="pato"')
  })

  it('art with no puppet comes through as its picture, with no error', () => {
    const scene = composeFinale({ kind: 'bubbles' }, line, 1)!
    const html = renderToString(<FinaleSceneView scene={scene} art={CART_ART} reducedMotion={false} />)
    expect(html).toContain(`data-art="${CART_ART.href}"`)
  })

  it('uses nothing the repo bans on an SVG', () => {
    for (const adventure of ADVENTURES.filter((a) => a.finale)) {
      const scene = finaleSceneFor(adventure, line)!
      const art = adventure.finale?.art ?? ZOO_ANIMAL_ART[adventure.animal!]
      const html = renderToString(<FinaleSceneView scene={scene} art={art} reducedMotion />)
      expect(html).not.toMatch(/url\(#|<mask|<clipPath|<pattern|<filter/)
    }
  })

  it('under reduced motion it renders the finished composition at once', () => {
    const scene = composeFinale({ kind: 'water' }, line, 1)!
    const html = renderToString(<FinaleSceneView scene={scene} art={ANIMAL_ART.pato} reducedMotion />)
    // A fully revealed strip has nothing left to offset.
    expect(html).toContain('stroke-dashoffset="0"')
    expect(html).not.toContain('stroke-dashoffset="1"')
  })

  it('the snake needs no picture: it draws its own body and head', () => {
    const scene = composeFinale({ kind: 'slither' }, line, 1)!
    const html = renderToString(<FinaleSceneView scene={scene} art={ZOO_ANIMAL_ART.vibora} reducedMotion />)
    expect(html).toContain('data-finale-head')
    expect(html).not.toContain(`href="${ZOO_ANIMAL_ART.vibora.href}"`)
  })

  it('the stage is the size the scenes are composed for', () => {
    const scene = composeFinale({ kind: 'water' }, line, 1)!
    const html = renderToString(<FinaleSceneView scene={scene} art={ANIMAL_ART.pato} reducedMotion />)
    expect(html).toContain(`viewBox="0 0 ${FINALE_STAGE.w} ${FINALE_STAGE.h}"`)
  })
})

describe('StrokeFinale', () => {
  it('needs no words: the only name is for assistive tech, and the Pulpito is there', () => {
    const adventure = row('duck')
    const html = renderToString(
      <StrokeFinale
        adventure={adventure}
        beat={adventure.closingBeat![0]}
        scene={finaleSceneFor(adventure, line)!}
        onDone={() => undefined}
        reducedMotion
      />,
    )
    expect(html).toContain('data-puppet="pulpo"')
    expect(html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, '').trim()).toBe('')
  })
})

describe('FinaleGate', () => {
  const render = (id: string) => {
    const adventure = row(id)
    return renderToString(
      <FinaleGate adventure={adventure} beat={adventure.closingBeat![0]}>
        <p>today's closing</p>
      </FinaleGate>,
    )
  }

  it('with no line (a skip, a deep link, old progress) today closing runs, untouched', () => {
    forgetSessionLines()
    const html = render('duck')
    expect(html).toContain('closing')
    expect(html).not.toContain('data-finale-kind')
  })

  it('with a line the finale plays first', () => {
    forgetSessionLines()
    recordApprovedStroke('duck', 'duck-trail4', [line.strokes[0].map(([x, y]) => ({ x, y }))], null)
    const html = render('duck')
    expect(html).toContain('data-finale-kind="water"')
    expect(html).not.toContain('closing</p>')
    forgetSessionLines()
  })

  it('an adventure with no finale ignores any line', () => {
    forgetSessionLines()
    expect(render('peces')).toContain('closing')
  })
})
