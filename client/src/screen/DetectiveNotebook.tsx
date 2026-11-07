// The detective's notebook and the animal album in one (`docs/19` §5.1/§5.3,
// `docs/18` §7 P2): opened from the map's backpack pill (`screen/ZooMap.tsx`), it shows
// every animal of the zoo: the live puppet once rescued, with what this child wrote for
// its family beside it, and its bare outline until then. Nothing on the cards is a word:
// a tap is heard. A strip of the tools the Pulpito has been given sits above them.
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
import { useEffect, useRef, useState } from 'react'
import { playSfx } from '../audio/sfx'
import { CloseIcon, NotebookPadIcon, PawPrintIcon, PencilIcon } from '../detective/icons'
import { CARRIER_LENS_ART, type ZooAnimalId } from '../detective/assets'
import { ArtImg } from '../puppet/ArtFigure'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { BACKPACK_ITEMS, earnedItems } from '../zoo/backpack'
import { lettersOf, notebookEntries, type NotebookAnimalEntry } from '../zoo/notebook'
import { ADVENTURES } from '../zoo/adventures'
import { puppetFigureFor } from '../puppet/ArtFigure'
import type { PuppetHandle } from '../puppet/Puppet'
import { PAPER_CARD_SHADOW, PAPER_EDGE } from '../puppet/rig'
import { loadTracedLines, smoothStrokePath, type TracedLine } from '../zoo/tracedLine'
import type { Records } from '../zoo/sectors'
import { canAutoSpeak, speak } from '../voice/narrator'
import { loadWritings, notebookWritings, type Writing } from '../zoo/notebookWriting'
import { strokePath, writingViewBox } from './NotebookKeepsake'
import { NotebookRule } from './NotebookPaper'

/** An animal not found yet: its shape and nothing else, dark enough to wonder about. */
const SILHOUETTE = '#4a5560'
const WHO_LINE = '¿Dónde estará?'

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
.cv-notebook-header-right { display: flex; align-items: center; gap: 8px; }
.cv-notebook-tab { flex: none; width: max(44px, min(9dvh, 60px)); height: max(44px, min(9dvh, 60px)); box-sizing: border-box; border-radius: 50%; border: 3px solid ${PAPER_EDGE}; box-shadow: ${PAPER_CARD_SHADOW}; background: ${SHEET_PAPER}; display: flex; align-items: center; justify-content: center; padding: 7px; cursor: pointer; }
.cv-notebook-tab svg { width: 100%; height: 100%; display: block; }
/* What the child wrote: their own strokes on the rule, nothing else on the page. */
.cv-notebook-writing { position: relative; flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-wrap: wrap; align-content: flex-start; justify-content: center; gap: 1.5dvh 2%; padding: 0 3% 2dvh; }
.cv-notebook-written { flex: none; max-width: 100%; height: clamp(90px, 26dvh, 200px); padding: 0; border: none; background: none; cursor: pointer; }
.cv-notebook-written--word { height: clamp(100px, 34dvh, 260px); }
.cv-notebook-written svg { height: 100%; width: 100%; display: block; }
.cv-notebook-close { flex: none; width: max(44px, min(9dvh, 60px)); height: max(44px, min(9dvh, 60px)); box-sizing: border-box; border-radius: 50%; border: none; background: transparent; display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; }
/* One shared card face for both the tools strip and the animal grid —
   marker style: warm paper, thick dark ink outline, no shadow
   (docs/09_GUIA_DE_ESTILO_VISUAL.md section 1), the same chrome
   screen/LevelPlay.tsx's own .cv-result-pill and ZooMap.tsx's HUD pills
   already use. box-sizing: border-box so the border never adds to the
   grid track's own computed size (the overflow this whole pass exists to
   fix). */
.cv-notebook-card { box-sizing: border-box; background: ${SHEET_PAPER}; border: 3px solid ${PAPER_EDGE}; box-shadow: ${PAPER_CARD_SHADOW}; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4%; min-width: 0; min-height: 0; overflow: hidden; }
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
/* A page of the album: the animal, and beside it what this child wrote for its family. */
.cv-album-card { position: relative; flex-direction: row; gap: 3%; padding: 3%; }
.cv-album-figure { flex: 1 1 58%; min-width: 0; height: 100%; display: flex; align-items: center; justify-content: center; }
.cv-album-figure > svg, .cv-album-figure > img { width: 100%; height: 100%; max-height: 100%; display: block; }
.cv-album-written { flex: 0 1 40%; min-width: 0; height: 74%; display: block; }
.cv-album-written svg { width: 100%; height: 100%; display: block; }
.cv-album-card--missing { background: #efeadb; }
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
/* T31 (odd/tasks/prewriting-stage-completion.md, notebook discoverability):
   the first time the notebook is ever opened, the animal that JUST arrived
   (screen/ZooMap.tsx's own backpack-receive signal) gets its card
   highlighted -- a warm glow ring, so a child who has never opened this
   screen before lands on exactly the page the whole flourish was pointing
   at, rather than a flat unlabelled grid. A box-shadow ring (never moving
   the card, never resizing the grid track) that pulses twice then holds its
   final state (animation-iteration-count: 2, not infinite -- nothing
   else on this static page loops forever once it settles). NO BACKTICKS in
   this block -- one inside a comment ends this template literal early
   (this file's own top-of-file note). */
.cv-notebook-card--highlight { animation: cv-notebook-highlight-glow 900ms ease-in-out 2; }
@keyframes cv-notebook-highlight-glow {
  0%, 100% { box-shadow: 0 0 0 4px rgba(242, 211, 119, 0.55); }
  50% { box-shadow: 0 0 0 4px rgba(242, 211, 119, 1); }
}
@media (prefers-reduced-motion: reduce) {
  .cv-notebook-card--highlight { animation: none; box-shadow: 0 0 0 4px rgba(242, 211, 119, 0.9); }
}
`

/** One thing the child wrote, in their own stroke. Tapped, it is read to them: they
 *  wrote it before they could read it. */
function WrittenPiece({ writing }: { writing: Writing }) {
  const isWord = writing.key.length > 1
  const viewBox = writingViewBox(writing, 30)
  const [, , w, h] = viewBox.split(' ').map(Number)
  return (
    <button
      type="button"
      className={isWord ? 'cv-notebook-written cv-notebook-written--word' : 'cv-notebook-written'}
      aria-label={writing.key}
      style={{ aspectRatio: `${w} / ${h}` }}
      onClick={() => {
        if (canAutoSpeak()) speak(writing.key)
      }}
    >
      <svg viewBox={viewBox} aria-hidden="true" data-cv-picture="true">
        <NotebookRule />
        {writing.strokes.map((stroke, i) => (
          <path
            key={i}
            d={strokePath(stroke)}
            fill="none"
            stroke="#2a3442"
            strokeWidth={11}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </button>
  )
}

/** What this child wrote for a family, small, beside its animal: a real letter once
 *  there is one, otherwise the line they drew for it. Never a model. */
function AlbumKeepsake({ writing, line }: { writing?: Writing | null; line?: TracedLine | null }) {
  if (writing) {
    return (
      <span className="cv-album-written" data-cv-album-written="letter">
        <svg viewBox={writingViewBox(writing, 16)} aria-hidden="true" data-cv-picture="true">
          {writing.strokes.map((stroke, i) => (
            <path key={i} d={strokePath(stroke)} fill="none" stroke="#2a3442" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
      </span>
    )
  }
  if (!line) return null
  const k = 100
  return (
    <span className="cv-album-written" data-cv-album-written="line">
      <svg viewBox={`-8 -8 ${line.w * k + 16} ${line.h * k + 16}`} aria-hidden="true" data-cv-picture="true">
        {line.strokes.map((stroke, i) => (
          <path
            key={i}
            d={smoothStrokePath(stroke.map(([x, y]) => [x * k, y * k]))}
            fill="none"
            stroke="#2a3442"
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </span>
  )
}

function AlbumCard({ entry, highlighted, writing, line }: { entry: NotebookAnimalEntry; highlighted: boolean; writing?: Writing | null; line?: TracedLine | null }) {
  const puppet = useRef<PuppetHandle | null>(null)
  const classes = ['cv-notebook-card', 'cv-album-card']
  if (highlighted) classes.push('cv-notebook-card--highlight')
  if (!entry.rescued) classes.push('cv-album-card--missing')
  const hasPuppet = !!puppetFigureFor(entry.figure)
  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-label={entry.rescued ? `${entry.id}, ${entry.caption}` : 'Animal todavía no encontrado'}
      data-cv-album={entry.id}
      data-cv-album-found={entry.rescued ? 'true' : 'false'}
      onClick={() => {
        playSfx('tap')
        if (!entry.rescued) {
          if (canAutoSpeak()) speak(WHO_LINE)
          return
        }
        puppet.current?.act('cheer', 1.4)
        if (entry.line && canAutoSpeak()) speak(entry.line)
      }}
    >
      <span className="cv-album-figure">
        {hasPuppet ? (
          <ArtImg art={entry.figure} silhouette={entry.rescued ? undefined : SILHOUETTE} puppetRef={puppet} />
        ) : entry.placeholderArt ? (
          <PawPrintIcon />
        ) : (
          <img src={entry.art.href} alt="" />
        )}
      </span>
      {entry.rescued && <AlbumKeepsake writing={writing} line={line} />}
    </button>
  )
}

export interface DetectiveNotebookProps {
  records: Records
  onClose: () => void
  /** The animal whose card should glow, the FIRST time the notebook is ever
   *  opened (`screen/ZooMap.tsx`'s own `notebookHighlightId`, cleared on
   *  every later open) — `null`/`undefined` renders the plain grid,
   *  unchanged. */
  highlightId?: ZooAnimalId | null
  /** Tests pin it: there is no `localStorage` under `renderToString`. */
  writings?: readonly Writing[]
  lines?: Readonly<Partial<Record<string, TracedLine>>>
}

/**
 * The libreta del detective: a full-screen overlay, not a routed screen —
 * the map keeps its own state (`ZooMap.tsx`'s `notebookOpen`) and simply
 * mounts this component while open, the same "closed unmounts, no internal
 * visibility state" convention `RescueCelebration`/`ZooMap`'s own bubble use
 * for the pieces that DO need one (this one does not: there is no auto-hide
 * timer to drive).
 */
export default function DetectiveNotebook({ records, onClose, highlightId, writings, lines }: DetectiveNotebookProps) {
  const [written] = useState(() => writings ?? notebookWritings(loadWritings()))
  const [familyLines] = useState(() => lines ?? loadTracedLines())
  const writingOf = (id: NotebookAnimalEntry['id']): Writing | null => {
    for (const key of lettersOf(id)) {
      const found = written.find((w) => w.key === key)
      if (found) return found
    }
    return null
  }
  const lineOf = (id: NotebookAnimalEntry['id']): TracedLine | null => {
    const row = ADVENTURES.find((a) => a.animal === id)
    return (row && familyLines[row.id]) ?? null
  }
  const [page, setPage] = useState<'animals' | 'writing'>('animals')
  const animals = notebookEntries(records)
  const earnedIds = new Set(earnedItems(records).map((item) => item.id))

  // T35: "closed unmounts, no internal visibility state" (this file's own
  // header) means every mount IS an open — a mount effect fires the
  // page-flip swish exactly once per open, never again while the same
  // instance stays mounted.
  useEffect(() => {
    playSfx('notebook')
  }, [])

  return (
    <div className="cv-notebook" role="dialog" aria-label="Libreta del detective">
      <style>{NOTEBOOK_CSS}</style>
      <div className="cv-notebook-page" aria-hidden="true" />
      <div className="cv-notebook-header">
        <div className="cv-notebook-title">
          <ArtImg art={CARRIER_LENS_ART} />
          <NotebookPadIcon />
        </div>
        <div className="cv-notebook-header-right">
        {written.length > 0 && (
          <button
            type="button"
            className="cv-notebook-tab"
            data-cv-notebook-tab={page === 'animals' ? 'writing' : 'animals'}
            aria-label={page === 'animals' ? 'Lo que escribí' : 'Los animales'}
            onClick={() => {
              playSfx('notebook')
              setPage(page === 'animals' ? 'writing' : 'animals')
            }}
          >
            {page === 'animals' ? <PencilIcon /> : <PawPrintIcon />}
          </button>
        )}
        <button
          type="button"
          className="cv-notebook-close"
          aria-label="Cerrar la libreta"
          onClick={() => {
            playSfx('tap')
            onClose()
          }}
        >
          <CloseIcon />
        </button>
        </div>
      </div>
      {page === 'writing' && (
        <div className="cv-notebook-writing" data-cv-notebook-writing="">
          {written.map((writing) => (
            <WrittenPiece key={writing.key} writing={writing} />
          ))}
        </div>
      )}
      {page === 'animals' && (
      <>
      <div className="cv-notebook-tools" role="group" aria-label="Herramientas">
        {BACKPACK_ITEMS.map((item) => (
          <div
            key={item.id}
            className={
              earnedIds.has(item.id) ? 'cv-notebook-card' : 'cv-notebook-card cv-notebook-tool-pending'
            }
          >
            <ArtImg art={item.art} className="cv-notebook-card-art" />
          </div>
        ))}
      </div>
      <div className="cv-notebook-grid">
        {animals.map((entry) => (
          <AlbumCard key={entry.id} entry={entry} highlighted={entry.id === highlightId} writing={writingOf(entry.id)} line={lineOf(entry.id)} />
        ))}
      </div>
      </>
      )}
    </div>
  )
}
