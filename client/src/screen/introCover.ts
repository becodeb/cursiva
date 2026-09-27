// The intro's own initial cover state (`odd/tasks/prewriting-stage-
// completion.md` T31, `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md` §4). The
// author's play-test note: "dice que el vidrio está empañado, pero se ve el
// fondo limpio" — `AdventureIntro.tsx` used to draw a level's adventure only
// the flat backdrop art (`backdropFor`), never the covering layer
// (fog/sand/leaves/mud, night's darkness, or a snake's grey art) the level
// itself opens on. This module derives that INITIAL — nothing cleared,
// nothing lit, nothing traced — cover state directly from the level's own
// `LevelConfig`, reusing the exact engine values a fresh `LevelPlay` mount
// would compute (`levels/revealGrid.ts`'s `EMPTY_REVEAL`/`revealTiles`,
// `levels/buildLevel.ts`'s `buildLevelTarget`), so `canvas/RevealLayer.tsx`
// (unchanged, reused as-is) renders pixel-for-pixel what the level's own
// first frame renders, at a fraction of `LevelPlay.tsx`'s own weight (no
// route scoring, no pointer handling, no demo animation).
//
// Pure and DOM-free: everything here is plain data derivation, testable with
// `getLevel`/`buildLevelTarget` alone (the same convention every other
// `levels/`-adjacent `screen/*.ts` module in this file's own directory
// follows — `pulpitoStance.ts`, `bubbleFit.ts`, `rescueAnimalPlacement.ts`).
//
// Which SURFACE a cleaning level's remaining tiles paint (glass/sand/leaves/
// mud) is not a `LevelConfig` field — `screen/LevelPlay.tsx` itself decides
// it from a private, unexported per-id check. Re-deriving THAT check here
// would either duplicate its literal id list (drifting the instant either
// side changes) or require exporting from `LevelPlay.tsx`, out of this
// task's own file boundary. Every adventure in this registry carries EXACTLY
// one level in `levelIds` for its cleaning/mud/leaves/sand row (`peces` →
// `glass1`, `tortugas` → `sand1`, `monos` → `glass3`, `sendero` → `sand3`,
// `zoo/adventures.ts`), so the ADVENTURE's own id is already the same
// distinguishing fact `LevelPlay.tsx`'s id-based check reaches for — no
// import from that file needed.
import type { Adventure } from '../zoo/adventures'
import { backdropFor } from '../zoo/backdrops'
import { getLevel } from '../levels/catalog'
import { buildLevelTarget } from '../levels/buildLevel'
import { EMPTY_REVEAL, revealTiles } from '../levels/revealGrid'
import { SHEET_PAPER, type TraceReveal } from '../canvas/TraceCanvas'
import type { ArtBox } from '../canvas/placeArt'

/** `canvas/TraceCanvas.tsx`'s own `VIEWBOX_HEIGHT` — not exported (the ruled
 *  zones never move), restated here as the same fixed constant every other
 *  file that draws a level's own 1000(-or-wider)x600 sheet already assumes
 *  (`screen/ZooMap.tsx`'s literal `viewBox="0 0 1000 600"`, `canvas/
 *  RevealLayer.test.tsx`'s own fixture). */
export const INTRO_COVER_VIEWBOX_HEIGHT = 600

/** A cleaning (glass/sand/leaves/mud) or night (light) level's initial veil —
 *  everything `canvas/RevealLayer.tsx` needs, nothing it does not. */
export interface IntroCoverVeil {
  kind: 'veil'
  viewBoxWidth: number
  backdropHref: string
  reveal: TraceReveal
}

/** A snake level's initial grey corridor — the pieces stand exactly where
 *  the level itself would place them (`levels/artCorridor.ts`'s
 *  `placeArtCorridor`, via `buildLevelTarget`), each drawn with its OWN
 *  `greyArt` rather than its coloured `art` (T20's own "nothing traced yet"
 *  frame — pixel-identical to `progress: 0`, `screen/LevelPlay.tsx`'s own
 *  `traceArtCorridor`). */
export interface IntroCoverSnakePiece {
  href: string
  box: ArtBox
  rotate: number
  pivot: { x: number; y: number }
}

export interface IntroCoverSnake {
  kind: 'snake'
  viewBoxWidth: number
  backdropHref: string
  pieces: readonly IntroCoverSnakePiece[]
}

export type IntroCover = IntroCoverVeil | IntroCoverSnake | null

/** The three adventures whose one-and-only introduced level paints its
 *  remaining reveal tiles as something other than plain glass/fog — see
 *  this file's own header on why the ADVENTURE id is the right key. */
function coverVisual(adventureId: Adventure['id']): 'sand' | 'leaves' | 'mud' | undefined {
  if (adventureId === 'tortugas') return 'sand'
  if (adventureId === 'monos') return 'leaves'
  if (adventureId === 'sendero') return 'mud'
  return undefined
}

/**
 * The adventure's own first level, exactly as it will look the instant
 * `LevelPlay` mounts it — nothing cleared, nothing lit, nothing traced.
 * `null` for every adventure whose first level carries neither a `reveal`
 * covering nor a grey-art `artCorridor` (every animal-trail adventure:
 * duck/sheep/llama/turtle/bee/dolphin/hedgehog) — those keep showing today's
 * flat backdrop, unchanged, exactly as `AdventureIntro.tsx`'s own caller
 * already falls back to.
 */
export function introCoverFor(adventure: Adventure): IntroCover {
  const levelId = adventure.levelIds[0]
  const level = getLevel(levelId)
  const backdrop = backdropFor(levelId)
  if (!backdrop) return null
  const target = buildLevelTarget(level)

  const hasGreyCorridor = level.artCorridor?.some((piece) => !!piece.greyArt) ?? false
  if (hasGreyCorridor) {
    const pieces: IntroCoverSnakePiece[] = []
    level.artCorridor!.forEach((piece, i) => {
      const placed = target.artCorridor?.[i]
      if (!piece.greyArt || !placed) return
      pieces.push({ href: piece.greyArt.href, box: placed.box, rotate: placed.rotate, pivot: placed.pivot })
    })
    return { kind: 'snake', viewBoxWidth: target.viewBoxWidth, backdropHref: backdrop.art.href, pieces }
  }

  if (!level.reveal) return null

  const tiles = revealTiles(level.reveal, EMPTY_REVEAL, target.viewBoxWidth)
  const visual = coverVisual(adventure.id)
  const reveal: TraceReveal =
    level.reveal.mode === 'light'
      ? {
          fill: backdrop.tile ?? SHEET_PAPER,
          tiles,
          art: level.reveal.objects.map((o) => ({
            href: o.art.href,
            w: o.art.w,
            h: o.art.h,
            size: o.size,
            x: o.x,
            y: o.y,
            revealed: false,
          })),
        }
      : { fill: backdrop.tile ?? SHEET_PAPER, ...(visual ? { visual } : {}), tiles }
  return { kind: 'veil', viewBoxWidth: target.viewBoxWidth, backdropHref: backdrop.art.href, reveal }
}
