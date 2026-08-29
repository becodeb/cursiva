# cursiva client

Vite + React + TypeScript client for the cursiva cursive-handwriting pedagogy
app — frontend-only MVP slice. Product specs live in `docs/` (Spanish):
`docs/02` architecture and trace engine, `docs/04` MVP specification,
`docs/07` modular letters and animation system.

## Setup

npm workspaces monorepo (`server/` drops in later). Install and run from the
repo root:

```sh
npm install
npm run dev       # Vite dev server on http://localhost:5173
npm test          # vitest run — vitest is the FIRST test runner in this repo
npm run build     # tsc --noEmit && vite build
```

## Delivery plan (work units)

1. Scaffold — this PR: workspace, tooling, placeholder shell, smoke test
2. Letters — `LetterConfig` model, registry, seeds `a`/`c`
3. Canvas internals — pointer capture, ink, resample, validation constants
4. Validation — checkpoint order, continuity, geometric score
5. Canvas UI — `TraceCanvas` with ruled guides and real-time ink
6. Modes — guided demo/rail (Mode 1), free trace with tone + star (Mode 2)
7. Progress + main screen — localStorage store, letter picker, family bloom

## Notes

- The canvas layer uses a normalized SVG viewBox `0 0 1000 600` (docs/02).
  This PR only verifies the app shell; canvas units bring their own focused
  tests per module.
- Final UI copy will be Spanish (docs/04); the scaffold placeholder keeps
  neutral English text until the main-screen unit decides UI language.
- LocalStorage persistence keys are namespaced (`cursiva.progress.v1`) — see
  the progress work unit.