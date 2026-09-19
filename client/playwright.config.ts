import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test'
import { getPlaywrightRunPaths } from './playwright.runPaths.mjs'

const PORT = 4173
const HOST = '127.0.0.1'
const runPaths = getPlaywrightRunPaths(
  process.env.PLAYWRIGHT_RUN_ID,
  process.cwd(),
  `${new Date().toISOString()}-${process.pid}`,
)
const browserChannel = process.env.PLAYWRIGHT_CHANNEL
const chromiumUse: PlaywrightTestConfig['use'] = {
  ...devices['Desktop Chrome'],
  ...(browserChannel ? { channel: browserChannel } : {}),
}

export default defineConfig({
  testDir: './e2e',
  outputDir: runPaths.outputDir,
  reporter: [['list'], ['html', { outputFolder: runPaths.reportDir, open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: chromiumUse,
    },
  ],
  webServer: {
    command: `npm run dev -- --host ${HOST} --port ${PORT} --strictPort`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
