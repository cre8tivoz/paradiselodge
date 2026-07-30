#!/usr/bin/env node
/**
 * Per-pixel comparison of two PNGs or two shot directories.
 *
 *   node tools/imagediff.mjs --a=shots/1a.png --b=images/mood/1a-target.png
 *   node tools/imagediff.mjs --a=shots/base --b=shots/opt --tol=2
 *
 * No package.json script — run by hand. Adapted from Claude of Duty
 * (MIT, Copyright 2026 mshumer).
 */
import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  }),
)

const A = resolve(String(args.a ?? ''))
const B = resolve(String(args.b ?? ''))
const TOL = Number(args.tol ?? 0)

if (!A || !B || !existsSync(A) || !existsSync(B)) {
  console.error('usage: node tools/imagediff.mjs --a=<file|dir> --b=<file|dir> [--tol=N] [--write-diff]')
  process.exit(2)
}

function compareFiles(pa, pb, label) {
  const a = PNG.sync.read(readFileSync(pa))
  const b = PNG.sync.read(readFileSync(pb))
  if (a.width !== b.width || a.height !== b.height) {
    return {
      shot: label,
      status: 'SIZE_MISMATCH',
      a: `${a.width}x${a.height}`,
      b: `${b.width}x${b.height}`,
    }
  }
  let diffPx = 0
  let sum = 0
  let maxD = 0
  const total = a.width * a.height
  const diff = args['write-diff'] ? new PNG({ width: a.width, height: a.height }) : null
  for (let i = 0; i < a.data.length; i += 4) {
    const dr = Math.abs(a.data[i] - b.data[i])
    const dg = Math.abs(a.data[i + 1] - b.data[i + 1])
    const db = Math.abs(a.data[i + 2] - b.data[i + 2])
    const d = Math.max(dr, dg, db)
    sum += d
    if (d > maxD) maxD = d
    const changed = d > TOL
    if (changed) diffPx++
    if (diff) {
      diff.data[i] = changed ? 255 : a.data[i] >> 2
      diff.data[i + 1] = changed ? 0 : a.data[i + 1] >> 2
      diff.data[i + 2] = changed ? 255 : a.data[i + 2] >> 2
      diff.data[i + 3] = 255
    }
  }
  if (diff) {
    const out = pb.endsWith('.png') ? pb.replace(/\.png$/, '.diff.png') : join(pb, label.replace(/\.png$/, '.diff.png'))
    writeFileSync(out, PNG.sync.write(diff))
  }
  return {
    shot: label,
    changedPct: +((diffPx / total) * 100).toFixed(4),
    maxDelta: maxD,
    meanDelta: +(sum / total).toFixed(3),
  }
}

const rows = []
if (statSync(A).isFile() && statSync(B).isFile()) {
  rows.push(compareFiles(A, B, basename(A)))
} else {
  const names = readdirSync(A).filter((f) => f.endsWith('.png') && !f.endsWith('.diff.png')).sort()
  for (const n of names) {
    const pb = join(B, n)
    if (!existsSync(pb)) {
      rows.push({ shot: n, status: 'MISSING_IN_B' })
      continue
    }
    rows.push(compareFiles(join(A, n), pb, n))
  }
}

const clean = rows.every(
  (r) => r.status === undefined && (r.changedPct ?? 100) < 0.05 && (r.maxDelta ?? 255) <= Math.max(2, TOL),
)
console.log(JSON.stringify({ a: A, b: B, tol: TOL, withinEpsilon: clean, rows }, null, 2))
process.exit(clean ? 0 : 1)
