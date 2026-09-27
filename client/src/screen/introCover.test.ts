// introCover tests (`odd/tasks/prewriting-stage-completion.md` T31). Node
// environment, no DOM: pure data derivation, no `renderToString` needed here
// (the rendering itself is exercised through `AdventureIntro.test.tsx`).
import { describe, expect, it } from 'vitest'
import { introCoverFor, INTRO_COVER_VIEWBOX_HEIGHT } from './introCover'
import { ADVENTURES } from '../zoo/adventures'
import { getLevel } from '../levels/catalog'
import { buildLevelTarget } from '../levels/buildLevel'
import { backdropFor } from '../zoo/backdrops'

function adventure(id: string) {
  const found = ADVENTURES.find((a) => a.id === id)
  if (!found) throw new Error(`fixture adventure not found: ${id}`)
  return found
}

describe('introCoverFor — trail adventures with neither a reveal nor a grey corridor', () => {
  it('returns null for the duck (a collect-along-path trail, no cover of any kind)', () => {
    expect(introCoverFor(adventure('duck'))).toBeNull()
  })

  it('returns null for every animal-trail adventure (sheep/llama/turtle/bee/dolphin/hedgehog)', () => {
    for (const id of ['sheep', 'llama', 'turtle', 'bee', 'dolphin', 'hedgehog']) {
      const a = ADVENTURES.find((x) => x.id === id)
      if (!a) continue // not every id above is guaranteed to exist across batches; skip absent ones
      expect(introCoverFor(a), id).toBeNull()
    }
  })
})

describe('introCoverFor — cleaning levels (glass/sand/leaves/mud), the fog/sand/leaves/mud play-test note', () => {
  it('peces (glass1): a veil cover, full grid at opacity 1, no visual override (plain fogged glass)', () => {
    const cover = introCoverFor(adventure('peces'))
    expect(cover?.kind).toBe('veil')
    if (cover?.kind !== 'veil') return
    const level = getLevel('glass1')
    expect(level.reveal?.mode).toBe('erase')
    const erase = level.reveal as Extract<typeof level.reveal, { mode: 'erase' }>
    expect(cover.reveal.tiles.length).toBe(erase.cols * erase.rows)
    expect(cover.reveal.tiles.every((t) => t.opacity === 1)).toBe(true)
    expect(cover.reveal.visual).toBeUndefined()
    expect(cover.reveal.fill).toBe(backdropFor('glass1')!.tile)
    expect(cover.backdropHref).toBe(backdropFor('glass1')!.art.href)
    expect(cover.viewBoxWidth).toBe(buildLevelTarget(level).viewBoxWidth)
  })

  it('tortugas (sand1): visual "sand"', () => {
    const cover = introCoverFor(adventure('tortugas'))
    expect(cover?.kind).toBe('veil')
    if (cover?.kind === 'veil') expect(cover.reveal.visual).toBe('sand')
  })

  it('monos (glass3): visual "leaves"', () => {
    const cover = introCoverFor(adventure('monos'))
    expect(cover?.kind).toBe('veil')
    if (cover?.kind === 'veil') expect(cover.reveal.visual).toBe('leaves')
  })

  it('sendero (sand3): visual "mud"', () => {
    const cover = introCoverFor(adventure('sendero'))
    expect(cover?.kind).toBe('veil')
    if (cover?.kind === 'veil') expect(cover.reveal.visual).toBe('mud')
  })
})

describe('introCoverFor — night (a light reveal): full darkness, every hidden object still under the veil', () => {
  it('night: an empty tile list (RevealLayer\'s own solid-darkness fast path) and every object unrevealed', () => {
    const cover = introCoverFor(adventure('night'))
    expect(cover?.kind).toBe('veil')
    if (cover?.kind !== 'veil') return
    const level = getLevel('night1')
    expect(level.reveal?.mode).toBe('light')
    const light = level.reveal as Extract<typeof level.reveal, { mode: 'light' }>
    expect(cover.reveal.tiles).toEqual([])
    expect(cover.reveal.art?.length).toBe(light.objects.length)
    expect(cover.reveal.art?.every((o) => o.revealed === false)).toBe(true)
  })
})

describe('introCoverFor — snake: the grey (uncoloured) corridor, nothing traced yet', () => {
  it('snake: one grey piece per artCorridor entry that carries greyArt, placed exactly where the level itself would stand it', () => {
    const cover = introCoverFor(adventure('snake'))
    expect(cover?.kind).toBe('snake')
    if (cover?.kind !== 'snake') return
    const level = getLevel('snake1')
    const target = buildLevelTarget(level)
    const expectedCount = level.artCorridor!.filter((p) => !!p.greyArt).length
    expect(expectedCount).toBeGreaterThan(0)
    expect(cover.pieces.length).toBe(expectedCount)
    // Every rendered piece's own box/rotate/pivot is the SAME object the
    // engine itself would place — never a second, independently recomputed
    // placement (this file's own header on why nothing here re-derives
    // `placeArtCorridor`'s own arithmetic).
    let cursor = 0
    level.artCorridor!.forEach((piece, i) => {
      if (!piece.greyArt) return
      const placed = target.artCorridor![i]
      const rendered = cover.pieces[cursor++]
      expect(rendered.href).toBe(piece.greyArt.href)
      expect(rendered.box).toEqual(placed.box)
      expect(rendered.rotate).toBe(placed.rotate)
      expect(rendered.pivot).toEqual(placed.pivot)
    })
  })

  it('never mixes the veil shape into a snake cover (no reveal field at all)', () => {
    const cover = introCoverFor(adventure('snake'))
    expect(cover && 'reveal' in cover).toBe(false)
  })
})

describe('INTRO_COVER_VIEWBOX_HEIGHT', () => {
  it('is the fixed 600 every sheet in this game uses (canvas/TraceCanvas.tsx\'s own VIEWBOX_HEIGHT)', () => {
    expect(INTRO_COVER_VIEWBOX_HEIGHT).toBe(600)
  })
})
