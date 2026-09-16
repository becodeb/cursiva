// Compile-time proof of `PrologueOpening`'s external contract (design.md D1,
// `prologue-opening` spec "PrologueOpening Is a Single-Responsibility
// Component", assertion 5). A stub that shows nothing but a button calling
// `onDone` type-checks against `PrologueOpeningProps` only while the
// contract stays "show, then report done" — the same `@ts-expect-error`
// precedent `CaptionedArt.test.tsx`'s `label` proof and `GameScreen.test.tsx`'s
// `onExit` proof both already use. `npm run build`'s `tsc --noEmit` is the
// only thing that can see this file's assertion; `npm test` never runs it.
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import type { PrologueOpeningProps } from './PrologueOpening'

describe('PrologueOpening external contract (design.md D1)', () => {
  it('a stub of shape ({ onDone }) => <button onClick={onDone} /> satisfies the props type', () => {
    const stub: (props: PrologueOpeningProps) => ReactElement = ({ onDone }) => (
      <button onClick={onDone} />
    )
    expect(typeof stub).toBe('function')
  })
})
