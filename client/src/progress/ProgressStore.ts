// ProgressStore contract (progress-store spec, T6.1): per-letter progress
// percentages behind a minimal interface so callers (MainScreen, Bloom) never
// couple to localStorage. `setProgress` persists so a fresh store instance
// reads the same value; implementations own clamping/merge semantics.
export interface ProgressStore {
  getProgress(letterId: string): number
  setProgress(letterId: string, value: number): void
}