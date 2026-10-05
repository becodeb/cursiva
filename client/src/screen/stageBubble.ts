// [T51] The entry and closing screens' Pulpito + speech bubble, as ONE pure
// call: `AdventureIntro.tsx` and `AdventureClosing.tsx` render exactly what
// this returns, and `bubbleFit.test.ts` sweeps every registry line through
// the same function, so the geometry under test is the geometry shipped
// (the `Deduction.tsx` `deductionBubble` precedent).
import type { ArtImage } from '../detective/assets'
import type { PulpitoCorner } from '../zoo/adventures'
import { placeAndFitBubble, ZOO_SPEECH_BUBBLE_LEFT_CONTENT, type PlacedBubbleContent } from './bubbleFit'
import { ZOO_SPEECH_BUBBLE_LEFT_TAIL, type Box } from './bubblePlacement'
import {
  OCTOPUS_CORNER_INSET,
  octopusBoxAtCorner,
  stageBubbleFrame,
  stageOctopusSizing,
  stageSpeechTarget,
  stanceBubbleSide,
} from './pulpitoStance'
import type { ViewportSize } from './useViewportSize'

export interface StageBubbleOptions {
  /** The octopus picture standing on the stage (a pose, the backpack
   *  octopus, or a beat's own `figure`). */
  readonly figure: ArtImage
  readonly corner: PulpitoCorner
  /** The window size; `undefined` (SSR) keeps the plain square frame. */
  readonly viewport: ViewportSize | undefined
  readonly text: string
  /** The bubble's own small picture; absent = text only. */
  readonly art?: ArtImage
}

export interface StageBubble extends PlacedBubbleContent {
  /** The octopus's own box, percent of the stage. */
  readonly octopusBox: Box
}

export function placeStageBubble({ figure, corner, viewport, text, art }: StageBubbleOptions): StageBubble {
  const octopusBox = octopusBoxAtCorner(figure, {
    corner,
    ...stageOctopusSizing(figure),
    bottom: 2,
    inset: OCTOPUS_CORNER_INSET,
  })
  const { placement, content } = placeAndFitBubble({
    frame: stageBubbleFrame(viewport),
    headBox: octopusBox,
    tail: ZOO_SPEECH_BUBBLE_LEFT_TAIL,
    box: ZOO_SPEECH_BUBBLE_LEFT_CONTENT,
    target: stageSpeechTarget(figure, octopusBox, corner),
    side: stanceBubbleSide(corner),
    text,
    art,
  })
  return { octopusBox, placement, content }
}
