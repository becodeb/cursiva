// Caption audit (`case-registry-and-captions` design unit 2, spec:
// detective-mode "Captioned Art Invariant"). String in, strings out — no
// DOM, so it runs the same way inside a `renderToString` node test as it
// would in a browser.
//
// THE INVARIANT: a word on screen is licensed to exist only inside a
// container that ITSELF carries at least one `<image href>` — the picture
// that gives the word its meaning (amended D6: on-screen text is allowed
// again, but only alongside an image, and never as the sole carrier of
// meaning). `CAPTION_CONTAINERS` below is NOT an exemption list: membership
// only grants a container the OPPORTUNITY to pass the audit —
// `imagelessContainers` is what still fails it when the container never
// actually earns that image. `openspec/changes/detective-mode/
// verify-report.md` records five assertions that shipped unable to fail;
// this module's own test suite (rows 2 and 3 especially) exists so this one
// cannot repeat that mistake.
//
// - `cv-captioned`: one picture, one word (`CaptionedArt.tsx`).
// - `pistas-bar`  : the rail — `PISTAS` labels a COLUMN of clue sockets, and
//                   the sockets (plus the lamp) are the images
//                   (`PistasRail.tsx:153` — the class is `pistas-bar`, not
//                   `pistas-rail`).
export const CAPTION_CONTAINERS = ['cv-captioned', 'pistas-bar'] as const

export interface CaptionAudit {
  /** Words inside a licensed container that really does carry an image. */
  captioned: readonly string[]
  /** Words that do not. The invariant this whole module exists to check is
   * that this array is always empty. */
  uncaptioned: readonly string[]
  /** A licensed container that carries no image at all — a failing
   * licence, checked rather than granted. */
  imagelessContainers: readonly string[]
}

/** One open element on the walk. `containerClass` is set only when this
 * element's own `class` attribute names one of `CAPTION_CONTAINERS`; every
 * other element is plain chrome that only ever bubbles its text up to
 * whichever container (if any) is still open around it. */
interface Frame {
  containerClass: string | null
  texts: string[]
  hasImage: boolean
}

/** HTML5 void elements: React (and any spec-compliant serializer) never
 * emits a matching closing tag for these, so the walk below must not push a
 * stack frame expecting one. `image`/`svg` are NOT void — React renders
 * `<image ...></image>` with a real closing tag even though the source JSX
 * has no children, which is exactly why this list is deliberately narrow
 * rather than "any tag with no children". */
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

function classesOf(openingTag: string): string[] {
  const match = openingTag.match(/\sclass="([^"]*)"/)
  return match ? match[1].split(/\s+/).filter(Boolean) : []
}

function carriesHrefOrSrc(openingTag: string): boolean {
  return /\s(?:href|src)="[^"]*"/.test(openingTag)
}

/**
 * Audits a `renderToString` HTML string for the captioned-art invariant.
 * Deliberately a small hand-written tokenizer rather than a real DOM parser:
 * this repo's harness runs in a node environment with NO DOM at all (every
 * `*.test.tsx` in `detective/` and `screen/` already works this way), so the
 * audit has to reason about the raw string the same way every other
 * text-stripping test helper in this codebase already does.
 */
export function auditCaptions(html: string): CaptionAudit {
  // `<style>` blocks are markup, never something a child reads off the
  // screen — the same exclusion every screen's own `visibleText`/`textOf`
  // helper already makes.
  const stripped = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]*class="[^"]*cv-zoo-sr[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/g, '')

  const captioned: string[] = []
  const uncaptioned: string[] = []
  const imagelessContainers: string[] = []
  const stack: Frame[] = []

  function pushText(text: string): void {
    const top = stack[stack.length - 1]
    if (top) top.texts.push(text)
    else uncaptioned.push(text)
  }

  function markImageSeen(): void {
    for (const frame of stack) frame.hasImage = true
  }

  function closeFrame(frame: Frame): void {
    if (frame.containerClass) {
      if (frame.hasImage) captioned.push(...frame.texts)
      else {
        uncaptioned.push(...frame.texts)
        imagelessContainers.push(frame.containerClass)
      }
    } else {
      // Plain chrome, not itself a licensed container: bubble its text up
      // to whichever container (if any) is still open around it.
      for (const text of frame.texts) pushText(text)
    }
  }

  const tokens = stripped.match(/<[^>]+>|[^<]+/g) ?? []
  for (const token of tokens) {
    if (token[0] !== '<') {
      const text = token.trim()
      if (text) pushText(text)
      continue
    }
    if (token.startsWith('</')) {
      const frame = stack.pop()
      if (frame) closeFrame(frame)
      continue
    }
    const tagNameMatch = token.match(/^<([a-zA-Z][a-zA-Z0-9]*)/)
    const tagName = tagNameMatch ? tagNameMatch[1] : ''
    const selfClosing = /\/>\s*$/.test(token) || VOID_TAGS.has(tagName)
    if ((tagName === 'image' || tagName === 'img') && carriesHrefOrSrc(token)) {
      markImageSeen()
    }
    if (!selfClosing) {
      const containerClass =
        classesOf(token).find((c) => (CAPTION_CONTAINERS as readonly string[]).includes(c)) ?? null
      stack.push({ containerClass, texts: [], hasImage: false })
    }
  }
  // Defensive only — real `renderToString` output is always well-formed, so
  // this drains nothing in practice, but a malformed hand-built test string
  // (this module's own `.test.ts`) still gets every open frame accounted
  // for rather than silently dropped.
  while (stack.length > 0) {
    const frame = stack.pop()
    if (frame) closeFrame(frame)
  }

  return { captioned, uncaptioned, imagelessContainers }
}
