#!/usr/bin/env node
/**
 * Automated end-to-end playtest for Scene 4 (The Interrogation Room) of The Paradise Lodge.
 *
 * Exercises all 5 Scene 4 objective gates:
 *   Gate 0: Section 464A Crimes Act formal caution & tape recorder start ('tape_caution')
 *   Gate 1: Confront Victor with hammer murder weapon & forensics report
 *   Gate 2: Confront Victor with bootprint mud matching 1A windowsill
 *   Gate 3: Confront Victor with handwritten slip ("grab the book. S.") -> Victor breaks & confesses burglary
 *   Gate 4: Extract Sterling's location (Mahoney's Bar cellar) & conclude interview ('sterlings_orders')
 *
 * Verifies Scene 4 completion, save advancement to 'scene5', and blackout fadeout.
 *
 * Usage:
 *   node tools/playtest-scene4.mjs
 */
import { closeBrowser, launchBrowser } from './browser.mjs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import net from 'node:net'

const PORT = 5176
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

console.log('--- Paradise Lodge: Scene 4 Automated Playtest ---')
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
  // Pre-seed localStorage with Scene 1, 2, and 3 completions
  await page.goto(`http://localhost:${PORT}/?scene=scene4&capture=1&pause=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })

  await page.evaluate(() => {
    localStorage.setItem(
      'paradise-lodge.save',
      JSON.stringify({
        version: 1,
        current: 'scene4',
        completed: ['scene1', 'scene2', 'scene3'],
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
          'victor_bootprint',
          'cottage_slip',
          'radio_arrest',
        ],
      }),
    )
  })

  // Reload to mount Scene 4 with seeded save
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__READY__ === true, { timeout: 30000 })

  console.log('\n--- Test 1: Scene 4 Environment Initialization ---')
  const envState = await page.evaluate(() => {
    const L = window.__lodge
    return {
      hasInterview: L.interview !== undefined,
      hasGates4: L.gates4 !== undefined,
      hasTape: L.registry.get('interview.tape') !== undefined,
      hasFolder: L.registry.get('interview.folder') !== undefined,
      hasVictor: L.registry.get('interview.victor') !== undefined,
      hasMoretti: L.registry.get('interview.moretti') !== undefined,
      hasDoor: L.registry.get('interview.door') !== undefined,
      priorEvidenceCount: L.caseFile.size,
      currentScene: L.scenes.currentId,
    }
  })

  assert(envState.hasInterview, 'Interview Room 1 3D world built and registered')
  assert(envState.hasGates4, 'Scene4GateTracker initialized')
  assert(envState.hasTape, "Lookable 'interview.tape' present")
  assert(envState.hasFolder, "Lookable 'interview.folder' present")
  assert(envState.hasVictor, "Lookable 'interview.victor' present")
  assert(envState.hasMoretti, "Lookable 'interview.moretti' present")
  assert(envState.hasDoor, "Lookable 'interview.door' present")
  assert(envState.priorEvidenceCount >= 15, 'Prior evidence restored from save')
  assert(envState.currentScene === 'scene4', "SceneManager set to 'scene4'")

  // --- Gate 0: Tape Caution ---
  console.log('\n--- Gate 0: Section 464A Formal Caution & Tape Recorder ---')
  const g0 = await page.evaluate(() => {
    const L = window.__lodge
    const cautionGraph = L.graphs.get('scene4.tape.caution')
    L.dialogue.start(cautionGraph)

    // Advance to choices
    L.dialogue.advance()
    // Choose 'understand'
    L.dialogue.choose('understand')
    // Advance to 'record_on'
    while (L.dialogue.isActive) {
      L.dialogue.advance()
    }

    return {
      unlocked: L.gates4.has('caution_tape'),
      hasCaution: L.caseFile.has('tape_caution'),
    }
  })
  assert(g0.hasCaution, "Evidence 'tape_caution' filed in CaseFile")
  assert(g0.unlocked, 'Gate 0 (caution_tape) unlocked')

  // --- Gate 1: Confront Victor with Hammer Forensics ---
  console.log('\n--- Gate 1: Confront Victor with Hammer Murder Weapon ---')
  const g1 = await page.evaluate(() => {
    const L = window.__lodge
    const victorGraph = L.graphs.get('scene4.victor.interrogation')
    L.dialogue.start(victorGraph)

    // Choose 'hammer'
    L.dialogue.choose('hammer')
    // Step through hammer_ans1, hammer_ans2, hammer_ans3, back to hub
    L.dialogue.advance()
    L.dialogue.advance()
    L.dialogue.advance()
    L.dialogue.advance()

    return {
      unlocked: L.gates4.has('confront_hammer'),
      dialogueActive: L.dialogue.isActive,
      currentNode: L.dialogue.current?.id,
    }
  })
  assert(g1.unlocked, 'Gate 1 (confront_hammer) unlocked')
  assert(g1.currentNode === 'hub', "Dialogue returned to interrogation 'hub'")

  // --- Gate 2: Confront Victor with Bootprint Impressions ---
  console.log('\n--- Gate 2: Confront Victor with Windowsill & Laneway Bootprints ---')
  const g2 = await page.evaluate(() => {
    const L = window.__lodge
    // Choose 'bootprint'
    L.dialogue.choose('bootprint')
    // Step through boot_ans1, boot_ans2, boot_ans3, back to hub
    L.dialogue.advance()
    L.dialogue.advance()
    L.dialogue.advance()
    L.dialogue.advance()

    return {
      unlocked: L.gates4.has('confront_bootprint'),
      currentNode: L.dialogue.current?.id,
    }
  })
  assert(g2.unlocked, 'Gate 2 (confront_bootprint) unlocked')
  assert(g2.currentNode === 'hub', "Dialogue returned to interrogation 'hub'")

  // --- Gate 3: Confront Victor with Slip (Victor Breaks & Confesses) ---
  console.log('\n--- Gate 3: Confront Victor with Handwritten Slip & Confession ---')
  const g3 = await page.evaluate(() => {
    const L = window.__lodge
    // Choose 'slip'
    L.dialogue.choose('slip')
    // Step through slip_break1, slip_break2, slip_break3, slip_break4, back to hub
    L.dialogue.advance()
    L.dialogue.advance()
    L.dialogue.advance()
    L.dialogue.advance()
    L.dialogue.advance()

    return {
      unlocked: L.gates4.has('confront_slip'),
      hasConfession: L.caseFile.has('victor_confession'),
      currentNode: L.dialogue.current?.id,
    }
  })
  assert(g3.hasConfession, "Evidence 'victor_confession' filed in CaseFile")
  assert(g3.unlocked, 'Gate 3 (confront_slip) unlocked')
  assert(g3.currentNode === 'hub', "Dialogue returned to interrogation 'hub'")

  // --- Gate 4: Sterling's Orders & Conclude Interrogation ---
  console.log('\n--- Gate 4: Sterling\'s Location & Conclude Interrogation ---')
  const g4 = await page.evaluate(() => {
    const L = window.__lodge
    // Choose 'sterling'
    L.dialogue.choose('sterling')
    // Step through sterling_ans1, sterling_ans2, back to hub
    L.dialogue.advance()
    L.dialogue.advance()
    L.dialogue.advance()

    const hasOrders = L.caseFile.has('sterlings_orders')

    // Choose 'conclude'
    L.dialogue.choose('conclude')
    // Step through moretti_book -> mahoneys
    while (L.dialogue.isActive) {
      L.dialogue.advance()
    }

    return {
      hasOrders,
      unlocked: L.gates4.has('sterlings_hideout'),
      allUnlocked: L.gates4.allUnlocked,
    }
  })
  assert(g4.hasOrders, "Evidence 'sterlings_orders' filed in CaseFile")
  assert(g4.unlocked, 'Gate 4 (sterlings_hideout) unlocked')
  assert(g4.allUnlocked, 'All 5 Scene 4 gates are now unlocked')

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

  assert(completed.sceneManagerComplete, 'SceneManager marked Scene 4 complete')
  assert(completed.save !== null, 'Save data written to localStorage')
  assert(completed.save?.version === 1, 'Save data version is 1')
  assert(completed.save?.current === 'scene5', "Save current scene advances to 'scene5'")
  assert(completed.save?.completed?.includes('scene4'), "Save completed list includes 'scene4'")
  assert(completed.save?.evidence?.includes('tape_caution'), "Save includes 'tape_caution'")
  assert(completed.save?.evidence?.includes('victor_confession'), "Save includes 'victor_confession'")
  assert(completed.save?.evidence?.includes('sterlings_orders'), "Save includes 'sterlings_orders'")
  assert(completed.isFadedOut, 'Scene exit fade blackout active (.scene-fade.is-out)')

  console.log('\n========================================')
  console.log('🎉 ALL SCENE 4 PLAYTEST GATES PASSED!')
  console.log('========================================\n')
} catch (err) {
  console.error('\nPlaytest error:', err)
  console.error('Recent browser logs:\n' + logs.slice(-25).join('\n'))
  process.exitCode = 1
} finally {
  await closeBrowser(browser, page, server)
}

process.exit(passed ? 0 : 1)
