// The detective's notebook (`odd/tasks/prewriting-stage-completion.md` T23;
// `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md` §5.1/§5.3): opened from the
// map's backpack pill (`screen/ZooMap.tsx`), it shows every animal of the
// zoo — rescued ones in colour with their own spot, missing ones as a
// silhouette with a bare "?" — plus a strip of the tools the Pulpito has
// been given so far (`zoo/backpack.ts`'s own registry).
//
// [T23 follow-up, orchestrator screenshot review] The first pass read as
// unfinished: tiny floating pictures on an empty page, inconsistent caption
// offsets, the monkey's placeholder art rendering as a solid black square,
// and the map's own green letterbox showing above/below the overlay. This
// pass rebuilds it as a real page of equal marker-style CARDS (paper fill,
// thick ink outline — the same chrome `screen/LevelPlay.tsx`'s own result
// pill and `screen/ZooMap.tsx`'s HUD pills already use), `position: fixed`
// so it covers the true viewport rather than the map's own letterboxed 5:3
// stage, and a ruled-paper background drawn with plain CSS lines.
//
// No `url(#…)` anywhere (`canvas/TraceCanvas.tsx:70-84`'s ban): every
// picture is a plain `<img>`, or — for the one animal whose real art is
// still a placeholder block (`zoo/notebook.ts`'s `placeholderArt`) —
// `detective/icons.tsx`'s `PawPrintIcon`, a drawn-in-code glyph rather than
// new art. Card art is sized by CSS (`object-fit: contain` inside a fixed
// aspect slot) rather than a JS-computed pixel size: any aspect ratio, from
// the llama's tall portrait to vibora's long low body, simply shrinks to
// fit the same card shape.
import { CloseIcon, NotebookPadIcon, PawPrintIcon } from '../detective/icons'
import { CARRIER_LENS_ART } from '../detective/assets'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { BACKPACK_ITEMS, earnedItems } from '../zoo/backpack'
import { notebookEntries } from '../zoo/notebook'
import type { Records } from '../zoo/sectors'
import { canAutoSpeak, speak } from '../voice/narrator'

const INK = '#1a1a1a'

const NOTEBOOK_CSS = `
/* position: fixed (not absolute): the map's own stage is a letterboxed 5:3
   box (ZooMap.tsx's ZOO_CSS), and an absolutely-positioned overlay only
   ever covered THAT box, leaving the stage's own green background visible
   above/below at any viewport that is not exactly 5:3 (found in
   orchestrator screenshot review). Fixed positioning is relative to the
   true viewport instead, the same full-screen treatment
   screen/LevelPlay.tsx's own .cv-sheet uses. */
.cv-notebook { position: fixed; inset: 0; z-index: 30; display: flex; flex-direction: column; background-color: ${SHEET_PAPER}; overflow: hidden; }
/* A faint ruled/grid page texture, drawn with plain repeating gradients —
   never an SVG pattern or a def referenced by id, this repo's own ban
   (TraceCanvas.tsx's header). Two layers (one horizontal, one vertical)
   read as graph paper; kept pale so it never competes with the cards drawn
   on top of it. */
.cv-notebook-page {
  position: absolute; inset: 0;
  background-image:
    repeating-linear-gradient(0deg, rgba(30,41,59,0.07) 0, rgba(30,41,59,0.07) 1px, transparent 1px, transparent 34px),
    repeating-linear-gradient(90deg, rgba(30,41,59,0.07) 0, rgba(30,41,59,0.07) 1px, transparent 1px, transparent 34px);
  pointer-events: none;
}
.cv-notebook-header, .cv-notebook-tools, .cv-notebook-grid { position: relative; }
.cv-notebook-header { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 1.2dvh 3% 0.6dvh; }
/* The title: no word anywhere, per this task's own brief ("no reading
   needed") — the Pulpito's own lupa beside a spiral-bound pad icon, both
   drawn/existing art, both aria-hidden (nothing here is read aloud; the
   dialog's own aria-label already names the screen for assistive tech). */
.cv-notebook-title { display: flex; align-items: center; gap: 10px; }
.cv-notebook-title img, .cv-notebook-title svg { height: min(6dvh, 42px); width: auto; display: block; }
.cv-notebook-close { flex: none; width: min(9dvh, 60px); height: min(9dvh, 60px); box-sizing: border-box; border-radius: 50%; border: 3px solid ${INK}; background: ${SHEET_PAPER}; display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; }
/* One shared card face for both the tools strip and the animal grid —
   marker style: warm paper, thick dark ink outline, no shadow
   (docs/09_GUIA_DE_ESTILO_VISUAL.md section 1), the same chrome
   screen/LevelPlay.tsx's own .cv-result-pill and ZooMap.tsx's HUD pills
   already use. box-sizing: border-box so the border never adds to the
   grid track's own computed size (the overflow this whole pass exists to
   fix). */
.cv-notebook-card { box-sizing: border-box; background: ${SHEET_PAPER}; border: 3px solid ${INK}; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4%; min-width: 0; min-height: 0; overflow: hidden; }
/* The image+caption group gets a DEFINITE height (100% of the card's own
   content box) so the picture's percentage height below has something
   real to resolve against — an "auto"-height ancestor would otherwise
   make that percentage invalid and fall back to the art's own intrinsic
   size, which is exactly the overflow this whole pass exists to fix. */
.cv-notebook-card > .cv-captioned { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; }
/* The picture slot: a fixed fraction of the CARD (not of the art's own
   aspect ratio) — object-fit: contain shrinks any art, however wide or
   tall, to fit inside it without ever overflowing the card. This is what
   replaced the earlier JS-computed per-entry pixel size. */
.cv-notebook-card-art { width: 60%; height: 60%; object-fit: contain; display: block; flex: none; }
.cv-notebook-card .cv-caption { margin-top: 4%; flex: none; font-size: clamp(10px, 1.6vw, 15px); line-height: 1.15; font-weight: 700; color: #1e293b; text-align: center; }
button.cv-notebook-card { cursor: pointer; font: inherit; }
button.cv-notebook-card:disabled { cursor: default; }
/* Tools strip: fixed-size SQUARE cards in a centred row — a strip, not a
   grid, so it never competes with the animal grid below it for space.
   Sized by HEIGHT (dvh, bounded) rather than by width/flex-grow: at a
   short landscape viewport (844x390) a width-driven card with
   aspect-ratio:1 grew tall enough to push the animal grid below the fold
   entirely (found in browser QA) — bounding height directly, with width
   following from the same fixed value, cannot repeat that. Earned tools
   render at full strength; a not-yet-earned one dims (never hides: a
   child sees what is still ahead). */
.cv-notebook-tools { flex: none; display: flex; align-items: center; justify-content: center; gap: 2%; padding: 0 3% 1dvh; }
/* padding as a FIXED px value here, deliberately never a percentage: a
   percentage padding on a FLEX item resolves against the FLEX CONTAINER's
   own width (CSS2.1's original box-model rule, never overridden for
   flexbox) — NOT against this card's own small clamped width. 8% measured
   against the tools ROW's ~960px width computed to 77px of padding per
   side, which cannot fit inside an intended ~77px-wide box at all
   (box-sizing: border-box has nowhere left to put the content), so the
   browser expanded the card to roughly 2x that padding instead — the
   exact 160px "the tools are huge and empty" defect found in browser QA.
   Grid items do not have this problem (percentages there resolve against
   the grid AREA, not the whole grid), which is why .cv-notebook-card's own
   base padding percentage is fine for the animal grid below.
   NO BACKTICKS in this block -- one inside a comment ends this template
   literal early (this file's own top-of-file note). */
.cv-notebook-tools .cv-notebook-card { flex: none; width: clamp(44px, 10dvh, 84px); height: clamp(44px, 10dvh, 84px); padding: 8px; }
.cv-notebook-tool-pending { opacity: 0.32; }
/* The animal grid: exactly 5 columns x 2 rows at landscape (10 real zoo
   animals, zoo/notebook.ts's own NOTEBOOK_ANIMAL_IDS) so every card fills
   the available area evenly with no leftover empty page — the "tiny
   pictures floating in a mostly empty page" this whole pass replaces.
   flex: 1; min-height: 0 is what lets it actually receive the remaining
   vertical space in a column flex parent (.cv-notebook) instead of
   collapsing to its own content height. minmax(0, 1fr) — NEVER a bare
   1fr, which is shorthand for minmax(auto, 1fr) — on both axes: a bare
   1fr's "auto" minimum is the CONTENT's own size, which silently grew
   every track past its fair 1/2 or 1/5 share and pushed the grid's own
   total height past what the flex column had actually allocated it,
   clipped by .cv-notebook's own overflow: hidden (the exact defect this
   fix is for — found by measuring, not by eye: the SSR harness cannot
   reproduce a grid-track sizing algorithm at all). */
.cv-notebook-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 1.6%; padding: 0 3% 1.5dvh; }
/* Portrait: 3 columns (this task's own "2-3 columns" brief) — 10 items no
   longer fit two full rows at a readable card size, so extra rows scroll
   inside the grid's own region, never moving the header/tools strip. */
@media (orientation: portrait) {
  .cv-notebook-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: none; grid-auto-rows: minmax(110px, auto); overflow-y: auto; }
}
@media (prefers-reduced-motion: no-preference) {
  .cv-notebook-card { transition: opacity 120ms ease-out; }
}
`

export interface DetectiveNotebookProps {
  records: Records
  onClose: () => void
}

/**
 * The libreta del detective: a full-screen overlay, not a routed screen —
 * the map keeps its own state (`ZooMap.tsx`'s `notebookOpen`) and simply
 * mounts this component while open, the same "closed unmounts, no internal
 * visibility state" convention `RescueCelebration`/`ZooMap`'s own bubble use
 * for the pieces that DO need one (this one does not: there is no auto-hide
 * timer to drive).
 */
export default function DetectiveNotebook({ records, onClose }: DetectiveNotebookProps) {
  const animals = notebookEntries(records)
  const earnedIds = new Set(earnedItems(records).map((item) => item.id))

  return (
    <div className="cv-notebook" role="dialog" aria-label="Libreta del detective">
      <style>{NOTEBOOK_CSS}</style>
      <div className="cv-notebook-page" aria-hidden="true" />
      <div className="cv-notebook-header">
        <div className="cv-notebook-title">
          <img src={CARRIER_LENS_ART.href} alt="" />
          <NotebookPadIcon />
        </div>
        <button type="button" className="cv-notebook-close" aria-label="Cerrar la libreta" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="cv-notebook-tools" role="group" aria-label="Herramientas">
        {BACKPACK_ITEMS.map((item) => (
          <div
            key={item.id}
            className={
              earnedIds.has(item.id) ? 'cv-notebook-card' : 'cv-notebook-card cv-notebook-tool-pending'
            }
          >
            <img src={item.art.href} alt="" className="cv-notebook-card-art" />
          </div>
        ))}
      </div>
      <div className="cv-notebook-grid">
        {animals.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="cv-notebook-card"
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
            {/* `cv-captioned`: the licensed container `detective/captionAudit.ts`
                requires around any visible word (the caption below). The
                picture is either the real art (colour or silhouette) or, for
                a placeholder animal's own missing page, a drawn paw print
                (`PawPrintIcon`'s own `data-cv-picture="true"` is what lets a
                hand-drawn glyph satisfy the SAME invariant a raster <img>
                normally does). */}
            <span className="cv-captioned">
              {entry.placeholderArt ? (
                <PawPrintIcon className="cv-notebook-card-art" />
              ) : (
                <img src={entry.art.href} alt="" className="cv-notebook-card-art" />
              )}
              <span className="cv-caption">{entry.caption}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
