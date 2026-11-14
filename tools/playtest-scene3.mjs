#!/usr/bin/env node
/**
 * Automated end-to-end playtest for Scene 3 (Prahran Laneway Chase) of The Paradise Lodge.
 *
 * Exercises all 5 Scene 3 objective gates:
 *   Gate 0: Approach 14 Regent Street worker cottage & find dropped slip
 *   Gate 1: Victor spots Miller and triggers sprint down bluestone laneway
 *   Gate 2: Chase Victor down the narrow alleyway past bins and pallets
 *   Gate 3: Victor vaults corrugated iron fence; examine bootprint in clay mud
 *   Gate 4: Radio exchange with Moretti confirming Victor arrested on Commercial Road
 *
 * Verifies Scene 3 completion, save advancement to 'scene4', and blackout fadeout.
 *
 * Usage:
 *   node tools/playtest-scene3.mjs
 */
import { closeBrowser, launchBrowser } from './browser.mjs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import net from 'node:net'

const PORT = 5175
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
  throw new Error('Vite dev server failed to start')
}

console.log('--- Paradise Lodge: Scene 3 Automated Playtest ---')
const server = await ensureServer()

const browser = await launchBrowser()

const page = await browser.newPage({
  viewport: { width: 1280, height: 960 },
})

const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

let passed = true
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    passed = false
    throw new Error(`Assertion failed: ${message}`)
  } else {
    console.log(`✓ ${message}`)
  }
}

try {
  // Pre-seed localStorage with Scene 1 and Scene 2 completions
  await page.goto(`http://localhost:${PORT}/?scene=scene3&capture=1&pause=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })

  await page.evaluate(() => {
    localStorage.setItem(
      'paradise-lodge.save',
      JSON.stringify({
        version: 1,
        current: 'scene3',
        completed: ['scene1', 'scene2'],
        evidence: [
          'needle',
          'temple',
          'sling',
          'frame',
          'sill',
          'lighter',
          'diary',
          'hammer',
          'hammer_report',
          'rakov_profile',
          'mark_statement',
          'mahoneys_lead',
        ],
      }),
    )
  })

  // Reload to mount Scene 3 with the seeded save state
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__READY__ === true, { timeout: 30000 })

  console.log('\n--- Test 1: Scene 3 Environment Initialization ---')
  const envState = await page.evaluate(() => {
    const L = window.__lodge
    return {
      hasLaneway: L.laneway !== undefined,
      hasGates3: L.gates3 !== undefined,
      hasCommodore: L.registry.get('laneway.commodore') !== undefined,
      hasCottageDoor: L.registry.get('cottage.door') !== undefined,
      hasCottageSlip: L.registry.get('cottage.slip') !== undefined,
      hasLanewayBin: L.registry.get('laneway.bin') !== undefined,
      hasLanewayPallets: L.registry.get('laneway.pallets') !== undefined,
      hasLanewayFence: L.registry.get('laneway.fence') !== undefined,
      hasBootprint: L.registry.get('laneway.bootprint') !== undefined,
      hasRadio: L.registry.get('laneway.radio') !== undefined,
      priorEvidenceCount: L.caseFile.size,
      currentScene: L.scenes.currentId,
    }
  })

  assert(envState.hasLaneway, 'Laneway 3D world built and registered')
  assert(envState.hasGates3, 'Scene3GateTracker initialized')
  assert(envState.hasCommodore, "Lookable 'laneway.commodore' present")
  assert(envState.hasCottageDoor, "Lookable 'cottage.door' present")
  assert(envState.hasCottageSlip, "Lookable 'cottage.slip' present")
  assert(envState.hasLanewayBin, "Lookable 'laneway.bin' present")
  assert(envState.hasLanewayPallets, "Lookable 'laneway.pallets' present")
  assert(envState.hasLanewayFence, "Lookable 'laneway.fence' present")
  assert(envState.hasBootprint, "Lookable 'laneway.bootprint' present")
  assert(envState.hasRadio, "Lookable 'laneway.radio' present")
  assert(envState.priorEvidenceCount >= 12, 'Prior evidence restored from save')
  assert(envState.currentScene === 'scene3', "SceneManager set to 'scene3'")

  // --- Gate 0: Approach Cottage & Find Dropped Slip ---
  console.log('\n--- Gate 0: Approach 14 Regent Street & Examine Dropped Slip ---')
  const g0 = await page.evaluate(() => {
    const L = window.__lodge
    // Player walks up to cottage verandah
    L.player.place(new L.Vector3(-2.2, 0, 6.5), Math.PI, 0)
    L.gates3.update(L.player.position)

    // Examine cottage slip
    L.caseFile.file('cottage_slip', 'cottage.slip')

    return {
      unlocked: L.gates3.has('approach_cottage'),
      hasSlip: L.caseFile.has('cottage_slip'),
    }
  })
  assert(g0.hasSlip, "Evidence 'cottage_slip' filed in CaseFile")
  assert(g0.unlocked, 'Gate 0 (approach_cottage) unlocked')

  // --- Gate 1: Victor Spots Miller and Bolts ---
  console.log('\n--- Gate 1: Victor Spots Miller and Bolts ---')
  const g1 = await page.evaluate(() => {
    const L = window.__lodge
    // Player approaches cottage side gate (Z < 8.5)
    L.player.place(new L.Vector3(0.5, 0, 7.5), Math.PI, 0)
    L.gates3.update(L.player.position)

    return {
      unlocked: L.gates3.has('victor_spotted'),
    }
  })
  assert(g1.unlocked, 'Gate 1 (victor_spotted) unlocked')

  // --- Gate 2: Pursue Victor Down Bluestone Laneway ---
  console.log('\n--- Gate 2: Pursue Victor Down Bluestone Laneway ---')
  const g2 = await page.evaluate(() => {
    const L = window.__lodge
    // Player runs down alleyway past bins and pallets
    L.player.place(new L.Vector3(0.5, 0, -10.0), Math.PI, 0)
    L.laneway.update(1.5, L.player.position)
    L.gates3.update(L.player.position)

    return {
      unlocked: L.gates3.has('laneway_chase'),
    }
  })
  assert(g2.unlocked, 'Gate 2 (laneway_chase) unlocked')

  // --- Gate 3: Victor Vaults Fence & Examine Bootprint ---
  console.log('\n--- Gate 3: Victor Vaults Fence & Examine Bootprint ---')
  const g3 = await page.evaluate(() => {
    const L = window.__lodge
    // Advance time so Victor completes sprint and vaults fence
    for (let i = 0; i < 30; i++) {
      L.laneway.update(0.2, L.player.position)
    }

    // Player reaches fence terminus
    L.player.place(new L.Vector3(0.6, 0, -18.5), Math.PI, 0)
    L.gates3.update(L.player.position)

    // Examine bootprint in clay mud
    L.caseFile.file('victor_bootprint', 'laneway.bootprint')

    return {
      unlocked: L.gates3.has('fence_vault'),
      isVictorOver: L.laneway.isVictorOverFence,
      hasBootprint: L.caseFile.has('victor_bootprint'),
    }
  })
  assert(g3.isVictorOver, 'Victor Rakov vaulted the corrugated iron perimeter fence')
  assert(g3.hasBootprint, "Evidence 'victor_bootprint' filed in CaseFile")
  assert(g3.unlocked, 'Gate 3 (fence_vault) unlocked')

  // --- Gate 4: Radio Arrest Exchange with Moretti ---
  console.log('\n--- Gate 4: Radio Arrest Exchange with Moretti ---')
  const g4 = await page.evaluate(() => {
    const L = window.__lodge
    const radioGraph = L.graphs.get('scene3.radio.arrest')
    L.dialogue.start(radioGraph)

    // Step through radio dialogue choices
    L.dialogue.choose('bring')
    while (L.dialogue.isActive) {
      L.dialogue.advance()
    }

    return {
      unlocked: L.gates3.has('radio_arrest'),
      allUnlocked: L.gates3.allUnlocked,
      hasRadioArrest: L.caseFile.has('radio_arrest'),
    }
  })
  assert(g4.hasRadioArrest, "Evidence 'radio_arrest' filed in CaseFile")
  assert(g4.unlocked, 'Gate 4 (radio_arrest) unlocked')
  assert(g4.allUnlocked, 'All 5 Scene 3 gates are now unlocked')

  // --- Scene Completion & Save Progression ---
  console.log('\n--- Scene Completion: Save Progression & Blackout ---')
  const completed = await page.evaluate(() => {
    const L = window.__lodge
    const saveStr = localStorage.getItem('paradise-lodge.save')
    const parsedSave = saveStr ? JSON.parse(saveStr) : null
    const fadeEl = document.querySelector('.scene-fade')
    const isFadedOut = fadeEl ? fadeEl.classList.contains('is-out') : false

    return {
      sceneManagerComplete: L.scenes.isComplete,
      save: parsedSave,
      isFadedOut,
    }
  })

  assert(completed.sceneManagerComplete, 'SceneManager marked Scene 3 complete')
  assert(completed.save !== null, 'Save data written to localStorage')
  assert(completed.save?.version === 1, 'Save data version is 1')
  assert(completed.save?.current === 'scene4', "Save current scene advances to 'scene4'")
  assert(completed.save?.completed?.includes('scene3'), "Save completed list includes 'scene3'")
  assert(completed.save?.evidence?.includes('cottage_slip'), "Save includes 'cottage_slip'")
  assert(completed.save?.evidence?.includes('victor_bootprint'), "Save includes 'victor_bootprint'")
  assert(completed.save?.evidence?.includes('radio_arrest'), "Save includes 'radio_arrest'")
  assert(completed.isFadedOut, 'Scene exit fade blackout active (.scene-fade.is-out)')

  console.log('\n========================================')
  console.log('🎉 ALL SCENE 3 PLAYTEST GATES PASSED!')
  console.log('========================================\n')
} catch (err) {
  console.error('\nPlaytest error:', err)
  console.error('Recent browser logs:\n' + logs.slice(-25).join('\n'))
  process.exitCode = 1
} finally {
  await closeBrowser(browser, page, server)
}

process.exit(passed ? 0 : 1)
