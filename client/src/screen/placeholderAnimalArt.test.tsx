// [T27 follow-up, orchestrator screenshot review 2026-09-27] "The collect
// items for a placeholder animal must render the drawn PawPrintIcon...
// never the placeholder PNG." [T49, `docs/23` D4] The monkey is no longer a
// placeholder: `art-source/mono v2.png` is the real drawing and
// `PLACEHOLDER_ZOO_ANIMALS` is empty. This file now guards the opposite
// direction on every screen a `monkeys` playthrough reaches — the two
// collect levels, the deduction (pre- and post-reveal), the closing beat and
// the map — each shows the REAL monkey (or its silhouette), never the paw
// stand-in that covered for the sign block. Node environment, no DOM:
// `renderToString` on the HTML string, the same convention every other
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
import { ANIMAL_SILHOUETTE_ART, MONKEY_FAMILY_ART, PLACEHOLDER_ZOO_ANIMALS, PROMISED_ANIMAL_ART } from '../detective/assets'
import { ADVENTURES } from '../zoo/adventures'
import type { Records } from '../zoo/sectors'

const MONO_HREF = PROMISED_ANIMAL_ART.mono.href

const noop = (): void => undefined

describe('every monkey screen shows the real drawn monkey (T49)', () => {
  it('mono is no longer a placeholder animal', () => {
    expect(PLACEHOLDER_ZOO_ANIMALS.has('mono')).toBe(false)
  })

  it('monkey3/monkey4 (collect levels): the three poses of the family stand along the route', () => {
    for (const id of ['monkey3', 'monkey4']) {
      const html = renderToString(
        <LevelPlay level={getLevel(id)} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      for (const pose of MONKEY_FAMILY_ART) expect(html, `${id} ${pose.href}`).toContain(pose.href)
    }
  })

  it('the monkeys deduction: mono stands as its own silhouette, then reveals the real monkey', () => {
    const kase = DETECTIVE_CASES.find((k) => k.id === 'monkeys')!
    const open = renderToString(
      <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(open).toContain(ANIMAL_SILHOUETTE_ART.mono!.href)
    expect(open).not.toContain('class="cv-option-paw"')
    const closed: DeductionState = { dismissed: ['erizo', 'abeja'], closed: true }
    const solved = renderToString(
      <DeductionView kase={kase} state={closed} onPick={noop} onExit={noop} />,
    )
    expect(solved).toContain(MONO_HREF)
  })

  it('the monkeys closing beat: the big rescue animal is the real monkey', () => {
    const monkeys = ADVENTURES.find((a) => a.id === 'monkeys')!
    const html = renderToString(
      <AdventureClosing adventure={monkeys} beat={monkeys.closingBeat![0]} onContinue={noop} />,
    )
    expect(html).toContain('class="cv-closing-rescue-animal"')
    expect(html).toContain(MONO_HREF)
  })

  it('the map: the rescued mono stands at the entrance as the real monkey', () => {
    const filed: Records = Object.fromEntries(
      ['monkey1', 'monkey2', 'monkey3', 'monkey4'].map((id) => [
        id,
        { ...EMPTY_RECORD, attempts: 1, approvals: 1 } satisfies LevelRecord,
      ]),
    )
    const html = renderToString(<ZooMap records={filed} onEnter={noop} />)
    expect(html).toContain(MONO_HREF)
  })
})
