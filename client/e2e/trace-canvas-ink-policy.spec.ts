import { expect, test } from '@playwright/test'

async function drawMovedStroke(page: import('@playwright/test').Page): Promise<void> {
  const svg = page.locator('svg').first()
  await expect(svg).toBeVisible()
  const box = await svg.boundingBox()
  if (!box) throw new Error('TraceCanvas SVG has no bounding box')
  await page.mouse.move(box.x + 80, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 260, box.y + box.height / 2 + 20, { steps: 6 })
}

test.describe('TraceCanvas inkPolicy pointer lifecycle', () => {
  test('live-only clears the live path on pointerup with default single-stroke capture', async ({ page }) => {
    await page.goto('/trace-canvas-harness.html?policy=live-only')
    const ink = page.locator('path[data-ink-policy="live-only"]')

    await drawMovedStroke(page)
    await expect.poll(() => ink.getAttribute('d')).not.toBe('')

    await page.mouse.up()
    await expect.poll(() => ink.getAttribute('d')).toBe('')
  })

  test('live-only clears the live path on pointercancel', async ({ page }) => {
    await page.goto('/trace-canvas-harness.html?policy=live-only')
    const ink = page.locator('path[data-ink-policy="live-only"]')
    const svg = page.locator('svg').first()

    await drawMovedStroke(page)
    await expect.poll(() => ink.getAttribute('d')).not.toBe('')
    await svg.dispatchEvent('pointercancel', {
      pointerId: 1,
      isPrimary: true,
      pointerType: 'mouse',
      button: 0,
      clientX: 260,
      clientY: 220,
    })

    await expect.poll(() => ink.getAttribute('d')).toBe('')
  })

  test('settled keeps the default single-stroke path visible after pointerup', async ({ page }) => {
    await page.goto('/trace-canvas-harness.html?policy=settled')
    const ink = page.locator('path[data-ink-policy="settled"]')

    await drawMovedStroke(page)
    await expect.poll(() => ink.getAttribute('d')).not.toBe('')
    const beforeUp = await ink.getAttribute('d')

    await page.mouse.up()
    await expect.poll(() => ink.getAttribute('d')).toBe(beforeUp)
  })
})
