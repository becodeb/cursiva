import { expect, test, type Page, type TestInfo } from '@playwright/test'

const VIEWPORTS = { desktop: [1280, 720], landscape: [844, 390], portrait: [390, 844] } as const
const STATES = ['start', 'partial', 'error', 'success', 'map-return'] as const
type ViewportName = keyof typeof VIEWPORTS
type StateName = (typeof STATES)[number]

for (const [name, [width, height]] of Object.entries(VIEWPORTS) as Array<[ViewportName, readonly [number, number]]>) {
  test.describe(`u8 night visual / ${name}`, () => {
    test.use({ viewport: { width, height } })
    for (const state of STATES) test(`${state} @ ${width}x${height}`, async ({ page }, testInfo) => {
      await page.goto('/index.html?dev')
      await page.evaluate(() => localStorage.clear())
      await page.goto('/index.html?dev&nivel=night2')
      if (state === 'partial') await drawPoints(page, [[0.26, 0.3], [0.26, 0.3], [-1, -1]], name)
      if (state === 'error') await drawPoints(page, [[0.26, 0.3], [0.3, 0.34]], name)
      if (state === 'success' || state === 'map-return') await drawPoints(page, [[0.26, 0.3], [0.74, 0.7]], name, 1)
      if (state === 'map-return') await page.getByRole('button', { name: /volver/i }).click()
      await assertState(page, state, name)
      await capture(page, testInfo, state, name)
    })
  })
}

async function assertState(page: Page, state: StateName, viewport: ViewportName): Promise<void> {
  if (state === 'map-return') {
    await expect(page.locator('main.cv-zoo')).toBeVisible()
    await expect(page.getByRole('status')).toContainText(/sectores abiertos/)
    return
  }
  await expect(page.locator('main.cv-play')).toBeVisible()
  await expect(page.getByRole('button', { name: /volver/i })).toBeVisible()
  if (viewport === 'portrait') {
    await expect(page.getByRole('status').filter({ hasText: /girá el dispositivo/i })).toBeVisible()
    await expect(page.locator('.cv-sheet svg')).toBeHidden()
    return
  }
  await expect(page.locator('.cv-sheet svg')).toBeVisible()
  const hints = page.locator('[data-night-visible-hint]')
  if (state === 'success') await expect(hints).toHaveCount(0)
  else expect(await hints.count()).toBeGreaterThan(0)
  if (state === 'partial') await expect(page.locator('[data-night-torch]')).toBeVisible()
  if (state === 'error') {
    await expect(page.locator('[data-night-discovery]')).toHaveCount(1)
    await expect(page.getByLabel('Resultado del intento')).toContainText(/Volvé a alumbrar/)
  }
  if (state === 'success') {
    await expect(page.locator('[data-night-discovery]')).toHaveCount(2)
    await expect(page.locator('[data-night-celebration]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  }
}

async function drawPoints(page: Page, points: readonly [number, number][], viewport: ViewportName, steps = 8): Promise<void> {
  if (viewport === 'portrait') await page.setViewportSize({ width: 844, height: 390 })
  const screenPoints = await page.locator('.cv-sheet svg').evaluate((node, pts) => {
    const svg = node as unknown as SVGSVGElement
    const matrix = svg.getScreenCTM()
    if (!matrix) throw new Error('Trace sheet transform was not measurable')
    const box = svg.viewBox.baseVal
    return pts.map(([x, y]) => {
      if (x < 0) return { x: -1, y: -1 }
      const point = svg.createSVGPoint()
      point.x = box.x + box.width * x
      point.y = box.y + box.height * y
      const screen = point.matrixTransform(matrix)
      return { x: screen.x, y: screen.y }
    })
  }, points)
  await page.mouse.move(screenPoints[0].x, screenPoints[0].y)
  await page.mouse.down()
  for (const point of screenPoints.slice(1)) if (point.x >= 0) await page.mouse.move(point.x, point.y, { steps })
  if (!screenPoints.some((point) => point.x < 0)) await page.mouse.up()
  if (viewport === 'portrait') await page.setViewportSize({ width: 390, height: 844 })
}

async function capture(page: Page, testInfo: TestInfo, state: StateName, viewport: ViewportName): Promise<void> {
  await page.screenshot({ path: testInfo.outputPath('u8-night-visual', `${viewport}-${state}.png`), animations: 'disabled' })
}
