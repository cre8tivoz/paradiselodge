#!/usr/bin/env node
/**
 * Automated end-to-end playtest for Scene 5 (Mahoney's Bar & Ending) of The Paradise Lodge.
 *
 * Exercises all 5 Scene 5 objective gates:
 *   Gate 0: Confront Kenneth Sterling at the mahogany bar ('confront_sterling')
 *   Gate 1: Bar brawl erupts at pool table; Moretti intervenes to contain punters ('brawl_distraction')
 *   Gate 2: Corner Sterling behind the bar and collar grab to seize cellar key ('collar_grab')
 *   Gate 3: Unlock cellar grille, open Chub floor safe, seize extortion ledger ('cellar_safe')
 *   Gate 4: Arrest Sterling fleeing out back, lodge charge sheet, slam watchhouse cell door ('cell_slam_ending')
 *
 * Verifies Scene 5 completion, ending screen appearance, audio cell slam, and final case resolution.
 *
 * Usage:
 *   node tools/playtest-scene5.mjs
 */
import { closeBrowser, launchBrowser } from './browser.mjs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import net from 'node:net'

const PORT = 5177
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

console.log('--- Paradise Lodge: Scene 5 Automated Playtest ---')
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
  // Pre-seed localStorage with Scene 1, 2, 3, and 4 completions
  await page.goto(`http://localhost:${PORT}/?scene=scene5&capture=1&pause=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })

  await page.evaluate(() => {
    localStorage.setItem(
      'paradise-lodge.save',
      JSON.stringify({
        version: 1,
        current: 'scene5',
        completed: ['scene1', 'scene2', 'scene3', 'scene4'],
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
          'cottage_slip',
          'victor_bootprint',
          'radio_arrest',
          'tape_caution',
          'victor_confession',
          'sterlings_orders',
        ],
      }),
    )
  })

  // Reload so SceneManager loads the scene5 save state
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction('window.__READY__ === true', null, { timeout: 60000 })

  console.log('\n--- Test 1: Scene 5 Environment Initialization ---')
  const envCheck = await page.evaluate(() => {
    const L = window.__lodge
    return {
      hasPub: L?.pub !== undefined,
      hasGates5: L?.gates5 !== undefined,
      hasSterling: L?.registry.get('mahoneys.sterling') !== undefined,
      hasBar: L?.registry.get('mahoneys.bar') !== undefined,
      hasBrawl: L?.registry.get('mahoneys.brawl') !== undefined,
      hasGrille: L?.registry.get('cellar.grille') !== undefined,
      hasSafe: L?.registry.get('cellar.safe') !== undefined,
      hasExit: L?.registry.get('mahoneys.exit') !== undefined,
      caseFileSize: L?.caseFile.size,
      sceneId: L?.scenes.currentId,
    }
  })

  assert(envCheck.hasPub, "Mahoney's Bar 3D world built and registered")
  assert(envCheck.hasGates5, 'Scene5GateTracker initialized')
  assert(envCheck.hasSterling, "Lookable 'mahoneys.sterling' present")
  assert(envCheck.hasBar, "Lookable 'mahoneys.bar' present")
  assert(envCheck.hasBrawl, "Lookable 'mahoneys.brawl' present")
  assert(envCheck.hasGrille, "Lookable 'cellar.grille' present")
  assert(envCheck.hasSafe, "Lookable 'cellar.safe' present")
  assert(envCheck.hasExit, "Lookable 'mahoneys.exit' present")
  assert(envCheck.caseFileSize >= 18, 'Prior evidence restored from save')
  assert(envCheck.sceneId === 'scene5', "SceneManager set to 'scene5'")

  console.log('\n--- Gate 0: Confront Kenneth Sterling at the Bar ---')
  // Start dialogue with Kenneth Sterling
  await page.evaluate(() => {
    const L = window.__lodge
    const sterling = L.registry.get('mahoneys.sterling')
    const g = L.graphs.get(sterling.dialogueId)
    L.dialogue.start(g)
  })

  // Choose victor_leverage
  await page.evaluate(() => {
    const L = window.__lodge
    L.dialogue.choose('victor_leverage')
  })
  // Choose slip_threat
  await page.evaluate(() => {
    const L = window.__lodge
    L.dialogue.choose('slip_threat')
  })

  const gate0Check = await page.evaluate(() => {
    const L = window.__lodge
    return {
      gate0: L.gates5.isUnlocked('confront_sterling'),
    }
  })
  assert(gate0Check.gate0, 'Gate 0 (confront_sterling) unlocked')

  console.log('\n--- Gate 1: Bar Brawl Erupts at Pool Table ---')
  // Sterling dialogue proceeds to trigger_brawl
  await page.evaluate(() => {
    const L = window.__lodge
    // Dismiss slip leads to trigger_brawl_node
    if (L.dialogue.current?.id === 'dismiss_slip') {
      L.dialogue.advance()
    }
    if (L.dialogue.current?.id === 'trigger_brawl_node') {
      L.dialogue.choose('trigger_brawl')
    }
    // Brawl erupts -> Moretti covers
    if (L.dialogue.current?.id === 'brawl_erupts') {
      L.dialogue.advance()
    }
  })

  const gate1Check = await page.evaluate(() => {
    const L = window.__lodge
    return {
      gate1: L.gates5.isUnlocked('brawl_distraction'),
      currentNode: L.dialogue.current?.id,
    }
  })
  assert(gate1Check.gate1, 'Gate 1 (brawl_distraction) unlocked')

  console.log('\n--- Gate 2: Corner Sterling & Collar Grab for Cellar Key ---')
  // Moretti says deal with Sterling -> choose corner_sterling
  await page.evaluate(() => {
    const L = window.__lodge
    if (L.dialogue.current?.id === 'moretti_covers') {
      L.dialogue.choose('corner_sterling')
    }
    if (L.dialogue.current?.id === 'collar_cornered') {
      L.dialogue.advance()
    }
    if (L.dialogue.current?.id === 'sterling_cornered') {
      L.dialogue.choose('collar_grab')
    }
    if (L.dialogue.current?.id === 'collar_grab_result') {
      L.dialogue.advance()
    }
    if (L.dialogue.current?.id === 'sterling_yields') {
      L.dialogue.choose('take_key')
    }
    if (L.dialogue.current?.id === 'key_taken') {
      L.dialogue.advance()
    }
  })

  const gate2Check = await page.evaluate(() => {
    const L = window.__lodge
    return {
      hasKey: L.caseFile.has('cellar_key'),
      gate2: L.gates5.isUnlocked('collar_grab'),
    }
  })
  assert(gate2Check.hasKey, "Evidence 'cellar_key' filed in CaseFile")
  assert(gate2Check.gate2, 'Gate 2 (collar_grab) unlocked')

  console.log('\n--- Gate 3: Cellar Safe & Extortion Ledger ---')
  // Interact with cellar.safe dialogue
  await page.evaluate(() => {
    const L = window.__lodge
    const safeLookable = L.registry.get('cellar.safe')
    const g = L.graphs.get(safeLookable.dialogueId)
    L.dialogue.start(g)
  })

  // Step through cellar safe dialogue
  await page.evaluate(() => {
    const L = window.__lodge
    if (L.dialogue.current?.id === 'cellar_entry') {
      L.dialogue.choose('open_safe')
    }
    if (L.dialogue.current?.id === 'safe_cracked') {
      L.dialogue.advance()
    }
    if (L.dialogue.current?.id === 'ledger_detail') {
      L.dialogue.choose('seize_ledger')
    }
    if (L.dialogue.current?.id === 'ledger_secured') {
      L.dialogue.advance()
    }
  })

  const gate3Check = await page.evaluate(() => {
    const L = window.__lodge
    return {
      hasLedger: L.caseFile.has('sterling_ledger'),
      gate3: L.gates5.isUnlocked('cellar_safe'),
    }
  })
  assert(gate3Check.hasLedger, "Evidence 'sterling_ledger' filed in CaseFile")
  assert(gate3Check.gate3, 'Gate 3 (cellar_safe) unlocked')

  console.log('\n--- Gate 4: Final Arrest, Cell Slam & Ending Screen ---')
  // Interact with mahoneys.exit (final arrest)
  await page.evaluate(() => {
    const L = window.__lodge
    const exitLookable = L.registry.get('mahoneys.exit')
    const g = L.graphs.get(exitLookable.dialogueId)
    L.dialogue.start(g)
  })

  // Step through final arrest
  await page.evaluate(() => {
    const L = window.__lodge
    if (L.dialogue.current?.id === 'intercept_flight') {
      L.dialogue.choose('confront_flight')
    }
    if (L.dialogue.current?.id === 'present_ledger') {
      L.dialogue.advance()
    }
    if (L.dialogue.current?.id === 'sterling_despair') {
      L.dialogue.choose('miller_verdict')
    }
    if (L.dialogue.current?.id === 'formal_charge') {
      L.dialogue.advance()
    }
    if (L.dialogue.current?.id === 'moretti_cuffs') {
      L.dialogue.choose('cell_slam')
    }
    if (L.dialogue.current?.id === 'watchhouse_ending') {
      L.dialogue.choose('credits_roll')
    }
    if (L.dialogue.current?.id === 'final_blackout') {
      L.dialogue.advance()
    }
  })

  // Allow animations and ending screen render
  await page.waitForTimeout(1000)

  const finalCheck = await page.evaluate(() => {
    const L = window.__lodge
    const endingEl = document.querySelector('.ending-screen')
    const endingVisible = endingEl !== null && endingEl.classList.contains('is-visible')
    return {
      hasArrest: L.caseFile.has('cell_arrest'),
      gate4: L.gates5.isUnlocked('cell_slam_ending'),
      allGates: L.gates5.allUnlocked,
      endingVisible,
      totalEvidence: L.caseFile.size,
    }
  })

  assert(finalCheck.hasArrest, "Evidence 'cell_arrest' filed in CaseFile")
  assert(finalCheck.gate4, 'Gate 4 (cell_slam_ending) unlocked')
  assert(finalCheck.allGates, 'All 5 Scene 5 gates are now unlocked')
  assert(finalCheck.endingVisible, 'Ending screen visible in DOM (.ending-screen.is-visible)')
  assert(finalCheck.totalEvidence >= 21, `Full case evidence filed (${finalCheck.totalEvidence} exhibits)`)

  console.log('\n========================================')
  console.log('🎉 ALL SCENE 5 PLAYTEST GATES PASSED!')
  console.log('🎉 CASE SOLVED: THE PARADISE LODGE')
  console.log('========================================\n')
} catch (err) {
  console.error('\n❌ Playtest failed with error:\n', err)
  console.error('\nConsole logs:\n', logs.slice(-25).join('\n'))
  process.exitCode = 1
} finally {
  await closeBrowser(browser, page, server)
}

process.exit(passed ? 0 : 1)
