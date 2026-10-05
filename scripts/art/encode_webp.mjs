#!/usr/bin/env node
// Re-encode the full-screen sector backdrops as lossy WebP (T50 follow-up,
// `odd/tasks/prewriting-stage-completion.md`).
//
// Run: `node scripts/art/encode_webp.mjs` — `scripts/art/build_art.py` runs it
// as its last step, so a plain `python3 scripts/art/build_art.py` still
// rebuilds everything. Needs the repo's own Playwright (root `node_modules`)
// and the system Chromium (`/usr/bin/chromium`, or `CHROMIUM=<path>`).
//
// WHY A BROWSER. The host has no cwebp, no sharp, no Pillow and no
// ImageMagick (`build_art.py`'s own header). Chromium ships libwebp and
// exposes it through `canvas.toBlob('image/webp', quality)`, and the repo
// already drives that Chromium through Playwright for its browser checks, so
// this adds no dependency. The PNG emitted by `build_art.py` stays the
// measured master: `quiet`/`brightest`/`corridorRows` are sampled from the
// authored source before this step ever runs. What this step adds to each
// manifest entry is the proof that the shipped WebP did not drift from that
// master: the per-pixel luma error after a full decode, and the brightest
// colour of the DECODED file over the same corridor rows, so
// `artManifest.test.ts`/`backdrops.test.ts` can assert the luma laws against
// the bytes a tablet actually receives.
//
// WHICH FILES. Every `sector-*-background` entry (the full-screen backdrops,
// 2-4 MB each as PNG). Nothing else in `client/public/art` is a full-screen
// opaque scene over 500 KB (the zoo map is 128 KB, and stays PNG).
//
// The PNG is deleted once its WebP is written, so `public/art` never ships
// both. Encoding is deterministic for one Chromium build; a different build
// may produce different bytes, which is why the error bounds, not the
// bytes, are what the tests pin.

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'client', 'public', 'art')
const MANIFEST = join(OUT, 'manifest.json')
/** libwebp quality, 0-1. 0.8 keeps the marker outlines clean at 1:1 and 2:1
 * zoom (`capturas/2026-10-05-t50/webp-*`); lower starts to ring around the
 * black contour on the light skies. */
export const WEBP_QUALITY = 0.8
export const BACKDROP_KEY = /^sector-[a-z-]+-background$/

const { chromium } = await import(join(ROOT, 'node_modules', 'playwright', 'index.mjs'))

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const keys = Object.keys(manifest).filter((k) => BACKDROP_KEY.test(k))
if (keys.length === 0) throw new Error('encode_webp: no sector backdrop in manifest.json')

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/usr/bin/chromium',
  args: ['--disable-gpu'],
})
const page = await browser.newPage()

for (const key of keys) {
  const entry = manifest[key]
  const pngPath = join(OUT, `${key}.png`)
  if (!existsSync(pngPath)) {
    throw new Error(`encode_webp: ${key}.png missing — run scripts/art/build_art.py first`)
  }
  const rows = entry.corridorRows ?? { top: 0, bottom: entry.h - 1 }
  const result = await page.evaluate(
    async ({ b64, quality, top, bottom }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const opts = { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }
      const src = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), opts)
      const w = src.width
      const h = src.height
      const a = new OffscreenCanvas(w, h)
      const actx = a.getContext('2d', { alpha: false })
      actx.drawImage(src, 0, 0)
      const blob = await a.convertToBlob({ type: 'image/webp', quality })
      if (blob.type !== 'image/webp') throw new Error(`this Chromium cannot encode WebP (${blob.type})`)
      const back = await createImageBitmap(blob, opts)
      const b = new OffscreenCanvas(w, h)
      const bctx = b.getContext('2d', { alpha: false })
      bctx.drawImage(back, 0, 0)
      const pa = actx.getImageData(0, 0, w, h).data
      const pb = bctx.getImageData(0, 0, w, h).data
      // BT.601 integer luma, the repo's own measure (`palette.ts` `luma`).
      const luma = (r, g, bl) => Math.floor((r * 299 + g * 587 + bl * 114) / 1000)
      const hist = new Uint32Array(256)
      let sum = 0
      let brightest = -1
      let brightestRgb = [0, 0, 0]
      for (let i = 0; i < pa.length; i += 4) {
        const la = luma(pa[i], pa[i + 1], pa[i + 2])
        const lb = luma(pb[i], pb[i + 1], pb[i + 2])
        const e = Math.abs(la - lb)
        hist[e] += 1
        sum += e
        const y = Math.floor(i / 4 / w)
        if (y >= top && y <= bottom && lb > brightest) {
          brightest = lb
          brightestRgb = [pb[i], pb[i + 1], pb[i + 2]]
        }
      }
      const n = w * h
      let acc = 0
      let p99 = 0
      for (let e = 0; e < 256; e++) {
        acc += hist[e]
        if (acc >= 0.99 * n) { p99 = e; break }
      }
      let max = 0
      for (let e = 255; e >= 0; e--) if (hist[e]) { max = e; break }
      const buf = new Uint8Array(await blob.arrayBuffer())
      let bin = ''
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
      const hex = '#' + brightestRgb.map((v) => v.toString(16).padStart(2, '0')).join('')
      return { w, h, webp: btoa(bin), mean: sum / n, p99, max, brightest: hex }
    },
    { b64: readFileSync(pngPath).toString('base64'), quality: WEBP_QUALITY, top: rows.top, bottom: rows.bottom },
  )
  if (result.w !== entry.w || result.h !== entry.h) {
    throw new Error(`encode_webp: ${key} decoded at ${result.w}x${result.h}, manifest says ${entry.w}x${entry.h}`)
  }
  const webp = Buffer.from(result.webp, 'base64')
  writeFileSync(join(OUT, `${key}.webp`), webp)
  unlinkSync(pngPath)
  const pngBytes = entry.bytes
  entry.file = `art/${key}.webp`
  entry.bytes = webp.length
  entry.webp = {
    quality: WEBP_QUALITY,
    pngBytes,
    lumaError: { mean: Math.round(result.mean * 100) / 100, p99: result.p99, max: result.max },
    shippedBrightest: result.brightest,
  }
  console.log(
    `  ${key.padEnd(30)} ${(pngBytes / 1024).toFixed(0).padStart(6)} KB png -> ${(webp.length / 1024).toFixed(0).padStart(5)} KB webp` +
      `  luma err mean ${entry.webp.lumaError.mean} p99 ${result.p99} max ${result.max}`,
  )
}
await browser.close()

// Same shape `build_art.py` writes (`json.dump(..., indent=2, sort_keys=True)`):
// keys sorted at every level, so a rebuild diff stays readable.
const sortKeys = (v) =>
  Array.isArray(v)
    ? v.map(sortKeys)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]))
      : v
writeFileSync(MANIFEST, JSON.stringify(sortKeys(manifest), null, 2) + '\n')
