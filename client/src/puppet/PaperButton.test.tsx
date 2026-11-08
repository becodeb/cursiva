// The button system's promises, the ones a capture cannot keep once it has been read.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UI_BUTTON_ART, ZOO_BACKPACK_ART } from '../detective/assets'
import { BackIcon, CloseIcon, ContinueIcon, ReplayIcon } from '../detective/icons'
import { getLevel } from '../levels/catalog'
import AdventureClosing from '../screen/AdventureClosing'
import AdventureIntro from '../screen/AdventureIntro'
import LevelPlay, { LAYOUT_CSS } from '../screen/LevelPlay'
import PrologueOpening from '../screen/PrologueOpening'
import ZooMap from '../screen/ZooMap'
import SpeakButton from '../voice/SpeakButton'
import VoiceToggle from '../voice/VoiceToggle'
import { ADVENTURES } from '../zoo/adventures'
import { PAPER_ICONS, pulpitoHead } from './chrome'
import { PAPER_BUTTON_CSS, PaperFace } from './PaperButton'
import { paperPropFor } from './props'

const NEXT = `data-art="${UI_BUTTON_ART.next.href}"`
const count = (html: string, needle: string): number => html.split(needle).length - 1
const noop = (): void => {}
const EMPTY = { bestAccuracy: 0, bestFluency: 0, attempts: 0, approvals: 0, streakFail: 0, streakPass: 0, widthFactor: 1, durationsMs: [] }

describe('a control is a piece of paper off its shadow', () => {
  const FACES: readonly (readonly [string, string])[] = [
    ['back', renderToString(<BackIcon />)],
    ['close', renderToString(<CloseIcon />)],
    ['next', renderToString(<ContinueIcon />)],
    ['replay', renderToString(<ReplayIcon />)],
    ['speak', renderToString(<SpeakButton line="hola" />)],
    ['voice', renderToString(<VoiceToggle />)],
    ['pencil', renderToString(<PaperFace scene={PAPER_ICONS.pencil} />)],
    ['paw', renderToString(<PaperFace scene={PAPER_ICONS.paw} />)],
    ['head', renderToString(<PaperFace scene={pulpitoHead('#f2743a', '#ff9d87')} />)],
    ['backpack', renderToString(<PaperFace scene={paperPropFor(ZOO_BACKPACK_ART)!} />)],
  ]

  it.each(FACES)('%s: its shadow stays down while the face moves', (_, html) => {
    const face = html.indexOf('class="cv-paper-face"')
    expect(face).toBeGreaterThan(0)
    // The ground shadow comes first and outside the part that moves.
    expect(html.slice(0, face)).toMatch(/<g transform="translate\(6 10\)"/)
    expect(html).not.toMatch(/url\(#|<mask|<clipPath|<pattern|<filter|Gradient|<defs/)
  })

  it('a press lands the face exactly on its shadow, and bounces back', () => {
    expect(PAPER_BUTTON_CSS).toContain('transform: translate(6px, 10px)')
    expect(PAPER_BUTTON_CSS).toMatch(/\.cv-paper-face \{ transition: transform \d+ms cubic-bezier/)
  })

  it('reduced motion keeps the answer and drops the travel', () => {
    const reduced = PAPER_BUTTON_CSS.slice(PAPER_BUTTON_CSS.indexOf('prefers-reduced-motion'))
    expect(reduced).toContain('transition: none')
  })

  it('the keyboard is visible on any colour', () => {
    expect(PAPER_BUTTON_CSS).toMatch(/button:focus-visible \{[^}]*outline: 4px solid/)
  })
})

describe('a finger always finds 64 px', () => {
  const px = (name: string, css: string): number => Number(css.match(new RegExp(`${name}: (\\d+)px`))![1])

  it('on a tablet the control is 64 px, the primary 96', () => {
    const root = PAPER_BUTTON_CSS.slice(0, PAPER_BUTTON_CSS.indexOf('@media'))
    expect(px('--cv-tap-size', root)).toBe(64)
    expect(px('--cv-go-size', root)).toBe(96)
  })

  it('on a phone on its side the paper shrinks and the hit area does not', () => {
    const phone = PAPER_BUTTON_CSS.slice(PAPER_BUTTON_CSS.indexOf('@media (max-height: 520px)'))
    const inset = Number(phone.match(/inset: -(\d+)px/)![1])
    expect(px('--cv-tap-size', phone) + 2 * inset).toBeGreaterThanOrEqual(64)
    expect(px('--cv-go-size', phone)).toBeGreaterThanOrEqual(64)
  })

  it('the sound controls are on that size, not on their own smaller one', () => {
    for (const html of [renderToString(<SpeakButton line="hola" />), renderToString(<VoiceToggle />)]) {
      expect(html).toContain('var(--cv-tap-size, 64px)')
      expect(html).toContain('data-paper-tap')
    }
  })

  it('the level no longer overrides that size at any height', () => {
    expect(LAYOUT_CSS).not.toMatch(/\.cv-btn\.cv-btn-art[^{]*\{ width: \d+px/)
    expect(LAYOUT_CSS).toContain('width: var(--cv-tap-size, 64px)')
  })
})

describe('one obvious thing to press', () => {
  const duck = ADVENTURES.find((a) => a.id === 'duck')!

  it('the intro, the closing and the map each have exactly one gold arrow', () => {
    expect(count(renderToString(<AdventureIntro adventure={duck} onStart={noop} />), NEXT)).toBe(1)
    expect(count(renderToString(<AdventureClosing adventure={duck} beat={duck.closingBeat![0]} onContinue={noop} />), NEXT)).toBe(1)
    expect(count(renderToString(<ZooMap records={{}} onEnter={noop} debug={false} />), NEXT)).toBe(1)
    expect(count(renderToString(<PrologueOpening from={1} onDone={noop} />), NEXT)).toBe(1)
  })

  it('while tracing there is none: the writing is the thing to do', () => {
    const html = renderToString(<LevelPlay level={getLevel('duck-trail1')} record={EMPTY} onAttempt={noop} onNext={noop} onBack={noop} />)
    expect(count(html, NEXT)).toBe(0)
  })

  it('the quiet controls live together at the top, and the row under the sheet stays empty', () => {
    const html = renderToString(<LevelPlay level={getLevel('duck-trail1')} record={EMPTY} onAttempt={noop} onNext={noop} onBack={noop} />)
    const head = html.slice(html.indexOf('class="cv-head'), html.indexOf('</header>'))
    expect(head).toContain('aria-label="Volver"')
    expect(head).toContain('aria-label="Ver de nuevo"')
    expect(head).toContain('aria-label="Escuchar"')
    expect(html.slice(html.indexOf('class="cv-actions"'))).not.toContain('aria-label="Ver de nuevo"')
  })

  it('nothing on a level control moves unless pressed (`docs/01` §5)', () => {
    expect(PAPER_BUTTON_CSS).not.toMatch(/@keyframes|animation:/)
    const html = renderToString(<LevelPlay level={getLevel('duck-trail1')} record={EMPTY} onAttempt={noop} onNext={noop} onBack={noop} />)
    const head = html.slice(html.indexOf('class="cv-head'), html.indexOf('</header>'))
    expect(head).not.toMatch(/cv-next-ready|cv-scene-(sway|drift|rays|bob)/)
  })

  it('the way out is one object: going back and closing are the same cut', () => {
    expect(paperPropFor(UI_BUTTON_ART.close)).toBe(paperPropFor(UI_BUTTON_ART.back))
  })
})
