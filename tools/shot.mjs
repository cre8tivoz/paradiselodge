#!/usr/bin/env node
/**
 * Capture a named shot to shots/<name>.png.
 *
 *   node tools/shot.mjs           # shots/1a.png
 *   node tools/shot.mjs --shot=1a --out=shots/1a.png
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import net from 'node:net'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  }),
)

const PORT = Number(args.port ?? 5173)
const W = Number(args.w ?? 1280)
const H = Number(args.h ?? 960)
const SHOT = String(args.shot ?? '1a')
const OUT = resolve(args.out ?? `shots/${SHOT}.png`)
const TIMEOUT = Number(args.timeout ?? 120000)
const SETTLE = Number(args.settle ?? 60)
const ROOT = resolve(import.meta.dirname, '..')

const portOpen = (port) =>
  new Promise((res) => {
    const s = net.connect({ port, host: 'localhost' }, () => (s.destroy(), res(true)))
    s.on('error', () => res(false))
    s.setTimeout(400, () => (s.destroy(), res(false)))
  })

async function ensureServer() {
  if (await portOpen(PORT)) return null
  const bin = resolve(ROOT, 'node_modules/.bin/vite')
  const p = spawn(bin, ['--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: ROOT,
    stdio: 'ignore',
    env: { ...process.env, VITE_CJS_IGNORE_WARNING: '1' },
  })
  for (let i = 0; i < 160; i++) {
    await new Promise((r) => setTimeout(r, 250))
    if (await portOpen(PORT)) return p
  }
  p.kill()
  throw new Error('vite failed to start')
}

const server = await ensureServer()
mkdirSync(dirname(OUT), { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-angle=metal',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--force-color-profile=srgb',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--mute-audio',
  ],
})

const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
})

const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

let failed = null
try {
  await page.goto(`http://localhost:${PORT}/?capture=1&shot=${encodeURIComponent(SHOT)}`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUT,
  })

  await page.waitForFunction('window.__READY__ === true', null, { timeout: TIMEOUT })

  const applied = await page.evaluate(
    ({ s }) => (window.__APPLY_SHOT__ ? window.__APPLY_SHOT__(s) : 'no-shot-api'),
    { s: SHOT },
  )
  logs.push(`[shot] ${applied}`)

  await page.evaluate(
    (n) =>
      new Promise((done) => {
        let i = 0
        const tick = () => (++i >= n ? done() : requestAnimationFrame(tick))
        requestAnimationFrame(tick)
      }),
    SETTLE,
  )

  // One more explicit render after the settle, so shadows and the last
  // camera sync land before the PNG is written.
  await page.evaluate(() => {
    const L = window.__lodge
    if (L?.renderer && L?.scene && L?.camera) {
      L.renderer.render(L.scene, L.camera)
    }
  })

  await page.screenshot({ path: OUT, type: 'png' })
  if (!existsSync(OUT)) throw new Error(`screenshot missing at ${OUT}`)
  console.log(`wrote ${OUT}`)
} catch (err) {
  failed = err
  console.error(err)
  if (logs.length) console.error(logs.slice(-40).join('\n'))
} finally {
  await browser.close()
  if (server) server.kill()
}

if (failed) process.exit(1)
