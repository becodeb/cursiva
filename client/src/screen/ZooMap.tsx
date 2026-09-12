// The zoo map (`docs/12_MAPA_DEL_ZOOLOGICO.md`, design.md §1-§7): one drawn
// illustration with registered layers on top, replacing the level-list entry
// screen. Every decision this screen shows lives in `zoo/sectors.ts` (or
// `zoo/stars.ts`/`zoo/backpack.ts`) as a named exported pure function — this
// component only reads them and draws. That split is not style: the harness
// is vitest in NODE ENV with no jsdom and no testing-library, so a decision
// taken inside a click handler is invisible to `renderToString`.
//
// No `url(#…)` anywhere: no `<defs>`, no `mask`, no `clipPath`, no `pattern`,
// no filter. Every picture is an `<image href="/art/…">`, the one mechanism
// that survives this repo's ban (`TraceCanvas.tsx:69-86` — it hydrates
// BLANK on real devices).
import CaptionedArt from '../detective/CaptionedArt'
import {
  ZOO_BACKPACK_ART,
  ZOO_FOG_ART,
  ZOO_MAP_ART,
  ZOO_OCTOPUS_BACKPACK_ART,
  ZOO_OCTOPUS_PRINT_ART,
  ZOO_SPEECH_BUBBLE_ART,
  ZOO_STAR_ART,
} from '../detective/assets'
import { placeArt } from '../canvas/placeArt'
import { isSectorDebug } from '../canvas/devMode'
import { earnedItems } from '../zoo/backpack'
import { totalStars } from '../zoo/stars'
import {
  PLAZA,
  PLAZA_CENTRE,
  SECTORS,
  animalPlacements,
  footprintTrail,
  hitCentre,
  isOpen,
  nextAdventure,
  recentlyDiscovered,
  type FootprintMark,
  type Records,
  type SectorId,
  type ZooSector,
} from '../zoo/sectors'
import { mapBubble } from '../zoo/adventures'

/** The measured edge colour of `zoo-map.png` (design.md §1) — the letterbox
 *  `xMidYMid meet` leaves on the outer `<svg>` is filled with this, never a
 *  third white (`docs/09` §7). */
const ZOO_BACKGROUND = '#76B56A'

const ZOO_CSS = `
.cv-zoo { height: 100dvh; overflow: hidden; background: ${ZOO_BACKGROUND}; }
html, body, #root { margin: 0; height: 100%; }
.cv-zoo-stage { position: relative; width: 100%; max-height: 100%; aspect-ratio: 5 / 3; margin: 0 auto; }
.cv-zoo-hud { position: absolute; inset: 0; display: flex; justify-content: space-between; align-items: flex-start; padding: 2% 3%; box-sizing: border-box; pointer-events: none; }
.cv-zoo-hud-left, .cv-zoo-hud-mid, .cv-zoo-hud-right { display: flex; align-items: center; gap: 6px; pointer-events: auto; }
/* The bocadillo is sized as a FRACTION OF THE STAGE, never in px: the
   488x372 PNG's intrinsic size is 488 CSS px, which is 49% of the 1000-unit
   stage at a 1000px-wide viewport and a different fraction at every other
   one. At 27% it is ~270 x 206 units and lands over the montanas hit
   (x 360-630, y 22-162) - which is fine and deliberate: montanas is fogged,
   so there is no drawn content under it to obscure, and the bubble only
   renders while a sector is newly discovered. container-type: inline-size
   makes the bubble its own query container, so everything inside it can be
   sized in cqw (percent of the BUBBLE's width, which is itself a percent of
   the stage) and nothing inside needs a px length.
   The tail is NOT at the file's centre: it hangs at ~10% of the width, so a
   bubble centred on the plaza points at bare grass to the Pulpito's left,
   which is what the 488px original did too. scaleX(-1) on the IMAGE ONLY
   mirrors the drawn oval (it is symmetric apart from the tail) and moves the
   tail to ~90% of the width; the caption inside is a sibling and is NOT
   transformed, so no text is reversed. left: 39.2% then lands that tail on
   PLAZA_CENTRE's x, and top: 36% with translate(..., -100%) rests it on the
   Pulpito's head at y ~ 216 rather than covering his face at y ~ 250.
   The bubble therefore covers the right of nocturna and the left of
   montanas (both fogged, no drawn content to obscure) and leaves the
   estanque - the one OPEN sector, with the pond the huellas point at -
   entirely clear. It only renders while a sector is newly discovered.
   NOTE: no backticks anywhere in this block - ZOO_CSS is a template
   literal, and one backtick in a CSS comment ends the string. */
.cv-zoo-bubble { position: absolute; left: 39.2%; top: 36%; width: 27%; aspect-ratio: 488 / 372; transform: translate(-50%, -100%); container-type: inline-size; pointer-events: none; }
.cv-zoo-bubble > img { display: block; width: 100%; height: 100%; transform: scaleX(-1); }
/* The oval's readable interior, inset from the drawn outline on all four
   sides. The tail occupies the bottom ~18% of the file, which is why the box
   spans 14%-74% rather than filling the bubble - that centres the print and
   the phrase on the OVAL, which is not the same thing as centring them on
   the image box. */
.cv-zoo-bubble .cv-captioned { position: absolute; left: 8%; right: 8%; top: 14%; height: 60%; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4cqw; }
/* width: auto lets the viewBox carry the aspect ratio, the same override
   Deduction.tsx's own .cv-captioned > svg rule already uses. flex: none
   keeps the print from being squeezed to a sliver by the phrase beside it -
   which is exactly what it rendered as before, 19 units wide next to a
   40-character phrase. */
.cv-zoo-bubble .cv-captioned > svg { width: auto; height: 62%; flex: none; }
/* No font-family: .cv-caption inherits Nunito from the document root
   (docs/09 section 8), the same way PistasRail's words do. The size is cqw
   so the phrase tracks the bubble, which tracks the stage - a px value would
   be right at exactly one viewport and wrong at every other. */
.cv-zoo-bubble .cv-caption { font-size: 6.4cqw; line-height: 1.16; font-weight: 700; color: #1e293b; text-align: left; }
/* The ONE thing this screen moves by itself (docs/12 §3, §4): the
   newly-discovered sector's fog fades once, opacity only. Mirrors
   HomeScreen.tsx:88-104's HOME_CSS shape exactly, including the
   reduced-motion override. */
@keyframes cv-zoo-fog-fade {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
.cv-zoo-fog-lift { animation: cv-zoo-fog-fade 1.5s ease-out forwards; }
@media (prefers-reduced-motion: reduce) { .cv-zoo-fog-lift { animation: none; } }
`

/**
 * The class a fog patch renders with. Exported and pure so the fade rule can
 * be tested directly against hand-built `ZooSector` data: under the CURRENT
 * registry `recentlyDiscovered` only ever resolves to the estanque (design.md
 * §5, D4's seed), and the estanque starts OPEN, so it never actually carries
 * fog to attach this class to. The scenario this proves (zoo-map spec "Fog
 * Fade Motion") becomes observable end-to-end once paso D adds a second
 * sector that can be closed-then-discovered; until then this function is the
 * honest, directly-testable half of the mechanism.
 */
export function fogClassFor(sectorId: SectorId, discovered: ZooSector | null): string {
  return discovered?.id === sectorId ? 'cv-zoo-fog cv-zoo-fog-lift' : 'cv-zoo-fog'
}

/** One footprint, centred on its own point and rotated to face the walked
 *  direction (`zoo/sectors.ts`'s `PRINT_FACING`) — origin-centred exactly
 *  like every other repeated mark in this repo (`docs/09` §3). Rendered at
 *  36 units tall: design.md §5's original ~26 put the print at 13.6 units
 *  WIDE (the art is 134×256), and a 13-unit mark on a 1000-unit stage does
 *  not register as a track to a five-year-old. At 36 the print is ~19 wide
 *  against `PRINT_OFFSET`'s ±12 stagger, so consecutive prints still read
 *  as alternating left/right rather than as one dotted line — `docs/09` §5
 *  is explicit that the alternation is what makes a track read as walking,
 *  and that is a screenshot check, not a test one. */
function Footprint({ x, y, angle }: FootprintMark) {
  const height = 36
  const width = (height * ZOO_OCTOPUS_PRINT_ART.w) / ZOO_OCTOPUS_PRINT_ART.h
  return (
    <image
      href={ZOO_OCTOPUS_PRINT_ART.href}
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      transform={`rotate(${angle.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}
      preserveAspectRatio="xMidYMid meet"
    />
  )
}

export interface ZooMapProps {
  /** The persisted level records, straight from `cursiva.levels.v1`. Passed
   *  in rather than read here so this screen stays renderable in the node
   *  test harness, where there is no `localStorage` (same convention
   *  `HomeScreen` used). */
  records: Records
  /** Tapping an open sector's hit-rect. Carries the resolved adventure id
   *  directly — `App` hands it straight to the game shell without
   *  re-deriving anything, the same shape `HomeScreen`'s `onEnter` used. */
  onEnter: (levelId: string) => void
  /** Override for `isSectorDebug(window.location.search)` — undefined in
   *  every real caller, which falls through to the window read below.
   *  Exists ONLY so `ZooMap.test.tsx` can exercise the debug overlay without
   *  touching `window` at all (this harness is node-env, no DOM, no
   *  `window` — the same reason `GameScreen`'s `initial` prop exists
   *  instead of every caller relying on its own internal window read). */
  debug?: boolean
}

export default function ZooMap({ records, onEnter, debug }: ZooMapProps) {
  // `?debug=sectores` reads the SAME guard `App.tsx`/`GameScreen.tsx` already
  // use for `window.location.search` under SSR (design.md §5) — and is
  // deliberately NOT gated by `isDevMode()`: it must paint the EXACT build a
  // reviewer is screenshotting.
  const resolvedDebug =
    debug ?? isSectorDebug(typeof window === 'undefined' ? '' : window.location.search)
  const discovered = recentlyDiscovered(records)
  const stars = totalStars(records)
  const backpack = earnedItems(records)
  // Every animal standing in the zoo right now, across every sector — the
  // SVG world shows each one at its own `animalSpot`; the HUD row below
  // shows the same set as a small summary of "who's been found so far".
  const recovered = SECTORS.flatMap((sector) => animalPlacements(sector, records))

  return (
    <main className="cv-zoo">
      <style>{ZOO_CSS}</style>
      <div className="cv-zoo-stage">
        <svg
          viewBox="0 0 1000 600"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          aria-label="El zoológico del Pulpito"
        >
          {/* The world continues under the letterbox `meet` leaves — the
              same "page is a place, not a card" move `docs/09` §7 made for
              the trail sheet, restated here with the map's own measured
              edge colour. */}
          <rect x={0} y={0} width={1000} height={600} fill={ZOO_BACKGROUND} />

          {/* §1: `slice` lives on the IMAGE, never on the root `<svg>` — the
              crop this produces is a fixed 33.333 units off the top and
              bottom on every device, not a function of the viewport. */}
          <image
            href={ZOO_MAP_ART.href}
            x={0}
            y={0}
            width={1000}
            height={600}
            preserveAspectRatio="xMidYMid slice"
          />

          {/* Fog, per closed sector. Two patches each (design.md §4's
              closed-form construction) — `flip` mirrors the drawn picture
              about its own centre without moving the axis-aligned box the
              containment proof reasons about. */}
          {SECTORS.filter((sector) => sector.fog.length > 0).flatMap((sector) =>
            sector.fog.map((patch, i) => {
              const art = ZOO_FOG_ART[patch.art]
              const box = placeArt(art, patch.size, { x: patch.x, y: patch.y })
              return (
                <image
                  key={`fog-${sector.id}-${i}`}
                  data-fog-sector={sector.id}
                  className={fogClassFor(sector.id, discovered)}
                  href={art.href}
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  transform={patch.flip ? `translate(${2 * patch.x},0) scale(-1,1)` : undefined}
                  preserveAspectRatio="xMidYMid meet"
                />
              )
            }),
          )}

          {/* Recovered animals, standing on their `animalSpot` by the feet
              (`STANDING_GRIP`, `zoo/sectors.ts`'s `animalPlacements`). */}
          {recovered.map((placed, i) => (
            <image
              key={`animal-${i}`}
              href={placed.art.href}
              x={placed.box.x}
              y={placed.box.y}
              width={placed.box.width}
              height={placed.box.height}
              preserveAspectRatio="xMidYMid meet"
            />
          ))}

          {/* Footprints from the plaza to whichever sector was recently
              discovered — only when there is one to point at. */}
          {discovered?.hit &&
            footprintTrail(PLAZA_CENTRE, hitCentre(discovered.hit)).map((mark, i) => (
              <Footprint key={`print-${i}`} {...mark} />
            ))}

          {/* The Pulpito with his mochila, in the plaza. Default (box-centre)
              grip — design.md §7's own worked call. */}
          <image
            href={ZOO_OCTOPUS_BACKPACK_ART.href}
            {...placeArt(ZOO_OCTOPUS_BACKPACK_ART, 150, PLAZA_CENTRE)}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Transparent hit-rects — the only tappable surface. Tapping an
              open sector opens its NEXT adventure (OD2); a sector whose
              `nextAdventure` is `null` (none authored yet) is simply inert. */}
          {SECTORS.filter((sector) => sector.hit && isOpen(sector, records)).map((sector) => (
            <rect
              key={`hit-${sector.id}`}
              x={sector.hit!.x}
              y={sector.hit!.y}
              width={sector.hit!.w}
              height={sector.hit!.h}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                const next = nextAdventure(sector, records)
                if (next) onEnter(next)
              }}
            />
          ))}

          {/* `?debug=sectores` (docs/12 §4): every `hit` and `animalSpot` in
              translucent red, plus the plaza for reference — read against a
              screenshot, correcting the REGISTRY when one misses, never the
              drawing. Adds no word, so `auditCaptions` is untouched by it. */}
          {resolvedDebug && (
            <g aria-hidden="true">
              {SECTORS.filter((sector) => sector.hit).map((sector) => (
                <rect
                  key={`debug-hit-${sector.id}`}
                  x={sector.hit!.x}
                  y={sector.hit!.y}
                  width={sector.hit!.w}
                  height={sector.hit!.h}
                  fill="#ff0000"
                  opacity={0.28}
                />
              ))}
              <rect x={PLAZA.x} y={PLAZA.y} width={PLAZA.w} height={PLAZA.h} fill="#ff0000" opacity={0.28} />
              {SECTORS.filter((sector) => sector.hit).map((sector) => (
                <circle
                  key={`debug-spot-${sector.id}`}
                  cx={sector.animalSpot.x}
                  cy={sector.animalSpot.y}
                  r={6}
                  fill="#ff0000"
                  opacity={0.6}
                />
              ))}
            </g>
          )}
        </svg>

        {/* The HUD: DOM, outside the `<svg>` (docs/12 §3) — siblings of it,
            never children, so it can be positioned in percent against the
            stage's own fixed 5:3 box (design.md §1) and inherit the
            document root's Nunito (`docs/09` §8) without redeclaring it. */}
        <div className="cv-zoo-hud">
          <div className="cv-zoo-hud-left">
            <img src={ZOO_BACKPACK_ART.href} alt="" height={40} />
            {backpack.map((item) => (
              <img key={item.id} src={item.art.href} alt="" height={32} />
            ))}
          </div>
          <div className="cv-zoo-hud-mid">
            {recovered.map((placed, i) => (
              <img key={i} src={placed.art.href} alt="" height={40} />
            ))}
          </div>
          <div className="cv-zoo-hud-right">
            {/* The ONLY way a number may sit beside a picture in this app —
                `CaptionedArt`'s `label` is required at type level, which is
                what makes a bare "12" impossible to ship by accident. */}
            <CaptionedArt art={ZOO_STAR_ART} label={String(stars)} size={40} />
          </div>
        </div>

        {discovered && (
          <div className="cv-zoo-bubble">
            <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
            {/* `size` is the UNSTYLED height; `ZOO_CSS`'s
                `.cv-zoo-bubble .cv-captioned > svg` overrides it with a
                percentage of the bubble so the print tracks the stage. 76
                is what that percentage resolves to at a 1000-unit stage, so
                the server-rendered markup already carries the right shape
                instead of a number the stylesheet silently contradicts. The
                `CaptionedArt` wrapper itself is NOT optional: it is the only
                component allowed to pair a picture with a word outside the
                rail, and `captionAudit`'s `auditCaptions` is what enforces
                that — only the styling changed here.
                The picture AND the word both come from `mapBubble` now
                (duck-undulations-and-sector-backdrop design.md §5): before
                the sector's own adventure is done it is the onward print and
                phrase, unchanged; once the animal is recovered it becomes
                that animal's own picture and closing line. */}
            <CaptionedArt {...mapBubble(discovered, records)} size={76} />
          </div>
        )}
      </div>
    </main>
  )
}
