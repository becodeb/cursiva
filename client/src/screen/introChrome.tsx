// The intro's own chrome-inset measurement (`odd/tasks/prewriting-stage-
// completion.md` T31 follow-up: "the intro must use the SAME framing as the
// level"). The author's own play-test note the coordinator relayed: glass1
// measured 35% different and snake1 68% different between the intro's own
// art crop and the level's — the snakes visibly bigger and shifted, so
// tapping "empezar" produced a jump instead of the seamless continuation the
// brief asked for.
//
// Root cause (T31's own evidence cell): `screen/LevelPlay.tsx`'s
// `fitContentWithInsets` fits the level's own backdrop into the viewport
// MINUS its header/footer chrome's own LIVE-MEASURED height
// (`chromeInsets`, a `ResizeObserver` on `.cv-top`/`.cv-foot`) — a real
// DOM measurement that varies by breakpoint AND by content (whether this
// level shows an enclosure sign, an adventure progress bar, a demo-replay
// button). `AdventureIntro.tsx` had no such chrome at all, so its own
// zero-inset "cover" crop could never agree with the level's.
//
// The fix picked (over hand-computing the same numbers as a "pure function
// of viewport size"): render an INVISIBLE replica of the level's own
// `.cv-top`/`.cv-foot` rows, built from the SAME registry/components/
// stylesheet `LevelPlay.tsx` itself renders with (`PROLOGUE_ZOO_SIGNS`,
// `SIGN_SIZE`/`SIGN_CROP_HEIGHT`, `demoPlays`, `LAYOUT_CSS`,
// `detective/TrailProgressBar.tsx`, `detective/icons.tsx`'s `BackIcon`/
// `ReplayIcon`) — never a second, independently-maintained guess at what
// those rows are shaped like, which is exactly the class of drift a "pure
// function" of viewport size alone could not detect the day someone adds a
// sign or a demo button. `AdventureIntro.tsx` measures this SAME ghost with
// the SAME `ResizeObserver` pattern `LevelPlay.tsx` uses for its own real
// chrome, then feeds the result into the SAME `fitContentWithInsets` — the
// two screens now compute IDENTICAL insets by construction, not by
// coincidence.
//
// `visibility: hidden` (not `display: none`): the row still participates in
// layout and is still measurable via `getBoundingClientRect`/
// `ResizeObserver` — `display: none` would report a zero size instead.
// `pointer-events: none` and `aria-hidden`: this row is never seen or
// reachable, only measured.
import type { RefObject } from 'react'
import CaptionedArt from '../detective/CaptionedArt'
import TrailProgressBar from '../detective/TrailProgressBar'
import { BackIcon, ReplayIcon } from '../detective/icons'
import SpeakButton from '../voice/SpeakButton'
import { getLevel } from '../levels/catalog'
import { adventureProgress, type AdventureProgress } from '../zoo/progress'
import { LAYOUT_CSS, PROLOGUE_ZOO_SIGNS, SIGN_CROP_HEIGHT, SIGN_SIZE, demoPlays } from './LevelPlay'

export interface LevelChromeFacts {
  zooSign: (typeof PROLOGUE_ZOO_SIGNS)[keyof typeof PROLOGUE_ZOO_SIGNS] | undefined
  hasProgressBar: boolean
  progress: AdventureProgress | null
  playDemo: boolean
}

/**
 * The structural facts that decide `.cv-top`/`.cv-foot`'s own rendered
 * height for `levelId` — never records-dependent: `adventureProgress`
 * returns non-null purely from the adventure having more than one level
 * (`zoo/progress.ts`'s own header), so an empty `{}` records object gives
 * the same STRUCTURAL answer a real player's progress would (whether the
 * bar exists at all never depends on how far they have gotten).
 * `demoPlays(level, 'full')` mirrors `LevelPlay.tsx`'s own
 * `guideLevelFor` — always `'full'` for a phase-1 level (`WITHDRAWAL_FROM_
 * PHASE`), which every `introCoverFor`-eligible level is.
 */
export function levelChromeFacts(levelId: string): LevelChromeFacts {
  const level = getLevel(levelId)
  const zooSign = PROLOGUE_ZOO_SIGNS[levelId as keyof typeof PROLOGUE_ZOO_SIGNS]
  const progress = adventureProgress(levelId, {})
  return { zooSign, hasProgressBar: !!progress, progress, playDemo: demoPlays(level, 'full') }
}

export interface IntroChromeGhostProps {
  facts: LevelChromeFacts
  topRef: RefObject<HTMLDivElement | null>
  bottomRef: RefObject<HTMLDivElement | null>
}

/** The invisible replica — see this file's own header. */
export function IntroChromeGhost({ facts, topRef, bottomRef }: IntroChromeGhostProps) {
  const { zooSign, hasProgressBar, progress, playDemo } = facts
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, visibility: 'hidden', pointerEvents: 'none' }}>
      <style>{LAYOUT_CSS}</style>
      <div className="cv-top" ref={topRef}>
        <header className={`cv-head${zooSign || hasProgressBar ? ' cv-head-wide' : ''}`}>
          <button type="button" className="cv-btn cv-btn-back cv-btn-art" tabIndex={-1}>
            <BackIcon />
          </button>
          {zooSign && (
            <CaptionedArt
              art={zooSign.art}
              label={zooSign.label}
              size={SIGN_SIZE}
              cropHeight={SIGN_CROP_HEIGHT}
              className="cv-level-zoo-sign"
            />
          )}
          {!zooSign && hasProgressBar && progress && <TrailProgressBar progress={progress} />}
          <div className="cv-head-right">
            <SpeakButton line="" />
          </div>
        </header>
      </div>
      <div className="cv-foot" ref={bottomRef}>
        <nav aria-label="Acciones" className="cv-actions">
          {playDemo && (
            <button type="button" className="cv-btn cv-btn-art" tabIndex={-1}>
              <ReplayIcon />
            </button>
          )}
        </nav>
      </div>
    </div>
  )
}
