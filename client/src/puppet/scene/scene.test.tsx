// The paper places: what a capture cannot keep guarding once it has been read. The
// luma law (`docs/09` §4, the 55 that `zoo/backdrops.test.ts` holds for the pictures)
// is asserted here against the colours the corridor can really land on.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SECTOR_BACKGROUND_ART, ZOO_MAP_ART, CLUE_ART, type ClueKind } from '../../detective/assets'
import { CLUE_DRAINED, luma } from '../../detective/palette'
import { ADVENTURE_BACKDROP, dimmedHex } from '../../zoo/backdrops'
import { ArtBackdrop, ScenePicture, sceneFor } from './Scene'
import { coloursInReach, cutScene, SCENE_H } from './engine'
import { SCENES } from './scenes'
import { ZOO_MAP_SCENE } from './zooMap'
import { ArtImg, ArtInSvg } from '../ArtFigure'
import { paperMarkFor } from '../marks'
import { paperPropFor } from '../props'
import { SECTOR_ADVENTURE_ART, HAZARD_STARFISH_ART } from '../../detective/assets'

const LAW = 55
const SHEET_PAPER = '#fdfcf7'
const INK_COLOR = '#1e293b'

describe('every sector picture has a paper place', () => {
  it.each(Object.entries(SECTOR_BACKGROUND_ART))('%s', (_, art) => {
    expect(sceneFor(art)).toBeDefined()
  })

  it('and the map too', () => {
    expect(sceneFor(ZOO_MAP_ART)).toBeDefined()
  })

  it('a picture with no scene keeps its picture', () => {
    const html = renderToString(<ArtBackdrop art={{ href: '/art/elsewhere.webp' }} className="b" />)
    expect(html).toContain('src="/art/elsewhere.webp"')
  })
})

describe('the corridor reads against everything it can land on (55 luma)', () => {
  const rows = Object.entries(ADVENTURE_BACKDROP)
  it.each(rows)('%s', (id, row) => {
    const scene = sceneFor(row!.art)!
    const reach = {
      top: (row!.corridorRows.top / row!.art.h) * SCENE_H,
      bottom: (row!.corridorRows.bottom / row!.art.h) * SCENE_H,
    }
    const colours = coloursInReach(scene, reach).map((c) => (row!.dim ? dimmedHex(c, row!.dim) : c))
    // What lies on those colours: the veil, the channel, or the child's own line
    // where the level paints neither.
    const noPaint = !row!.tile && !row!.channel && (id === 'bee' || id === 'hedgehog')
    const paint = row!.tile ?? (noPaint ? (row!.ink ?? INK_COLOR) : (row!.channel ?? SHEET_PAPER))
    for (const colour of colours) {
      expect(Math.abs(luma(colour) - luma(paint)), `${id}: ${colour} under ${paint}`).toBeGreaterThanOrEqual(LAW)
    }
  })

  it('the forest also carries the paper strip: the same scene answers both of its rows', () => {
    const forest = sceneFor(SECTOR_BACKGROUND_ART.forest)!
    for (const colour of coloursInReach(forest)) {
      expect(luma(colour)).toBeLessThanOrEqual(luma(SHEET_PAPER) - LAW)
      expect(luma(colour)).toBeGreaterThanOrEqual(luma(INK_COLOR) + LAW)
    }
  })

  it('is sensitive: a paper strip on the sand would fail', () => {
    const sand = sceneFor(SECTOR_BACKGROUND_ART.sand)!
    expect(Math.abs(luma(sand.base) - luma(SHEET_PAPER))).toBeLessThan(LAW)
  })
})

describe('the working band is flat', () => {
  // The middle of the central 4:3 is where corridors live: a band piece may run
  // under it (the sky, the ground), but nothing may start and end inside it.
  const BAND = { left: 600, right: 1400, top: 300, bottom: 700 }
  it.each(Object.entries(SCENES))('%s keeps its decoration out of the middle of the sheet', (_, def) => {
    const { layers } = cutScene(def)
    // A far hill is a full-width sheet: fine as long as the base colour's own sheet
    // is laid back over it before the band.
    const covered = (from: number): boolean =>
      layers.slice(from + 1).some((l) => l.pieces.some((p) => p.c === def.base && p.top < BAND.top && p.bottom >= def.h && p.left <= 0 && p.right >= def.w))
    layers.forEach((layer, i) => {
      for (const piece of layer.pieces) {
        const inBand = piece.right > BAND.left && piece.left < BAND.right && piece.bottom > BAND.top && piece.top < BAND.bottom
        if (inBand && piece.c !== def.base && !covered(i)) throw new Error(`${piece.c} at ${piece.left},${piece.top}..${piece.right},${piece.bottom}`)
      }
    })
  })
})

describe('a scene is pure paper', () => {
  const BANNED = /url\(#|<mask|<clipPath|<pattern|<filter|Gradient|<defs|<image/

  it.each(Object.entries(SCENES))('%s has no banned machinery', (_, def) => {
    const html = renderToString(<ScenePicture scene={cutScene(def)} />)
    expect(html).not.toMatch(BANNED)
  })

  it('so does the map', () => {
    expect(renderToString(<ScenePicture scene={cutScene(ZOO_MAP_SCENE)} />)).not.toMatch(BANNED)
  })

  it('renderToString gives the finished scene, and two renders the same paper', () => {
    const a = renderToString(<ScenePicture scene={cutScene(SCENES.lagoon)} still />)
    const b = renderToString(<ScenePicture scene={cutScene(SCENES.lagoon)} still />)
    expect(a).toBe(b)
    expect(a.match(/<path/g)!.length).toBeGreaterThan(20)
  })
})

describe('motion is a prop', () => {
  it('still has no moving class at all: the trace screen (docs/01 §5)', () => {
    for (const def of Object.values(SCENES)) {
      expect(renderToString(<ScenePicture scene={cutScene(def)} still />)).not.toMatch(/cv-scene-(sway|drift|rays|bob)/)
    }
  })

  it('off the trace screen a scene breathes', () => {
    const moving = Object.values(SCENES).filter((def) => /cv-scene-(sway|drift|rays|bob)/.test(renderToString(<ScenePicture scene={cutScene(def)} />)))
    expect(moving.length).toBeGreaterThanOrEqual(8)
  })

  it('a few pieces move, not the whole sheet', () => {
    for (const def of Object.values(SCENES)) {
      const html = renderToString(<ScenePicture scene={cutScene(def)} />)
      expect((html.match(/cv-scene-(sway|drift|rays|bob)/g) ?? []).length).toBeLessThanOrEqual(10)
    }
  })
})

describe('the clue marks', () => {
  const kinds = Object.keys(CLUE_ART) as ClueKind[]

  it.each(kinds)('%s is paper in both states and all its drawings, and lights by its fill alone', (kind) => {
    const art = CLUE_ART[kind]
    for (const pair of [art.art, ...(art.variations ?? [])]) {
      const earned = paperMarkFor(pair.earned)!
      const drained = paperMarkFor(pair.drained)!
      expect(earned.d).toBe(drained.d)
      expect(earned.fill).toBe(art.earned)
      expect(drained.fill).toBe(CLUE_DRAINED)
    }
  })

  it('stays cheap: one path, few points, because it repeats about 40 times', () => {
    for (const kind of kinds) {
      const mark = paperMarkFor(CLUE_ART[kind].art.earned)!
      expect(mark.d.length, kind).toBeLessThan(1500)
    }
  })

  it('a trace, never an animal: no mark has eyes or a face', () => {
    const html = renderToString(<svg><ArtInSvg art={CLUE_ART.wool.art.earned} box={{ x: 0, y: 0, width: 28, height: 28 }} /></svg>)
    expect(html.match(/<path/g)).toHaveLength(1)
    expect(html).not.toContain('data-puppet')
  })

  it('prints alternate; a thing that was dropped does not', () => {
    expect(paperMarkFor(CLUE_ART.webfoot.art.earned)!.alternates).toBe(true)
    expect(paperMarkFor(CLUE_ART.handprint.art.earned)!.alternates).toBe(true)
    expect(paperMarkFor(CLUE_ART.puddle.art.earned)!.alternates).toBe(false)
  })
})

describe('the props', () => {
  it('stand in the box they are handed and never ask for a clock', () => {
    const html = renderToString(<svg><ArtInSvg art={SECTOR_ADVENTURE_ART.stone} box={{ x: 10, y: 20, width: 60, height: 50 }} /></svg>)
    expect(html).toContain('x="10"')
    expect(html).toContain('width="60"')
    expect(html).toContain(`data-art="${SECTOR_ADVENTURE_ART.stone.href}"`)
    expect(html).not.toContain('<image')
  })

  it('every thing a level meets on the sheet is drawn', () => {
    for (const art of [SECTOR_ADVENTURE_ART.stone, SECTOR_ADVENTURE_ART.leaf, SECTOR_ADVENTURE_ART.leaf2, SECTOR_ADVENTURE_ART.leaf3, SECTOR_ADVENTURE_ART.apple, SECTOR_ADVENTURE_ART.apple2, SECTOR_ADVENTURE_ART.apple3, SECTOR_ADVENTURE_ART.mushroom, SECTOR_ADVENTURE_ART.flower, SECTOR_ADVENTURE_ART.flowerDormant, SECTOR_ADVENTURE_ART.honeycomb, SECTOR_ADVENTURE_ART.chest, HAZARD_STARFISH_ART]) {
      expect(paperPropFor(art), art.href).toBeDefined()
    }
  })

  it('a dormant and a lit flower share their shape: the swap does not move it', () => {
    const shapes = (art: { href: string }) => paperPropFor(art)!.layers.flatMap((l) => l.pieces.map((p) => p.d))
    expect(shapes(SECTOR_ADVENTURE_ART.flower)).toEqual(shapes(SECTOR_ADVENTURE_ART.flowerDormant))
  })

  it('reaches HTML surfaces too', () => {
    expect(renderToString(<ArtImg art={SECTOR_ADVENTURE_ART.chest} />)).toContain(`data-art="${SECTOR_ADVENTURE_ART.chest.href}"`)
  })
})
