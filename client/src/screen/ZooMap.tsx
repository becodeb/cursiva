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
.cv-zoo-bubble { position: absolute; left: 49.8%; top: 47%; transform: translate(-50%, -100%); display: flex; align-items: center; justify-content: center; pointer-events: none; }
.cv-zoo-bubble img { display: block; }
.cv-zoo-bubble .cv-captioned { position: absolute; inset: 0; margin: auto; display: flex; align-items: center; justify-content: center; }
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
 *  ~26 units tall, per design.md §5's own footnote. */
function Footprint({ x, y, angle }: FootprintMark) {
  const height = 26
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
            <CaptionedArt
              art={ZOO_OCTOPUS_PRINT_ART}
              label="¡Mirá! Las huellas van hacia allá. ¿Vamos?"
              size={36}
            />
          </div>
        )}
      </div>
    </main>
  )
}
