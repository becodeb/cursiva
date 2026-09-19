// firstVisit tests (add-caretaker-prologue design.md D2, `prologue-opening`
// spec "The Already-Seen Gate Is Derived, Never a New Persisted Key"). Pure
// over a plain `Records` value, no store, no DOM — the same node-testable
// shape `zoo/prologue.ts`'s `advancePlate` and `GameScreen.ts`'s
// `resolveNextAction` already use.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const gameScreenProbe: { current: Record<string, unknown> | null } = { current: null }
vi.mock('./screen/GameScreen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./screen/GameScreen')>()
  return {
    ...actual,
    default: (props: Record<string, unknown>) => {
      gameScreenProbe.current = props
      return null
    },
  }
})

const zooMapProbe: { current: Record<string, unknown> | null } = { current: null }
vi.mock('./screen/ZooMap', () => ({
  default: (props: Record<string, unknown>) => {
    zooMapProbe.current = props
    return null
  },
}))

import App, { firstVisit, resolveShell } from './App'
import { applyAttempt } from './game/adaptiveTolerance'
import { openProgressStore } from './game/openProgressStore'
import { EMPTY_RECORD, type LevelAttempt, type LevelRecord } from './game/types'
import { LEVEL_PROGRESS_KEY, type StorageLike } from './game/LevelProgressStore'
import { nextAdventure, SECTORS, type Records } from './zoo/sectors'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const approvedAttempt: LevelAttempt = {
  approved: true,
  failedPillar: null,
  accuracy: 100,
  directionOk: true,
  wrongDirection: false,
  fluency: 100,
  extraLifts: 0,
}

let root: Root | null = null

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  gameScreenProbe.current = null
  zooMapProbe.current = null
  vi.unstubAllGlobals()
})

describe('firstVisit (design.md D2: derived, never a new persisted key)', () => {
  it('an empty Records object resolves to "not seen" (true)', () => {
    expect(firstVisit({})).toBe(true)
  })

  it('any existing level record resolves to "seen" (false)', () => {
    expect(firstVisit({ glass1: { ...EMPTY_RECORD, approvals: 0 } })).toBe(false)
    expect(firstVisit({ 'duck-trail4': { ...EMPTY_RECORD, approvals: 1 } })).toBe(false)
  })
})

// The COMPOSITION, which is a different thing from the three ingredients.
// `initialView`, `prologueRoute` and `firstVisit` were each well tested
// alone, but the ORDER they are tried in is what three `prologue-opening`
// scenarios assert — a deep link beats the opening, the dev route beats the
// already-seen gate, and the gate only decides when nothing was asked for.
// Nothing was red if that order changed, so `resolveShell` was split out of
// `initialShell` to be checkable without reaching for `window`.
describe('resolveShell (prologue-opening spec: the routing order)', () => {
  const fresh: Readonly<Record<string, LevelRecord>> = {}
  const played: Readonly<Record<string, LevelRecord>> = {
    glass1: { ...EMPTY_RECORD, approvals: 1 },
  }

  it('a level deep link skips the opening even on a fresh install', () => {
    // A bare level id lands ON the level; only the `intro-` prefix opens
    // its narrative entry. Both forms must beat the opening on a fresh
    // install, which is the whole point of the deep link.
    expect(resolveShell('?nivel=glass1', true, fresh)).toEqual({
      at: 'game',
      initial: { view: 'play', levelId: 'glass1' },
    })
    expect(resolveShell('?nivel=intro-glass1', true, fresh)).toEqual({
      at: 'game',
      initial: { view: 'intro', levelId: 'glass1' },
    })
  })

  it('the dev route reaches the opening even when it has already been seen', () => {
    expect(resolveShell('?nivel=apertura', true, played)).toEqual({ at: 'prologue', from: 0 })
    expect(resolveShell('?nivel=apertura:2', true, played)).toEqual({ at: 'prologue', from: 2 })
  })

  it('the dev route is inert outside dev mode, and the gate decides instead', () => {
    expect(resolveShell('?nivel=apertura', false, played)).toEqual({ at: 'map' })
    expect(resolveShell('?nivel=apertura', false, fresh)).toEqual({ at: 'prologue' })
  })

  it('with nothing asked for, the derived gate alone decides', () => {
    expect(resolveShell('', true, fresh)).toEqual({ at: 'prologue' })
    expect(resolveShell('', true, played)).toEqual({ at: 'map' })
  })
})

describe('App/GameScreen/ZooMap progression composition (finish-mvp-roadmap U2)', () => {
  it('completes duck-trail1, refreshes App map records, and the same sector enters duck-trail2', () => {
    const storage = new MemoryStorage()
    storage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify({ sand4: { ...EMPTY_RECORD, approvals: 1 } }))
    installInteractiveGlobals(storage, '?nivel=duck-trail1')

    const container = fakeElement('div')
    container.ownerDocument = document
    root = createRoot(container as unknown as Element)
    act(() => {
      root!.render(<App />)
    })
    expect(gameScreenProbe.current?.initial).toEqual({ view: 'play', levelId: 'duck-trail1' })

    act(() => {
      const store = openProgressStore()
      store.save('duck-trail1', applyAttempt(store.get('duck-trail1'), approvedAttempt))
      ;(gameScreenProbe.current?.onExit as () => void)()
    })

    const refreshed = zooMapProbe.current?.records as Records
    expect(refreshed['duck-trail1']?.approvals).toBe(1)
    const estanque = SECTORS.find((sector) => sector.id === 'estanque')!
    const next = nextAdventure(estanque, refreshed)
    expect(next).toBe('duck-trail2')

    act(() => {
      ;(zooMapProbe.current?.onEnter as (levelId: string) => void)(next!)
    })

    expect(gameScreenProbe.current?.initial).toEqual({ view: 'play', levelId: 'duck-trail2' })
  })
})

function installInteractiveGlobals(storage: StorageLike, search: string): void {
  const doc = fakeDocument()
  const win = {
    document: doc,
    location: { search },
    localStorage: storage,
    HTMLElement: function HTMLElement() {},
    HTMLIFrameElement: function HTMLIFrameElement() {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  doc.defaultView = win
  vi.stubGlobal('window', win)
  vi.stubGlobal('document', doc)
  vi.stubGlobal('HTMLElement', win.HTMLElement)
  vi.stubGlobal('HTMLIFrameElement', win.HTMLIFrameElement)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
}

type FakeElement = {
  nodeType: number
  nodeName: string
  tagName: string
  ownerDocument?: unknown
  childNodes: unknown[]
  style: Record<string, unknown>
  textContent: string
  appendChild: (child: unknown) => unknown
  insertBefore: (child: unknown) => unknown
  removeChild: (child: unknown) => unknown
  addEventListener: () => void
  removeEventListener: () => void
  setAttribute: () => void
  removeAttribute: () => void
}

function fakeDocument(): FakeElement & {
  defaultView?: unknown
  createElement: (tagName: string) => FakeElement
  createTextNode: (text: string) => FakeElement & { data: string }
  documentElement: FakeElement
  body: FakeElement
} {
  const documentElement = fakeElement('html')
  const body = fakeElement('body')
  return {
    ...fakeElement('#document'),
    nodeType: 9,
    documentElement,
    body,
    createElement: fakeElement,
    createTextNode: fakeText,
  }
}

function fakeText(text: string): FakeElement & { data: string } {
  return { ...fakeElement('#text'), nodeType: 3, data: text }
}

function fakeElement(tagName: string): FakeElement {
  const node: FakeElement = {
    nodeType: 1,
    nodeName: tagName.toUpperCase(),
    tagName: tagName.toUpperCase(),
    childNodes: [] as unknown[],
    style: {},
    textContent: '',
    appendChild(child: unknown): unknown {
      node.childNodes.push(child)
      return child
    },
    insertBefore(child: unknown): unknown {
      node.childNodes.push(child)
      return child
    },
    removeChild(child: unknown): unknown {
      node.childNodes = node.childNodes.filter((item) => item !== child)
      return child
    },
    addEventListener(): void {},
    removeEventListener(): void {},
    setAttribute(): void {},
    removeAttribute(): void {},
  }
  node.ownerDocument = node
  return node
}
