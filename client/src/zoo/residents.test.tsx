// The rule the story asked for, held for every adventure and every place, so a scene
// cannot bring it back: an animal that is lost is not in its place, and whatever a line
// names is there, whole, on every screen shape.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SECTOR_BACKGROUND_ART, ZOO_ANIMAL_ART, type ZooAnimalId } from '../detective/assets'
import { luma } from '../detective/palette'
import { sceneFor } from '../puppet/scene/Scene'
import { cutScene, type CutScene, type SceneDef } from '../puppet/scene/engine'
import { NAMED_THINGS, SCENES, type SceneName } from '../puppet/scene/scenes'
import { ZOO_MAP_SCENE } from '../puppet/scene/zooMap'
import AdventureClosing from '../screen/AdventureClosing'
import AdventureIntro from '../screen/AdventureIntro'
import { ADVENTURES, closingBeats, type Adventure } from './adventures'
import { backdropFor } from './backdrops'
import { placesOf, residentsOf } from './residents'
import type { Records } from './sectors'

const FILED = { approvals: 1 } as Records[string]
const filed = (rows: readonly Adventure[]): Records => Object.fromEntries(rows.flatMap((a) => a.levelIds.map((id) => [id, FILED])))
const rescued = ADVENTURES.filter((a): a is Adventure & { animal: ZooAnimalId } => a.animal !== undefined)
const everyoneBut = (animal: ZooAnimalId): Records => filed(ADVENTURES.filter((a) => a.animal !== animal))
const adventure = (id: string): Adventure => ADVENTURES.find((a) => a.id === id)!

/** What the intro paints behind the Pulpito: everything but his bubble and the chrome. */
function introPlace(row: Adventure, records: Records): string {
  const html = renderToString(<AdventureIntro adventure={row} records={records} onStart={() => {}} />)
  return html.slice(html.indexOf('class="cv-intro-backdrop"'), html.indexOf('class="cv-intro-frame"'))
}

describe('a lost animal is not in its place', () => {
  it.each(rescued.map((a) => [a.id, a] as const))('%s: its intro renders no animal of its kind', (_, row) => {
    for (const records of [{}, everyoneBut(row.animal)]) {
      const place = introPlace(row, records)
      expect(place.length).toBeGreaterThan(100)
      expect(place).not.toContain(`data-resident="${row.animal}"`)
      expect(place).not.toContain(`data-art="${ZOO_ANIMAL_ART[row.animal].href}"`)
    }
  })

  it.each(rescued.map((a) => [a.id, a] as const))('%s: and nobody stands anywhere until they are found', (_, row) => {
    for (const href of placesOf(row.animal)) {
      expect(residentsOf({ href }, everyoneBut(row.animal)).filter((r) => r.animal === row.animal)).toEqual([])
    }
  })

  it('the entrance enclosures: nobody is in them on the way in or on the way out', () => {
    for (const id of ['peces', 'tortugas', 'monos', 'sendero']) {
      const row = adventure(id)
      expect(introPlace(row, {}), id).not.toContain('data-resident')
      const html = renderToString(<AdventureClosing adventure={row} beat={row.closingBeat![0]} onContinue={() => {}} />)
      expect(html, id).not.toContain('data-resident')
    }
  })
})

describe('a place has no eyes', () => {
  /** A face is a small dark piece on a small pale one: anything alive has it, and no stone
   *  or chest does. Whoever lives in a place stands on it as a resident, not as paint. */
  function eyesIn(scene: CutScene): string[] {
    const pieces = scene.layers.flatMap((l) => l.pieces)
    const out: string[] = []
    for (const pale of pieces) {
      const w = pale.right - pale.left
      if (luma(pale.c) < 200 || w > 60) continue
      for (const dark of pieces) {
        if (luma(dark.c) > 70) continue
        const dw = dark.right - dark.left
        if (dw < w * 0.8 && dark.left >= pale.left - 2 && dark.right <= pale.right + 2 && dark.top >= pale.top - 2 && dark.bottom <= pale.bottom + 2) {
          out.push(`${dark.c} on ${pale.c} at ${Math.round(pale.left)},${Math.round(pale.top)}`)
        }
      }
    }
    return out
  }

  it.each(Object.entries(SCENES))('%s', (_, def) => {
    expect(eyesIn(cutScene(def))).toEqual([])
  })

  it('nor does the map', () => {
    expect(eyesIn(cutScene(ZOO_MAP_SCENE))).toEqual([])
  })

  it('and this test would see a fish painted in again', () => {
    const paintedFish: SceneDef = {
      w: 2000,
      h: 1000,
      base: '#94dbea',
      layers: [
        {
          pieces: [
            { d: 'M400 200C400 170 540 170 540 200C540 230 400 230 400 200Z', c: '#ffb04d' },
            { d: 'M480 190C480 180 500 180 500 190C500 200 480 200 480 190Z', c: '#ffffff' },
            { d: 'M486 190C486 186 494 186 494 190C494 194 486 194 486 190Z', c: '#1a2226' },
          ],
        },
      ],
    }
    expect(eyesIn(cutScene(paintedFish))).toHaveLength(1)
  })
})

describe('once they are found, the place shows them, from the records', () => {
  it('the aquarium is empty before and alive after the fish come home', () => {
    const tank = SECTOR_BACKGROUND_ART.aquarium
    expect(residentsOf(tank, {})).toEqual([])
    expect(residentsOf(tank, everyoneBut('pez'))).toEqual([])
    const home = residentsOf(tank, filed([adventure('fish')]))
    expect(home.length).toBeGreaterThanOrEqual(3)
    expect(new Set(home.map((r) => r.animal))).toEqual(new Set(['pez']))
  })

  it('half a rescue is not a rescue', () => {
    const fish = adventure('fish')
    const partial: Records = Object.fromEntries(fish.levelIds.slice(0, -1).map((id) => [id, FILED]))
    expect(residentsOf(SECTOR_BACKGROUND_ART.aquarium, partial)).toEqual([])
  })

  it('an old enclosure line is not said in front of what came back', () => {
    const peces = adventure('peces')
    expect(closingBeats(peces, {})[0].line).toContain('no hay ni un pez')
    expect(closingBeats(peces, filed([adventure('fish')]))[0].line).not.toContain('no hay')
    const sendero = adventure('sendero')
    expect(closingBeats(sendero, {})).toHaveLength(2)
    expect(closingBeats(sendero, filed([adventure('duck')]))[0].line).not.toContain('Se fueron')
  })

  it.each([
    ['fish', 'aquarium', 'pez'],
    ['monkeys', 'monkeys', 'mono'],
    ['turtles', 'sand', 'tortuga'],
  ] as const)('%s closes where its line says, with them there', (id, place, animal) => {
    const row = adventure(id)
    const html = renderToString(<AdventureClosing adventure={row} beat={row.closingBeat![0]} onContinue={() => {}} />)
    expect(html).toContain(`data-art="${SECTOR_BACKGROUND_ART[place].href}"`)
    expect(html).toContain(`data-resident="${animal}"`)
  })

  it('a lone animal is the hero of its own closing, not a twin of itself', () => {
    const row = adventure('duck')
    const html = renderToString(<AdventureClosing adventure={row} beat={row.closingBeat![0]} onContinue={() => {}} />)
    expect(html).not.toContain('data-resident="pato"')
  })

  it('another animal already home stands in the place it shares', () => {
    expect(introPlace(adventure('dolphin'), filed([adventure('duck')]))).toContain('data-resident="pato"')
  })
})

describe('what a line names is there, whole, on every screen', () => {
  // The central 4:3 (a tablet) and the 924 rows a phone at 844x390 keeps.
  const SAFE = { x0: 333, x1: 1667, y0: 38, y1: 962 }
  const placeOf = (row: Adventure): SceneName => {
    const href = (row.home ?? backdropFor(row.levelIds[0])!.art).href
    return (Object.entries(SECTOR_BACKGROUND_ART) as [SceneName, { href: string }][]).find(([, art]) => art.href === href)![0]
  }
  const NAMED: readonly (readonly [string, 'intro' | 'closing', readonly string[]])[] = [
    ['peces', 'closing', ['algas', 'cofre', 'piedras']],
    ['tortugas', 'closing', ['piedras', 'tronco']],
    ['monos', 'closing', ['sogas', 'frutas']],
    ['sendero', 'closing', ['huellas']],
    ['sheep', 'intro', ['lana']],
    ['turtles', 'intro', ['surco']],
    ['fish', 'intro', ['burbujas']],
    ['bee', 'intro', ['flores']],
    ['bee', 'closing', ['panal']],
    ['monkeys', 'intro', ['lianas']],
    ['monkeys', 'closing', ['sogas']],
  ]

  it.each(NAMED.map((row) => [`${row[0]} ${row[1]}`, row] as const))('%s', (_, [id, when, words]) => {
    const row = adventure(id)
    const line = when === 'intro' ? row.intro : row.closingBeat![0].line
    const name = when === 'intro' ? (Object.entries(SECTOR_BACKGROUND_ART) as [SceneName, { href: string }][]).find(([, art]) => art.href === backdropFor(row.levelIds[0])!.art.href)![0] : placeOf(row)
    const scene = sceneFor(SECTOR_BACKGROUND_ART[name])!
    for (const word of words) {
      expect(line.toLowerCase().replace('¡son ', ''), word).toContain(word)
      const thing = NAMED_THINGS[name]?.[word]
      expect(thing, `${name} names ${word}`).toBeDefined()
      expect(thing!.x0, word).toBeGreaterThanOrEqual(SAFE.x0)
      expect(thing!.x1, word).toBeLessThanOrEqual(SAFE.x1)
      expect(thing!.y0, word).toBeGreaterThanOrEqual(SAFE.y0)
      expect(thing!.y1, word).toBeLessThanOrEqual(SAFE.y1)
      // Something is really cut there, and not cut off.
      const inside = scene.layers.flatMap((l) => l.pieces).filter((p) => p.left >= thing!.x0 - 6 && p.right <= thing!.x1 + 6 && p.top >= thing!.y0 - 6 && p.bottom <= thing!.y1 + 6)
      expect(inside.length, `${name}: ${word}`).toBeGreaterThanOrEqual(1)
    }
  })

  it('the chest is a chest: lid, band and clasp, not a lump', () => {
    const tank = sceneFor(SECTOR_BACKGROUND_ART.aquarium)!
    const thing = NAMED_THINGS.aquarium!.cofre
    const inside = tank.layers.flatMap((l) => l.pieces).filter((p) => p.left >= thing.x0 - 6 && p.right <= thing.x1 + 6 && p.top >= thing.y0 - 6 && p.bottom <= thing.y1 + 6)
    expect(inside.length).toBeGreaterThanOrEqual(6)
    expect(inside.map((p) => p.c)).toContain('#ffd84f')
    expect(new Set(inside.map((p) => p.c)).size).toBeGreaterThanOrEqual(4)
  })

  it('a bubble says what the line says: he is a ball, so his picture is the ball', () => {
    const html = renderToString(<AdventureIntro adventure={adventure('hedgehog')} onStart={() => {}} />)
    expect(html).toContain(`data-art="${adventure('hedgehog').introArt!.href}"`)
  })
})
