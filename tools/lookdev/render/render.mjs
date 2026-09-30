// Deterministic capture in headless Chrome + SwiftShader WebGL2 (same approach as the valley project).
// Usage: QS="shot=reception-rosie" node render/render.mjs still out/name.png
//        QS="shot=walk" node render/render.mjs frames <start> <end> <workers> <outdir>
//        QS="shot=..." node render/render.mjs bench out/bench-<shot>.json
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mode, a1, a2, a3, a4] = process.argv.slice(2);
const PORT = 8600 + Math.floor(Math.random() * 300);
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const QS = process.env.QS || '';
async function openPage() {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 1800000,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1920,1080', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1920, height: 1080 } });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || process.env.VERBOSE) console.log('[console]', m.text().slice(0, 1500)); });
  await page.goto(`http://127.0.0.1:${PORT}/${process.env.PAGE || 'index.html'}?${QS}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 1800000, polling: 500 });
  return { browser, page };
}
const t0 = Date.now();
const save = (file, url) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
try {
  if (mode === 'still') {
    const { browser, page } = await openPage();
    console.log('loaded', (Date.now() - t0) / 1000, 's');
    const a = Date.now(); save(a1, await page.evaluate(() => window.__renderFrame(0)));
    console.log('rendered', a1, Date.now() - a, 'ms');
    await browser.close();
  } else if (mode === 'bench') {
    const { browser, page } = await openPage();
    const r = await page.evaluate(() => window.__bench(2));
    r.renderer = await page.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    fs.writeFileSync(a1, JSON.stringify(r, null, 2)); console.log(JSON.stringify(r));
    await browser.close();
  } else if (mode === 'frames') {
    const start = +a1, end = +a2, workers = +a3 || 1; const out = a4; fs.mkdirSync(out, { recursive: true });
    const todo = []; for (let n = start; n < end; n++) if (!fs.existsSync(`${out}/f${String(n).padStart(4, '0')}.png`)) todo.push(n);
    console.log('frames to render', todo.length);
    let next = 0, done = 0; const per = [];
    await Promise.all(Array.from({ length: workers }, async () => {
      const { browser, page } = await openPage();
      while (next < todo.length) {
        const n = todo[next++]; const a = Date.now();
        save(`${out}/f${String(n).padStart(4, '0')}.png`, await page.evaluate((n) => window.__renderFrame(n), n));
        per.push(Date.now() - a); done++;
        if (done % 20 === 0) console.log(`${done}/${todo.length} frames, elapsed ${((Date.now() - t0) / 1000).toFixed(0)}s, wall/frame ${((Date.now() - t0) / 1000 / done).toFixed(2)}s`);
      }
      await browser.close();
    }));
    const secs = (Date.now() - t0) / 1000;
    fs.writeFileSync(`${out}/../render-stats.json`, JSON.stringify({ frames: todo.length, workers, wallSeconds: secs, meanPageMs: per.reduce((a, b) => a + b, 0) / Math.max(1, per.length) }, null, 2));
    console.log('done', secs, 's');
  }
} finally { server.kill(); }
