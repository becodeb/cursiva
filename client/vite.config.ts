import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// vitest is the FIRST test runner in this repository (see client/README.md).
// The `test` block is a workspace-level vitest config; focused unit suites
// for canvas/letters/progress modules arrive with their own work units.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})