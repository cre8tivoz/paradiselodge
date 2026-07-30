/**
 * Procedural 33³ colour grading LUT.
 *
 * Ported and retargeted from Claude of Duty (MIT, Copyright 2026 mshumer).
 * Their default was a cool-shadow / warm-highlight shooter grade. This preset
 * is 3pm St Kilda interior: warm highlights, nicotine shadows, mild contrast,
 * so room 1A photographs instead of merely lighting correctly.
 *
 * Chain (display-referred): ASC-CDL → split tone → saturation → highlight
 * desat → filmic S-curve about mid-grey with normalised shoulder.
 */

import {
  ClampToEdgeWrapping,
  Data3DTexture,
  LinearFilter,
  RGBAFormat,
  UnsignedByteType,
} from 'three'

const SIZE = 33

export interface GradePreset {
  readonly slope: readonly [number, number, number]
  readonly offset: readonly [number, number, number]
  readonly power: readonly [number, number, number]
  readonly shadowTint: readonly [number, number, number]
  readonly highlightTint: readonly [number, number, number]
  readonly saturation: number
  readonly contrast: number
  readonly pivot: number
  readonly highlightDesat: number
  readonly toe: number
  readonly shoulder: number
  readonly shoulderSoft: number
}

/** Fixed sun, cream walls, dusty rose — not a modern FPS look. */
export const AFTERNOON_1A: GradePreset = {
  slope: [1.02, 1.0, 0.97],
  offset: [0.008, 0.004, -0.006],
  power: [0.98, 1.0, 1.04],
  // Nicotine in the shade, sun-warm on the highs.
  shadowTint: [0.018, 0.010, -0.012],
  highlightTint: [0.040, 0.018, -0.014],
  saturation: 1.08,
  contrast: 1.18,
  pivot: 0.5,
  highlightDesat: 0.12,
  toe: 0.012,
  shoulder: 0.62,
  shoulderSoft: 1.1,
}

const LUM = [0.2126, 0.7152, 0.0722] as const

interface Shoulder {
  readonly k: number
  readonly s: number
  readonly norm: number
}

function shoulderParams(g: GradePreset): Shoulder {
  const k = Math.min(0.98, Math.max(0.05, g.shoulder))
  const s = Math.max(1e-3, g.shoulderSoft)
  const cMax = g.pivot * Math.pow(1 / g.pivot, g.contrast)
  const norm = 1 - Math.exp(-Math.max(cMax - k, 1e-3) / s)
  return { k, s, norm }
}

function applyGrade(rgb: readonly [number, number, number], g: GradePreset, sh: Shoulder): [number, number, number] {
  let r = Math.pow(Math.max(0, rgb[0] * g.slope[0] + g.offset[0]), g.power[0])
  let gg = Math.pow(Math.max(0, rgb[1] * g.slope[1] + g.offset[1]), g.power[1])
  let b = Math.pow(Math.max(0, rgb[2] * g.slope[2] + g.offset[2]), g.power[2])

  const l = r * LUM[0] + gg * LUM[1] + b * LUM[2]
  const shadowW = Math.pow(1 - Math.min(1, l), 2.2)
  const highW = Math.pow(Math.min(1, l), 2.0)
  r += g.shadowTint[0] * shadowW + g.highlightTint[0] * highW
  gg += g.shadowTint[1] * shadowW + g.highlightTint[1] * highW
  b += g.shadowTint[2] * shadowW + g.highlightTint[2] * highW

  const l2 = r * LUM[0] + gg * LUM[1] + b * LUM[2]
  r = l2 + (r - l2) * g.saturation
  gg = l2 + (gg - l2) * g.saturation
  b = l2 + (b - l2) * g.saturation

  const hd = g.highlightDesat * Math.pow(Math.min(1, Math.max(0, l2)), 3.0)
  r += (l2 - r) * hd
  gg += (l2 - gg) * hd
  b += (l2 - b) * hd

  const scurve = (x: number): number => {
    const t = Math.max(0, x)
    let c = t <= 0 ? 0 : g.pivot * Math.pow(t / g.pivot, g.contrast)
    if (c > sh.k) {
      c = sh.k + (1 - sh.k) * ((1 - Math.exp(-(c - sh.k) / sh.s)) / sh.norm)
    }
    return g.toe + (1 - g.toe) * Math.min(1, Math.max(0, c))
  }

  return [scurve(r), scurve(gg), scurve(b)]
}

export function createGradeLut(preset: GradePreset = AFTERNOON_1A): {
  readonly texture: Data3DTexture
  readonly size: number
} {
  const sh = shoulderParams(preset)
  const n = SIZE
  const data = new Uint8Array(n * n * n * 4)
  let p = 0
  for (let z = 0; z < n; z++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const out = applyGrade([x / (n - 1), y / (n - 1), z / (n - 1)], preset, sh)
        data[p++] = Math.round(Math.min(1, Math.max(0, out[0])) * 255)
        data[p++] = Math.round(Math.min(1, Math.max(0, out[1])) * 255)
        data[p++] = Math.round(Math.min(1, Math.max(0, out[2])) * 255)
        data[p++] = 255
      }
    }
  }

  const texture = new Data3DTexture(data, n, n, n)
  texture.format = RGBAFormat
  texture.type = UnsignedByteType
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.wrapR = ClampToEdgeWrapping
  texture.unpackAlignment = 1
  texture.needsUpdate = true
  texture.name = 'grade-lut-afternoon-1a'
  return { texture, size: n }
}
