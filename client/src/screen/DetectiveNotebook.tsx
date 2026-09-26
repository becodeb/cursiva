// The detective's notebook (`odd/tasks/prewriting-stage-completion.md` T23,
// `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md` §5.1/§5.3): opened from the
// map's backpack pill (`screen/ZooMap.tsx`), it shows every animal of the
// zoo — rescued ones in colour with their own spot, missing ones as a
// silhouette with a bare "?" — plus a strip of the tools the Pulpito has
// been given so far (`zoo/backpack.ts`'s own registry).
//
// No `url(#…)` anywhere (`canvas/TraceCanvas.tsx:70-84`'s ban): every
// picture is a plain `<img>` or `CaptionedArt`'s own `<image href>`, the
// same convention `screen/ZooMap.tsx`'s HUD already follows. Marker style —
// warm paper, thick dark ink outline, no shadow (`docs/09_GUIA_DE_ESTILO_
// VISUAL.md` §1) — matching the map's own HUD pills and `voice/
// VoiceToggle.tsx`'s restyle.
import CaptionedArt from '../detective/CaptionedArt'
import { CloseIcon } from '../detective/icons'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { BACKPACK_ITEMS, earnedItems } from '../zoo/backpack'
import { notebookEntries } from '../zoo/notebook'
import type { Records } from '../zoo/sectors'
import { canAutoSpeak, speak } from '../voice/narrator'

const NOTEBOOK_CSS = `
.cv-notebook { position: absolute; inset: 0; z-index: 20; background: ${SHEET_PAPER}; display: flex; flex-direction: column; overflow: hidden; }
.cv-notebook-close { position: absolute; top: 3%; right: 3%; width: 64px; height: 64px; min-width: 64px; min-height: 64px; box-sizing: border-box; border-radius: 50%; border: 3px solid #1a1a1a; background: ${SHEET_PAPER}; display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; z-index: 2; }
/* The tools strip: one row, every backpack item (zoo/backpack.ts's
   BACKPACK_ITEMS, always the same five, in registry order) — earned ones at
   full strength, a not-yet-earned one dimmed (never hidden: a child sees
   what is still ahead, the same idea the animal grid below applies).
   Centred, with room on the right for the close button above it.
   NO BACKTICKS in this block -- one inside a comment ends this template
   literal early (this file's own top-of-file note). */
.cv-notebook-tools { flex: none; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px; padding: 16px 88px 8px 16px; }
.cv-notebook-tool { width: 48px; height: 48px; object-fit: contain; }
.cv-notebook-tool-pending { opacity: 0.3; }
/* The animal grid: big square-ish cells (min 96px), so a first-grade thumb
   never has to aim carefully — the same 64px tap floor convention
   detective/icons.tsx's own header names. Scrolls its OWN region (never
   the whole overlay) so a short landscape viewport (844x390) still reaches
   every animal without the close button or tools strip moving. */
.cv-notebook-grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; padding: 8px 16px 20px; align-content: start; box-sizing: border-box; }
.cv-notebook-animal { border: none; background: none; padding: 6px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-width: 64px; min-height: 64px; cursor: pointer; }
.cv-notebook-animal:disabled { cursor: default; }
.cv-notebook-animal .cv-caption { font-size: 13px; line-height: 1.2; text-align: center; font-weight: 700; color: #1e293b; }
`

export interface DetectiveNotebookProps {
  records: Records
  onClose: () => void
}

/**
 * The libreta del detective: a full-stage overlay, not a routed screen — the
 * map keeps its own state (`ZooMap.tsx`'s `notebookOpen`) and simply mounts
 * this component while open, the same "closed unmounts, no internal
 * visibility state" convention `RescueCelebration`/`ZooMap`'s own bubble use
 * for the pieces that DO need one (this one does not: unlike the bubble,
 * there is no auto-hide timer to drive).
 */
export default function DetectiveNotebook({ records, onClose }: DetectiveNotebookProps) {
  const animals = notebookEntries(records)
  const earnedIds = new Set(earnedItems(records).map((item) => item.id))

  return (
    <div className="cv-notebook" role="dialog" aria-label="Libreta del detective">
      <style>{NOTEBOOK_CSS}</style>
      <button
        type="button"
        className="cv-notebook-close"
        aria-label="Cerrar la libreta"
        onClick={onClose}
      >
        <CloseIcon />
      </button>
      <div className="cv-notebook-tools" role="group" aria-label="Herramientas">
        {BACKPACK_ITEMS.map((item) => (
          <img
            key={item.id}
            src={item.art.href}
            alt=""
            className={earnedIds.has(item.id) ? 'cv-notebook-tool' : 'cv-notebook-tool cv-notebook-tool-pending'}
          />
        ))}
      </div>
      <div className="cv-notebook-grid">
        {animals.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="cv-notebook-animal"
            disabled={!entry.rescued}
            aria-label={entry.rescued ? `${entry.id}, ${entry.caption}` : 'Animal todavía no encontrado'}
            onClick={
              entry.rescued
                ? () => {
                    if (entry.line && canAutoSpeak()) speak(entry.line)
                  }
                : undefined
            }
          >
            <CaptionedArt art={entry.art} label={entry.caption} size={64} />
          </button>
        ))}
      </div>
    </div>
  )
}
