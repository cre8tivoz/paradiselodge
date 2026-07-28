import './style.css'
import { Group, Scene, Vector3 } from 'three'
import * as events from './core/events.ts'
import { emit } from './core/events.ts'
import { Input } from './core/input.ts'
import { Loop } from './core/loop.ts'
import { createViewport } from './render/renderer.ts'
import { buildSceneLighting } from './render/lighting.ts'
import { buildLodge } from './world/lodge.ts'
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
import { DialogueRunner } from './dialogue/runner.ts'
import { DialoguePanel } from './dialogue/panel.ts'
import { ROSIE_RECEPTION } from './dialogue/graphs/rosie-reception.ts'
import type { DialogueGraph } from './dialogue/graph.ts'

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

  const lodge = buildLodge()
  world.add(lodge.group)

  /*
   * Room 1A, placed into the building rather than sitting at the origin.
   *
   * Rotated a quarter turn, so the room's local -Z door opens onto the
   * first-floor hall at x = 1.7 and its local +Z sash looks out at x = 6.3,
   * which is the side the verandah wraps onto and where the 3pm sun comes from.
   * Front and side corner, per BRIEF.md.
   */
  const room = buildRoom1A({
    position: new Vector3(4.0, 3.45, 2.6),
    rotationY: Math.PI / 2,
  })
  world.add(room.group)

  scene.add(world)

  const lighting = buildSceneLighting()
  scene.add(lighting.group)
  scene.background = lighting.sky

  // The camera has to be in the scene graph or its children never get traversed.
  scene.add(camera)

  const input = new Input(canvas)
  const solver = new BoxCollisionSolver(
    [...lodge.solids, ...room.solids],
    [...lodge.floors, ...room.floors],
  )
  const player = new PlayerController(camera, input, solver, lodge.spawn, lodge.spawnYaw)

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
    {
      id: '1a.door',
      description: 'Door to the hall. Standing open.',
      object: room.props.door,
    },

    /*
     * The lodge. Tier one only: none of this is evidence, and per BRIEF.md the
     * parlour table only starts mattering on the way back down.
     *
     * The reception talk stub that used to hang off 1A's door is gone. Rosie
     * belongs at this desk and she arrives at step 11; until then nothing in
     * the building talks, which is better than her voice coming out of a door
     * upstairs.
     */
    {
      id: 'lodge.tape',
      description: 'Police tape across the footpath. Lifted in the middle.',
      object: lodge.props.tape,
    },
    {
      id: 'lodge.neon',
      description: 'Neon over the entrance. Two lines. One tube is crook.',
      object: lodge.props.neon,
    },
    {
      id: 'lodge.steps',
      description: 'Marble steps. Hollowed out in the middle.',
      object: lodge.props.steps,
    },
    {
      id: 'lodge.frontDoor',
      description: 'Front door, standing open.',
      object: lodge.props.frontDoor,
    },
    {
      id: 'lodge.desk',
      description: 'Reception desk. Nobody behind it.',
      object: lodge.props.desk,
    },
    {
      id: 'lodge.keyRack',
      description: 'Pigeonholes. Most of them still have a key in them.',
      object: lodge.props.keyRack,
    },
    {
      id: 'lodge.ledger',
      description: 'Guest ledger, open on the desk.',
      object: lodge.props.ledger,
    },
    {
      id: 'lodge.phone',
      description: 'Bakelite phone. The cord is twisted right up.',
      object: lodge.props.phone,
    },
    {
      id: 'lodge.ashtray',
      description: 'Ashtray on the desk. Full.',
      object: lodge.props.ashtray,
    },
    {
      id: 'lodge.stairs',
      description: 'The staircase. Runner worn through on the treads.',
      object: lodge.props.stairs,
    },
    {
      id: 'lodge.armchair',
      description: 'Armchairs round a low table.',
      object: lodge.props.armchair,
    },
    {
      id: 'lodge.parlourTable',
      description: 'Low table in the middle of the parlour.',
      object: lodge.props.parlourTable,
    },
    {
      id: 'lodge.television',
      description: 'Television in the corner. Off.',
      object: lodge.props.television,
    },
    {
      id: 'lodge.standardLamp',
      description: 'Standard lamp. Shade gone yellow.',
      object: lodge.props.standardLamp,
    },
  ]

  const graphs = new Map<string, DialogueGraph>([[ROSIE_RECEPTION.id, ROSIE_RECEPTION]])

  const registry = new LookRegistry()
  for (const lookable of lookables) {
    registry.add(lookable)
  }

  const look = new LookRaycaster(camera, registry, world)
  const hands = await Hands.create(camera)
  const caseFile = new CaseFile()
  const notebook = new Notebook(hudRoot, caseFile)
  const dialogue = new DialogueRunner()
  const dialoguePanel = new DialoguePanel(hudRoot, dialogue)

  const descriptions = new Map(lookables.map((entry) => [entry.id, entry.description]))

  // Built before examine wiring so tier-two text can land on it.
  // The prompt is appended after so its scrim sits behind the description line.
  const hud = new Hud(hudRoot, (id) => descriptions.get(id))

  const targetWorld = new Vector3()
  let examiningId: string | undefined = undefined

  function tryTalk(): boolean {
    if (hands.isPlaying || notebook.isOpen || dialogue.isActive) {
      return false
    }
    const target = look.target
    if (target === undefined || target.dialogueId === undefined) {
      return false
    }
    const graph = graphs.get(target.dialogueId)
    if (graph === undefined) {
      console.warn(`No dialogue graph "${target.dialogueId}"`)
      return false
    }
    dialogue.start(graph)
    return true
  }

  function tryExamine(): void {
    if (hands.isPlaying || notebook.isOpen || dialogue.isActive) {
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
  events.on('dialogue:start', ({ nodeId, speaker }) => {
    console.debug('dialogue', speaker, nodeId)
  })
  events.on('dialogue:end', ({ nodeId }) => {
    console.debug('dialogue end', nodeId)
  })

  const prompt = document.createElement('div')
  prompt.className = 'prompt'
  hudRoot.appendChild(prompt)

  const CONTROLS =
    'WASD move &middot; Shift run &middot; C or Ctrl crouch &middot; Q and E lean &middot; Hold F examine &middot; F talk &middot; N case file'

  const updatePrompt = (): void => {
    // Ask the runner, not the panel. The runner sets its state before it emits
    // dialogue:start, and the panel opens on the callback after it, so a panel
    // check here runs one step too early and leaves the prompt over the scene.
    if (input.isLocked || notebook.isOpen || dialogue.isActive) {
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
  events.on('dialogue:start', updatePrompt)
  events.on('dialogue:end', updatePrompt)

  // Esc closes the notebook without going through Input, so we do not
  // preventDefault on Escape and trap pointer lock. Dialogue handles its own Esc.
  const onEscape = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape' || dialoguePanel.isOpen || !notebook.isOpen) {
      return
    }
    notebook.close()
  }
  window.addEventListener('keydown', onEscape)

  let elapsed = 0

  const loop = new Loop((delta) => {
    elapsed += delta
    lodge.update(elapsed)

    if (input.wasPressed('notebook')) {
      if (dialogue.isActive) {
        // Notebook waits. Finish or leave the conversation first.
        input.endFrame()
        renderer.render(scene, camera)
        return
      }
      if (hands.isPlaying) {
        hands.cancel()
        examiningId = undefined
      }
      notebook.toggle()
    }

    if (notebook.isOpen || dialogue.isActive) {
      if (notebook.isOpen) {
        if (input.wasPressed('forward')) {
          notebook.moveSelection(-1)
        } else if (input.wasPressed('back')) {
          notebook.moveSelection(1)
        }
      }
      // Still render. Do not move, look, or examine under the book or talk.
      hands.update(delta)
      renderer.render(scene, camera)
      input.endFrame()
      return
    }

    player.update(delta)
    look.update()

    // Hold to examine. Press starts it; release before the clip ends cancels.
    // Talkables take the same key as a press, not a hold.
    if (hands.isPlaying) {
      if (!input.isHeld('examine')) {
        hands.cancel()
        examiningId = undefined
      }
    } else if (input.wasPressed('examine')) {
      if (!tryTalk()) {
        tryExamine()
      }
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
      dialogue,
      dialoguePanel,
      graphs,
      lodge,
      room,
      solver,
      lighting,
      clips: CLIPS,
      Vector3,
    })
  }
}

main().catch((error: unknown) => {
  console.error(error)
})
