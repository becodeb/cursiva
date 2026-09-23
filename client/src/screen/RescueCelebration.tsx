// Extracted from `AdventureClosing.tsx` (`promised-animals` task B): "a short
// burst of stars" is now shared by the adventure closing screen's rescue beat
// AND the zoo map's own finale bubble (`docs/18` §4.7 item 1, "recuperar un
// animal se tiene que ver" — the finale is the SAME idea applied to the whole
// story rather than to one animal). One component, one CSS block, so a future
// change to "what a rescue looks like" cannot drift between the two callers.
//
// No `url(#…)` anywhere (`canvas/TraceCanvas.tsx:70-84`'s ban): plain `<img>`
// elements only.
import { ZOO_STAR_ART } from '../detective/assets'

/**
 * The celebration's own CSS, meant to be interpolated into whichever
 * `<style>` block the caller already renders (`AdventureClosing`'s
 * `CLOSING_CSS`, `ZooMap`'s `ZOO_CSS`) — this component never renders a
 * `<style>` of its own, so using it twice in one document can never ship the
 * rule twice by accident.
 *
 * `position: absolute; inset: 0` fills WHATEVER positioned ancestor the
 * caller wraps `<RescueCelebration />` in — the closing screen's whole
 * `.cv-closing-frame`, or the zoo map's own (much smaller) `.cv-zoo-bubble`
 * box — so "a short burst" scales itself to wherever it is asked to
 * celebrate, with no prop needed to say how big.
 *
 * NOTE: no backticks anywhere in this block — it is spliced into a
 * template literal, and one backtick inside a comment would end the string
 * early (the exact reason `ZOO_CSS`/`CLOSING_CSS` give in their own headers).
 */
export const RESCUE_CELEBRATION_CSS = `
.cv-rescue-celebration { position: absolute; inset: 0; pointer-events: none; }
.cv-rescue-celebration img { position: absolute; width: 9%; height: auto; opacity: 0; animation: cv-rescue-celebrate 1s ease-out forwards; }
@keyframes cv-rescue-celebrate {
  0% { opacity: 0; transform: scale(0.4) rotate(-15deg); }
  60% { opacity: 1; transform: scale(1.15) rotate(8deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
@media (prefers-reduced-motion: reduce) { .cv-rescue-celebration { display: none; } }
`

/** A handful of positions the burst's stars pop in at, staggered so it reads
 *  as scattered rather than a single flash. Six is "a short burst": enough
 *  to register as a flourish without becoming a field of stars. Moved here
 *  byte-identical from `AdventureClosing.tsx`'s own former `CELEBRATION_STARS`. */
const CELEBRATION_STARS: readonly { top: string; left: string; delay: string }[] = [
  { top: '2%', left: '8%', delay: '0s' },
  { top: '4%', left: '78%', delay: '0.08s' },
  { top: '24%', left: '2%', delay: '0.16s' },
  { top: '28%', left: '88%', delay: '0.04s' },
  { top: '48%', left: '12%', delay: '0.2s' },
  { top: '50%', left: '74%', delay: '0.12s' },
]

/**
 * A short, purely decorative burst of stars (`RESCUE_CELEBRATION_CSS` above)
 * — `aria-hidden`, absolutely positioned so it never affects layout or
 * shifts a sibling, no `url(#…)` reference anywhere. Render it once, wherever
 * a caller decides "something just came home" deserves a moment: an
 * adventure's own rescue beat (`AdventureClosing`), or the zoo map's finale
 * once every animal is back (`ZooMap`).
 */
export default function RescueCelebration() {
  return (
    <div className="cv-rescue-celebration" aria-hidden="true">
      {CELEBRATION_STARS.map((spot, i) => (
        <img
          key={i}
          src={ZOO_STAR_ART.href}
          alt=""
          style={{ top: spot.top, left: spot.left, animationDelay: spot.delay }}
        />
      ))}
    </div>
  )
}
