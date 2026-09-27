// [T27 follow-up, orchestrator screenshot review 2026-09-27] "The collect
// items for a placeholder animal must render the drawn PawPrintIcon...
// never the placeholder PNG. Put the decision in ONE helper and reuse it
// everywhere. Add a test that no rendered monkey screen contains the
// placeholder file's href."
//
// `mono` is this app's one shipped `PLACEHOLDER_ZOO_ANIMALS` entry
// (`detective/assets.ts`), so this file renders every screen a `monkeys`
// playthrough actually reaches — the two collect levels, the deduction (both
// pre- and post-reveal), the closing beat, and the map once rescued — and
// asserts NONE of them ever emit `/art/animal-mono.png`, the grey sign
// block `isPlaceholderArt` exists to keep off-screen. Node environment, no
// DOM: `renderToString` on the HTML string, the same convention every other
// screen test in this app uses.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import LevelPlay from './LevelPlay'
import { DeductionView, initialDeductionState, type DeductionState } from './Deduction'
import AdventureClosing from './AdventureClosing'
import ZooMap from './ZooMap'
import { getLevel } from '../levels/catalog'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import { DETECTIVE_CASES } from '../detective/cases'
import { PROMISED_ANIMAL_ART } from '../detective/assets'
import { ADVENTURES } from '../zoo/adventures'
import type { Records } from '../zoo/sectors'

/** `mono`'s own colour art — the exact file this whole test exists to keep
 *  off every monkey screen (`PROMISED_ANIMAL_ART.mono`, `ZOO_ANIMAL_ART.mono`'s
 *  own source, `detective/assets.ts`). */
const MONO_PLACEHOLDER_HREF = PROMISED_ANIMAL_ART.mono.href

const noop = (): void => undefined

describe('no rendered monkey screen ever shows the placeholder file directly', () => {
  it('monkey3/monkey4 (collect levels): the badge stands at every crest, never the sign block', () => {
    for (const id of ['monkey3', 'monkey4']) {
      const html = renderToString(
        <LevelPlay level={getLevel(id)} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      expect(html, id).not.toContain(MONO_PLACEHOLDER_HREF)
      // Four items (three crests + the route's end, T40) — the badge stands at
      // every one, not merely at some.
      expect((html.match(/data-cv-picture="true"/g) ?? []).length, id).toBe(4)
    }
  })

  it('the monkeys deduction: mono draws the paw badge before the reveal, real art only once solved', () => {
    const kase = DETECTIVE_CASES.find((k) => k.id === 'monkeys')!
    const open = renderToString(
      <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(open).not.toContain(MONO_PLACEHOLDER_HREF)

    // Solved: mono is revealed, and this IS the one state where its own
    // (still placeholder) colour art legitimately shows — there is nothing
    // else to show for an animal actually caught (this file's own header on
    // `Deduction.tsx`'s `Animal` component). Not a regression this test
    // guards against; recorded here so the state is not mistaken for one.
    const closed: DeductionState = { dismissed: ['erizo', 'abeja'], closed: true }
    const solved = renderToString(
      <DeductionView kase={kase} state={closed} onPick={noop} onExit={noop} />,
    )
    expect(solved).toContain(MONO_PLACEHOLDER_HREF)
  })

  it('the monkeys closing beat: the big rescue animal is the drawn badge, never the sign block', () => {
    const monkeys = ADVENTURES.find((a) => a.id === 'monkeys')!
    const html = renderToString(
      <AdventureClosing adventure={monkeys} beat={monkeys.closingBeat![0]} onContinue={noop} />,
    )
    expect(html).not.toContain(MONO_PLACEHOLDER_HREF)
    expect(html).toContain('class="cv-closing-rescue-animal"')
    expect(html).toContain('data-cv-picture="true"')
  })

  it('the map: the rescued mono stands as the drawn badge at the entrance, never the sign block', () => {
    const filed: Records = Object.fromEntries(
      ['monkey1', 'monkey2', 'monkey3', 'monkey4'].map((id) => [
        id,
        { ...EMPTY_RECORD, attempts: 1, approvals: 1 } satisfies LevelRecord,
      ]),
    )
    const html = renderToString(<ZooMap records={filed} onEnter={noop} />)
    expect(html).not.toContain(MONO_PLACEHOLDER_HREF)
    expect(html).toContain('data-cv-picture="true"')
  })
})
