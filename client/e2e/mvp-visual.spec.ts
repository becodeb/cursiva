import { expect, test, type Page, type TestInfo } from '@playwright/test'

export const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  landscape: { width: 844, height: 390 },
  portrait: { width: 390, height: 844 },
} as const

type VisualStateName = 'start' | 'partial' | 'error' | 'success' | 'map-return'
type ViewportName = keyof typeof VIEWPORTS

type VisualState = {
  name: VisualStateName
  url: string
  assert: (page: Page) => Promise<void>
  prepare?: (page: Page) => Promise<void>
}

const GLASS_REVEAL_TILE = '#64726b'
const EVIDENCE_ROOT = 'mvp-visual-matrix'

const levelUrl = (suffix = '') => `/index.html?dev&nivel=glass1${suffix}`

export const VISUAL_STATES: readonly VisualState[] = [
  {
    name: 'start',
    url: levelUrl(),
    assert: async (page) => {
      await assertLevelShell(page)
      await expectRevealTileCount(page, 60)
    },
  },
  {
    name: 'partial',
    url: levelUrl('&debug=revelado:45'),
    assert: async (page) => {
      await assertLevelShell(page)
      await expectRevealTileCount(page, 30)
    },
  },
  {
    name: 'error',
    url: '/index.html?dev&nivel=f1-libre',
    prepare: drawShortAttempt,
    assert: async (page) => {
      await assertLevelShell(page)
      await expect(page.getByLabel('Resultado del intento')).toContainText(/camino|tranquilo|dedo|parejo|flecha/i)
      await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    },
  },
  {
    name: 'success',
    url: levelUrl('&debug=revelado:100'),
    assert: async (page) => {
      await assertLevelShell(page)
      await expectRevealTileCount(page, 0)
    },
  },
  {
    name: 'map-return',
    url: levelUrl(),
    prepare: async (page) => {
      await page.getByRole('button', { name: /volver/i }).click()
    },
    assert: assertZooMap,
  },
]

for (const [viewportName, viewport] of Object.entries(VIEWPORTS) as Array<[ViewportName, (typeof VIEWPORTS)[ViewportName]]>) {
  test.describe(`mvp visual matrix / ${viewportName}`, () => {
    test.use({ viewport })

    for (const state of VISUAL_STATES) {
      test(`${state.name} @ ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
        await page.goto(state.url)
        await state.prepare?.(page)
        await state.assert(page)
        await captureEvidence(page, testInfo, state.name, viewportName)
      })
    }
  })
}

async function assertLevelShell(page: Page): Promise<void> {
  await expect(page.locator('main.cv-play')).toBeVisible()
  await expect(page.getByRole('button', { name: /volver/i })).toBeVisible()
  await expect(page.locator('.cv-sheet svg')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Borrar' })).toBeVisible()
}

async function assertZooMap(page: Page): Promise<void> {
  await expect(page.locator('main.cv-zoo')).toBeVisible()
  await expect(page.getByLabel('El zoológico del Pulpito')).toBeVisible()
}

async function expectRevealTileCount(page: Page, expected: number): Promise<void> {
  await expect.poll(() => revealTileCount(page)).toBe(expected)
}

async function revealTileCount(page: Page): Promise<number> {
  return page.locator('rect').evaluateAll((rects, fill) =>
    rects.filter((rect) => rect.getAttribute('fill')?.toLowerCase() === fill).length,
    GLASS_REVEAL_TILE,
  )
}

async function drawShortAttempt(page: Page): Promise<void> {
  const sheet = page.locator('.cv-sheet svg')
  await expect(sheet).toBeVisible()
  const box = await sheet.boundingBox()
  if (!box) throw new Error('Trace sheet was not measurable')
  const x = box.x + box.width * 0.5
  const y = box.y + box.height * 0.5
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 6, y + 6, { steps: 2 })
  await page.mouse.up()
}

async function captureEvidence(
  page: Page,
  testInfo: TestInfo,
  state: VisualStateName,
  viewport: ViewportName,
): Promise<void> {
  const file = testInfo.outputPath(EVIDENCE_ROOT, `${viewport}-${state}.png`)
  await page.screenshot({ path: file, animations: 'disabled' })
  testInfo.attachments.push({ name: `${viewport}-${state}`, path: file, contentType: 'image/png' })
}
