import { isValidElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ANIMAL_ART, ANIMAL_SILHOUETTE_ART, OCTOPUS_ART, OCTOPUS_EMPTY_HANDED_ART, PULPITO_POSE_ART, SIGN_ART, ZOO_ANIMAL_ART, ZOO_OCTOPUS_BACKPACK_ART } from '../detective/assets'
import { stageSpeechTarget } from '../screen/pulpitoStance'
import { ArtImg, ArtInSvg, puppetFigureFor, standingFigure } from './ArtFigure'
import { puppetView } from './characters'

const BOX = { x: 10, y: 20, width: 80, height: 100 }

describe('the seam', () => {
  it('names a puppet for the cast, and nothing for a prop or a silhouette', () => {
    expect(puppetFigureFor(ZOO_ANIMAL_ART.pato)?.name).toBe('pato')
    for (const art of [OCTOPUS_ART, OCTOPUS_EMPTY_HANDED_ART, ZOO_OCTOPUS_BACKPACK_ART, ...Object.values(PULPITO_POSE_ART)]) {
      expect(puppetFigureFor(art)?.name, art.href).toBe('pulpo')
    }
    expect(puppetFigureFor(SIGN_ART.fish)).toBeUndefined()
    // The deduction's "who is it?" stays a silhouette until it is answered.
    for (const art of Object.values(ANIMAL_SILHOUETTE_ART)) expect(puppetFigureFor(art!), art!.href).toBeUndefined()
  })

  it('only the drawing that holds the lens gets the lens', () => {
    expect(puppetFigureFor(OCTOPUS_ART)?.accessories?.lens).toBe(true)
    expect(puppetFigureFor(OCTOPUS_EMPTY_HANDED_ART)?.accessories?.lens).toBeFalsy()
    expect(puppetFigureFor(PULPITO_POSE_ART.cheers)?.accessories?.lens).toBeFalsy()
  })

  it('renders the PNG when there is neither a puppet nor paper, in both worlds', () => {
    const noPaper = { href: '/art/no-paper-for-this.png', w: 100, h: 100 }
    const img = renderToString(<ArtImg art={noPaper} className="x" />)
    expect(img).toContain(`src="${noPaper.href}"`)
    const image = renderToString(<svg><ArtInSvg art={noPaper} box={BOX} /></svg>)
    expect(image).toContain(`href="${noPaper.href}"`)
    expect(image).toContain('width="80"')
    expect(image).not.toContain('data-puppet')
  })

  it('renders the puppet when there is one, and no request for the PNG', () => {
    const svg = renderToString(<ArtImg art={ANIMAL_ART.pato} className="x" />)
    expect(svg).toContain('data-puppet="pato"')
    expect(svg).toContain('class="cv-puppet x"')
    expect(svg).not.toContain('src=')
    const embedded = renderToString(<svg><ArtInSvg art={ANIMAL_ART.pato} box={BOX} /></svg>)
    expect(embedded).toContain('data-puppet="pato"')
    expect(embedded).not.toContain('<image')
  })

  it('a puppet fills the very aspect of the PNG it replaces', () => {
    for (const art of [ANIMAL_ART.pato, OCTOPUS_ART, PULPITO_POSE_ART.points]) {
      const name = puppetFigureFor(art)!.name
      const view = puppetView(name, art.w / art.h)
      expect(view.w / view.h, art.href).toBeCloseTo(art.w / art.h, 6)
    }
  })
})

describe('standingFigure, for the trace canvas', () => {
  it('stays still: nothing moves on a trace screen unless the finger causes it', () => {
    const node = standingFigure(OCTOPUS_ART)!(BOX)
    expect(isValidElement(node)).toBe(true)
    expect((node as { props: { still: boolean } }).props.still).toBe(true)
  })

  it('leaves the canvas its <image> for a picture with no puppet', () => {
    expect(standingFigure(SIGN_ART.fish)).toBeUndefined()
  })

  it('keeps one function per picture across renders', () => {
    expect(standingFigure(OCTOPUS_ART)).toBe(standingFigure(OCTOPUS_ART))
  })
})

describe('the speech bubble on the puppet', () => {
  it('the intro tail lands to the right of the cap brim, on empty air', () => {
    const art = PULPITO_POSE_ART.points
    const box = { x: 0, y: 0, w: art.w, h: art.h }
    const target = stageSpeechTarget(art, box, 'left')!
    const view = puppetView('pulpo', art.w / art.h)
    const x = view.x + (target.x / box.w) * view.w
    const y = view.y + (target.y / box.h) * view.h
    // In the drawing the brim ends at x 296, the head at x 284, and the highest
    // arm on that side starts below y 180.
    expect(x).toBeGreaterThan(296)
    expect(y).toBeLessThan(180)
  })
})
