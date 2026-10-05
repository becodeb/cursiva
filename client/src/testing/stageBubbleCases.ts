// Every line an entry or closing screen can put in Pulpito's bubble, with the
// picture beside it and the octopus figure standing there — exactly
// `AdventureIntro.tsx`'s and `AdventureClosing.tsx`'s own choices. Shared by
// `screen/bubbleFit.test.ts` (fit) and `screen/bubbleArt.test.ts` (pixels).
import type { ArtImage } from '../detective/assets'
import { ZOO_OCTOPUS_BACKPACK_ART } from '../detective/assets'
import { closingBubbleText } from '../screen/AdventureClosing'
import { INTRO_OCTOPUS_ART, RESCUE_OCTOPUS_ART } from '../screen/pulpitoStance'
import { ADVENTURES, introBubbleArt } from '../zoo/adventures'

export interface StageBubbleCase {
  readonly id: string
  readonly text: string
  readonly art?: ArtImage
  readonly figure: ArtImage
}

/** The four sizes T51 names plus 1180x820 (the tablet T18 swept). */
export const STAGE_VIEWPORTS: ReadonlyArray<{ readonly width: number; readonly height: number }> = [
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 1920, height: 911 },
  { width: 844, height: 390 },
  { width: 1180, height: 820 },
]

export function stageBubbleCases(): StageBubbleCase[] {
  const cases: StageBubbleCase[] = []
  for (const adventure of ADVENTURES) {
    cases.push({ id: `${adventure.id}: intro`, text: adventure.intro, art: introBubbleArt(adventure), figure: INTRO_OCTOPUS_ART })
    const isRescue = adventure.animal !== undefined
    for (const [i, beat] of (adventure.closingBeat ?? []).entries()) {
      const figure = beat.figure ?? (isRescue ? RESCUE_OCTOPUS_ART : ZOO_OCTOPUS_BACKPACK_ART)
      // A rescue closing is text-only (T24) and, until the notebook was
      // opened once, carries the notebook hint too (T31).
      const texts = isRescue ? [closingBubbleText(beat, false), closingBubbleText(beat, true)] : [beat.line]
      for (const [j, text] of texts.entries()) {
        cases.push({ id: `${adventure.id}: closingBeat[${i}]${j ? ' + hint' : ''}`, text, art: isRescue ? undefined : beat.art, figure })
      }
    }
  }
  return cases
}
