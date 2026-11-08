// The child's own Pulpito: his colour and what he has on, from what the rescued animals
// gave him. No shop and no currency: a gift cannot be bought or lost. Nothing to read:
// he reacts to every choice and says what it is. Opened from the map, closed the same
// way as the notebook, and never over a level.
import { useEffect, useRef } from 'react'
import { playSfx } from '../audio/sfx'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { OCTOPUS_EMPTY_HANDED_ART } from '../detective/assets'
import { CloseIcon } from '../detective/icons'
import { ArtImg } from '../puppet/ArtFigure'
import { pulpitoHead } from '../puppet/chrome'
import { PaperFace } from '../puppet/PaperButton'
import type { PuppetHandle } from '../puppet/Puppet'
import { PAPER_CARD_SHADOW, PAPER_EDGE } from '../puppet/rig'
import { usePulpitoLook } from '../puppet/useLook'
import { WEARABLE_ART } from '../puppet/wardrobe'
import { earnedWearables, WEARABLES } from '../zoo/backpack'
import { PULPITO_COLOURS, setLook, toggleWorn } from '../zoo/pulpitoLook'
import type { Records } from '../zoo/sectors'
import { canAutoSpeak, speak } from '../voice/narrator'

const WARDROBE_CSS = `
.cv-wardrobe { position: fixed; inset: 0; z-index: 30; display: flex; background: #d9efe3; overflow: hidden; }
.cv-wardrobe-stage { flex: 0 0 42%; position: relative; display: flex; align-items: center; justify-content: center; min-width: 0; }
.cv-wardrobe-stage .cv-puppet { height: 86%; width: auto; max-width: 96%; }
.cv-wardrobe-shelves { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 2.4dvh; padding: 2dvh 3% 2dvh 0; }
.cv-wardrobe-row { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(6px, 1.4dvh, 12px); }
.cv-garment { box-sizing: border-box; flex: none; width: clamp(64px, 15dvh, 92px); height: clamp(64px, 15dvh, 92px); padding: 6px; border-radius: 22%; border: 3px solid ${PAPER_EDGE}; background: ${SHEET_PAPER}; box-shadow: ${PAPER_CARD_SHADOW}; cursor: pointer; }
.cv-swatch { position: relative; box-sizing: border-box; flex: none; width: clamp(60px, 12dvh, 76px); height: clamp(60px, 12dvh, 76px); padding: 6px; border: none; border-radius: 50%; background: transparent; cursor: pointer; }
.cv-swatch svg, .cv-garment svg { display: block; width: 100%; height: 100%; }
/* Chosen is a gold sheet under the piece, and the piece stays pressed onto it. */
.cv-swatch[aria-pressed="true"] { background: #f6c23a; }
.cv-swatch[aria-pressed="true"] .cv-paper-face { transform: translate(6px, 10px); }
.cv-garment[aria-pressed="true"] { background: #ffe39a; border-color: #f2b632; transform: translate(3px, 5px); box-shadow: none; }
/* Still to come: its outline on bare paper, no card, nothing to press yet. */
.cv-garment--waiting { background: transparent; border: 3px dashed #b9c9bf; box-shadow: none; }
.cv-garment--waiting svg { opacity: 0.22; }
.cv-wardrobe-close { position: absolute; top: 2dvh; left: 2%; z-index: 1; width: var(--cv-tap-size, 64px); height: var(--cv-tap-size, 64px); padding: 0; border: none; background: transparent; cursor: pointer; }
@media (orientation: portrait) {
  .cv-wardrobe { flex-direction: column; }
  .cv-wardrobe-stage { flex: 0 0 40%; }
}
`

/** A swatch is his own head in that colour, not a bare dot: nothing to decode. */
function ColourFace({ body, pink }: { body: string; pink: string }) {
  return <PaperFace scene={pulpitoHead(body, pink)} picture />
}

export interface PulpitoWardrobeProps {
  records: Records
  onClose: () => void
}

export default function PulpitoWardrobe({ records, onClose }: PulpitoWardrobeProps) {
  const look = usePulpitoLook()
  const puppet = useRef<PuppetHandle | null>(null)
  const earned = new Set(earnedWearables(records).map((w) => w.id))
  useEffect(() => {
    playSfx('notebook')
  }, [])
  const react = (line: string): void => {
    playSfx('tap')
    puppet.current?.act('cheer', 1.2)
    if (canAutoSpeak()) speak(line)
  }
  return (
    <div className="cv-wardrobe" role="dialog" aria-label="Vestir al Pulpito" data-cv-wardrobe="">
      <style>{WARDROBE_CSS}</style>
      <div className="cv-wardrobe-stage">
        <ArtImg art={OCTOPUS_EMPTY_HANDED_ART} still={false} followPointer puppetRef={puppet} />
      </div>
      <div className="cv-wardrobe-shelves">
        <div className="cv-wardrobe-row" role="group" aria-label="Colores">
          {PULPITO_COLOURS.map((colour) => (
            <button
              key={colour.id}
              type="button"
              className="cv-swatch"
              aria-label={colour.name}
              aria-pressed={look.colour === colour.id}
              data-cv-colour={colour.id}
              onClick={() => {
                setLook({ ...look, colour: colour.id })
                react(`¡${colour.name}!`)
              }}
            >
              <ColourFace body={colour.colours.body} pink={colour.colours.pink} />
            </button>
          ))}
        </div>
        <div className="cv-wardrobe-row" role="group" aria-label="Regalos de los animales">
          {WEARABLES.map((item) => {
            const has = earned.has(item.id)
            return (
              <button
                key={item.id}
                type="button"
                className={has ? 'cv-garment' : 'cv-garment cv-garment--waiting'}
                data-paper-card={has ? '' : undefined}
                aria-label={has ? item.name : 'Un regalo que todavía no llegó'}
                aria-pressed={has && look.worn.includes(item.id)}
                data-cv-garment={item.id}
                data-cv-garment-earned={has ? 'true' : 'false'}
                onClick={() => {
                  if (!has) {
                    playSfx('tap')
                    if (canAutoSpeak()) speak('Este regalo llega cuando encuentres a otro animal.')
                    return
                  }
                  setLook(toggleWorn(look, item.id))
                  react(`¡${item.name}!`)
                }}
              >
                <ArtImg art={WEARABLE_ART[item.id]} />
              </button>
            )
          })}
        </div>
      </div>
      <button
        type="button"
        className="cv-wardrobe-close"
        data-paper-tap=""
        aria-label="Cerrar"
        onClick={() => {
          playSfx('tap')
          onClose()
        }}
      >
        <CloseIcon />
      </button>
    </div>
  )
}
