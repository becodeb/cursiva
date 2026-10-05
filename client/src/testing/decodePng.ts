// Test-only PNG decoding, shared by the suites that read the shipped art
// (`detective/artHierarchy.test.ts`, `screen/bubbleArt.test.ts`). Vite's
// `import.meta.glob(..., { query: '?inline' })` hands each file over as a
// `data:` URL (`@types/node` is not a dependency, so no `node:fs`);
// `inlinedPng` turns that URL into an RGBA raster.
export interface Raster {
  w: number
  h: number
  /** RGBA, row-major, 4 bytes per pixel. */
  px: Uint8Array
}

/** `Uint8Array<ArrayBuffer>`, spelled out, because the default parameter is
 * `ArrayBufferLike` and `BlobPart` will not accept a view that might be backed
 * by a `SharedArrayBuffer`. Every array here is freshly allocated, so pinning
 * the buffer type is a statement of fact rather than a cast. */
export type Bytes = Uint8Array<ArrayBuffer>

export function base64ToBytes(b64: string): Bytes {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function inflate(data: Bytes): Promise<Bytes> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

/** Decode one 8-bit RGB/RGBA non-interlaced PNG. Authored ImageGen sources
 * are RGB while pipeline outputs are RGBA; normalize both to RGBA so the
 * source-canvas and pass-through checks compare pixels, not file encoding. */
export async function decodePng(bytes: Bytes): Promise<Raster> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let w = 0
  let h = 0
  let channels = 0
  const idat: Uint8Array[] = []
  let pos = 8 // past the 8-byte signature
  while (pos < bytes.length) {
    const len = view.getUint32(pos)
    const tag = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8))
    const body = bytes.subarray(pos + 8, pos + 8 + len)
    if (tag === 'IHDR') {
      w = view.getUint32(pos + 8)
      h = view.getUint32(pos + 12)
      const [depth, colour, , , interlace] = body.subarray(8)
      if (depth !== 8 || (colour !== 2 && colour !== 6) || interlace !== 0) {
        throw new Error(`unsupported PNG: depth ${depth}, colour type ${colour}`)
      }
      channels = colour === 2 ? 3 : 4
    } else if (tag === 'IDAT') {
      idat.push(body)
    } else if (tag === 'IEND') {
      break
    }
    pos += 12 + len
  }
  const merged: Bytes = new Uint8Array(idat.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const chunk of idat) {
    merged.set(chunk, at)
    at += chunk.length
  }
  const raw = await inflate(merged)

  const sourceStride = w * channels
  const decoded = new Uint8Array(sourceStride * h)
  let src = 0
  for (let y = 0; y < h; y++) {
    const filter = raw[src++]
    const row = y * sourceStride
    for (let x = 0; x < sourceStride; x++) {
      const a = x >= channels ? decoded[row + x - channels] : 0
      const b = y > 0 ? decoded[row - sourceStride + x] : 0
      const c = x >= channels && y > 0 ? decoded[row - sourceStride + x - channels] : 0
      const v = raw[src + x]
      let out: number
      if (filter === 0) out = v
      else if (filter === 1) out = v + a
      else if (filter === 2) out = v + b
      else if (filter === 3) out = v + ((a + b) >> 1)
      else if (filter === 4) out = v + paeth(a, b, c)
      else throw new Error(`unknown PNG filter ${filter}`)
      decoded[row + x] = out & 0xff
    }
    src += sourceStride
  }
  if (channels === 4) return { w, h, px: decoded }
  const px = new Uint8Array(w * h * 4)
  for (let sourceAt = 0, targetAt = 0; sourceAt < decoded.length; sourceAt += 3, targetAt += 4) {
    px[targetAt] = decoded[sourceAt]
    px[targetAt + 1] = decoded[sourceAt + 1]
    px[targetAt + 2] = decoded[sourceAt + 2]
    px[targetAt + 3] = 255
  }
  return { w, h, px }
}

/** Decodes a `?inline` PNG import (a base64 `data:` URL). */
export async function inlinedPng(dataUrl: string): Promise<Raster> {
  return decodePng(base64ToBytes(dataUrl.split(',')[1]))
}
