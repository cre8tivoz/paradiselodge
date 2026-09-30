// Exports the Mixamo-rigged Rosie (idle + walk clips) to a binary glTF via three's GLTFExporter in headless Chrome.
// Usage: node phase2/v2/export_rigged.mjs <out.glb>
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { spawn } from 'child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..'); const PORT = 9300 + Math.floor(Math.random() * 200);
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
try {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 1800000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const p = await b.newPage(); p.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await p.goto(`http://127.0.0.1:${PORT}/phase2/v2/rigcheck.html?clips=../../mixamo/rosie-walk.fbx&w=64&h=64`, { waitUntil: 'load' });
  await p.waitForFunction('window.__ready === true', { timeout: 600000, polling: 500 });
  console.log(JSON.stringify(await p.evaluate(() => window.__info))); console.log(JSON.stringify(await p.evaluate(() => window.__bones)));
  if (process.argv[3] === 'info') { await b.close(); process.exit(0); }
  const url = await p.evaluate(() => window.__exportGLB());
  fs.writeFileSync(process.argv[2], Buffer.from(url.split(',')[1], 'base64')); console.log('wrote', process.argv[2], fs.statSync(process.argv[2]).size);
  await b.close();
} finally { server.kill(); }
