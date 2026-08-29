// Dev-mode flag: on in `vite` dev server (import.meta.env.DEV) or when the URL
// carries `?dev` (so it can be toggled on a production/preview build for demos).
export function isDevMode(): boolean {
  if (typeof window === 'undefined') return false
  return import.meta.env.DEV || new URLSearchParams(window.location.search).has('dev')
}
