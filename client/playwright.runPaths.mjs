import path from 'node:path'

export const PLAYWRIGHT_OUTPUT_BASE = 'test-results/playwright-output'
export const PLAYWRIGHT_REPORT_BASE = 'playwright-report'

export function getPlaywrightRunPaths(rawRunId, cwd, fallbackRunId) {
  const runId = safeRunId(rawRunId, fallbackRunId)
  return {
    runId,
    outputDir: resolveContainedRunPath(cwd, PLAYWRIGHT_OUTPUT_BASE, runId),
    reportDir: resolveContainedRunPath(cwd, PLAYWRIGHT_REPORT_BASE, runId),
  }
}

export function safeRunId(rawRunId, fallbackRunId) {
  const fallback = sanitizeRunId(fallbackRunId) || 'fallback'
  const candidate = sanitizeRunId(rawRunId || fallback)
  const body = isDotOnlySegment(candidate) ? fallback : candidate
  return `run-${body.replace(/^run-/, '')}`
}

function sanitizeRunId(value) {
  return value
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
}

function isDotOnlySegment(value) {
  return value.length === 0 || value.replace(/[._-]/g, '').length === 0
}

function resolveContainedRunPath(cwd, baseDir, runId) {
  const basePath = path.resolve(cwd, baseDir)
  const runPath = path.resolve(basePath, runId)
  const relative = path.relative(basePath, runPath)

  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Playwright run path escaped ${baseDir}`)
  }

  return runPath
}
