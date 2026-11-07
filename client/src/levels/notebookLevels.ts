// The levels of the bridge to cursive (`docs/25` 4.2 to 4.6, `docs/21` §3.3). Data,
// generated from one table, so a letter's whole sequence is one row: the family's
// gesture made small on the rule, then each letter in the detective's notebook, then
// the words those letters allow. Every id here is persisted: add, never rename.
import { buildWord } from '../letters/combinations'
import { exitKindFor } from '../letters/anchors'
import { LETTER_REGISTRY } from '../letters/registry'
import { flattenPathD } from '../letters/svgLetter'
import type { ArtImage } from '../detective/assets'
import { ZOO_ANIMAL_ART } from '../detective/assets'
import { bridges, garland, loops, ovals } from './paths'
import type { LetterMorphConfig, LevelConfig, LevelFeedback, LevelRules, LevelView, NotebookStep } from './types'

const FEEDBACK: LevelFeedback = { tone: true, haptics: true, rail: false }

/** Wide enough for a fingertip at the zoom a letter is shown at. */
const LETTER_CORRIDOR = 46
const WORD_CORRIDOR = 60
const BRIDGE_CORRIDOR = 56
/** Far under a wobbly stroke's 75 to 80 (`game/letterScore.test.ts`): this pillar
 *  is there to stop a zigzag and a stroke made of stops, not a small hand. */
const LETTER_MIN_FLUENCY = 35
const LETTER_MIN_ACCURACY = 60
const FREEHAND_MIN_ACCURACY = 50

function letterRules(minAccuracy: number): LevelRules {
  return { mustBeContinuous: true, enforceOrder: true, minFluency: LETTER_MIN_FLUENCY, minAccuracy }
}

/** A window on the sheet: down to the baseline, up to whatever the writing reaches. */
function bandFor(paths: readonly string[]): { y: number; height: number; width: number } {
  const points = paths.flatMap((d) => flattenPathD(d).points)
  const xs = points.map((p) => p.x)
  const top = Math.min(...points.map((p) => p.y))
  const y = top < 280 ? 130 : 240
  return { y, height: 470 - y, width: Math.max(...xs) - Math.min(...xs) }
}

function letterView(char: string, shift = 0): LevelView {
  const { y, height, width } = bandFor([LETTER_REGISTRY[char].pathDefinition.d])
  // One size for all of a letter's steps: room for the letter and its model.
  return { width: Math.max(640, Math.ceil(width * 2 + 160)), y, height, shiftX: shift }
}

interface LetterRow {
  readonly char: string
  /** Spoken while the arm draws it. */
  readonly description: string
  readonly morph: LetterMorphConfig
  /** The first letter of a pair ends a sitting: back to the map, the rest waits there. */
  readonly sittingEnd?: { readonly named: string; readonly animal: ArtImage }
}

function morph(bridgeLevelId: string, family: string, fraction: number, named: string): LetterMorphConfig {
  return { bridgeLevelId, family, fraction, line: `¡Mirá tu línea! ¡Se convierte en ${named}!` }
}

/** In the order a child reaches them: `zoo/journey.ts` follows the story, and
 *  the duck comes first (`docs/25` 4.6's pairs, each after its own family). */
const LETTERS: readonly LetterRow[] = [
  {
    char: 'm',
    description: 'Subo y bajo, tres puentes, sin levantar el dedo. ¡Mirá!',
    morph: morph('duck-puente', 'duck', 1, 'la eme'),
    sittingEnd: { named: 'la eme', animal: ZOO_ANIMAL_ART.pato },
  },
  {
    char: 'n',
    description: 'Subo y bajo, dos puentes, sin levantar el dedo. ¡Mirá!',
    morph: morph('duck-puente', 'duck', 2 / 3, 'la ene'),
  },
  {
    char: 'u',
    description: 'Subo, bajo con una pancita, subo y bajo. ¡Mirá!',
    morph: morph('fish-puente', 'fish', 2 / 3, 'la u'),
  },
  {
    char: 'o',
    description: 'Subo, doy la vuelta para atrás y termino arriba, en la rayita.',
    morph: morph('turtle-puente', 'turtles', 1 / 3, 'la o'),
    sittingEnd: { named: 'la o', animal: ZOO_ANIMAL_ART.tortuga },
  },
  {
    char: 'a',
    description: 'Subo, doy la vuelta para atrás, cierro arriba y bajo.',
    morph: morph('turtle-puente', 'turtles', 1 / 3, 'la a'),
  },
  {
    char: 'l',
    description: 'Subo bien alto, doy la vuelta y bajo derecho a la raya.',
    morph: morph('monkey-puente', 'monkeys', 1 / 3, 'la ele'),
    sittingEnd: { named: 'la ele', animal: ZOO_ANIMAL_ART.mono },
  },
  {
    char: 'e',
    description: 'Subo un poquito, doy una vuelta chiquita y bajo a la raya.',
    morph: morph('monkey-puente', 'monkeys', 1 / 3, 'la e'),
  },
]

const STEP_HINT: Readonly<Record<Exclude<NotebookStep, 'trace' | 'word'>, string>> = {
  dotted: 'Ahora seguí la línea de puntitos.',
  copy: 'Mirala bien y hacela vos acá al lado.',
  memory: 'Ahora de memoria. ¡Vos podés!',
}

export function letterLevelIds(char: string): readonly string[] {
  return [`${char}-calco`, `${char}-punteado`, `${char}-copia`, `${char}-memoria`]
}

function letterLevels(row: LetterRow): LevelConfig[] {
  const { char, description } = row
  const paths = [LETTER_REGISTRY[char].pathDefinition.d]
  const base = {
    phase: 3 as const,
    kind: 'path' as const,
    surface: 'ruled' as const,
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: FEEDBACK,
    paths,
    corridorWidth: LETTER_CORRIDOR,
    showGuide: true,
    letters: [char],
    demo: true,
  }
  const view = letterView(char)
  const highExit = exitKindFor(char) === 'top'
  const [trace, dotted, copy, memory] = letterLevelIds(char)
  const modelDx = Math.round(view.width * 0.42)
  return [
    {
      ...base,
      id: trace,
      title: `La ${char}`,
      hint: `${description} Ahora vos.`,
      rules: letterRules(LETTER_MIN_ACCURACY),
      view,
      guideBand: 'full',
      demoSeconds: 5,
      notebook: { step: 'trace', text: char, morph: row.morph },
    },
    {
      ...base,
      id: dotted,
      title: `La ${char} de puntitos`,
      hint: highExit ? `${STEP_HINT.dotted} Terminá arriba, en la rayita.` : STEP_HINT.dotted,
      rules: letterRules(LETTER_MIN_ACCURACY),
      view,
      guideBand: 'dotted',
      demoSeconds: 5,
      notebook: { step: 'dotted', text: char },
    },
    {
      ...base,
      id: copy,
      title: `Copiá la ${char}`,
      hint: highExit ? `${STEP_HINT.copy} Terminá arriba, en la rayita.` : STEP_HINT.copy,
      rules: letterRules(FREEHAND_MIN_ACCURACY),
      view: { ...view, shiftX: Math.round(view.width * 0.18) },
      guideBand: 'minimal',
      demoSeconds: 5,
      keepWriting: char,
      notebook: { step: 'copy', text: char, freehand: true, modelDx },
    },
    {
      ...base,
      id: memory,
      title: `La ${char} de memoria`,
      hint: STEP_HINT.memory,
      rules: letterRules(FREEHAND_MIN_ACCURACY),
      view,
      guideBand: 'none',
      demoSeconds: 5,
      keepWriting: char,
      notebook: { step: 'memory', text: char, freehand: true, ...(row.sittingEnd ? { sittingEnd: row.sittingEnd } : null) },
    },
  ]
}

/** Calco, copia, memoria: the routine again, without its dotted step. */
function secondLetterIds(char: string): readonly string[] {
  const [trace, , copy, memory] = letterLevelIds(char)
  return [trace, copy, memory]
}

interface WordRow {
  readonly id: string
  readonly word: string
  readonly animal: ArtImage
}

/** Each built only from letters practised before it. Accents stay out: `buildWord`
 *  has no accent stroke, so `mamá` would be written wrong (`docs/25` §9). */
export const WORDS: readonly WordRow[] = [
  { id: 'palabra-mano', word: 'mano', animal: ZOO_ANIMAL_ART.tortuga },
  { id: 'palabra-ola', word: 'ola', animal: ZOO_ANIMAL_ART.mono },
  { id: 'palabra-luna', word: 'luna', animal: ZOO_ANIMAL_ART.mono },
]

function wordLevel({ id, word, animal }: WordRow): LevelConfig {
  const config = buildWord(word.split(''))
  const paths = [config.pathDefinition.d]
  const { y, height } = bandFor(paths)
  return {
    id,
    phase: 5,
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: FEEDBACK,
    title: `La palabra ${word}`,
    hint: `Ahora escribimos ${word}, todo de corrido. ¡Mirá! Ahora vos.`,
    paths,
    corridorWidth: WORD_CORRIDOR,
    rules: letterRules(LETTER_MIN_ACCURACY),
    showGuide: true,
    letters: word.split(''),
    demo: true,
    demoSeconds: 7,
    view: { width: 640, y, height },
    guideBand: 'full',
    keepWriting: word,
    notebook: { step: 'word', text: word, animal },
  }
}

function bridgeLevel(id: string, title: string, hint: string, path: string, y: number): LevelConfig {
  return {
    id,
    phase: 3,
    title,
    hint,
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: FEEDBACK,
    paths: [path],
    corridorWidth: BRIDGE_CORRIDOR,
    rules: { mustBeContinuous: true, enforceOrder: true, minFluency: 0, minAccuracy: LETTER_MIN_ACCURACY },
    showGuide: true,
    // No letter yet: the gesture is what is being carried over.
    letters: [],
    demo: true,
    demoSeconds: 4,
    view: { width: 760, y, height: 470 - y },
    guideBand: 'full',
    peekingRule: true,
    keepWriting: id,
  }
}

/** The gesture a family already knows, at letter size. */
export const BRIDGE_LEVELS: readonly LevelConfig[] = [
  bridgeLevel(
    'duck-puente',
    'Los puentes en el renglón',
    'Los puentes del pato, ahora chiquitos, sobre el renglón.',
    bridges({ x0: 170, x1: 590, yTop: 300, yBase: 420, cycles: 3, footRise: 62, footLean: 4, topHandle: 34 }),
    240,
  ),
  bridgeLevel(
    'fish-puente',
    'La guirnalda en el renglón',
    'La guirnalda de los peces, ahora chiquita, sobre el renglón.',
    garland({ x0: 170, x1: 590, yTop: 300, yBottom: 420, cycles: 3 }),
    240,
  ),
  bridgeLevel(
    'turtle-puente',
    'Las vueltas en el renglón',
    'Las vueltas de la tortuga, ahora chiquitas, sobre el renglón.',
    ovals({ x0: 160, x1: 600, cy: 360, rx: 52, ry: 60, count: 3 }),
    240,
  ),
  bridgeLevel(
    'monkey-puente',
    'Los rulos en el renglón',
    'Los rulos del mono, ahora chiquitos, sobre el renglón.',
    loops({ x0: 150, x1: 610, yBase: 420, yTop: 180, cycles: 3 }),
    130,
  ),
]

export const LETTER_LEVELS: readonly LevelConfig[] = LETTERS.flatMap(letterLevels)
export const WORD_LEVELS: readonly LevelConfig[] = WORDS.map(wordLevel)

/** The levels of each chapter, in play order. Here rather than in `zoo/`, because
 *  both the sectors and the adventures read it and adventures imports sectors. */
export const CHAPTER_LEVEL_IDS = {
  mn: ['duck-puente', ...letterLevelIds('m'), ...secondLetterIds('n')],
  u: ['fish-puente', ...letterLevelIds('u')],
  oa: ['turtle-puente', ...letterLevelIds('o'), ...secondLetterIds('a'), 'palabra-mano'],
  le: ['monkey-puente', ...letterLevelIds('l'), ...secondLetterIds('e'), 'palabra-ola', 'palabra-luna'],
} as const

/** A second letter's dotted step is left out of the story: the child already knows the
 *  routine, and tracing then copying is what the evidence asks for (`docs/25` C8). The
 *  levels stay in the catalog, because a level id is never deleted: a child who filed
 *  one keeps it, and a dev link still opens it. */
export const RESTING_LEVEL_IDS: readonly string[] = ['n', 'a', 'e'].map((char) => `${char}-punteado`)
