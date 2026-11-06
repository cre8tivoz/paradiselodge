#!/usr/bin/env node
/**
 * Automated end-to-end playtest for Scene 1 of The Paradise Lodge.
 *
 * Exercises all 8 objective gates, validates state transitions,
 * walks through dialogue and bagging, triggers Moretti's exit
 * theorise conversation, and verifies save persistence and scene completion.
 *
 * Usage:
 *   node tools/playtest-scene1.mjs
 */
import { chromium } from 'playwright'
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

console.log('--- Paradise Lodge: Scene 1 Automated Playtest ---')
const server = await ensureServer()

const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--ignore-certificate-errors',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--force-color-profile=srgb',
    '--hide-scrollbars',
    '--mute-audio',
  ],
})

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
  await page.goto(`http://localhost:${PORT}/?capture=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })

  await page.waitForFunction('window.__READY__ === true', null, { timeout: 60000 })
  console.log('✓ WebGL scene initialised and window.__lodge ready')

  // Step 0: Check initial state
  const initial = await page.evaluate(() => {
    const L = window.__lodge
    return {
      hasLodge: !!L,
      gatesUnlocked: Array.from(L.gates.unlocked),
      rosieStation: L.rosie.station,
      allUnlocked: L.gates.allUnlocked,
      morettiDialogue: L.registry.get('moretti')?.dialogueId,
    }
  })
  assert(initial.hasLodge, 'window.__lodge exposed in DEV mode')
  assert(initial.gatesUnlocked.length === 0, 'No gates unlocked initially')
  assert(initial.rosieStation === 'reception', "Rosie begins at 'reception'")
  assert(initial.morettiDialogue === 'moretti.standby', "Moretti begins in 'moretti.standby' state")

  // Step 1: Gate 0 - Entry (Crossing the hall threshold)
  console.log('\n--- Gate 0: Entry ---')
  const gate0 = await page.evaluate(() => {
    const L = window.__lodge
    // Place player inside the hall box
    L.player.place(new L.Vector3(0, 0, 2.5), 0, 0)
    L.gates.update(L.player.position)
    return {
      unlocked: L.gates.has('entry'),
      rosieStation: L.rosie.station,
    }
  })
  assert(gate0.unlocked, 'Gate 0 (entry) unlocked on hall entry')
  assert(gate0.rosieStation === 'reception', 'Rosie remains at reception during entry beat')

  // Step 2: Gate 1 - Body (Needle & Temple evidence in 1A)
  console.log('\n--- Gate 1: Body (Cause of Death) ---')
  const gate1 = await page.evaluate(() => {
    const L = window.__lodge
    L.caseFile.file('needle', '1a.needle')
    L.caseFile.file('temple', '1a.temple')
    return {
      unlocked: L.gates.has('body'),
      rosieStation: L.rosie.station,
      rosieDescription: L.registry.get('rosie')?.description,
    }
  })
  assert(gate1.unlocked, 'Gate 1 (body) unlocked after filing needle & temple')
  assert(gate1.rosieStation === 'parlour', "Rosie relocated to 'parlour' station while player was in 1A")
  assert(gate1.rosieDescription.includes('window'), 'Rosie description updated for parlour window station')

  // Step 3: Gate 2 - Room (Sling, Frame, Sill)
  console.log('\n--- Gate 2: Room ---')
  const gate2 = await page.evaluate(() => {
    const L = window.__lodge
    L.caseFile.file('sling', '1a.sling')
    L.caseFile.file('frame', '1a.frame')
    L.caseFile.file('sill', '1a.sill')
    return {
      unlocked: L.gates.has('room'),
      outstanding: L.gates.outstanding.map((g) => g.id),
    }
  })
  assert(gate2.unlocked, 'Gate 2 (room) unlocked after filing sling, frame, sill')

  // Step 4: Gate 3 - Lighter
  console.log('\n--- Gate 3: Lighter ---')
  const gate3 = await page.evaluate(() => {
    const L = window.__lodge
    L.caseFile.file('lighter', '1a.lighter')
    return {
      unlocked: L.gates.has('lighter'),
    }
  })
  assert(gate3.unlocked, 'Gate 3 (lighter) unlocked after filing lighter')

  // Step 5: Gate 4 - Verandah Stairs (Clocked / Looked at)
  console.log('\n--- Gate 4: Verandah Stairs ---')
  const gate4 = await page.evaluate(() => {
    const L = window.__lodge
    L.events.emit('look:enter', { objectId: 'verandah.stairs' })
    return {
      unlocked: L.gates.has('stairs'),
    }
  })
  assert(gate4.unlocked, 'Gate 4 (stairs) unlocked when verandah stairs are clocked')

  // Step 6: Gate 5 - Rosie 2am Bang
  console.log('\n--- Gate 5: Rosie 2am Bang ---')
  const gate5 = await page.evaluate(() => {
    const L = window.__lodge
    while (L.dialogue.isActive) L.dialogue.advance()
    const graph = L.graphs.get('rosie.parlour')
    L.dialogue.start(graph)
    const heardBang = L.gates.has('rosie')
    // Advance through the dialogue to leave cleanly
    while (L.dialogue.isActive) {
      if (L.dialogue.current?.choices?.length) {
        L.dialogue.choose('leave')
      } else {
        L.dialogue.advance()
      }
    }
    return {
      unlocked: heardBang,
    }
  })
  assert(gate5.unlocked, "Gate 5 (rosie) unlocked upon opening parlour conversation ('bang' node)")

  // Step 7: Gate 6 - Tagged Diary
  console.log('\n--- Gate 6: Diary Tagged ---')
  const gate6 = await page.evaluate(() => {
    const L = window.__lodge
    while (L.dialogue.isActive) L.dialogue.advance()
    L.moretti.onBagged('lodge.diary')
    const unlocked = L.gates.has('diary')
    const diaryInRegistry = !!L.registry.get('lodge.diary')
    const diaryBagged = L.gates.isBagged('lodge.diary')
    while (L.dialogue.isActive) L.dialogue.advance()
    return {
      unlocked,
      diaryInRegistry,
      diaryBagged,
    }
  })
  assert(gate6.unlocked, 'Gate 6 (diary) unlocked when Moretti bags the diary')
  assert(!gate6.diaryInRegistry, 'Diary removed from LookRegistry after bagging')
  assert(gate6.diaryBagged, 'GateTracker records diary as bagged')

  // Step 8: Gate 7 - Tagged Hammer
  console.log('\n--- Gate 7: Hammer Tagged ---')
  const gate7 = await page.evaluate(() => {
    const L = window.__lodge
    while (L.dialogue.isActive) L.dialogue.advance()
    L.moretti.onBagged('yard.hammer')
    const unlocked = L.gates.has('hammer')
    const hammerInRegistry = !!L.registry.get('yard.hammer')
    const hammerBagged = L.gates.isBagged('yard.hammer')
    const allUnlocked = L.gates.allUnlocked
    const morettiDialogue = L.registry.get('moretti')?.dialogueId
    while (L.dialogue.isActive) L.dialogue.advance()
    return {
      unlocked,
      hammerInRegistry,
      hammerBagged,
      allUnlocked,
      morettiDialogue,
    }
  })
  assert(gate7.unlocked, 'Gate 7 (hammer) unlocked when Moretti bags the hammer')
  assert(!gate7.hammerInRegistry, 'Hammer removed from LookRegistry after bagging')
  assert(gate7.allUnlocked, 'All 8 Scene 1 gates are now unlocked')
  assert(gate7.morettiDialogue === 'moretti.theorise', "Moretti's dialogue switched to 'moretti.theorise'")

  // Step 9: Theorise with Moretti & Complete Scene 1
  console.log("\n--- Scene Completion: Moretti's Theorise ---")
  const completed = await page.evaluate(() => {
    const L = window.__lodge
    while (L.dialogue.isActive) {
      L.dialogue.advance()
    }

    const graph = L.graphs.get('moretti.theorise')
    L.dialogue.start(graph)

    // Option at 'ready' choice is 'run'
    if (L.dialogue.current?.id === 'ready') {
      L.dialogue.choose('run')
    }

    // Step through the rest of the nodes until conversation ends on 'sir'
    while (L.dialogue.isActive) {
      L.dialogue.advance()
    }

    // Read save state from localStorage
    const rawSave = localStorage.getItem('paradise-lodge.save')
    const parsedSave = rawSave ? JSON.parse(rawSave) : null

    const fadeEl = document.querySelector('.scene-fade')
    const isFadedOut = fadeEl ? fadeEl.classList.contains('is-out') : false

    return {
      sceneManagerComplete: L.scenes.isComplete,
      save: parsedSave,
      isFadedOut,
    }
  })

  assert(completed.sceneManagerComplete, 'SceneManager marked Scene 1 complete')
  assert(completed.save !== null, 'Save data written to localStorage')
  assert(completed.save?.version === 1, 'Save data version is 1')
  assert(completed.save?.current === 'scene1', "Save current scene is 'scene1'")
  assert(completed.save?.completed?.includes('scene1'), "Save completed list includes 'scene1'")
  assert(completed.save?.evidence?.length >= 6, `Filed evidence persisted (${completed.save?.evidence?.length} items)`)
  assert(completed.isFadedOut, 'Scene exit fade blackout active (.scene-fade.is-out)')

  console.log('\n========================================')
  console.log('🎉 ALL SCENE 1 PLAYTEST GATES PASSED!')
  console.log('========================================\n')
} catch (err) {
  console.error('\nPlaytest error:', err)
  if (logs.length > 0) {
    console.error('Recent browser logs:')
    console.error(logs.slice(-20).join('\n'))
  }
  process.exitCode = 1
} finally {
  await browser.close()
  if (server) server.kill()
}
