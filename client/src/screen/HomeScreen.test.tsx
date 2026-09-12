import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HomeScreen from './HomeScreen'
import { auditCaptions } from '../detective/captionAudit'
import { DETECTIVE_TRAIL_IDS, DUCK_TRAIL_IDS, EMPTY_RECORD, type LevelRecord } from '../game/types'
import type { Records } from '../home/caseState'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

const render = (records: Records = {}) =>
  renderToString(<HomeScreen records={records} onEnter={() => {}} />)

/** Visible copy, with tags and the scoped `<style>` block stripped. The style
 * block is markup, not something a child can read off the screen. */
function visibleText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('HomeScreen (docs/10 §3, §7: what this screen is NOT)', () => {
  it('shows no text whatsoever — no title, no button copy, not the word cursiva', () => {
    const text = visibleText(render())
    expect(text).toBe('')
  })

  it('every word (if any) carries its own image — captioned-art invariant, checked not granted', () => {
    const html = render()
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('renders no `url(#…)` reference — the ban that hydrates blank on real devices', () => {
    const html = render()
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<defs')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<pattern')
  })
})

describe('HomeScreen (the office)', () => {
  it('draws the octopus exactly once — modes are objects composed onto it', () => {
    const html = render()
    expect(html.match(/\/art\/home-octopus\.png/g)).toHaveLength(1)
  })

  it('draws the desk, and the glass as the continue control', () => {
    const html = render()
    expect(html).toContain('/art/home-desk.png')
    expect(html).toContain('/art/carrier-lens.png')
  })

  it('never shows the trail-carrier octopus — that one is already holding a glass', () => {
    expect(render()).not.toContain('/art/carrier-octopus.png')
  })

  it('ships no pencil or map: their modes do not exist yet', () => {
    const html = render()
    expect(html).not.toContain('mode-pencil')
    expect(html).not.toContain('mode-map')
  })

  it('gives the ground both layers, so the office is the same place as a trail', () => {
    const html = render()
    expect(html).toContain('/art/ground-grass-')
    expect(html).toContain('/art/ground-mud-')
  })
})

describe('HomeScreen (the case state is REAL, not decorative)', () => {
  // [case-registry-and-captions, Phase 6] The home now shows the ACTIVE case
  // (design.md §1) — a fresh child's active case is the DUCK's (id "duck",
  // clued webfoot/breadcrumb/bubble/feather), not the hen's, because the duck
  // is first in `DETECTIVE_CASES` (the user's binding decision 3).
  it('a fresh child sees the DUCK case: four drained clues and an unlit lamp', () => {
    const html = render()
    expect(html).toContain('/art/lamp-off.png')
    expect(html).not.toContain('/art/lamp-on.png')
    for (const kind of ['webfoot', 'breadcrumb', 'bubble', 'feather']) {
      expect(html, kind).toContain(`/art/clue-${kind}-drained.png`)
      expect(html, kind).not.toContain(`/art/clue-${kind}-earned.png`)
    }
  })

  it("shows a filed clue in the duck case's earned colour and leaves the others drained", () => {
    const html = render(filed(DUCK_TRAIL_IDS[0], DUCK_TRAIL_IDS[2]))
    expect(html).toContain('/art/clue-webfoot-earned.png')
    expect(html).toContain('/art/clue-bubble-earned.png')
    expect(html).toContain('/art/clue-breadcrumb-drained.png')
    expect(html).toContain('/art/clue-feather-drained.png')
  })

  it('lights the lamp only once the WHOLE active case is collected', () => {
    const html = render(filed(...DUCK_TRAIL_IDS))
    expect(html).toContain('/art/lamp-on.png')
    expect(html).not.toContain('/art/lamp-off.png')
  })

  it("filing every one of the HEN's trails does not light the duck case's own lamp — the two never cross-light", () => {
    const html = render(filed(...DETECTIVE_TRAIL_IDS))
    expect(html).toContain('/art/lamp-off.png')
    expect(html).not.toContain('/art/lamp-on.png')
  })
})

describe('HomeScreen (motion)', () => {
  it('moves exactly one thing by itself: the glass', () => {
    const html = render()
    expect(html.match(/cv-home-pulse/g)?.filter((m) => m === 'cv-home-pulse')).toBeTruthy()
    // One element carries the class (the keyframes name and the rule in the
    // scoped stylesheet account for the other occurrences).
    expect(html.match(/class="cv-home-pulse"/g)).toHaveLength(1)
  })

  it('honours prefers-reduced-motion', () => {
    expect(render()).toContain('prefers-reduced-motion')
  })
})
