#!/usr/bin/env node
/**
 * Automated end-to-end playtest for Scene 2 (The Station) of The Paradise Lodge.
 *
 * Exercises all 5 Scene 2 objective gates:
 *   Gate 0: Drop hammer at Forensics intake hatch
 *   Gate 1: Pour coffee at break bench electric urn
 *   Gate 2: Examine Forensics match report on Miller's desk (Victor Rakov latents)
 *   Gate 3: Query LEAP CRT terminal for Rakov criminal history & Prahran laneway address
 *   Gate 4: Interview Mark in Room 2 (clears Mark, establishes Mahoney's Bar lead)
 *
 * Walks through Moretti's exit theorise conversation ('moretti.station.exit'),
 * verifies localStorage save progression to 'scene3', and checks blackout transition.
 *
 * Usage:
 *   node tools/playtest-scene2.mjs
 */
import { closeBrowser, launchBrowser } from './browser.mjs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import net from 'node:net'

const PORT = 5174
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

console.log('--- Paradise Lodge: Scene 2 Automated Playtest ---')
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
  // Pre-seed localStorage with Scene 1 completion so Scene 2 loads with continuity
  await page.goto(`http://localhost:${PORT}/?scene=scene2&capture=1&pause=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })

  await page.evaluate(() => {
    localStorage.setItem(
      'paradise-lodge.save',
      JSON.stringify({
        version: 1,
        current: 'scene2',
        completed: ['scene1'],
        evidence: ['needle', 'temple', 'sling', 'frame', 'sill', 'lighter', 'diary', 'hammer'],
      }),
    )
  })

  // Reload to pick up save state
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction('window.__READY__ === true', null, { timeout: 60000 })
  console.log('✓ Scene 2 WebGL initialised and window.__lodge ready')

  // Step 0: Check initial Scene 2 state
  const initial = await page.evaluate(() => {
    const L = window.__lodge
    return {
      hasLodge: !!L,
      isScene2: L?.station !== undefined,
      gates2Unlocked: Array.from(L?.gates2?.unlocked ?? []),
      allUnlocked: L?.gates2?.allUnlocked ?? false,
      morettiDialogue: L?.registry?.get('moretti')?.dialogueId,
      priorEvidence: L?.caseFile?.has('hammer'),
    }
  })

  assert(initial.hasLodge, 'window.__lodge exposed in DEV mode')
  assert(initial.isScene2, 'Scene 2 Station level geometry active')
  assert(initial.priorEvidence, 'Scene 1 evidence (hammer) loaded into CaseFile')
  assert(initial.gates2Unlocked.length === 0, 'No Scene 2 gates unlocked initially')
  assert(initial.morettiDialogue === 'moretti.station.standby', "Moretti begins in 'moretti.station.standby' state")

  // --- Gate 0: Deliver Hammer to Forensics Hatch ---
  console.log('\n--- Gate 0: Forensics Hatch Hammer Drop ---')
  const g0 = await page.evaluate(() => {
    const L = window.__lodge
    const hatch = L.registry.get('station.forensics_hatch')
    const graph = L.graphs.get(hatch.dialogueId)
    L.dialogue.start(graph)
    // Choose 'hammer'
    L.dialogue.choose('hammer')
    while (L.dialogue.isActive) {
      L.dialogue.advance()
    }
    return {
      unlocked: L.gates2.has('drop_hammer'),
      hatchDialogue: L.registry.get('station.forensics_hatch')?.dialogueId,
    }
  })
  assert(g0.unlocked, 'Gate 0 (drop_hammer) unlocked after forensics intake')
  assert(g0.hatchDialogue === 'forensics.done', "Forensics hatch dialogue updated to 'forensics.done'")

  // --- Gate 1: Break Station Coffee Urn ---
  console.log('\n--- Gate 1: Coffee Urn ---')
  const g1 = await page.evaluate(() => {
    const L = window.__lodge
    L.gates2.recordCoffee()
    return {
      unlocked: L.gates2.has('coffee_urn'),
    }
  })
  assert(g1.unlocked, 'Gate 1 (coffee_urn) unlocked after pouring coffee')

  // --- Gate 2: Forensics Manila Report (Latents) ---
  console.log('\n--- Gate 2: Forensics Manila Report ---')
  const g2 = await page.evaluate(() => {
    const L = window.__lodge
    L.caseFile.file('hammer_report', 'station.report')
    return {
      unlocked: L.gates2.has('hammer_report'),
      hasEvidence: L.caseFile.has('hammer_report'),
      morettiDialogue: L.registry.get('moretti')?.dialogueId,
    }
  })
  assert(g2.hasEvidence, "Evidence 'hammer_report' filed in CaseFile")
  assert(g2.unlocked, 'Gate 2 (hammer_report) unlocked')
  assert(g2.morettiDialogue === 'moretti.station.interview', "Moretti dialogue updated to 'moretti.station.interview'")

  // --- Gate 3: LEAP CRT Terminal ---
  console.log('\n--- Gate 3: LEAP Terminal Dossier ---')
  const g3 = await page.evaluate(() => {
    const L = window.__lodge
    L.caseFile.file('rakov_profile', 'station.leap')
    return {
      unlocked: L.gates2.has('leap_terminal'),
      hasEvidence: L.caseFile.has('rakov_profile'),
    }
  })
  assert(g3.hasEvidence, "Evidence 'rakov_profile' filed in CaseFile")
  assert(g3.unlocked, 'Gate 3 (leap_terminal) unlocked')

  // --- Gate 4: Mark Interview in Room 2 ---
  console.log('\n--- Gate 4: Mark Interview ---')
  const g4 = await page.evaluate(() => {
    const L = window.__lodge
    while (L.dialogue.isActive) {
      L.dialogue.advance()
    }
    const markGraph = L.graphs.get('mark.interview')
    L.dialogue.start(markGraph)
    // Advance intro -> confirm -> grief -> hub
    L.dialogue.advance() // confirm
    L.dialogue.advance() // grief
    L.dialogue.advance() // hub

    // Topic 1: tuesday
    L.dialogue.choose('tuesday')
    L.dialogue.advance() // tuesday2
    L.dialogue.advance() // tuesday3
    L.dialogue.advance() // tuesday4
    L.dialogue.advance() // back to hub

    // Topic 2: money
    L.dialogue.choose('money')
    L.dialogue.advance() // money2
    L.dialogue.advance() // back to hub

    // Topic 3: alibi
    L.dialogue.choose('alibi')
    L.dialogue.advance() // alibi2
    L.dialogue.advance() // back to hub

    // Topic 4: done
    L.dialogue.choose('done')
    L.dialogue.advance() // mark.end

    while (L.dialogue.isActive) {
      L.dialogue.advance()
    }

    return {
      unlocked: L.gates2.has('mark_interview'),
      allUnlocked: L.gates2.allUnlocked,
      hasStatement: L.caseFile.has('mark_statement'),
      hasMahoneys: L.caseFile.has('mahoneys_lead'),
      morettiDialogue: L.registry.get('moretti')?.dialogueId,
    }
  })
  assert(g4.hasStatement, "Evidence 'mark_statement' filed in CaseFile")
  assert(g4.hasMahoneys, "Evidence 'mahoneys_lead' filed in CaseFile")
  assert(g4.unlocked, 'Gate 4 (mark_interview) unlocked')
  assert(g4.allUnlocked, 'All 5 Scene 2 gates are now unlocked')
  assert(g4.morettiDialogue === 'moretti.station.exit', "Moretti dialogue updated to 'moretti.station.exit'")

  // --- Scene Completion: Moretti Exit Theorise ---
  console.log('\n--- Scene Completion: Moretti Exit Theorise ---')
  const completed = await page.evaluate(() => {
    const L = window.__lodge
    while (L.dialogue.isActive) {
      L.dialogue.advance()
    }

    const exitGraph = L.graphs.get('moretti.station.exit')
    L.dialogue.start(exitGraph)

    // Choice 'run'
    L.dialogue.choose('run')
    // Advance hammer -> link -> address -> rollout -> sir
    while (L.dialogue.isActive) {
      L.dialogue.advance()
    }

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

  assert(completed.sceneManagerComplete, 'SceneManager marked Scene 2 complete')
  assert(completed.save !== null, 'Save data written to localStorage')
  assert(completed.save?.version === 1, 'Save data version is 1')
  assert(completed.save?.current === 'scene3', "Save current scene advances to 'scene3'")
  assert(completed.save?.completed?.includes('scene2'), "Save completed list includes 'scene2'")
  assert(completed.save?.evidence?.includes('hammer_report'), "Save includes 'hammer_report'")
  assert(completed.save?.evidence?.includes('rakov_profile'), "Save includes 'rakov_profile'")
  assert(completed.save?.evidence?.includes('mark_statement'), "Save includes 'mark_statement'")
  assert(completed.save?.evidence?.includes('mahoneys_lead'), "Save includes 'mahoneys_lead'")
  assert(completed.isFadedOut, 'Scene exit fade blackout active (.scene-fade.is-out)')

  console.log('\n========================================')
  console.log('🎉 ALL SCENE 2 PLAYTEST GATES PASSED!')
  console.log('========================================\n')
} catch (err) {
  console.error('\nPlaytest error:', err)
  console.error('Recent browser logs:\n' + logs.slice(-25).join('\n'))
  process.exitCode = 1
} finally {
  await closeBrowser(browser, page, server)
}

process.exit(passed ? 0 : 1)
