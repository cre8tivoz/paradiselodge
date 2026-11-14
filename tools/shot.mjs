#!/usr/bin/env node
/**
 * Capture a named shot to shots/<name>.png.
 *
 *   node tools/shot.mjs           # shots/1a.png
 *   node tools/shot.mjs --shot=1a --out=shots/1a.png
 */
import { closeBrowser, launchBrowser } from './browser.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
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
const SHOTS = args.shots ? String(args.shots).split(',').map((s) => s.trim()).filter(Boolean) : [SHOT]
const OUT = resolve(args.out ?? `shots/${SHOT}.png`)
const TIMEOUT = Number(args.timeout ?? 120000)
const SETTLE = Number(args.settle ?? (process.platform === 'linux' ? 2 : 60))
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

const browser = await launchBrowser(['--force-device-scale-factor=1'])

const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
})

const logs = []
page.on('console', (m) => {
  const text = `[${m.type()}] ${m.text()}`
  logs.push(text)
  console.log(text)
})
page.on('pageerror', (e) => {
  const text = `[pageerror] ${e.message}`
  logs.push(text)
  console.error(text)
})

let failed = null
try {
  await page.goto(`http://localhost:${PORT}/?capture=1&pause=1&shot=${encodeURIComponent(SHOTS[0])}`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUT,
  })

  await page.waitForFunction('window.__READY__ === true', null, { timeout: TIMEOUT })

  for (const shotName of SHOTS) {
    const outPath = SHOTS.length === 1 && args.out ? resolve(String(args.out)) : resolve(`shots/${shotName}.png`)
    mkdirSync(dirname(outPath), { recursive: true })

    const applied = await page.evaluate(
      ({ s, settle }) => {
        const result = window.__APPLY_SHOT__ ? window.__APPLY_SHOT__(s) : 'no-shot-api'
        const L = window.__lodge
        if (typeof L?.step === 'function') {
          for (let i = 0; i < settle; i += 1) {
            L.step(0.016, false)
          }
        }
        return result
      },
      { s: shotName, settle: SETTLE },
    )
    logs.push(`[shot] ${applied}`)

    // Explicit single render after camera/preset sync, so shadows and the last
    // camera sync land before the PNG is written. Dusk draws through its
    // composer; a bare renderer.render would wipe the grade off the canvas.
    const dataUrl = await page.evaluate(() => {
      const L = window.__lodge
      if (typeof L?.dusk?.render === 'function') {
        L.dusk.render()
      } else if (typeof L?.post?.render === 'function') {
        L.post.render()
      } else if (L?.grade && L?.scene && L?.camera && L?.renderer) {
        L.grade.render(L.renderer, L.scene, L.camera)
      } else if (L?.renderer && L?.scene && L?.camera) {
        L.renderer.render(L.scene, L.camera)
      }
      const canvas = document.querySelector('canvas#game')
      return canvas instanceof HTMLCanvasElement ? canvas.toDataURL('image/png') : null
    })

    if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
      writeFileSync(outPath, Buffer.from(base64, 'base64'))
    } else {
      await page.screenshot({ path: outPath, type: 'png', timeout: 120000 })
    }

    if (!existsSync(outPath)) throw new Error(`screenshot missing at ${outPath}`)
    console.log(`wrote ${outPath}`)
  }
} catch (err) {
  failed = err
  console.error(err)
  if (logs.length) console.error(logs.slice(-40).join('\n'))
} finally {
  await closeBrowser(browser, page, server)
}

process.exit(failed ? 1 : 0)
