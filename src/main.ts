import './style.css'
import { Box3, Group, Scene, Vector3 } from 'three'
import * as events from './core/events.ts'
import { emit } from './core/events.ts'
import { Input } from './core/input.ts'
import { Loop } from './core/loop.ts'
import { createViewport } from './render/renderer.ts'
import { GradePass } from './render/grade-pass.ts'
import { buildSceneLighting } from './render/lighting.ts'
import { buildLodge } from './world/lodge.ts'
import { buildVerandah } from './world/verandah.ts'
import { buildYard } from './world/yard.ts'
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
import { Audio } from './audio/audio.ts'
import { CaseFile } from './case/casefile.ts'
import { Notebook } from './case/notebook.ts'
import { getEvidence } from './case/evidence.ts'
import { GateTracker } from './case/gates.ts'
import { DialogueRunner } from './dialogue/runner.ts'
import { DialoguePanel } from './dialogue/panel.ts'
import { ROSIE_RECEPTION } from './dialogue/graphs/rosie-reception.ts'
import { ROSIE_PARLOUR } from './dialogue/graphs/rosie-parlour.ts'
import type { DialogueGraph } from './dialogue/graph.ts'
import { buildRosie } from './npc/rosie.ts'
import { buildMoretti } from './npc/moretti.ts'
import { MORETTI_BAG } from './dialogue/graphs/moretti-bag.ts'
import { MORETTI_STANDBY, MORETTI_THEORISE, THEORISE_LAST_NODE } from './dialogue/graphs/moretti-exit.ts'
import { applyShot, listShots } from './dev/shots.ts'
import { SceneManager } from './core/scene.ts'
import { TitleCard } from './ui/title-card.ts'

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
  const room = await buildRoom1A({
    position: new Vector3(4.0, 3.45, 2.6),
    rotationY: Math.PI / 2,
  })
  world.add(room.group)

  const verandah = buildVerandah()
  world.add(verandah.group)

  const yard = buildYard()
  world.add(yard.group)

  // Under `world`, so the look raycast reaches her and her own hands are not a
  // special case the way Miller's are.
  const rosie = await buildRosie()
  world.add(rosie.root)

  scene.add(world)

  const lighting = buildSceneLighting()
  scene.add(lighting.group)
  scene.background = lighting.sky

  const grade = new GradePass()
  const draw = (): void => {
    grade.render(renderer, scene, camera)
  }

  // The camera has to be in the scene graph or its children never get traversed.
  scene.add(camera)

  /*
   * Audio comes up before the world can emit anything at it. It stays silent
   * until `unlock()`, which rides the same click as pointer lock, because a
   * browser will not run an AudioContext before a user gesture and fails
   * silently when you try.
   */
  const audio = new Audio()

  const input = new Input(canvas)
  // Rosie's box goes in by reference, not by copy. She relocates, and the
  // solver reads min and max every frame with nothing precomputed, so she
  // rewrites that one box in place and the solver follows her.
  // Kept as a handle, because Moretti cannot be built until the solver exists
  // and his box has to go into the same array once he has one. The solver holds
  // it by reference and reads it every frame, so a later push is seen.
  const solids = [
    ...lodge.solids,
    ...room.solids,
    ...verandah.solids,
    ...yard.solids,
    ...rosie.solids,
  ]
  const solver = new BoxCollisionSolver(
    solids,
    [...lodge.floors, ...room.floors, ...verandah.floors, ...yard.floors],
  )
  const player = new PlayerController(camera, input, solver, lodge.spawn, lodge.spawnYaw)

  /*
   * Moretti is built after the solver because he walks on it, and his own box
   * goes into it by reference the way Rosie's does. He collapses that box while
   * he is moving, or the pushout would eject him from himself.
   */
  const moretti = await buildMoretti(solver)
  world.add(moretti.root)
  solids.push(...moretti.solids)

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
  const diary = getEvidence('diary')
  const hammer = getEvidence('hammer')
  if (
    needle === undefined ||
    temple === undefined ||
    sling === undefined ||
    frame === undefined ||
    sill === undefined ||
    lighter === undefined ||
    diary === undefined ||
    hammer === undefined
  ) {
    throw new Error('Scene 1 evidence catalogue is missing an entry')
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
      id: '1a.frontWindow',
      // Look only. The verandah sash is the one that matters and it already
      // carries the `sill` evidence; a second examinable window would read as a
      // second answer to a question the room has already answered.
      description: 'The other sash, over the dresser. Shut, and painted in.',
      object: room.props.frontWindow,
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
      id: 'lodge.diary',
      description: diary.look,
      examine: diary.examine,
      // Gate 6. Examine files it, the way every other clue in the game does.
      // Tag is separate and it is Moretti carrying the object away.
      clipId: 'liftNote',
      evidenceId: diary.id,
      taggable: true,
      object: lodge.props.diary,
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
    {
      id: 'lodge.commodore',
      description: 'Beige Commodore. Unmarked, fleet spec.',
      object: lodge.props.commodore,
    },
    {
      id: 'lodge.uniforms',
      description: 'Two uniforms at the tape. Summer blues.',
      object: lodge.props.uniforms,
    },

    // The verandah and the yard.
    {
      id: '1a.verandahDoor',
      description: 'Door out to the verandah.',
      object: room.props.verandahDoor,
    },
    {
      id: 'verandah.lace',
      description: 'Iron lace along the verandah. Paint flaking off it.',
      object: verandah.props.lace,
    },
    {
      id: 'verandah.stairs',
      // Gate 4. It only has to be seen; the gate logic lands at step 13.
      description: 'Timber stairs off the end of the verandah, down to the yard.',
      object: verandah.props.stairs,
    },
    {
      id: 'yard.hoist',
      description: 'Hills hoist. Nothing on the line.',
      object: yard.props.hoist,
    },
    {
      id: 'yard.shed',
      description: 'Corrugated iron shed. Door shut.',
      object: yard.props.shed,
    },
    {
      id: 'yard.fence',
      description: 'Paling fence. Gate to the street is shut.',
      object: yard.props.fence,
    },
    {
      id: 'yard.hammer',
      description: hammer.look,
      examine: hammer.examine,
      /*
       * `leanIn` is the needle's clip: get down close, hands off. It is the
       * right shape for a bloodied hammer at a scene, and it saves a bespoke
       * animation for an object Moretti will be bagging at step 12 anyway.
       */
      clipId: 'leanIn',
      evidenceId: hammer.id,
      // Gate 7.
      taggable: true,
      object: yard.props.hammer,
    },
  ]

  const graphs = new Map<string, DialogueGraph>([
    [ROSIE_RECEPTION.id, ROSIE_RECEPTION],
    [ROSIE_PARLOUR.id, ROSIE_PARLOUR],
    [MORETTI_STANDBY.id, MORETTI_STANDBY],
    [MORETTI_THEORISE.id, MORETTI_THEORISE],
    ...Object.values(MORETTI_BAG).map((graph) => [graph.id, graph] as const),
  ])

  const caseFile = new CaseFile()
  // Ahead of the registry, because Moretti's entry reads the gate state to pick
  // which of his two graphs he has.
  const gates = new GateTracker(caseFile)

  const registry = new LookRegistry()
  for (const lookable of lookables) {
    registry.add(lookable)
  }

  /*
   * Rosie is not in the static list, because her look line and her graph both
   * change when she relocates and `Lookable` is readonly by design. Re-register
   * rather than mutate: the registry indexes descendants by object id, so
   * swapping the entry is the supported way to change one.
   */
  const registerRosie = (): void => {
    registry.remove('rosie')
    registry.add({
      id: 'rosie',
      description: rosie.current.description,
      dialogueId: rosie.current.dialogueId,
      object: rosie.root,
    })
  }
  registerRosie()

  /*
   * Moretti is talkable, and which graph he has depends on the gates. Same
   * re-registration as Rosie and for the same reason: `Lookable` is readonly.
   *
   * He is the objective display. No map, no marker, no checklist: you turn round
   * and ask the constable.
   */
  const registerMoretti = (): void => {
    registry.remove('moretti')
    registry.add({
      id: 'moretti',
      description: 'Constable Moretti.',
      dialogueId: gates.allUnlocked ? MORETTI_THEORISE.id : MORETTI_STANDBY.id,
      object: moretti.root,
    })
  }
  registerMoretti()

  const look = new LookRaycaster(camera, registry, world)
  const hands = await Hands.create(camera)
  const notebook = new Notebook(hudRoot, caseFile)
  const dialogue = new DialogueRunner()
  const dialoguePanel = new DialoguePanel(hudRoot, dialogue)

  // Built before examine wiring so tier-two text can land on it.
  // The prompt is appended after so its scrim sits behind the description line.
  // Asks the registry rather than a snapshot map, because Rosie's line changes
  // when she relocates and a map built from the static list would go stale.
  const hud = new Hud(hudRoot, (id) => registry.get(id)?.description)

  /** Set once the theorise conversation reaches its last node. */
  let sceneComplete = false
  /** BRIEF.md: gloves go on at the front door. Once per scene entry. */
  let glovesDone = false
  const captureMode = new URLSearchParams(window.location.search).get('capture') === '1'

  const scenes = new SceneManager(hudRoot, caseFile)
  scenes.start()

  new TitleCard(hudRoot)

  /**
   * Cold open. BRIEF.md: no interaction, walk, look, listen. The verbs stay
   * locked until Miller crosses the hall threshold (gate 0's box). The prompt
   * is hidden too, because a "click to look around" scrim over a title card is
   * the wrong first impression.
   */
  let coldOpenDone = false

  const targetWorld = new Vector3()
  const targetBounds = new Box3()
  let examiningId: string | undefined = undefined

  /**
   * Where a lookable actually is in the world.
   *
   * Not `getWorldPosition`. Most kit props are a Group left at the origin with
   * their parts placed by world-space extents, so a group origin is the middle
   * of the building rather than the middle of the object. Found by tagging the
   * diary and watching Moretti set off for the front hall.
   */
  const locate = (object: Lookable['object'], into: Vector3): Vector3 => {
    targetBounds.setFromObject(object)
    return targetBounds.isEmpty() ? object.getWorldPosition(into) : targetBounds.getCenter(into)
  }

  /**
   * Crossing the threshold into the hall. Ground floor, past the open front
   * door leaf, still in the entry bay. Capture mode skips it so the shot is clean.
   */
  const tryGlovesOn = (): void => {
    if (glovesDone || captureMode || hands.isPlaying) {
      return
    }
    const p = player.position
    if (p.y > 0.4 || p.z < 2.05 || p.z > 3.4 || Math.abs(p.x) > 1.15) {
      return
    }
    glovesDone = true
    audio.foley.glovesOn()
    const clip = getClip('glovesOn')
    locate(lodge.props.frontDoor, targetWorld)
    hands.play(clip, 'gloves', targetWorld)
  }

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

  /**
   * Tag. Miller calls Moretti over and Moretti bags it.
   *
   * It files nothing. Examine already did that and the case file holds
   * knowledge, not objects. What this changes is that the object leaves in a
   * bag, which is what gates 6 and 7 read at step 13.
   *
   * Deliberately not gated on having examined it first. The player who tags
   * something they have not looked at still has to look at it to know it is
   * there, and a refusal with no stated reason is worse than a wasted walk.
   */
  function tryTag(): void {
    if (hands.isPlaying || notebook.isOpen || dialogue.isActive) {
      return
    }
    const target = look.target
    if (target === undefined || target.taggable !== true) {
      return
    }
    if (gates.isBagged(target.id) || moretti.state === 'approaching' || moretti.state === 'bagging') {
      return
    }
    locate(target.object, targetWorld)
    emit('tag:requested', { objectId: target.id })
    moretti.sendTo(targetWorld, player.position, target.id)
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
    locate(target.object, targetWorld)
    emit('examine:start', { objectId: target.id })
    hands.play(getClip(target.clipId), target.id, targetWorld)
  }

  function isClipId(id: string): id is ClipId {
    return Object.prototype.hasOwnProperty.call(CLIPS, id)
  }

  moretti.onBagged = (objectId) => {
    // The tracker records it off the bus, so nothing here keeps a second list.
    emit('tag:bagged', { objectId })
    // The object goes with him. Hiding it is the whole point of the verb, and
    // it is also what stops the player tagging the same hammer twice.
    const lookable = registry.get(objectId)
    if (lookable !== undefined) {
      lookable.object.visible = false
      registry.remove(objectId)
    }
    const graph = MORETTI_BAG[objectId]
    if (graph !== undefined) {
      dialogue.start(graph)
    }
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

  gates.onUnlocked = (gateId) => {
    console.debug('gate', gateId)

    if (gateId === 'entry' && !coldOpenDone) {
      coldOpenDone = true
      updatePrompt()
    }

    /*
     * Rosie moves on gate 1, not on a position check.
     *
     * Gate 1 is Miller working the body, so he is in 1A with his back to the
     * door and the move cannot be seen from anywhere. It also honours what she
     * told him at the desk: she is in the parlour by the time he comes back
     * down, because she went while he was busy.
     */
    if (gateId === 'body' && rosie.station === 'reception') {
      rosie.setStation('parlour')
      registerRosie()
    }

    // The last gate is what gives Moretti the exit conversation.
    if (gates.allUnlocked) {
      registerMoretti()
    }
  }

  const prompt = document.createElement('div')
  prompt.className = 'prompt'
  hudRoot.appendChild(prompt)

  const CONTROLS =
    'WASD move &middot; Shift run &middot; C or Ctrl crouch &middot; Q and E lean &middot; Hold F examine &middot; F talk &middot; G tag &middot; N case file &middot; Esc release mouse'

  const updatePrompt = (): void => {
    // Ask the runner, not the panel. The runner sets its state before it emits
    // dialogue:start, and the panel opens on the callback after it, so a panel
    // check here runs one step too early and leaves the prompt over the scene.
    if (input.isLocked || notebook.isOpen || dialogue.isActive || sceneComplete || !coldOpenDone) {
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
      : `<strong>Click to look around</strong><span>${CONTROLS}</span>`
  }

  /*
   * Sound starts on the same gesture that asks for pointer lock.
   *
   * All three of these, because the click is the normal path, the mousedown is
   * the drag-to-look fallback in documents that refuse the lock, and the keydown
   * catches a player who reaches for WASD before clicking anything. `unlock` is
   * idempotent.
   */
  const unlockAudio = (): void => {
    audio.unlock()
  }
  canvas.addEventListener('click', unlockAudio)
  canvas.addEventListener('mousedown', unlockAudio)
  window.addEventListener('keydown', unlockAudio)

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

  /*
   * The scene exit. Reaching the last node of the theorise graph ends scene 1.
   * SceneManager owns the fade and the save written on that boundary.
   */
  events.on('dialogue:end', ({ nodeId }) => {
    if (sceneComplete || nodeId !== THEORISE_LAST_NODE) {
      return
    }
    sceneComplete = true
    registry.remove('moretti')
    hud.clearExamine()
    updatePrompt()
    emit('scene:complete', { id: 'scene1' })
  })

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
    lodge.update(elapsed, player.position)
    // Ambience crossfades on where he is standing, which is not an event.
    audio.update(player.position)
    // Ahead of the notebook and dialogue early-outs. She is on screen for the
    // whole conversation and a figure that freezes the moment you talk to her
    // is worse than one that never moved.
    rosie.update(delta, player.position)
    // Ahead of the early-outs with Rosie, and for the same reason: he is on
    // screen walking toward something when the panel opens on him arriving.
    moretti.update(delta, player.position)

    if (input.wasPressed('notebook')) {
      if (dialogue.isActive) {
        // Notebook waits. Finish or leave the conversation first.
        input.endFrame()
        draw()
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
      draw()
      input.endFrame()
      return
    }

    player.update(delta)
    tryGlovesOn()
    look.update()
    gates.update(player.position)

    /*
     * Cold open. Walk, look, listen. No verbs until Miller is inside the hall.
     * The look raycast still runs so the player can see descriptions of the
     * tape, the neon, the car, but nothing can be examined, talked to, or
     * tagged, and the notebook stays shut.
     */
    if (!coldOpenDone) {
      hands.update(delta)
      draw()
      input.endFrame()
      return
    }

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

    if (input.wasPressed('tag')) {
      tryTag()
    }

    hands.update(delta)
    draw()
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
      verandah,
      yard,
      rosie,
      moretti,
      gates,
      solver,
      lighting,
      audio,
      grade,
      scenes,
      clips: CLIPS,
      Vector3,
    })

    const shotCtx = { player, hands, hud, hudRoot }
    Reflect.set(window, '__SHOTS__', Object.fromEntries(listShots().map((n) => [n, true])))
    Reflect.set(window, '__APPLY_SHOT__', (name: string) => applyShot(name, shotCtx))

    const params = new URLSearchParams(window.location.search)
    if (params.get('capture') === '1') {
      const name = params.get('shot') ?? '1a'
      applyShot(name, shotCtx)
      // One frame so the placed camera and the shadow map settle before the
      // harness is allowed to treat the page as ready.
      requestAnimationFrame(() => {
        draw()
        Reflect.set(window, '__READY__', true)
      })
    } else {
      Reflect.set(window, '__READY__', true)
    }
  }
}

main().catch((error: unknown) => {
  console.error(error)
})
