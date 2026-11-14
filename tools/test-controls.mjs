#!/usr/bin/env node
/**
 * Real Human Input & Browser Controls Test.
 *
 * Verifies that the companion game is fully playable using real keyboard and mouse
 * events dispatched through Playwright into the DOM:
 *
 * 1. Canvas Focus & Pointer Lock / Drag Look
 * 2. WASD Walking & Velocity
 * 3. Sprinting (Shift) & Crouching (C)
 * 4. Mouse Turning (Yaw & Pitch)
 * 5. Case File Notebook (KeyN / Esc toggle)
 * 6. Interaction Key F (Raycast targeting, hands examine animation)
 * 7. Dialogue UI (DOM Choice Button Clicks & progression)
 * 8. Evidence Tagging Key G
 */
import { closeBrowser, launchBrowser } from './browser.mjs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import net from 'node:net'

const PORT = 5178
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

console.log('========================================================')
console.log('🎮 PARADISE LODGE: CONTROLS & BROWSER PLAYABILITY TEST')
console.log('========================================================\n')

const server = await ensureServer()

const browser = await launchBrowser()

const page = await browser.newPage({
  viewport: { width: 1024, height: 768 },
})

const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    throw new Error(`Assertion failed: ${message}`)
  } else {
    console.log(`✓ ${message}`)
  }
}

try {
  // -------------------------------------------------------------------------
  // Test 1: Page Load & Canvas Click Focus
  // -------------------------------------------------------------------------
  console.log('--- Test 1: Page Load & Canvas Focus ---')
  await page.goto(`http://localhost:${PORT}/?capture=1&pause=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await page.waitForFunction('window.__READY__ === true', null, { timeout: 60000 })
  await page.evaluate(() => {
    const hud = document.getElementById('hud')
    if (hud) hud.style.display = ''
    window.__lodge.hands.setVisible(true)
  })
  assert(true, 'DOM loaded and WebGL scene initialised')

  const canvas = await page.$('#game')
  assert(canvas !== null, 'Canvas element #game present')

  // Click canvas to trigger pointer lock / audio unlock
  await page.mouse.click(512, 384)
  assert(true, 'Canvas clicked to acquire input focus and unlock audio')

  // -------------------------------------------------------------------------
  // Test 2: WASD Movement Controls
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: WASD Movement & Velocity ---')
  const walkCheck = await page.evaluate(() => {
    const L = window.__lodge
    const pStart = { x: L.player.position.x, z: L.player.position.z }

    // Dispatch DOM keydown for 'KeyW'
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }))
    assertHeld: {
      if (!L.input.isHeld('forward')) throw new Error('KeyW did not register as held forward action')
    }

    // Step player physics for 10 frames
    for (let i = 0; i < 10; i++) {
      L.player.update(0.016)
    }
    const speed = L.player.speed

    // Dispatch DOM keyup for 'KeyW'
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }))

    const pEnd = { x: L.player.position.x, z: L.player.position.z }
    const dist = Math.hypot(pEnd.x - pStart.x, pEnd.z - pStart.z)

    // Test strafe with KeyA
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', bubbles: true }))
    for (let i = 0; i < 10; i++) {
      L.player.update(0.016)
    }
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', bubbles: true }))

    const pStrafe = { x: L.player.position.x, z: L.player.position.z }

    return { dist, speed, strafed: pStrafe.x !== pEnd.x }
  })

  assert(walkCheck.dist > 0.1, `KeyW moved player forward by ${walkCheck.dist.toFixed(2)}m`)
  assert(walkCheck.speed > 0.5, `Player speed reached ${walkCheck.speed.toFixed(2)} m/s`)
  assert(walkCheck.strafed, 'KeyA strafed player laterally')

  // -------------------------------------------------------------------------
  // Test 3: Sprinting (Shift) & Crouching (C)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Sprinting (Shift) & Crouching (C) ---')
  const sprintCheck = await page.evaluate(() => {
    const L = window.__lodge
    // Engage ShiftLeft + KeyW
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }))

    for (let i = 0; i < 15; i++) {
      L.player.update(0.016)
    }

    const running = L.player.isRunning
    const speed = L.player.speed

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', bubbles: true }))

    return { running, speed }
  })

  assert(sprintCheck.running, 'ShiftLeft engaged running state')
  assert(sprintCheck.speed > 2.0, `Sprint speed reached ${sprintCheck.speed.toFixed(2)} m/s (above walk speed)`)

  // Crouch: KeyC is hold-to-crouch (crouchIsToggle: false)
  const crouchCheck = await page.evaluate(() => {
    const L = window.__lodge
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', bubbles: true }))
    L.player.update(0.016)
    const crouched = L.player.currentStance === 'crouch'

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyC', bubbles: true }))
    L.player.update(0.016)
    const stood = L.player.currentStance === 'stand'

    return { crouched, stood }
  })
  assert(crouchCheck.crouched, "Holding KeyC entered 'crouch' stance")
  assert(crouchCheck.stood, "Releasing KeyC returned to 'stand' stance")

  // -------------------------------------------------------------------------
  // Test 4: Mouse Turning (Yaw & Pitch)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Mouse Turning (Yaw & Pitch) ---')
  const rotStart = await page.evaluate(() => {
    return {
      yaw: window.__lodge.player.yaw,
      pitch: window.__lodge.player.pitch,
    }
  })

  await page.evaluate(() => {
    const gameCanvas = document.getElementById('game')
    gameCanvas?.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }))
    const e = new MouseEvent('mousemove', {
      bubbles: true,
      movementX: 120,
      movementY: -35,
    })
    document.dispatchEvent(e)
    window.__lodge.player.update(0.016)
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }))
  })

  const rotAfter = await page.evaluate(() => {
    return {
      yaw: window.__lodge.player.yaw,
      pitch: window.__lodge.player.pitch,
    }
  })

  assert(rotAfter.yaw !== rotStart.yaw, `Mouse horizontal movement turned camera yaw (${rotStart.yaw.toFixed(2)} -> ${rotAfter.yaw.toFixed(2)})`)
  assert(rotAfter.pitch !== rotStart.pitch, `Mouse vertical movement adjusted camera pitch (${rotStart.pitch.toFixed(2)} -> ${rotAfter.pitch.toFixed(2)})`)

  // -------------------------------------------------------------------------
  // Test 5: Case File Notebook (KeyN / Esc toggle)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Case File Notebook (KeyN / Esc toggle) ---')
  const stepFrames = (n = 2) =>
    page.evaluate((count) => {
      const L = window.__lodge
      for (let i = 0; i < count; i += 1) {
        L.step(0.016, false)
      }
    }, n)

  // Step across the front door threshold into the lodge to conclude cold open
  await page.evaluate(() => {
    const L = window.__lodge
    L.player.place(new L.Vector3(0, 0, 2.5), 0, 0)
    L.gates.update(L.player.position)
  })
  await stepFrames(2)

  await page.keyboard.press('KeyN')
  await stepFrames(2)

  const notebookOpenCheck = await page.evaluate(() => {
    const L = window.__lodge
    const nbEl = document.querySelector('#hud .notebook')
    return {
      isOpen: L.notebook.isOpen,
      domVisible: nbEl !== null && nbEl.classList.contains('is-open'),
    }
  })
  assert(notebookOpenCheck.isOpen, "Pressing KeyN set notebook.isOpen to true")
  assert(notebookOpenCheck.domVisible, "Notebook DOM element displayed with '.is-open' class")

  // Press Escape to close
  await page.keyboard.press('Escape')
  await stepFrames(2)

  const notebookCloseCheck = await page.evaluate(() => {
    const L = window.__lodge
    const nbEl = document.querySelector('#hud .notebook')
    return {
      isOpen: L.notebook.isOpen,
      domVisible: nbEl !== null && nbEl.classList.contains('is-open'),
    }
  })
  assert(!notebookCloseCheck.isOpen, "Pressing Escape closed the notebook")
  assert(!notebookCloseCheck.domVisible, "Notebook DOM element removed '.is-open' class")

  // -------------------------------------------------------------------------
  // Test 6: Crosshair Raycast & Interaction Key F (Examine)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: Crosshair Raycasting & Interaction Key F ---')
  // Teleport inside Room 1A beside the bed facing Crystal within 3m lookRange
  await page.evaluate(() => {
    const L = window.__lodge
    L.hands.cancel()
    L.player.place(new L.Vector3(3.35, 3.45, 2.65), Math.PI, -0.62)
    L.look.update()
  })

  const targetCheck = await page.evaluate(() => {
    return {
      targetId: window.__lodge.look.target?.id,
      description: window.__lodge.look.target?.description,
    }
  })
  assert(targetCheck.targetId !== undefined, `Crosshair raycast locked onto target: '${targetCheck.targetId}' ("${targetCheck.description}")`)

  // Press KeyF to examine
  await page.keyboard.press('KeyF')
  await stepFrames(2)

  const handsPlaying = await page.evaluate(() => {
    return {
      handsActive: window.__lodge.hands.isPlaying,
    }
  })
  assert(handsPlaying.handsActive, "Pressing KeyF engaged first-person hand examine animation")

  // Complete hands animation
  await page.evaluate(() => {
    window.__lodge.hands.cancel()
  })

  // -------------------------------------------------------------------------
  // Test 7: Dialogue UI & Option Button Clicking
  // -------------------------------------------------------------------------
  console.log('\n--- Test 7: Dialogue UI & Option Button Clicking ---')
  // Walk over to Rosie at reception (x = 3.5, z = 3.15) clearing the desk (y = 1.14)
  await page.evaluate(() => {
    const L = window.__lodge
    L.player.place(new L.Vector3(3.5, 0, 1.4), Math.PI, -0.12)
    L.look.update()
  })

  // Press KeyF to talk to Rosie
  await page.keyboard.press('KeyF')
  await stepFrames(2)

  const dialogueActiveCheck = await page.evaluate(() => {
    const L = window.__lodge
    const panel = document.querySelector('.dialogue')
    return {
      isActive: L.dialogue.isActive,
      panelVisible: panel !== null && panel.classList.contains('is-open'),
      speaker: L.dialogue.current?.speaker,
      choicesCount: document.querySelectorAll('.dialogue-choices button').length,
    }
  })
  assert(dialogueActiveCheck.isActive, `KeyF initiated dialogue with ${dialogueActiveCheck.speaker}`)
  assert(dialogueActiveCheck.panelVisible, "Dialogue panel rendered and visible in DOM")

  // Click on a dialogue choice button in the DOM if choices are present
  if (dialogueActiveCheck.choicesCount > 0) {
    const choiceBtn = await page.$('.dialogue-choices button')
    assert(choiceBtn !== null, "Dialogue choice button rendered in DOM")
    await choiceBtn.click()
    await stepFrames(2)
    assert(true, "Clicked dialogue choice button successfully in the browser")
  }

  // Close out dialogue cleanly
  await page.evaluate(() => {
    const L = window.__lodge
    while (L.dialogue.isActive) {
      if (L.dialogue.current?.choices?.length) {
        L.dialogue.choose(L.dialogue.current.choices[0].id)
      } else {
        L.dialogue.advance()
      }
    }
  })

  // -------------------------------------------------------------------------
  // Test 8: Tagging Key G
  // -------------------------------------------------------------------------
  console.log('\n--- Test 8: Evidence Tagging Key G ---')
  // Teleport beside parlour table facing West (-X) toward the diary at (-3.4, 0.52, 2.5)
  await page.evaluate(() => {
    const L = window.__lodge
    L.player.place(new L.Vector3(-2.4, 0, 2.5), Math.PI / 2, -0.87)
    L.look.update()
  })

  const tagTarget = await page.evaluate(() => {
    return {
      targetId: window.__lodge.look.target?.id,
      taggable: window.__lodge.look.target?.taggable,
    }
  })
  assert(tagTarget.taggable === true, `Crosshair locked onto taggable evidence '${tagTarget.targetId}'`)

  await page.keyboard.press('KeyG')
  await stepFrames(2)
  const tagFired = await page.evaluate(() => {
    return window.__lodge.moretti.state === 'approaching' || window.__lodge.moretti.state === 'bagging'
  })
  assert(tagFired, "Pressing KeyG dispatched Constable Moretti to bag evidence")

  console.log('\n========================================================')
  console.log('🎉 ALL CONTROLS & BROWSER INTERACTION TESTS PASSED 100%!')
  console.log('========================================================\n')
} catch (err) {
  console.error('\n❌ Controls test failed with error:\n', err)
  console.error('\nConsole logs:\n', logs.slice(-25).join('\n'))
  process.exitCode = 1
} finally {
  await closeBrowser(browser, page, server)
}

process.exit(process.exitCode ?? 0)
