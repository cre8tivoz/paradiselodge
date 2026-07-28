import './style.css'
import { Group, Scene, Vector3 } from 'three'
import * as events from './core/events.ts'
import { emit } from './core/events.ts'
import { Input } from './core/input.ts'
import { Loop } from './core/loop.ts'
import { createViewport } from './render/renderer.ts'
import { buildRoom1A } from './world/room1a.ts'
import { BoxCollisionSolver } from './world/collision.ts'
import { PlayerController } from './player/controller.ts'
import { LookRegistry } from './interact/lookable.ts'
import type { Lookable } from './interact/lookable.ts'
import { LookRaycaster } from './interact/look.ts'
import { Hands } from './player/hands/hands.ts'
import { CLIPS, getClip } from './player/hands/clips.ts'
import type { ClipId } from './player/hands/clips.ts'
import { Hud } from './ui/hud.ts'
import { CaseFile } from './case/casefile.ts'
import { Notebook } from './case/notebook.ts'
import { getEvidence } from './case/evidence.ts'

const canvasEl = document.querySelector<HTMLCanvasElement>('#game')
const hudRootEl = document.querySelector<HTMLDivElement>('#hud')

if (canvasEl === null || hudRootEl === null) {
  throw new Error('index.html is missing #game or #hud')
}

const canvas = canvasEl
const hudRoot = hudRootEl

async function main(): Promise<void> {
  const { renderer, camera } = createViewport(canvas)

  const scene = new Scene()

  /*
   * Everything solid lives under `world`. Miller's hands are children of the
   * camera, which is a sibling of it.
   *
   * That split is what keeps his own hands out of the look raycast. They sit
   * inches from the lens, so a ray cast against the whole scene stops on a glove
   * every time, and three raycasts objects whose `visible` is false, so hiding
   * them is not enough. Excluding them by render layer would work for the ray
   * and then quietly unlight them, since a light in three only illuminates
   * objects that share its layer. That is the viewmodel bug SETUP.md warns about
   * in the reference repo. Separate roots, one light rig, no drift.
   */
  const world = new Group()
  const room = buildRoom1A()
  world.add(room.group)
  scene.add(world)

  // The camera has to be in the scene graph or its children never get traversed.
  scene.add(camera)

  const input = new Input(canvas)
  const solver = new BoxCollisionSolver(room.solids)
  const player = new PlayerController(camera, input, solver, room.spawn, room.spawnYaw)
  player.setSurface('floorboard')

  /*
   * Look and examine copy for room 1A. Writing rules apply. Register Crystal's
   * body first, then head / needle / sling so their meshes win the raycast map.
   * Diary and hammer wait for the parlour and the yard.
   */
  const needle = getEvidence('needle')
  const temple = getEvidence('temple')
  const sling = getEvidence('sling')
  const frame = getEvidence('frame')
  const sill = getEvidence('sill')
  const lighter = getEvidence('lighter')
  if (
    needle === undefined ||
    temple === undefined ||
    sling === undefined ||
    frame === undefined ||
    sill === undefined ||
    lighter === undefined
  ) {
    throw new Error('Scene 1 evidence catalogue is missing a room 1A entry')
  }

  const lookables: Lookable[] = [
    {
      id: '1a.bed',
      description: 'Single bed. Chenille spread, dusty pink.',
      object: room.props.bed,
    },
    {
      id: '1a.crystal',
      description: 'A woman on the bed. Cream dress.',
      object: room.crystal.root,
    },
    {
      id: '1a.temple',
      description: temple.look,
      examine: temple.examine,
      clipId: 'turnHead',
      evidenceId: temple.id,
      object: room.crystal.head,
    },
    {
      id: '1a.needle',
      description: needle.look,
      examine: needle.examine,
      clipId: 'leanIn',
      evidenceId: needle.id,
      object: room.crystal.needle,
    },
    {
      id: '1a.sling',
      description: sling.look,
      examine: sling.examine,
      clipId: 'liftDrop',
      evidenceId: sling.id,
      object: room.crystal.sling,
    },
    {
      id: '1a.dresser',
      description: 'Timber dresser. Things on top of it.',
      object: room.props.dresser,
    },
    {
      id: '1a.drawer',
      description: 'Top drawer. Shut.',
      examine: 'Socks. A spare toothbrush. Nothing with a name on it.',
      clipId: 'openLookClose',
      object: room.props.drawer,
    },
    {
      id: '1a.wardrobe',
      description: 'Tall wardrobe. Doors shut.',
      examine: 'Three dresses. One empty hanger. A pair of sandals on the floor.',
      clipId: 'openLookClose',
      object: room.props.wardrobe,
    },
    {
      id: '1a.chair',
      description: 'Wooden chair by the window.',
      object: room.props.chair,
    },
    {
      id: '1a.sideTable',
      description: 'Small table by the bed head.',
      object: room.props.sideTable,
    },
    {
      id: '1a.sash',
      description: "Sash window, open a hand's width.",
      examine: 'It gives another inch. Stops. Paint on the runners is old.',
      clipId: 'pushSash',
      object: room.props.sash,
    },
    {
      id: '1a.sill',
      description: 'Windowsill. Timber, worn.',
      examine: sill.examine,
      clipId: 'sightSill',
      evidenceId: sill.id,
      object: room.props.sill,
    },
    {
      id: '1a.frame',
      description: 'Photo frame lying face down on the dresser.',
      examine: frame.examine,
      clipId: 'turnOver',
      evidenceId: frame.id,
      object: room.props.frame,
    },
    {
      id: '1a.magazines',
      description: 'Travel magazines. Covers faded.',
      examine: 'Airlines. Beaches. Someone has dog-eared half of them.',
      clipId: 'fanMagazines',
      object: room.props.magazines,
    },
    {
      id: '1a.map',
      description: 'A map. Pins in it.',
      examine: 'Pins in cities. None of them labelled. Do not move them.',
      clipId: 'leanMap',
      object: room.props.map,
    },
    {
      id: '1a.note',
      description: 'A note, her handwriting.',
      examine: "fly out April 6th! Can't wait!",
      clipId: 'liftNote',
      object: room.props.note,
    },
    {
      id: '1a.lighter',
      description: lighter.look,
      examine: lighter.examine,
      clipId: 'turnLighter',
      evidenceId: lighter.id,
      object: room.props.lighter,
    },
  ]

  const registry = new LookRegistry()
  for (const lookable of lookables) {
    registry.add(lookable)
  }

  const look = new LookRaycaster(camera, registry, world)
  const hands = await Hands.create(camera)
  const caseFile = new CaseFile()
  const notebook = new Notebook(hudRoot, caseFile)

  const descriptions = new Map(lookables.map((entry) => [entry.id, entry.description]))

  // Built before examine wiring so tier-two text can land on it.
  // The prompt is appended after so its scrim sits behind the description line.
  const hud = new Hud(hudRoot, (id) => descriptions.get(id))

  const targetWorld = new Vector3()
  let examiningId: string | undefined = undefined

  function tryExamine(): void {
    if (hands.isPlaying || notebook.isOpen) {
      return
    }
    const target = look.target
    if (target === undefined || target.examine === undefined) {
      return
    }
    if (target.clipId === undefined || !isClipId(target.clipId)) {
      return
    }
    examiningId = target.id
    hud.clearExamine()
    target.object.getWorldPosition(targetWorld)
    emit('examine:start', { objectId: target.id })
    hands.play(getClip(target.clipId), target.id, targetWorld)
  }

  function isClipId(id: string): id is ClipId {
    return Object.prototype.hasOwnProperty.call(CLIPS, id)
  }

  hands.onComplete = (objectId) => {
    emit('examine:complete', { objectId })
    const lookable = registry.get(objectId)
    if (lookable?.examine !== undefined) {
      hud.showExamine(objectId, lookable.examine)
    }
    if (lookable?.evidenceId !== undefined) {
      caseFile.file(lookable.evidenceId, objectId)
    }
    examiningId = undefined
  }

  // Nothing listens for these yet. The audio mixer comes later. Wired now so the
  // controller is not the thing that has to change when it does.
  events.on('player:footstep', ({ surface, speed }) => {
    console.debug('footstep', surface, speed.toFixed(2))
  })
  events.on('player:state', ({ stance }) => {
    console.debug('stance', stance)
  })
  events.on('evidence:filed', ({ evidenceId }) => {
    console.debug('filed', evidenceId)
  })

  const prompt = document.createElement('div')
  prompt.className = 'prompt'
  hudRoot.appendChild(prompt)

  const CONTROLS =
    'WASD move &middot; Shift run &middot; C or Ctrl crouch &middot; Q and E lean &middot; Hold F examine &middot; N case file'

  const updatePrompt = (): void => {
    if (input.isLocked || notebook.isOpen) {
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

  events.on('look:exit', ({ objectId }) => {
    if (examiningId === objectId) {
      hands.cancel()
      examiningId = undefined
    }
    hud.clearExamine()
  })

  events.on('casefile:open', updatePrompt)
  events.on('casefile:close', updatePrompt)

  // Esc closes the notebook without going through Input, so we do not
  // preventDefault on Escape and trap pointer lock.
  const onEscape = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape' || !notebook.isOpen) {
      return
    }
    notebook.close()
  }
  window.addEventListener('keydown', onEscape)

  const loop = new Loop((delta) => {
    if (input.wasPressed('notebook')) {
      if (hands.isPlaying) {
        hands.cancel()
        examiningId = undefined
      }
      notebook.toggle()
    }

    if (notebook.isOpen) {
      if (input.wasPressed('forward')) {
        notebook.moveSelection(-1)
      } else if (input.wasPressed('back')) {
        notebook.moveSelection(1)
      }
      // Still render. Do not move, look, or examine under the book.
      hands.update(delta)
      renderer.render(scene, camera)
      input.endFrame()
      return
    }

    player.update(delta)
    look.update()

    // Hold to examine. Press starts it; release before the clip ends cancels.
    if (hands.isPlaying) {
      if (!input.isHeld('examine')) {
        hands.cancel()
        examiningId = undefined
      }
    } else if (input.wasPressed('examine')) {
      tryExamine()
    }

    hands.update(delta)
    renderer.render(scene, camera)
    input.endFrame()
  })

  loop.start()

  if (import.meta.env.DEV) {
    // Dev only, stripped from the production bundle. The screenshot and profiler
    // tooling will want a handle like this too.
    Reflect.set(window, '__lodge', {
      player,
      camera,
      scene,
      world,
      renderer,
      input,
      loop,
      events,
      look,
      registry,
      hud,
      hands,
      caseFile,
      notebook,
      clips: CLIPS,
      Vector3,
    })
  }
}

main().catch((error: unknown) => {
  console.error(error)
})
