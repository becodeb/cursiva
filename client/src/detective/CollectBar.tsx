// The in-level collect-along-the-path progress bar (`docs/19` §2.2/§3.4;
// T17). This is NOT `TrailProgressBar` — that component answers "how far
// along THIS ANIMAL'S ADVENTURE am I" (one slot per LEVEL, `zoo/progress.ts`);
// this one answers "how many of THIS LEVEL's own items have I gathered so
// far", which changes several times DURING a single level's own run as the
// child traces past each peak.
//
// It reuses `TrailProgressBar`'s own markup shape and CSS classes VERBATIM
// (`pistas-bar`, `pistas-slots`, `pistas-slot-shell`, `pistas-slot`,
// `pistas-flight`, all defined once in `screen/LevelPlay.tsx`'s `LAYOUT_CSS`)
// rather than inventing a second visual language for "a row of collectible
// sockets that pop and fly when earned" — the exact instruction this task
// carries ("reuse the existing pop/fly animation of the clue rail if it
// fits"). `TrailProgressBar.Slot`'s own `justFiled` baseline-diff technique
// is reused too: a ref captures which items were ALREADY collected the first
// time this bar mounted (this level's `?` case, mid-session resume through
// `?debug=`), and only an item that flips false → true AFTER that baseline
// ever plays the flight — so resuming a level already partway collected never
// replays every earlier item's animation at once.
//
// `LevelPlay.tsx` renders this INSTEAD OF `TrailProgressBar` for a level that
// authors `collect` — the same absolutely-positioned centred slot in
// `.cv-head` either bar occupies, never both at once, so this adds no row and
// no height (the T3/T5/T7 lesson `TrailProgressBar.tsx`'s own header cites).
import { useRef } from 'react'
import type { ArtImage } from './assets'

/** Matches `TrailProgressBar.tsx`'s own `STAR_COLOR`/`SLOT_SIZE`/
 *  `MARK_HEIGHT` literals — not imported (they are module-private there) but
 *  the SAME values, for the same reason: one visual "earned" gold and one
 *  socket size across both bars. */
const EARNED_COLOR = '#eab308'
const DRAINED_COLOR = '#838383'
const SLOT_SIZE = 40
const MARK_HEIGHT = 18

export interface CollectBarProps {
  /** This level's own collect items, in route order. */
  collected: readonly boolean[]
  art: ArtImage
}

/** "Faltan 2 de 4" — one accessible name for the whole bar, mirroring
 *  `TrailProgressBar.tsx`'s `accessibleTrailName`: a pre-reader is the one
 *  audience this whole redesign is for, so one short spoken sentence serves
 *  them better than one name per socket. */
export function accessibleCollectName(collected: readonly boolean[]): string {
  const done = collected.filter(Boolean).length
  const total = collected.length
  if (total === 0) return ''
  if (done >= total) return `Juntaste todo: ${total} de ${total}`
  return `Faltan ${total - done} de ${total}`
}

export default function CollectBar({ collected, art }: CollectBarProps) {
  // Baseline captured ONCE at mount — see this file's own header for why:
  // only a slot that transitions false → true AFTER the bar first appeared
  // should ever fly. `LevelPlay.tsx` keys the whole subtree on `level.id`, so
  // a genuinely new level always remounts this bar with a fresh baseline.
  const initiallyCollectedRef = useRef(collected)
  if (collected.length === 0) return null
  const width = (MARK_HEIGHT * art.w) / art.h
  return (
    <div className="pistas-bar" role="img" aria-label={accessibleCollectName(collected)}>
      <div className="pistas-slots">
        {collected.map((filled, i) => {
          const justCollected = filled && !initiallyCollectedRef.current[i]
          return (
            <span
              key={i}
              className={`pistas-slot-shell${filled ? ' pistas-slot-shell-filed' : ''}`}
              data-filed={filled ? 'true' : 'false'}
            >
              {justCollected && (
                <img className="pistas-flight" src={art.href} width={width} height={MARK_HEIGHT} alt="" aria-hidden="true" />
              )}
              <svg
                className="pistas-slot"
                viewBox="0 0 24 24"
                width={SLOT_SIZE}
                height={SLOT_SIZE}
                role="img"
                aria-hidden="true"
                focusable="false"
              >
                <rect
                  x={1}
                  y={1}
                  width={22}
                  height={22}
                  rx={5}
                  fill={filled ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.48)'}
                  stroke={filled ? EARNED_COLOR : DRAINED_COLOR}
                  strokeWidth={filled ? 2.6 : 1.5}
                />
                {filled && (
                  <image
                    href={art.href}
                    x={12 - width / 2}
                    y={12 - MARK_HEIGHT / 2}
                    width={width}
                    height={MARK_HEIGHT}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )}
              </svg>
            </span>
          )
        })}
      </div>
    </div>
  )
}
