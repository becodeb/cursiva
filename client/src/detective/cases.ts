// The case registry (design.md §1 "The case registry", detective-mode spec
// "Case Registry Data Shape"). A `DetectiveCase` derives its clue kinds from
// the catalog rather than restating them — `clueKindsOf` is the one lookup
// every other module (`palette.test.ts`, `caseState.railSlots`, `Deduction`)
// reads through, so the case and the levels it points at can never disagree.
import { getLevel } from '../levels/catalog'
import { DETECTIVE_TRAIL_IDS } from '../game/types'
import {
  CAT_FUR_SAMPLE_ART,
  CLUE_ART,
  SECTOR_ADVENTURE_ART,
  SIGN_ART,
  type ArtImage,
  type ClueKind,
  type ZooAnimalId,
} from './assets'

/**
 * How a case is deduced (`docs/19` §2.3; `docs/21` §6 decision 1, decided
 * 2026-10-02): two deductions in a row on the journey never share a form.
 *
 *  - `new-silhouettes`: animals the child has not met, each ruled out by a
 *    clue (the duck);
 *  - `rescued-silhouettes`: the lineup includes animals already rescued,
 *    which rule themselves out (the night, the monkeys);
 *  - `signs`: the entrance's empty-enclosure signs (the fish);
 *  - `comparison`: three SAMPLES side by side (`optionArt`) and the child
 *    picks the one that matches the clue just collected — the sheep's wool
 *    against a feather and cat fur, the turtles' print against two other
 *    prints. Samples and prints are one form (the author's decision,
 *    2026-10-02): both are "which of these is the same as mine?".
 */
export type DeductionForm = 'new-silhouettes' | 'rescued-silhouettes' | 'signs' | 'comparison'

export interface DetectiveCase {
  id: string
  culprit: ZooAnimalId
  /** [T45] Which of the four ways of deducing this case asks (see
   *  {@link DeductionForm}). */
  form: DeductionForm
  /** [T45] Pulpito's opening question, when it is not the generic "¿Quién
   *  dejó todo esto?" (`Deduction.tsx`'s `DEDUCTION_OPENING_LINE`). */
  question?: string
  /** Lineup order, explicit so it never depends on key iteration order. May
   *  be the STATIC authored default (every case but `night`) or a live,
   *  progress-resolved array (`resolveCase`, below) — either way this is
   *  what `Deduction.tsx` renders, unchanged. */
  options: readonly ZooAnimalId[]
  /** Which clue clears which animal — a fact about THIS case. Absent for a
   *  distractor named in `rescuedDistractors` instead: there is no clue
   *  behind THAT dismissal (see its own header). */
  ruledOutBy: Readonly<Partial<Record<ZooAnimalId, ClueKind>>>
  /**
   * Distractors ruled out because the child has already rescued them
   * elsewhere, not because a clue fails to match them (`docs/19` §2.3's
   * second form of deducing: "siluetas que incluyen animales ya rescatados,
   * que se descartan solos" — the night case's own "¿El pato? No: el pato
   * ya está en su laguna"). Exempts every animal named here from
   * `ruledOutBy`'s "every distractor has a verdict" requirement
   * (`cases.test.ts`) — forcing an unrelated `ClueKind` into `ruledOutBy`
   * for a dismissal that has nothing to do with a clue would assert
   * something false about why the case closes. Absent (every case but
   * `night`) means every non-culprit option is ruled out by a clue, the
   * original T21 invariant, unchanged.
   */
  rescuedDistractors?: readonly ZooAnimalId[]
  /**
   * Pulpito's own spoken line for a wrong pick (`odd/tasks/prewriting-stage-
   * completion.md` T21, `docs/19` §5.4: "la silueta da un pasito atrás y el
   * Pulpito dice por qué, con la pista que la descarta" — "El gato no tiene
   * plumas"). One per distractor, keyed the same way `ruledOutBy` is; the
   * culprit carries none, the same shape `ruledOutBy` already follows. Also
   * covers every `rescuedDistractors` entry (the "ya está en su X" lines),
   * and — for `night` — every candidate `resolveNightDiscards` could ever
   * pick, not only the two the STATIC `options` below name, so a live,
   * progress-resolved lineup always has a hint ready for whichever animal it
   * actually shows.
   */
  hint: Readonly<Partial<Record<ZooAnimalId, string>>>
  /**
   * The trails whose OWN clues feed this case's rail and deduction (`getLevel
   * (id).clue`, `clueKindsOf` below) — NOT every level of the adventure that
   * carries the case. T21 (`docs/19` §2.3: "en una aventura A de cuatro
   * niveles: niveles 1–2 pistas... niveles 3–4 juntar") splits the duck's
   * levels: the pistas levels (four since T40: `duck-trail1`/`5`/`2`/`6`)
   * carry a clue and feed this list; `duck-trail3`/`duck-trail4` were
   * repurposed to
   * `LevelConfig.collect` (the duck FAMILY, gathered after the case is
   * solved) and carry no clue at all, so they are deliberately absent here —
   * `game/types.ts`'s `DUCK_TRAIL_IDS` (all four, used only by
   * `migrateDuckCase.ts`'s POSITIONAL seeding, a different concern) is never
   * the right list for this field again.
   */
  trailIds: readonly string[]
  /**
   * The chip row's own art, when it isn't one `ClueKind` per `trailIds`
   * level (`clueKindsOf`'s default path, duck/hen). T25 (`docs/19` §3.2):
   * the night case's hedgehog belongings (leaf/apple/mushroom) are
   * naturalistic PROPS with their own registry (`SECTOR_ADVENTURE_ART`), not
   * the flat single-colour-token icons `ClueKind`/`CLUE_ART` model
   * (`ClueArt.earned`'s colour-token field has no honest value for a
   * photographed leaf) — so this case supplies its chip pictures directly
   * instead of forcing a fourth reason for `ClueKind` to exist. Present here
   * means `clueKindsOf` returns `[]` (there is nothing for it to derive).
   */
  clueArt?: readonly ArtImage[]
  /**
   * T26 (`docs/19` §2.3's THIRD form of deducing: "los carteles de los
   * recintos vacíos del prólogo"). `Deduction.tsx`'s `Animal` renders every
   * un-revealed option as its `ANIMAL_SILHOUETTE_ART` silhouette by default
   * — right for a case whose lineup is animals (duck/night), wrong for the
   * fish case, whose lineup is the entrance's three empty-enclosure SIGN
   * pictures (`SIGN_ART.fish`/`.turtles`/`.monkeys`, `detective/assets.ts`)
   * asking "¿de qué recinto se escaparon?" — a picture of a SIGN, not of an
   * animal shape, and one `ANIMAL_SILHOUETTE_ART` has no entry for `tortuga`/
   * `mono` anyway (only the four deduction-lineup animals it predates ever
   * needed one). Keyed by option, same shape `ruledOutBy`/`hint` already use;
   * absent (every case but `fish`) keeps today's silhouette-only behaviour.
   * The revealed culprit still swaps to `ZOO_ANIMAL_ART` regardless — this
   * only overrides the UN-revealed picture.
   */
  optionArt?: Readonly<Partial<Record<ZooAnimalId, ArtImage>>>
}

/**
 * The night case's own discard candidates, most-preferred first (`docs/19`
 * §2.3/§3.2). `pato`/`oveja` are the STORY's pick ("ya está en su laguna" /
 * "ya está en su ladera"); `llama` is a plausible third — `nocturna` cannot
 * open before `llama-peak4` is filed either (`zoo/sectors.ts`), so it is
 * JUST as reliably already-rescued as the first two in ordinary play.
 * `vaca`/`gato` close the list as an UNCONDITIONAL last resort: no
 * `ADVENTURES` row ever recovers them (`zoo/adventures.isRescued` is false
 * for both by construction), so `resolveNightDiscards` can never fail to
 * return two distinct picks even from an empty `Records` (a `?debug` seed
 * that jumps straight to `night1` with nothing else filed). Declared BEFORE
 * `DETECTIVE_CASES` so the night entry's own `rescuedDistractors` can
 * reference it directly — module-init order, the same reason
 * `assets.ts`'s `HEDGEHOG_ART` moved above `ZOO_ANIMAL_ART`.
 */
const NIGHT_DISCARD_PRIORITY: readonly ZooAnimalId[] = ['pato', 'oveja', 'llama', 'vaca', 'gato']

/** `vaca`/`gato` need no `isRescued` check — see `NIGHT_DISCARD_PRIORITY`'s
 *  own header. */
const NIGHT_DISCARD_FALLBACK: readonly ZooAnimalId[] = ['vaca', 'gato']

/**
 * The `monkeys` case's own two distractors (`docs/19` §3's monos row names
 * `erizo`/`abeja` SPECIFICALLY, never a substitute) — unlike `night`'s
 * single priority list, WHO appears never changes with progress, only HOW
 * each is dismissed (`resolveMonkeysCase`, below). Declared BEFORE
 * `DETECTIVE_CASES` for the same reason `NIGHT_DISCARD_PRIORITY` is: the
 * static entry's own `hint` references `MONKEY_RESCUED_HINT` directly.
 */
const MONKEY_DISTRACTORS: readonly ZooAnimalId[] = ['erizo', 'abeja']

/** The "ya rescatado" framing — the ORDINARY path (`zoo/journey.ts`'s own
 *  `JOURNEY` order plays `hedgehog`/`bee` well before `monkey1`, and
 *  `bosque`'s own `adventureIds` puts `bee1..4` immediately before
 *  `monkey1..4` in the SAME sector), and the STATIC `DETECTIVE_CASES`
 *  entry's own `hint` below, verbatim. */
const MONKEY_RESCUED_HINT: Readonly<Partial<Record<ZooAnimalId, string>>> = {
  erizo: '¿El erizo? No: al erizo ya lo encontramos.',
  abeja: '¿La abeja? No: la abeja ya volvió a su panal.',
}

/** The clue-based fallback framing, for a `?debug`-seeded or otherwise
 *  non-linear session that reaches `bosque` (unlocked by `snake4` alone,
 *  `zoo/sectors.ts`) before actually rescuing one of these two. Both lines
 *  stay TRUE regardless of progress — a real deduction, not a placeholder
 *  excuse: the hedgehog does not eat bananas (`monkey2`'s `banana`), and a
 *  bee has no hands to leave a handprint (`monkey1`'s `handprint`). [T43]
 *  The bee's line said "no deja huellas" while the clue was a bird
 *  footprint stand-in; with the real handprint it names the hand. */
const MONKEY_CLUE_HINT: Readonly<Partial<Record<ZooAnimalId, string>>> = {
  erizo: 'El erizo no come bananas: no fue él.',
  abeja: 'La abeja no tiene manos: no fue ella.',
}

/** Which of `monkey1`/`monkey2`'s own two clue kinds rules out which
 *  fallback distractor — pairwise distinct, `cases.test.ts`'s own generic
 *  invariant restated for this progress-resolved branch. Matches
 *  `levels/catalog.ts`'s `monkey1` (`handprint`) / `monkey2` (`banana`)
 *  exactly. */
const MONKEY_CLUE_VERDICT: Readonly<Partial<Record<ZooAnimalId, ClueKind>>> = {
  erizo: 'banana',
  abeja: 'handprint',
}

/** Ordered cases, duck first (design.md §1; the user's binding decision 3). */
export const DETECTIVE_CASES: readonly DetectiveCase[] = [
  {
    id: 'duck',
    form: 'new-silhouettes',
    culprit: 'pato',
    options: ['pato', 'vaca', 'gato'],
    // [T21] `feather`/`droplet`, not the pre-T21 `feather`/`bubble`: `bubble`
    // is `docs/19` §3's own clue for the FISH case (burbuja/gota in the same
    // laguna), and reusing it here would let the same picture rule out a
    // different animal in two adjacent cases — confusing for a five-year-old
    // even though nothing here technically forbids it. `droplet` is the
    // duck's own "salió del agua chorreando" beat (`docs/19` §3, the pato
    // row's own flavour line) and a cat is exactly the animal that is never
    // dripping wet, so it reads as a real deduction rather than an arbitrary
    // rule. `webfoot` and `breadcrumb` never appear in `ruledOutBy` — this
    // repo's own invariant (`cases.test.ts`, "webfoot and breadcrumb rule
    // nobody out") bans either from ever discriminating. [T40] One clue per
    // pistas level: the duck's four traces take four levels, and the two
    // non-ruling ones sit on the chip row without ruling anybody out.
    // [T43] Redrawn per `docs/22`: puddle (C1) for the droplet, seeds (C5)
    // for the corn, the yellow duck feather (C2) for the hen's green one,
    // and a new webbed print (C3) under the same `webfoot` kind. The
    // verdicts keep their meaning: a cow has no feathers, a cat does not
    // come out of the water.
    ruledOutBy: { vaca: 'duckFeather', gato: 'puddle' },
    hint: {
      vaca: 'La vaca no tiene plumas: no fue ella.',
      gato: 'El gato no vino mojado: no fue él.',
    },
    trailIds: ['duck-trail1', 'duck-trail5', 'duck-trail2', 'duck-trail6'],
  },
  {
    id: 'hen',
    form: 'new-silhouettes',
    culprit: 'gallina',
    options: ['gallina', 'pato', 'vaca', 'gato'],
    ruledOutBy: { pato: 'footprint', vaca: 'feather', gato: 'corn' },
    hint: {
      pato: 'El pato deja otra huella: la suya es palmeada.',
      vaca: 'La vaca no tiene plumas: no fue ella.',
      gato: 'El gato no come maíz: no fue él.',
    },
    trailIds: DETECTIVE_TRAIL_IDS,
  },
  // [T25, `docs/19` §2.3/§3.2] "La noche y el erizo son un solo caso
  // repartido en dos aventuras: la noche junta las pistas y encuentra al
  // erizo; el erizo es el rescate." This case is the FIRST half — closed by
  // `night3` (`zoo/adventures.ts`'s `night.deduction.after`), it routes into
  // `night4`, where the curled erizo is the reveal-grid's own find.
  //
  // `options`/`ruledOutBy` below are the ORDINARY, always-expected lineup —
  // `zoo/sectors.ts`'s own `nocturna.unlockedWhen: isFiled('llama-peak4')`
  // makes it structurally impossible to reach `night1` in ordinary play
  // before `duck`, `sheep` AND `llama` are all fully recovered, so `pato`/
  // `oveja` are the two REAL discards nearly every child ever sees. This
  // static entry is what `cases.test.ts`'s generic structural invariants
  // check; the LIVE lineup `Deduction.tsx` actually renders is
  // `resolveCase`'s own progress-aware substitute, below — a `?debug`-seeded
  // or otherwise non-linear session still gets two animals the child has
  // genuinely met, never a placeholder it has never seen.
  {
    id: 'night',
    form: 'rescued-silhouettes',
    culprit: 'erizo',
    options: ['erizo', 'pato', 'oveja'],
    // No clue rules either of these out — see `rescuedDistractors`'s own
    // header. Left empty rather than filled with a `ClueKind` that would say
    // something false about why the case closes.
    ruledOutBy: {},
    rescuedDistractors: NIGHT_DISCARD_PRIORITY,
    hint: {
      pato: '¿El pato? No: el pato ya está en su laguna.',
      oveja: '¿La oveja? No: la oveja ya está en su ladera.',
      llama: '¿La llama? No: la llama ya está en la cumbre.',
      vaca: 'Esa vaca no vive en este zoológico: no fue ella.',
      gato: 'Ese gato no vive en este zoológico: no fue él.',
    },
    // T25 (`docs/19` §3.2): the leaf (`night1`), the bitten apple (`night2`)
    // and the mushroom (`night3`). [T43] `docs/20` B12 delivered the apple
    // and the mushroom; until then the leaf and the stone stood in for them.
    // [T44, `docs/21` N2] + the hedgehog's prints, followed by torchlight
    // on `night-rastro` (`docs/22` C7). The chip shows the print itself.
    clueArt: [
      SECTOR_ADVENTURE_ART.leaf,
      SECTOR_ADVENTURE_ART.apple,
      SECTOR_ADVENTURE_ART.mushroom,
      CLUE_ART.hedgehogPrint.art.earned,
    ],
    trailIds: ['night1', 'night2', 'night3', 'night-rastro'],
  },
  // [T26, `docs/19` §2.3/§3] Recipe A's third case, closed by `f2-agua2`
  // (`zoo/adventures.ts`'s `fish.deduction.after`), routing into `f2-agua3`
  // (the fish family, `LevelConfig.collect`). The prólogo left three
  // enclosures empty — `pez`/`tortuga`/`mono` (`docs/18` §4.5) — and the
  // laguna's own bubbles ask "¿de qué recinto se escaparon?": the lineup is
  // the three enclosure SIGNS, not three animal silhouettes (`optionArt`'s
  // own header).
  {
    id: 'fish',
    form: 'signs',
    culprit: 'pez',
    options: ['pez', 'tortuga', 'mono'],
    // No `ClueKind` rules `tortuga`/`mono` out — the bubble/scale clues this
    // case's own pistas levels carry (`trailIds`, below) say "a pond animal
    // came this way", not "not a turtle, not a monkey". The dismissal is
    // read off the SIGN itself (a turtle's sign is not the fish's sign), the
    // same "no clue behind this dismissal" shape `rescuedDistractors`
    // already models for the night case — reused here for a DIFFERENT
    // reason (neither `tortuga` nor `mono` is rescued yet: `docs/19` §2.3's
    // own recorrido has `peces` (#8) BEFORE `tortugas` (#10) and `monos`
    // (#11)), but the exact same mechanical exemption: nothing in
    // `ruledOutBy` would be honest for either.
    ruledOutBy: {},
    rescuedDistractors: ['tortuga', 'mono'],
    optionArt: { pez: SIGN_ART.fish, tortuga: SIGN_ART.turtles, mono: SIGN_ART.monkeys },
    hint: {
      tortuga: '¿El cartel de las tortugas? No: ahí no hay burbujas.',
      mono: '¿El cartel de los monos? No: los monos no nadan.',
    },
    // [T44, `docs/21` N3] + `f2-buceo`'s seaweed, a third distinct trace.
    trailIds: ['f2-guirnalda', 'f2-agua2', 'f2-buceo'],
  },
  // [T27, `odd/tasks/prewriting-stage-completion.md`, `docs/19` §2.3/§3 monos
  // row] The last of the four complete cases (duck, night, fish, monkeys —
  // `docs/19` §2.3's own binding decision). Closed by `monkey2`
  // (`zoo/adventures.ts`'s `monkeys.deduction.after`), routing into
  // `monkey3`/`monkey4`, where the recovered monkey family is gathered.
  //
  // `options`/`ruledOutBy`/`hint` below are the ORDINARY, always-expected
  // lineup — `zoo/journey.ts`'s own `JOURNEY` order plays `hedgehog`
  // (erizo, stop 9) and `bee` (abeja, stop 11) both well before `monkey1`
  // (the last stop, 17), and `bosque`'s own `adventureIds` puts `bee1..4`
  // immediately before `monkey1..4` in the SAME sector — so an ordinary
  // playthrough has genuinely met and rescued both distractors by the time
  // this case opens, the same "nearly every child ever sees this" argument
  // `night`'s own header makes for pato/oveja. `resolveMonkeysCase`, below,
  // is the live, progress-aware substitute `Deduction.tsx` actually renders
  // (`resolveCase`) — the one place this ordinary assumption can fall back
  // to a real clue-based verdict instead, for a `?debug`-seeded or
  // otherwise non-linear session that reaches `bosque` (unlocked by
  // `snake4` alone, `zoo/sectors.ts`) before `hedgehog4` is filed.
  {
    id: 'monkeys',
    form: 'rescued-silhouettes',
    culprit: 'mono',
    options: ['mono', 'erizo', 'abeja'],
    ruledOutBy: {},
    rescuedDistractors: MONKEY_DISTRACTORS,
    hint: MONKEY_RESCUED_HINT,
    // [T43] `monkey1` carries the monkey's handprint (`docs/22` C8) and
    // `monkey2` a banana (C12); they were the `footprint`/`corn` stand-ins
    // until the art landed. NEVER `feather` — a case whose answer is
    // "mono" showing a feather teaches the wrong animal, not merely the
    // wrong OBJECT (`levels/catalog.ts`'s monkey family header). Never
    // `webfoot`/`breadcrumb` either — this file's own "webfoot and breadcrumb
    // rule nobody out" invariant (`cases.test.ts`) bans either from ever
    // being a `ruledOutBy` verdict, in this case or any other.
    // [T44, `docs/21` N4] + `monkey-lianas`' banana peels (`docs/22` C11).
    // The verdicts below still name only `monkey1`/`monkey2`'s kinds: a
    // peel says a monkey ate a banana, which the banana already says.
    trailIds: ['monkey1', 'monkey2', 'monkey-lianas'],
  },
  // [T45, `docs/21` N5; the author's decision of 2026-10-02] The sheep's own
  // case, closed by `sheep-lana` (`zoo/adventures.ts`'s
  // `sheep.deduction.after`), routing into `sheep-hill1`, where the sheep are
  // gathered on the hills. A COMPARISON: the child collected tufts of wool
  // and picks, from three samples, the one that is the same — the wool, a
  // duck's feather (`docs/22` C2) or cat fur (no art yet, see
  // `CAT_FUR_SAMPLE_ART`). No second clue kind backs either dismissal, so
  // `ruledOutBy` stays empty; a `comparison` case's distractors are ruled
  // out by the picture itself (`cases.test.ts`), and `hint` says why.
  {
    id: 'sheep',
    form: 'comparison',
    question: '¿De quién es esta lana?',
    culprit: 'oveja',
    options: ['oveja', 'pato', 'gato'],
    ruledOutBy: {},
    optionArt: {
      oveja: CLUE_ART.wool.art.earned,
      pato: CLUE_ART.duckFeather.art.earned,
      gato: CAT_FUR_SAMPLE_ART,
    },
    hint: {
      pato: 'Eso es una pluma de pato: no es lana.',
      gato: 'Eso es pelo de gato: no es lana.',
    },
    trailIds: ['sheep-lana'],
  },
  // [T45, `docs/21` N6] The turtles' own case, closed by `turtle-huellas`,
  // routing into `turtle1`. A comparison too: three PRINTS side by side
  // (`optionArt`), and the child picks the one that matches the print just
  // collected. The duck's webbed print (`docs/22` C3) and the hen's three
  // toes (`huella negra.png`) are ruled out by the picture, like the sheep's
  // samples, and `hint` says why each print is not the one.
  {
    id: 'turtles',
    form: 'comparison',
    question: '¿De quién es esta huella?',
    culprit: 'tortuga',
    options: ['tortuga', 'pato', 'gallina'],
    ruledOutBy: {},
    optionArt: {
      tortuga: CLUE_ART.turtlePrint.art.earned,
      pato: CLUE_ART.webfoot.art.earned,
      gallina: CLUE_ART.footprint.art.earned,
    },
    hint: {
      pato: 'Esa es la huella del pato: tiene los dedos unidos. No es esta.',
      gallina: 'Esa es la huella de la gallina: tres dedos finitos. No es esta.',
    },
    trailIds: ['turtle-huellas'],
  },
]

/**
 * The `monkeys` case's live lineup framing, resolved from progress
 * (`odd/tasks/prewriting-stage-completion.md` T27: "erizo and abeja may be
 * 'already rescued' discards like the night case... if they are rescued by
 * then; otherwise plain distractors"). Unlike `resolveNightDiscards`, WHO
 * appears never changes — only HOW each of the two fixed distractors is
 * dismissed: `rescuedDistractors` narrows to only the ones actually
 * rescued, and any NOT yet rescued gains a real `ruledOutBy` verdict (one
 * of the case's own two clue kinds) plus the clue-based hint instead of the
 * "ya rescatado" one.
 */
export function resolveMonkeysCase(
  kase: DetectiveCase,
  isRescued: (animal: ZooAnimalId) => boolean,
): DetectiveCase {
  const rescuedDistractors = MONKEY_DISTRACTORS.filter((animal) => isRescued(animal))
  const ruledOutBy: Partial<Record<ZooAnimalId, ClueKind>> = {}
  const hint = { ...kase.hint }
  for (const animal of MONKEY_DISTRACTORS) {
    if (isRescued(animal)) {
      hint[animal] = MONKEY_RESCUED_HINT[animal]
    } else {
      ruledOutBy[animal] = MONKEY_CLUE_VERDICT[animal]
      hint[animal] = MONKEY_CLUE_HINT[animal]
    }
  }
  return { ...kase, rescuedDistractors, ruledOutBy, hint }
}

/**
 * The night case's two live discard slots, computed from progress rather
 * than hardcoded (`odd/tasks/prewriting-stage-completion.md` T25: "the
 * discard option must be an animal the child has actually rescued by then
 * ... encoded so it's computed from progress"). `isRescued` is a predicate,
 * not `Records` itself, so this stays a pure, zoo-independent function —
 * `zoo/adventures.ts`'s own `isRescued(records, animal)` is the real
 * predicate every caller (`screen/GameScreen.tsx`) passes in.
 *
 * Always returns two DISTINCT animals: `NIGHT_DISCARD_PRIORITY`'s trailing
 * `vaca`/`gato` pass the filter unconditionally (own header), so the
 * filtered list can never come up short of two.
 */
export function resolveNightDiscards(
  isRescued: (animal: ZooAnimalId) => boolean,
): readonly [ZooAnimalId, ZooAnimalId] {
  const eligible = NIGHT_DISCARD_PRIORITY.filter(
    (animal) => NIGHT_DISCARD_FALLBACK.includes(animal) || isRescued(animal),
  )
  return [eligible[0], eligible[1]]
}

/** The night case's live lineup: the erizo (always) plus its two
 *  progress-resolved discards, in that order — matching every other case's
 *  own "culprit first" `options` convention (`duck`, `hen`, above). */
export function nightCaseOptions(isRescued: (animal: ZooAnimalId) => boolean): readonly ZooAnimalId[] {
  return ['erizo', ...resolveNightDiscards(isRescued)]
}

/**
 * The case `Deduction.tsx` should actually render for the CURRENT `Records`
 * — the STATIC `DETECTIVE_CASES` entry for every case but `night`, whose own
 * `options` are progress-resolved instead (`nightCaseOptions`, above).
 * `screen/GameScreen.tsx` calls this once, at the point it builds the
 * `kase` prop, rather than every case having to know how to resolve itself.
 */
export function resolveCase(
  kase: DetectiveCase,
  isRescued: (animal: ZooAnimalId) => boolean,
): DetectiveCase {
  if (kase.id === 'night') return { ...kase, options: nightCaseOptions(isRescued) }
  // [T27] `monkeys`' own progress-resolved framing (`resolveMonkeysCase`,
  // above) — unlike `night`, `options` never changes; only `rescuedDistractors`/
  // `ruledOutBy`/`hint` do.
  if (kase.id === 'monkeys') return resolveMonkeysCase(kase, isRescued)
  return kase
}

/** The case's clue kinds, in play order. Throws on a trail authored without a
 *  clue — the same failure `caseState.railSlots` already raises by name.
 *  `[]` for a case that supplies its own chip art directly (`clueArt`,
 *  above) — there is no `ClueKind` to derive, by design, not by omission.
 *  One kind per trail (T40): a case with four clues has four pistas
 *  levels. */
export function clueKindsOf(kase: DetectiveCase): readonly ClueKind[] {
  if (kase.clueArt) return []
  return kase.trailIds.map((id) => {
    const clue = getLevel(id).clue
    if (!clue) throw new Error(`Rastro sin pista: ${id}`)
    return clue.kind
  })
}

/** The persisted pseudo-id that records "this case was solved" (D2). */
export function caseSolvedId(caseId: string): string {
  return `${caseId}-deduce`
}

export function caseOf(levelId: string): DetectiveCase | undefined {
  return DETECTIVE_CASES.find((k) => k.trailIds.includes(levelId))
}

/** FNV-1a, 32-bit: a stable number from a case id. */
function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32: a tiny seeded PRNG, so a shuffle is the same on every render
 *  and every reload. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Salt for {@link lineupOrder}'s seed — chosen so the six journey cases'
 *  culprits land in varied positions: journey order duck 0, sheep 1, night
 *  2, fish 1, turtles 2, monkeys 1 (`cases.test.ts` pins it). */
const LINEUP_SALT = 'lineup-10'

/**
 * [T46] The order `Deduction.tsx` shows a case's options in. Every case
 * lists its culprit FIRST in `options` (a registry convention several
 * resolvers rely on), and showing that order as-is made the card position
 * itself a tell. This is a fixed permutation per case — a Fisher-Yates
 * shuffle seeded by the case id, so it never changes between renders,
 * reloads, tests and captures — applied by position, so a progress-resolved
 * lineup (the night's discards) keeps the same shape. `options` itself, and
 * every contract built on it, are unchanged.
 */
export function lineupOrder(kase: Pick<DetectiveCase, 'id' | 'options'>): readonly ZooAnimalId[] {
  const order = [...kase.options]
  const random = seededRandom(hashId(`${LINEUP_SALT}:${kase.id}`))
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}
