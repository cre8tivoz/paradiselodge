import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

export function resolveChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  }
  const bundled = chromium.executablePath()
  if (bundled && existsSync(bundled)) {
    return bundled
  }
  for (const candidate of [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ]) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  return undefined
}

export async function launchBrowser(extraArgs = []) {
  const executablePath = resolveChromiumExecutable()
  return chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
      ...(process.platform === 'darwin'
        ? ['--use-angle=metal']
        : [
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-webgl',
            '--enable-unsafe-swiftshader',
          ]),
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--force-color-profile=srgb',
      '--hide-scrollbars',
      '--mute-audio',
      ...extraArgs,
    ],
  })
}
