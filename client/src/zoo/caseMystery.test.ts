// Review batch 2 (`docs/25` §5.2 P2-2, §7 item 2.1; the author's decision of
// 2026-10-16): a case's animal stays a mystery until its deduction. From the
// case's entry screen up to the deduction nothing names the animal or shows
// its art, and nothing collected on the way is the animal itself (collecting
// it AFTER the deduction — the rescue levels — is fine). The prologue and the
// cleaning enclosures are the world's opening lore and stay out of this.
// Node environment, no DOM — every check reads registry data only.
import { describe, expect, it } from 'vitest'
import {
  ANIMAL_ART,
  ANIMAL_SILHOUETTE_ART,
  HEDGEHOG_ART,
  ZOO_ANIMAL_ART,
  ZOO_ANIMAL_SILHOUETTE_ART,
  type ArtImage,
  type ZooAnimalId,
} from '../detective/assets'
import { DETECTIVE_CASES, type DetectiveCase } from '../detective/cases'
import { getLevel } from '../levels/catalog'
import type { LevelConfig } from '../levels/types'
import { ADVENTURES, introBubbleArt, type Adventure } from './adventures'

/** Every way a line can name a case's animal: singular and plural. Matched
 *  as whole words, case- and accent-insensitively (`fold`). */
const ANIMAL_WORDS: Readonly<Partial<Record<ZooAnimalId, readonly string[]>>> = {
  pato: ['pato', 'patos', 'patito', 'patitos'],
  oveja: ['oveja', 'ovejas'],
  erizo: ['erizo', 'erizos'],
  tortuga: ['tortuga', 'tortugas'],
  mono: ['mono', 'monos'],
  // The fish case's lineup is the enclosures' signs, so the enclosure's own
  // name gives the answer away just as well as the animal's.
  pez: ['pez', 'peces', 'pecera', 'peceras'],
  gallina: ['gallina', 'gallinas'],
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function namedAnimal(text: string, animal: ZooAnimalId): string | undefined {
  const words = fold(text).split(/[^\p{L}]+/u)
  return (ANIMAL_WORDS[animal] ?? []).find((w) => words.includes(fold(w)))
}

/** Every picture that IS the animal: its zoo art, its silhouette, and (for
 *  the erizo) every pose of the hedgehog. Compared by `href`. */
function animalHrefs(animal: ZooAnimalId): ReadonlySet<string> {
  const arts: (ArtImage | undefined)[] = [
    ZOO_ANIMAL_ART[animal],
    ZOO_ANIMAL_SILHOUETTE_ART[animal],
    (ANIMAL_ART as Readonly<Record<string, ArtImage>>)[animal],
    (ANIMAL_SILHOUETTE_ART as Readonly<Record<string, ArtImage | undefined>>)[animal],
    ...(animal === 'erizo' ? Object.values(HEDGEHOG_ART) : []),
  ]
  return new Set(arts.filter((a): a is ArtImage => !!a).map((a) => a.href))
}

/** Every picture a level stands on its route or hands the child to gather. */
function levelPictures(level: LevelConfig): ArtImage[] {
  return [
    ...(level.collect ? [level.collect.art, ...(level.collect.variants ?? [])] : []),
    ...(level.vertexArt ? [level.vertexArt.art] : []),
    ...(level.goalArt ? [level.goalArt] : []),
    ...(level.carrierArt ? [level.carrierArt.art] : []),
    ...(level.hazardArt ? [level.hazardArt] : []),
    ...(level.reveal?.mode === 'light' ? level.reveal.objects.map((o) => o.art) : []),
    ...(level.waypoints
      ? [level.waypoints.goalArt, level.waypoints.stopArt.dormant, level.waypoints.stopArt.lit]
      : []),
  ]
}

interface CaseRun {
  readonly kase: DetectiveCase
  /** The adventure whose entry screen opens this case, if any (`hen` is the
   *  office's case and has no entry screen). */
  readonly adventure?: Adventure
  /** Every level played before the deduction, in play order. */
  readonly levelIds: readonly string[]
}

function caseRuns(): CaseRun[] {
  return DETECTIVE_CASES.map((kase) => {
    const adventure = ADVENTURES.find((a) => a.deduction?.caseId === kase.id)
    if (!adventure) return { kase, levelIds: kase.trailIds }
    const after = adventure.levelIds.indexOf(adventure.deduction!.after)
    return { kase, adventure, levelIds: adventure.levelIds.slice(0, after + 1) }
  })
}

describe('a case keeps its animal a mystery until the deduction', () => {
  const runs = caseRuns()

  it('covers every journey case with a deduction', () => {
    const withEntry = runs.filter((r) => r.adventure).map((r) => r.kase.id)
    expect(withEntry.sort()).toEqual(['duck', 'fish', 'monkeys', 'night', 'sheep', 'turtles'])
    for (const run of runs) expect(ANIMAL_WORDS[run.kase.culprit], run.kase.id).toBeDefined()
  })

  for (const { kase, adventure, levelIds } of runs) {
    const animal = kase.culprit

    if (adventure) {
      it(`${kase.id}: the entry line does not name the ${animal}`, () => {
        const lines = [adventure.intro, adventure.introTool?.line, adventure.introTool?.label]
        for (const line of lines) {
          if (line) expect(namedAnimal(line, animal), line).toBeUndefined()
        }
      })

      it(`${kase.id}: the entry bubble and tool badge do not show the ${animal}`, () => {
        const hrefs = animalHrefs(animal)
        expect(hrefs.has(introBubbleArt(adventure).href), introBubbleArt(adventure).href).toBe(false)
        if (adventure.introTool) expect(hrefs.has(adventure.introTool.art.href)).toBe(false)
      })
    }

    it(`${kase.id}: no level before the deduction names the ${animal} in its hint or title`, () => {
      for (const id of levelIds) {
        const level = getLevel(id)
        expect(namedAnimal(level.hint, animal), `${id} hint: ${level.hint}`).toBeUndefined()
        expect(namedAnimal(level.title, animal), `${id} title: ${level.title}`).toBeUndefined()
      }
    })

    it(`${kase.id}: no level before the deduction collects or shows the ${animal}`, () => {
      const hrefs = animalHrefs(animal)
      for (const id of levelIds) {
        for (const art of levelPictures(getLevel(id))) expect(hrefs.has(art.href), `${id}: ${art.href}`).toBe(false)
      }
    })
  }
})
