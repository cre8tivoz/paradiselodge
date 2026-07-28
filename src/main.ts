import './style.css'
import { Scene } from 'three'
import * as events from './core/events.ts'
import { Input } from './core/input.ts'
import { Loop } from './core/loop.ts'
import { createViewport } from './render/renderer.ts'
import { buildGreybox } from './world/greybox.ts'
import { BoxCollisionSolver } from './world/collision.ts'
import { PlayerController } from './player/controller.ts'
import { LookRegistry } from './interact/lookable.ts'
import type { Lookable } from './interact/lookable.ts'
import { LookRaycaster } from './interact/look.ts'
import { Hud } from './ui/hud.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
const hudRoot = document.querySelector<HTMLDivElement>('#hud')

if (canvas === null || hudRoot === null) {
  throw new Error('index.html is missing #game or #hud')
}

const { renderer, camera } = createViewport(canvas)

const scene = new Scene()
const greybox = buildGreybox()
scene.add(greybox.group)

const input = new Input(canvas)
const solver = new BoxCollisionSolver(greybox.solids)
const player = new PlayerController(camera, input, solver, greybox.spawn)

/*
 * Tier one text on the test props. Flat and factual, per the writing rules:
 * Australian English, contractions, no editorialising, and nothing that tells
 * the player a thing matters. These are grey boxes, so they describe grey
 * boxes. They go when room 1A lands at step 6.
 */
const lookables: Lookable[] = [
  {
    id: 'greybox.pillar',
    description: 'Square column. Taller than you are.',
    object: greybox.props.pillar,
  },
  {
    id: 'greybox.block',
    description: "Waist-high block. There's nothing on top of it.",
    object: greybox.props.block,
  },
  {
    id: 'greybox.cube',
    description: 'A cube, about a metre each way.',
    object: greybox.props.cube,
  },
  {
    id: 'greybox.jamb',
    description: "Stub wall. There's a gap beside it wide enough to walk through.",
    object: greybox.props.jambLeft,
  },
]

const registry = new LookRegistry()
for (const lookable of lookables) {
  registry.add(lookable)
}

const look = new LookRaycaster(camera, registry, scene)

const descriptions = new Map(lookables.map((entry) => [entry.id, entry.description]))

// Nothing listens for these yet. The audio mixer comes later. Wired now so the
// controller is not the thing that has to change when it does.
events.on('player:footstep', ({ surface, speed }) => {
  console.debug('footstep', surface, speed.toFixed(2))
})
events.on('player:state', ({ stance }) => {
  console.debug('stance', stance)
})

const prompt = document.createElement('div')
prompt.className = 'prompt'
hudRoot.appendChild(prompt)

const CONTROLS =
  'WASD move &middot; Shift run &middot; C or Ctrl crouch &middot; Q and E lean'

const updatePrompt = (): void => {
  if (input.isLocked) {
    prompt.style.display = 'none'
    return
  }
  prompt.style.display = 'flex'
  // Some documents refuse pointer lock outright. Say so and name the fallback
  // rather than leaving the player clicking a canvas that will never lock.
  // Once refused it becomes a quiet bar instead of a full screen scrim, since
  // it has to stay up the whole time the player is dragging to look.
  prompt.classList.toggle('is-hint', input.isLockRefused)
  prompt.innerHTML = input.isLockRefused
    ? '<strong>Drag to look around</strong>' +
      `<span>${CONTROLS}</span>` +
      '<span class="prompt-note">This browser refused pointer lock, so hold the left button to turn.</span>'
    : `<strong>Click to look around</strong><span>${CONTROLS} &middot; Esc release</span>`
}

input.onLockRefused = updatePrompt
document.addEventListener('pointerlockchange', updatePrompt)
updatePrompt()

// Built after the prompt so the prompt's scrim sits behind the description
// line rather than dimming it. The prompt is scaffold and goes with it.
const hud = new Hud(hudRoot, (id) => descriptions.get(id))

const loop = new Loop((delta) => {
  player.update(delta)
  look.update()
  renderer.render(scene, camera)
  input.endFrame()
})

loop.start()

if (import.meta.env.DEV) {
  // Dev only, stripped from the production bundle. The screenshot and profiler
  // tooling will want a handle like this too.
  Reflect.set(window, '__lodge', {
    player, camera, scene, renderer, input, loop, events, look, registry, hud,
  })
}
