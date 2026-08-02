#!/usr/bin/env node
/**
 * Moving-camera frame-time profile for Paradise Lodge.
 *
 * Adapted from Claude of Duty's profiler (MIT, Copyright 2026 mshumer). It
 * reports distributions and shader-program changes because a median alone can
 * hide the first-view stalls that matter in a short authored experience.
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import net from 'node:net'

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/)
    return match ? [match[1], match[2] ?? true] : [arg, true]
  }),
)

const PORT = Number(args.port ?? 5173)
const W = Number(args.w ?? 1512)
const H = Number(args.h ?? 982)
const DPR = Number(args.dpr ?? 2)
const FRAMES = Number(args.frames ?? 600)
const SHOT = String(args.shot ?? 'scene1-exterior')
const ROOT = resolve(import.meta.dirname, '..')

const portOpen = (port) =>
  new Promise((done) => {
    const socket = net.connect({ port, host: '127.0.0.1' }, () => {
      socket.destroy()
      done(true)
    })
    socket.on('error', () => done(false))
    socket.setTimeout(400, () => {
      socket.destroy()
      done(false)
    })
  })

async function ensureServer() {
  if (await portOpen(PORT)) return null
  const server = spawn(
    resolve(ROOT, 'node_modules/.bin/vite'),
    ['--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: ROOT, stdio: 'ignore' },
  )
  for (let attempt = 0; attempt < 160; attempt += 1) {
    await new Promise((done) => setTimeout(done, 250))
    if (await portOpen(PORT)) return server
  }
  server.kill()
  throw new Error('vite failed to start')
}

const server = await ensureServer()
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-angle=metal',
    '--ignore-gpu-blocklist',
    '--mute-audio',
    '--disable-frame-rate-limit',
    '--disable-gpu-vsync',
  ],
})
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: DPR,
})
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})

const bootStart = Date.now()
await page.goto(`http://127.0.0.1:${PORT}/?capture=1&shot=${encodeURIComponent(SHOT)}`, {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
})
await page.waitForFunction('window.__READY__ === true', null, { timeout: 120000 })
const bootMs = Date.now() - bootStart

const samples = await page.evaluate(
  ({ frames, shot }) => {
    window.__APPLY_SHOT__?.(shot)
    const lodge = window.__lodge
    const renderer = lodge.renderer
    const player = lodge.player
    const origin = player.position.clone()
    const out = []
    let previous = performance.now()
    let frame = 0

    return new Promise((done) => {
      const tick = () => {
        const now = performance.now()
        const dt = now - previous
        previous = now
        const phase = frame / 90
        player.place(origin, -2.5 + Math.sin(phase) * 0.22, 0.18 + Math.sin(phase * 0.7) * 0.04)
        out.push({
          frame,
          dt,
          programs: renderer.info.programs?.length ?? 0,
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
        })
        frame += 1
        if (frame >= frames) done(out)
        else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  },
  { frames: FRAMES, shot: SHOT },
)

const warm = samples.slice(Math.min(60, Math.floor(samples.length / 5)))
const times = warm.map((sample) => sample.dt).sort((a, b) => a - b)
const quantile = (value) =>
  Number(times[Math.min(times.length - 1, Math.floor(times.length * value))].toFixed(2))
const median = quantile(0.5)
const hitches = warm
  .filter((sample) => sample.dt > Math.max(median * 2, median + 8))
  .map((sample) => ({ frame: sample.frame, ms: Number(sample.dt.toFixed(1)) }))
  .sort((a, b) => b.ms - a.ms)

const first = warm[0]
const last = warm[warm.length - 1]
console.log(JSON.stringify({
  shot: SHOT,
  bootMs,
  viewport: { width: W, height: H, dpr: DPR },
  sampledFrames: warm.length,
  frameTimeMs: {
    p50: median,
    p95: quantile(0.95),
    p99: quantile(0.99),
    max: quantile(1),
  },
  fps: {
    p50: Math.round(1000 / median),
    p95: Math.round(1000 / quantile(0.95)),
    p99: Math.round(1000 / quantile(0.99)),
  },
  hitches: hitches.slice(0, 12),
  shaderPrograms: {
    start: first.programs,
    end: last.programs,
    compiledDuringProfile: last.programs - first.programs,
  },
  render: {
    calls: [first.calls, last.calls],
    triangles: [first.triangles, last.triangles],
    geometries: [first.geometries, last.geometries],
    textures: [first.textures, last.textures],
  },
  errors,
}, null, 2))

await browser.close()
if (server) server.kill()
if (errors.length > 0) process.exitCode = 1
