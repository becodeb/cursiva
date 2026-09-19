import assert from 'node:assert/strict'
import path from 'node:path'
import {
  PLAYWRIGHT_OUTPUT_BASE,
  PLAYWRIGHT_REPORT_BASE,
  getPlaywrightRunPaths,
  safeRunId,
} from '../playwright.runPaths.mjs'

const cwd = path.resolve('client')
const fallback = 'fallback-id'

const sanitizationCases = [
  ['parent traversal', '..', 'run-fallback-id'],
  ['dot segment', '.', 'run-fallback-id'],
  ['empty', '', 'run-fallback-id'],
  ['slash traversal', '../outside', 'run-outside'],
  ['backslash traversal', '..\\outside', 'run-outside'],
  ['Unix absolute-like path', '/tmp/outside', 'run-tmp-outside'],
  ['Windows drive path', 'C:\\tmp\\outside', 'run-C--tmp-outside'],
  ['Windows UNC path', '\\\\server\\share\\outside', 'run-server-share-outside'],
  ['Windows device path', '\\\\.\\NUL', 'run-NUL'],
  ['Windows extended device path', '\\\\?\\C:\\tmp\\outside', 'run-C--tmp-outside'],
  ['Windows reserved name', 'CON', 'run-CON'],
  ['Windows reserved name with extension', 'NUL.txt', 'run-NUL.txt'],
  ['trailing dot normalization', 'evidence...', 'run-evidence'],
  ['trailing space normalization', 'evidence   ', 'run-evidence'],
  ['trailing dot and space normalization', 'evidence. ', 'run-evidence'],
  ['normal id', 'u4-review-run', 'run-u4-review-run'],
]

for (const [label, rawRunId, expectedRunId] of sanitizationCases) {
  assert.equal(safeRunId(rawRunId, fallback), expectedRunId, label)
}

for (const [, rawRunId] of sanitizationCases) {
  const paths = getPlaywrightRunPaths(rawRunId, cwd, fallback)
  assertContained(paths.outputDir, path.resolve(cwd, PLAYWRIGHT_OUTPUT_BASE), rawRunId)
  assertContained(paths.reportDir, path.resolve(cwd, PLAYWRIGHT_REPORT_BASE), rawRunId)
  assert.equal(path.basename(paths.outputDir), paths.runId)
  assert.equal(path.basename(paths.reportDir), paths.runId)
  assertSafeLeaf(paths.runId, rawRunId)
}

function assertContained(received, baseDir, rawRunId) {
  const relative = path.relative(baseDir, received)
  assert(
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative),
    `${rawRunId} resolved outside ${baseDir}: ${received}`,
  )
}

function assertSafeLeaf(runId, rawRunId) {
  assert(runId.startsWith('run-'), `${rawRunId} did not receive safe run prefix: ${runId}`)
  assert(!/[\\/:]/.test(runId), `${rawRunId} retained a path separator or drive colon: ${runId}`)
  assert(!/[. ]$/.test(runId), `${rawRunId} retained a trailing dot or space: ${runId}`)
}
