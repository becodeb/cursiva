// The notebook surfaces under `renderToString`: no written words alone, and each
// asks for what `docs/25` 4.3 asked: wordless, pictured, and never a number.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { auditCaptions } from '../detective/captionAudit'
import { getLevel } from '../levels/catalog'
import { EMPTY_RECORD } from '../game/types'
import type { Writing } from '../zoo/notebookWriting'
import DetectiveNotebook from './DetectiveNotebook'
import { guideLevelFor } from './LevelPlay'
import LetterMorph from './LetterMorph'
import LevelPlay from './LevelPlay'
import NotebookKeepsake, { keepsakeLine, writingViewBox } from './NotebookKeepsake'
import { resolveNextAction } from './GameScreen'
import { backdropFor } from '../zoo/backdrops'

const line = Array.from({ length: 30 }, (_, i) => ({ x: i * 6, y: 300 + Math.sin(i / 3) * 50 }))
const writing: Writing = { key: 'mano', strokes: [line.map((p): [number, number] => [p.x, p.y])] }

const renderLevel = (id: string) =>
  renderToString(<LevelPlay level={getLevel(id)} record={EMPTY_RECORD} onAttempt={() => {}} onNext={() => {}} onBack={() => {}} />).replace(
    /<style>[\s\S]*?<\/style>/g,
    '',
  )

describe('the letter step on the notebook page', () => {
  for (const id of ['o-calco', 'o-punteado', 'o-copia', 'o-memoria', 'palabra-mano']) {
    const html = renderLevel(id)
    it(`${id} shows no number, no pillar and no text-only control`, () => {
      expect(html).not.toMatch(/Precisión|Sentido|Fluidez|Borrar|Siguiente|Ver la guía|Fase \d/)
      expect(auditCaptions(html).uncaptioned).toEqual([])
    })
    it(`${id} is on the notebook page, with no scene behind it`, () => {
      expect(html).toContain('data-cv-notebook-paper')
      expect(html).toContain('data-cv-notebook-rule')
      expect(html).not.toContain(backdropFor('turtle-puente')!.art.href)
    })
  }

  it('dots on the dotted step and no walls; the model on the copy step; nothing on memory', () => {
    expect(renderLevel('o-punteado')).toContain('data-cv-letter-dots')
    expect(renderLevel('o-copia')).toContain('data-cv-letter-model')
    const memory = renderLevel('o-memoria')
    expect(memory).not.toContain('data-cv-letter-dots')
    expect(memory).not.toContain('data-cv-letter-model')
    expect(memory).not.toContain('data-cv-exit-cue')
  })

  it('a letter that ends high has its own sign, and one that does not has none', () => {
    expect(renderLevel('o-calco')).toContain('data-cv-exit-cue')
    expect(renderLevel('o-punteado')).toContain('data-cv-exit-cue')
    expect(renderLevel('a-calco')).not.toContain('data-cv-exit-cue')
  })

  it('reuses the guide withdrawal: the step is the band, mastery does not move it', () => {
    const mastered = { ...EMPTY_RECORD, bestAccuracy: 100 }
    expect(guideLevelFor(mastered, getLevel('o-calco'))).toBe('full')
    expect(guideLevelFor(EMPTY_RECORD, getLevel('o-memoria'))).toBe('none')
  })

  it('the bridge shows the rule in the scene', () => {
    const html = renderLevel('turtle-puente')
    expect(html).toContain('data-cv-peeking-rule')
    expect(html).not.toContain('data-cv-notebook-paper')
  })
})

describe('the morph', () => {
  const level = getLevel('o-calco')
  const morph = level.notebook!.morph!

  it('shows a line and the page, with no word on screen', () => {
    const html = renderToString(<LetterMorph level={level} morph={morph} onDone={() => {}} reducedMotion={false} source={line} />)
    expect(html).toContain('data-cv-morph="o"')
    expect(html).toContain('aria-label="Seguir"')
    expect(auditCaptions(html.replace(/<style>[\s\S]*?<\/style>/g, '')).uncaptioned).toEqual([])
  })

  it('with reduced motion the line and the letter simply stand side by side', () => {
    const html = renderToString(<LetterMorph level={level} morph={morph} onDone={() => {}} reducedMotion source={line} />)
    expect(html.match(/<path d="M/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('every first step of a letter names its family and a bridge level that exists', () => {
    for (const char of 'mnuoale') {
      const m = getLevel(`${char}-calco`).notebook!.morph!
      expect(getLevel(m.bridgeLevelId).peekingRule).toBe(true)
      expect(m.fraction).toBeGreaterThan(0)
      expect(m.fraction).toBeLessThanOrEqual(1)
    }
  })
})

describe('the word keepsake', () => {
  it('says what they wrote, draws their own stroke and has the animal react', () => {
    const level = getLevel('palabra-mano')
    const html = renderToString(<NotebookKeepsake level={level} onDone={() => {}} writing={writing} />)
    expect(keepsakeLine('mano')).toMatch(/mano/)
    expect(html).toContain('data-cv-keepsake="mano"')
    expect(html).toContain('cv-keepsake-ink')
    expect(html).toContain('cv-keepsake-animal')
    expect(auditCaptions(html.replace(/<style>[\s\S]*?<\/style>/g, '')).uncaptioned).toEqual([])
  })

  it('frames the writing and keeps both lines of the body zone in view', () => {
    const [, y, , h] = writingViewBox(writing).split(' ').map(Number)
    expect(y).toBeLessThanOrEqual(300)
    expect(y + h).toBeGreaterThanOrEqual(420)
  })

  it('still renders with no writing to show', () => {
    expect(() => renderToString(<NotebookKeepsake level={getLevel('palabra-ola')} onDone={() => {}} writing={null} />)).not.toThrow()
  })
})

describe('the notebook\'s written page', () => {
  it('is offered once something is written, by an icon', () => {
    const html = renderToString(<DetectiveNotebook records={{}} onClose={() => {}} writings={[writing]} />)
    expect(html).toContain('data-cv-notebook-tab="writing"')
    const bare = renderToString(<DetectiveNotebook records={{}} onClose={() => {}} writings={[]} />)
    expect(bare).not.toContain('data-cv-notebook-tab')
  })
})

describe('the chapter routing', () => {
  it('a chapter ends on the map and never chains past the story', () => {
    expect(resolveNextAction('n-memoria', {})).toMatchObject({ type: 'close', levelId: 'n-memoria' })
  })

  it('a step goes on to the next step', () => {
    expect(resolveNextAction('o-calco', {})).toEqual({ type: 'next', levelId: 'o-punteado' })
    expect(resolveNextAction('duck-puente', {})).toEqual({ type: 'next', levelId: 'm-calco' })
  })

  it('the last memory step of a chapter with a word goes on to the word', () => {
    expect(resolveNextAction('a-memoria', {})).toEqual({ type: 'next', levelId: 'palabra-mano' })
  })
})
