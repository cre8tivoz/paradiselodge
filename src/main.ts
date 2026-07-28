import './style.css'
import { Scene } from 'three'
import { Input } from './core/input.ts'
import { Loop } from './core/loop.ts'
import * as events from './core/events.ts'
const { on } = events
import { createViewport } from './render/renderer.ts'
import { buildGreybox } from './world/greybox.ts'
import { BoxCollisionSolver } from './world/collision.ts'
import { PlayerController } from './player/controller.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
const hud = document.querySelector<HTMLDivElement>('#hud')

if (canvas === null || hud === null) {
  throw new Error('index.html is missing #game or #hud')
}

const { renderer, camera } = createViewport(canvas)

const scene = new Scene()
const greybox = buildGreybox()
scene.add(greybox.group)

const input = new Input(canvas)
const solver = new BoxCollisionSolver(greybox.solids)
const player = new PlayerController(camera, input, solver, greybox.spawn)

// Nothing listens for these yet. The audio mixer is build order step 1 of a
// later session. Wired now so the controller is not the thing that changes.
on('player:footstep', ({ surface, speed }) => {
  console.debug('footstep', surface, speed.toFixed(2))
})
on('player:state', ({ stance }) => {
  console.debug('stance', stance)
})

const prompt = document.createElement('div')
prompt.className = 'prompt'
prompt.innerHTML =
  '<strong>Click to look around</strong>' +
  '<span>WASD move &middot; C or Ctrl crouch &middot; Q and E lean &middot; Esc release</span>'
hud.appendChild(prompt)

const updatePrompt = (): void => {
  prompt.style.display = input.isLocked ? 'none' : 'flex'
}
document.addEventListener('pointerlockchange', updatePrompt)
updatePrompt()

const loop = new Loop((delta) => {
  player.update(delta)
  renderer.render(scene, camera)
  input.endFrame()
})

loop.start()

if (import.meta.env.DEV) {
  // Dev only, stripped from the production bundle. The screenshot and profiler
  // tooling will want a handle like this too.
  Reflect.set(window, '__lodge', { player, camera, scene, renderer, input, loop, events })
}
