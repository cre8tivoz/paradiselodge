import './style.css'
import {
  AgXToneMapping,
  Box3,
  Group,
  LineSegments,
  Mesh,
  NoToneMapping,
  Points,
  Scene,
  Vector3,
} from 'three'
import type { BufferGeometry, Material, Object3D } from 'three'
import * as events from './core/events.ts'
import { emit } from './core/events.ts'
import { Input } from './core/input.ts'
import { Loop } from './core/loop.ts'
import { isSceneId, type SceneId } from './core/save.ts'
import { SceneManager } from './core/scene.ts'
import { createViewport } from './render/renderer.ts'
import { loadEnvironment, type Environment } from './render/environment.ts'
import { buildSceneLighting } from './render/lighting.ts'
import { readLookMode } from './render/look-mode.ts'
import { installDuskLook } from './render/dusk.ts'
import { buildPost, GRADES, type PostStack } from './render/post.ts'
import { installNightSkyEnvironment, type SkyEnvironment } from './world/exterior-dusk.ts'
import { buildLodge } from './world/lodge.ts'
import { loadLodgeExterior } from './world/lodge-exterior.ts'
import { loadCommodore } from './world/commodore.ts'
import { buildVerandah } from './world/verandah.ts'
import { buildYard } from './world/yard.ts'
import { buildRoom1A } from './world/room1a.ts'
import { installDoorNumberPlates, loadUnitA } from './world/unit-a.ts'
import { BoxCollisionSolver, type WalkableRegion } from './world/collision.ts'
import { buildStation, type StationWorld } from './world/scene2-station.ts'
import { buildLaneway, type LanewayWorld } from './world/scene3-laneway.ts'
import { buildInterviewRoom, type InterviewWorld } from './world/scene4-interview.ts'
import { buildMahoneysBar, type PubWorld } from './world/scene5-pub.ts'
import { PlayerController } from './player/controller.ts'
import { LookRegistry, type Lookable } from './interact/lookable.ts'
import { LookRaycaster } from './interact/look.ts'
import { Hands } from './player/hands/hands.ts'
import { CLIPS, getClip, type ClipId } from './player/hands/clips.ts'
import { Hud } from './ui/hud.ts'
import { TitleCard } from './ui/title-card.ts'
import { LeapTerminal } from './ui/leap-terminal.ts'
import { EndingScreen } from './ui/ending-screen.ts'
import { Audio } from './audio/audio.ts'
import { SoundtrackPlayer } from './audio/soundtrack.ts'
import { CaseFile } from './case/casefile.ts'
import { Notebook } from './case/notebook.ts'
import { getEvidence } from './case/evidence.ts'
import { GateTracker } from './case/gates.ts'
import { Scene2GateTracker } from './case/gates-scene2.ts'
import { Scene3GateTracker } from './case/gates-scene3.ts'
import { Scene4GateTracker } from './case/gates-scene4.ts'
import { Scene5GateTracker } from './case/gates-scene5.ts'
import type { DialogueGraph } from './dialogue/graph.ts'
import { DialogueRunner } from './dialogue/runner.ts'
import { DialoguePanel } from './dialogue/panel.ts'
import { ROSIE_RECEPTION } from './dialogue/graphs/rosie-reception.ts'
import { ROSIE_PARLOUR } from './dialogue/graphs/rosie-parlour.ts'
import { MORETTI_BAG } from './dialogue/graphs/moretti-bag.ts'
import { MORETTI_STANDBY, MORETTI_THEORISE, THEORISE_LAST_NODE } from './dialogue/graphs/moretti-exit.ts'
import { FORENSICS_INTAKE, FORENSICS_DONE } from './dialogue/graphs/forensics-tech.ts'
import { MARK_INTERVIEW } from './dialogue/graphs/mark-interview.ts'
import {
  MORETTI_STATION_STANDBY,
  MORETTI_STATION_INTERVIEW,
  MORETTI_STATION_EXIT,
  SCENE2_THEORISE_LAST_NODE,
} from './dialogue/graphs/moretti-scene2.ts'
import { SCENE3_RADIO_ARREST, SCENE3_THEORISE_LAST_NODE } from './dialogue/graphs/scene3-radio.ts'
import {
  SCENE4_TAPE_CAUTION,
  SCENE4_VICTOR_INTERROGATION,
  SCENE4_THEORISE_LAST_NODE,
  setScene4ConcludePredicate,
} from './dialogue/graphs/scene4-interrogation.ts'
import {
  SCENE5_STERLING_CONFRONTATION,
  SCENE5_CELLAR_SAFE,
  SCENE5_FINAL_ARREST,
} from './dialogue/graphs/scene5-mahoneys.ts'
import { buildRosie, type Rosie } from './npc/rosie.ts'
import { buildMoretti, type Moretti } from './npc/moretti.ts'
import { applyShot, listShots } from './dev/shots.ts'

const canvasEl = document.querySelector<HTMLCanvasElement>('#game')
const hudRootEl = document.querySelector<HTMLDivElement>('#hud')

if (canvasEl === null || hudRootEl === null) {
  throw new Error('index.html is missing #game or #hud')
}

const canvas = canvasEl
const hudRoot = hudRootEl

function assertNever(value: never): never {
  throw new Error(`Unhandled scene id: ${String(value)}`)
}

function sceneForShot(shot: string | null, fallback: SceneId): SceneId {
  if (shot === null) return fallback
  if (shot.startsWith('station-')) return 'scene2'
  if (shot.startsWith('laneway-')) return 'scene3'
  if (shot.startsWith('interview-')) return 'scene4'
  if (shot.startsWith('mahoneys-')) return 'scene5'
  return 'scene1'
}

function disposeSubtree(root: Object3D): void {
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<Material>()
  root.traverse((node) => {
    if (node instanceof Mesh || node instanceof LineSegments || node instanceof Points) {
      geometries.add(node.geometry)
      const mats = Array.isArray(node.material) ? node.material : [node.material]
      for (const mat of mats) {
        materials.add(mat)
      }
    }
  })
  for (const geometry of geometries) {
    geometry.dispose()
  }
  for (const material of materials) {
    material.dispose()
  }
}

interface MutableShotContext {
  player: PlayerController
  hands: Hands
  hud: Hud
  hudRoot: HTMLElement
  rosie?: Rosie
  station?: StationWorld
  laneway?: LanewayWorld
  interview?: InterviewWorld
  pub?: PubWorld
}

interface DevHandle {
  player: PlayerController
  camera: ReturnType<typeof createViewport>['camera']
  scene: Scene
  world: Group
  renderer: ReturnType<typeof createViewport>['renderer']
  input: Input
  loop: Loop | undefined
  events: typeof events
  look: LookRaycaster
  registry: LookRegistry
  hud: Hud
  hands: Hands
  caseFile: CaseFile
  notebook: Notebook
  dialogue: DialogueRunner
  dialoguePanel: DialoguePanel
  graphs: Map<string, DialogueGraph>
  lodge: ReturnType<typeof buildLodge> | undefined
  station: StationWorld | undefined
  laneway: LanewayWorld | undefined
  interview: InterviewWorld | undefined
  pub: PubWorld | undefined
  rosie: Rosie | undefined
  moretti: Moretti | undefined
  gates: GateTracker | undefined
  gates2: Scene2GateTracker | undefined
  gates3: Scene3GateTracker | undefined
  gates4: Scene4GateTracker | undefined
  gates5: Scene5GateTracker | undefined
  dusk: Awaited<ReturnType<typeof installDuskLook>> | undefined
  post: PostStack | undefined
  leapTerminal: LeapTerminal | undefined
  endingScreen: EndingScreen | undefined
  solver: BoxCollisionSolver
  audio: Audio
  soundtrack: SoundtrackPlayer
  scenes: SceneManager
  clips: typeof CLIPS
  Vector3: typeof Vector3
}

async function main(): Promise<void> {
  const { renderer, camera } = createViewport(canvas)

  const scene = new Scene()
  const world = new Group()
  scene.add(world)
  scene.add(camera)

  const caseFile = new CaseFile()
  const scenes = new SceneManager(hudRoot, caseFile)
  if (scenes.stored?.evidence !== undefined) {
    for (const id of scenes.stored.evidence) {
      caseFile.file(id, 'prior_save')
    }
  }

  const params = new URLSearchParams(window.location.search)
  const captureMode = params.get('capture') === '1'
  const requestedShot = params.get('shot')
  const bootScene: SceneId = sceneForShot(requestedShot, scenes.currentId)

  const solids: Box3[] = []
  const floors: WalkableRegion[] = []
  const solver = new BoxCollisionSolver(solids, floors)
  const registry = new LookRegistry()
  const graphs = new Map<string, DialogueGraph>()
  const examinedIds = new Set<string>()

  const input = new Input(canvas)
  const player = new PlayerController(camera, input, solver, new Vector3(), 0)
  const look = new LookRaycaster(camera, registry, world)
  const hands = await Hands.create(camera)
  const notebook = new Notebook(hudRoot, caseFile)
  const dialogue = new DialogueRunner()
  const dialoguePanel = new DialoguePanel(hudRoot, dialogue)

  const audio = new Audio(bootScene)
  const soundtrack = new SoundtrackPlayer(audio.mixer)
  soundtrack.play(bootScene)

  let activeScene: SceneId = bootScene
  let sceneComplete = false
  let glovesDone = false
  let coldOpenDone = bootScene !== 'scene1'
  let examiningId: string | undefined = undefined
  let sceneElapsed = 0

  let lodge: ReturnType<typeof buildLodge> | undefined
  let rosie: Rosie | undefined
  let moretti: Moretti | undefined
  let dusk: Awaited<ReturnType<typeof installDuskLook>> | undefined
  let environment: Environment | undefined
  let lightingGroup: Group | undefined

  let station: StationWorld | undefined
  let laneway: LanewayWorld | undefined
  let interview: InterviewWorld | undefined
  let pub: PubWorld | undefined

  let s25Post: PostStack | undefined
  let s25Sky: SkyEnvironment | undefined

  let gates: GateTracker | undefined
  let gates2: Scene2GateTracker | undefined
  let gates3: Scene3GateTracker | undefined
  let gates4: Scene4GateTracker | undefined
  let gates5: Scene5GateTracker | undefined

  let titleCard: TitleCard | undefined
  let endingScreen: EndingScreen | undefined
  let leapTerminal: LeapTerminal | undefined

  const hud = new Hud(hudRoot, (id) => {
    if (
      activeScene === 'scene1' &&
      rosie !== undefined &&
      id === 'lodge.desk' &&
      rosie.station === 'reception'
    ) {
      return 'Reception desk. A woman behind it.'
    }
    return registry.get(id)?.description
  })

  const prompt = document.createElement('div')
  prompt.className = 'prompt'
  hudRoot.appendChild(prompt)

  const CONTROLS =
    'WASD move &middot; Shift run &middot; C crouch &middot; F examine or talk &middot; G tag &middot; N case file &middot; Esc cancel / release mouse'

  const updatePrompt = (): void => {
    if (
      input.isLocked ||
      notebook.isOpen ||
      dialogue.isActive ||
      sceneComplete ||
      !coldOpenDone ||
      (leapTerminal !== undefined && leapTerminal.visible)
    ) {
      prompt.style.display = 'none'
      return
    }
    prompt.style.display = 'flex'
    prompt.classList.add('is-hint')
    prompt.innerHTML = input.isLockRefused
      ? '<strong>Drag to look around</strong>' +
        `<span>${CONTROLS}</span>` +
        '<span class="prompt-note">This browser refused pointer lock, so hold the left button to turn. Hold F to examine.</span>'
      : `<strong>Click to look around</strong><span>${CONTROLS}</span><span class="prompt-note">Aim at a thing. Press F. Watch the hands. Then open N for the case file.</span>`
  }

  const registerRosie = (): void => {
    if (rosie === undefined) return
    registry.remove('rosie')
    registry.add({
      id: 'rosie',
      description: rosie.current.description,
      dialogueId: rosie.current.dialogueId,
      object: rosie.root,
    })
  }

  const registerMoretti = (): void => {
    if ((activeScene !== 'scene1' && activeScene !== 'scene2') || moretti === undefined) {
      registry.remove('moretti')
      return
    }
    registry.remove('moretti')
    let dialogueId = MORETTI_STANDBY.id
    if (activeScene === 'scene2') {
      if (gates2?.allUnlocked === true) {
        dialogueId = MORETTI_STATION_EXIT.id
      } else if (gates2?.has('hammer_report') === true) {
        dialogueId = MORETTI_STATION_INTERVIEW.id
      } else {
        dialogueId = MORETTI_STATION_STANDBY.id
      }
    } else if (gates?.allUnlocked === true) {
      dialogueId = MORETTI_THEORISE.id
    }
    registry.add({
      id: 'moretti',
      description: 'Constable Moretti.',
      dialogueId,
      object: moretti.root,
    })
  }

  const wireMorettiBagging = (npc: Moretti): void => {
    npc.onBagged = (objectId) => {
      emit('tag:bagged', { objectId })
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
  }

  const shotCtx: MutableShotContext = {
    player,
    hands,
    hud,
    hudRoot,
  }

  const devHandle: DevHandle | undefined = import.meta.env.DEV
    ? {
        player,
        camera,
        scene,
        world,
        renderer,
        input,
        loop: undefined,
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
        station,
        laneway,
        interview,
        pub,
        rosie,
        moretti,
        gates,
        gates2,
        gates3,
        gates4,
        gates5,
        dusk,
        post: s25Post,
        leapTerminal,
        endingScreen,
        solver,
        audio,
        soundtrack,
        scenes,
        clips: CLIPS,
        Vector3,
      }
    : undefined

  const syncHandles = (): void => {
    shotCtx.rosie = rosie
    shotCtx.station = station
    shotCtx.laneway = laneway
    shotCtx.interview = interview
    shotCtx.pub = pub

    if (devHandle !== undefined) {
      devHandle.lodge = lodge
      devHandle.station = station
      devHandle.laneway = laneway
      devHandle.interview = interview
      devHandle.pub = pub
      devHandle.rosie = rosie
      devHandle.moretti = moretti
      devHandle.gates = gates
      devHandle.gates2 = gates2
      devHandle.gates3 = gates3
      devHandle.gates4 = gates4
      devHandle.gates5 = gates5
      devHandle.dusk = dusk
      devHandle.post = s25Post
      devHandle.leapTerminal = leapTerminal
      devHandle.endingScreen = endingScreen
    }
  }

  const disposeActiveScene = (): void => {
    if (hands.isPlaying) hands.cancel()
    examiningId = undefined
    if (dialogue.isActive) dialogue.cancel()
    if (notebook.isOpen) notebook.close()
    hud.clearExamine()

    titleCard?.dispose()
    titleCard = undefined
    endingScreen?.dispose()
    endingScreen = undefined
    leapTerminal?.dispose()
    leapTerminal = undefined

    dusk?.dispose()
    dusk = undefined
    environment?.dispose()
    environment = undefined
    s25Post?.dispose()
    s25Post = undefined
    s25Sky?.dispose()
    s25Sky = undefined

    gates?.dispose()
    gates = undefined
    gates2?.dispose()
    gates2 = undefined
    gates3?.dispose()
    gates3 = undefined
    gates4?.dispose()
    gates4 = undefined
    gates5?.dispose()
    gates5 = undefined

    setScene4ConcludePredicate(() => true)

    while (world.children.length > 0) {
      const child = world.children[0]
      if (child !== undefined) {
        world.remove(child)
        disposeSubtree(child)
      }
    }
    if (lightingGroup !== undefined) {
      lightingGroup.removeFromParent()
      disposeSubtree(lightingGroup)
      lightingGroup = undefined
    }

    renderer.toneMapping = AgXToneMapping
    renderer.toneMappingExposure = 1
    renderer.shadowMap.autoUpdate = true
    renderer.setClearColor(0x000000, 1)
    scene.fog = null
    scene.environment = null
    scene.background = null

    look.clear()
    registry.clear()
    graphs.clear()
    examinedIds.clear()
    solids.length = 0
    floors.length = 0

    lodge = undefined
    rosie = undefined
    moretti = undefined
    station = undefined
    laneway = undefined
    interview = undefined
    pub = undefined
    syncHandles()
  }

  const mountScene = async (id: SceneId): Promise<void> => {
    activeScene = id
    sceneComplete = false
    glovesDone = false
    coldOpenDone = id !== 'scene1'
    examiningId = undefined
    sceneElapsed = 0

    switch (id) {
      case 'scene1': {
        lodge = buildLodge()
        world.add(lodge.group)

        const [unitA, lodgeExterior, commodore] = await Promise.all([
          loadUnitA(),
          loadLodgeExterior(),
          loadCommodore(),
        ])
        lodge.interiorVisuals.removeFromParent()
        world.add(lodgeExterior.scene)
        lodge.props.neon.clear()
        lodge.props.neon.add(lodgeExterior.neon)
        lodge.props.commodore.clear()
        lodge.props.commodore.add(commodore)

        const room = await buildRoom1A(
          {
            position: new Vector3(4.0, 3.45, 2.6),
            rotationY: Math.PI / 2,
          },
          unitA.scene,
        )
        world.add(room.group)
        installDoorNumberPlates(unitA.scene, room.group)

        const lodgeProps = { ...lodge.props, ...unitA.props }
        const verandah = buildVerandah()
        world.add(verandah.group)

        const yard = buildYard()
        world.add(yard.group)

        rosie = await buildRosie()
        world.add(rosie.root)

        const lighting = buildSceneLighting()
        lightingGroup = lighting.group
        scene.add(lightingGroup)

        const lookMode = readLookMode()
        if (lookMode === 'day') {
          environment = await loadEnvironment(renderer)
          environment.apply(scene)
        } else {
          dusk = await installDuskLook({
            renderer,
            scene,
            camera,
            interior: unitA.scene,
            lodge: lodge.group,
            exterior: lodgeExterior.scene,
            commodore,
            sun: lighting.sun,
          })
        }

        solids.push(
          ...lodge.solids,
          ...room.solids,
          ...verandah.solids,
          ...yard.solids,
          ...rosie.solids,
        )
        floors.push(...lodge.floors, ...room.floors, ...verandah.floors, ...yard.floors)
        player.place(lodge.spawn, lodge.spawnYaw, 0)

        moretti = await buildMoretti(solver)
        world.add(moretti.root)
        solids.push(...moretti.solids)
        wireMorettiBagging(moretti)

        gates = new GateTracker(caseFile)
        gates.onUnlocked = (gateId) => {
          console.debug('gate', gateId)
          if (gateId === 'entry' && !coldOpenDone) {
            coldOpenDone = true
            updatePrompt()
          }
          if (gateId === 'body' && rosie !== undefined && rosie.station === 'reception') {
            rosie.setStation('parlour')
            registerRosie()
          }
          if (gates?.allUnlocked === true) {
            registerMoretti()
          }
        }

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

        const scene1Lookables: Lookable[] = [
          {
            id: '1a.bed',
            description: 'Single bed. Chenille spread, dusty pink.',
            object: room.props.bed,
          },
          {
            id: '1a.crystal',
            description: 'A woman on the bed. Cream dress.',
            examine: temple.examine,
            clipId: 'turnHead',
            evidenceId: temple.id,
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
            description: 'Timber dresser under the street window.',
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
            description: 'Small table beside the dresser.',
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
            description: 'Reception desk.',
            object: lodgeProps.desk,
          },
          {
            id: 'lodge.keyRack',
            description: 'Pigeonholes. Most of them still have a key in them.',
            object: lodgeProps.keyRack,
          },
          {
            id: 'lodge.ledger',
            description: 'Guest ledger, open on the desk.',
            object: lodgeProps.ledger,
          },
          {
            id: 'lodge.phone',
            description: 'Bakelite phone. The cord is twisted right up.',
            object: lodgeProps.phone,
          },
          {
            id: 'lodge.ashtray',
            description: 'Ashtray on the desk. Full.',
            object: lodgeProps.ashtray,
          },
          {
            id: 'lodge.stairs',
            description: 'The staircase. Runner worn through on the treads.',
            object: lodgeProps.stairs,
          },
          {
            id: 'lodge.armchair',
            description: 'Armchairs round a low table.',
            object: lodgeProps.armchair,
          },
          {
            id: 'lodge.parlourTable',
            description: 'Low table in the middle of the parlour.',
            object: lodgeProps.parlourTable,
          },
          {
            id: 'lodge.diary',
            description: diary.look,
            examine: diary.examine,
            clipId: 'liftNote',
            evidenceId: diary.id,
            taggable: true,
            object: lodgeProps.diary,
          },
          {
            id: 'lodge.television',
            description: 'Television in the corner. Off.',
            object: lodgeProps.television,
          },
          {
            id: 'lodge.standardLamp',
            description: 'Standard lamp. Shade gone yellow.',
            object: lodgeProps.standardLamp,
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
            clipId: 'leanIn',
            evidenceId: hammer.id,
            taggable: true,
            object: yard.props.hammer,
          },
        ]
        for (const lookable of scene1Lookables) {
          registry.add(lookable)
        }
        registerRosie()
        registerMoretti()

        graphs.set(ROSIE_RECEPTION.id, ROSIE_RECEPTION)
        graphs.set(ROSIE_PARLOUR.id, ROSIE_PARLOUR)
        graphs.set(MORETTI_STANDBY.id, MORETTI_STANDBY)
        graphs.set(MORETTI_THEORISE.id, MORETTI_THEORISE)
        for (const graph of Object.values(MORETTI_BAG)) {
          graphs.set(graph.id, graph)
        }

        titleCard = new TitleCard(hudRoot, 'ST KILDA', '26 FEBRUARY 1994')
        break
      }

      case 'scene2': {
        station = await buildStation()
        world.add(station.group)
        solids.push(...station.solids)
        floors.push(...station.floors)
        player.place(station.spawn, station.spawnYaw, 0)

        moretti = await buildMoretti(solver, new Vector3(2.9, 0, 1.2), Math.PI)
        world.add(moretti.root)
        solids.push(...moretti.solids)
        wireMorettiBagging(moretti)

        gates2 = new Scene2GateTracker(caseFile)
        leapTerminal = new LeapTerminal(hudRoot, caseFile)

        renderer.toneMapping = NoToneMapping
        renderer.toneMappingExposure = 1
        s25Post = buildPost(renderer, scene, camera, () => [])
        s25Post.applyGrade(GRADES.precinct)

        const registerStationReport = (): void => {
          if (station === undefined) return
          station.props.forensicsReport.visible = true
          if (registry.get('station.report') === undefined) {
            registry.add({
              id: 'station.report',
              description: 'Manila folder from Forensics. Wet ink stamp: MATCH FOUND.',
              examine:
                'Latent prints on the handle match Victor Rakov. Associated with the King Street Crew.',
              clipId: 'liftNote',
              evidenceId: 'hammer_report',
              object: station.props.forensicsReport,
            })
          }
        }

        gates2.onUnlocked = (gateId) => {
          console.debug('gate2', gateId)
          if (gateId === 'drop_hammer') {
            registerStationReport()
          }
          registerMoretti()
        }

        const scene2Lookables: Lookable[] = [
          {
            id: 'station.forensics_hatch',
            description: 'Forensics intake counter. Wire-glass hatch with a bell.',
            examine: 'Drop the tagged hammer into the intake tray.',
            dialogueId: FORENSICS_INTAKE.id,
            clipId: 'leanIn',
            object: station.props.forensicsHatch,
          },
          {
            id: 'station.coffee_urn',
            description: 'Stainless steel electric urn. Simmering on the break bench.',
            examine: 'Pour a mug of instant coffee. Scalding, black, bitter.',
            clipId: 'leanIn',
            object: station.props.urn,
          },
          {
            id: 'station.noticeboard',
            description: 'Noticeboard. Shift rosters, union notices, and armed robbery photokits.',
            object: station.props.noticeboard,
          },
          {
            id: 'station.desk',
            description: "Miller's desk. Metal drawers, blotter, and a banker's lamp.",
            object: station.props.deskGroup,
          },
          {
            id: 'station.leap',
            description: 'Green phosphor CRT terminal. Victoria Police LEAP mainframe.',
            examine: 'Query Victor Rakov criminal record on the mainframe.',
            evidenceId: 'rakov_profile',
            object: station.props.leapTerminal,
          },
          {
            id: 'station.mark',
            description: 'Mark sitting in the interview cubicle, head down in his hands.',
            dialogueId: MARK_INTERVIEW.id,
            object: station.props.markActor,
          },
        ]
        for (const lookable of scene2Lookables) {
          registry.add(lookable)
        }
        registerMoretti()

        graphs.set(FORENSICS_INTAKE.id, FORENSICS_INTAKE)
        graphs.set(FORENSICS_DONE.id, FORENSICS_DONE)
        graphs.set(MARK_INTERVIEW.id, MARK_INTERVIEW)
        graphs.set(MORETTI_STATION_STANDBY.id, MORETTI_STATION_STANDBY)
        graphs.set(MORETTI_STATION_INTERVIEW.id, MORETTI_STATION_INTERVIEW)
        graphs.set(MORETTI_STATION_EXIT.id, MORETTI_STATION_EXIT)

        titleCard = new TitleCard(hudRoot, 'ST KILDA PRECINCT', '26 FEBRUARY 1994 &middot; 21:15')
        break
      }

      case 'scene3': {
        laneway = await buildLaneway()
        world.add(laneway.group)
        solids.push(...laneway.solids)
        floors.push(...laneway.floors)
        player.place(laneway.spawn, laneway.spawnYaw, 0)

        gates3 = new Scene3GateTracker(caseFile)
        gates3.onUnlocked = (gateId) => {
          console.debug('gate3', gateId)
        }

        s25Sky = installNightSkyEnvironment(renderer, scene, new Vector3(0.4, 0.7, 0.3))
        renderer.toneMapping = NoToneMapping
        renderer.toneMappingExposure = 1
        s25Post = buildPost(renderer, scene, camera, () =>
          s25Sky !== undefined ? [s25Sky.sky] : [],
        )
        s25Post.applyGrade(GRADES.nightAlley)

        const scene3Lookables: Lookable[] = [
          {
            id: 'laneway.commodore',
            description: 'Unmarked Victoria Police fleet VP Commodore. Beige, slant-nosed, 3.8L V6.',
            examine: 'The radio is squawking softly on the VHF dispatch frequency.',
            object: laneway.props.commodore,
          },
          {
            id: 'cottage.door',
            description: '14 Regent Street. Weatherboard worker cottage, front door standing slightly ajar.',
            examine: 'Warm light spilling into the porch. Smells like fried onions and stale tobacco.',
            object: laneway.props.cottageDoor,
          },
          {
            id: 'cottage.slip',
            description: 'Small table on the porch with a discarded slip of receipt paper.',
            examine: 'Pencil scribble: "Fitzroy St - grab the book. S." Sterling sent him for the diary.',
            clipId: 'liftNote',
            evidenceId: 'cottage_slip',
            object: laneway.props.cottageSlip,
          },
          {
            id: 'laneway.bin',
            description: 'Council wheelie bin knocked sideways on the bluestone.',
            examine: 'Fresh scuffs on the plastic lid. Victor clipped it as he sprinted past.',
            object: laneway.props.wheelieBin,
          },
          {
            id: 'laneway.pallets',
            description: 'Stack of splintered pine pallets leaning against the fence.',
            examine: 'Grease and road grit.',
            object: laneway.props.pallets,
          },
          {
            id: 'laneway.fence',
            description: 'Dead-end corrugated iron fence. Commercial Road traffic humming on the other side.',
            examine: 'Fresh clay smudges on the galvanised iron where Rakov scrambled over.',
            object: laneway.props.lanewayFence,
          },
          {
            id: 'laneway.bootprint',
            description: 'Deep boot impression in the wet clay mud at the base of the fence.',
            examine: 'Heavy lug pattern matches the partial on the Room 1A windowsill.',
            clipId: 'leanIn',
            evidenceId: 'victor_bootprint',
            object: laneway.props.bootprint,
          },
          {
            id: 'laneway.radio',
            description: 'Victoria Police VHF radio unit. Moretti is calling on the divisional channel.',
            examine: 'Answer Moretti on the radio.',
            dialogueId: SCENE3_RADIO_ARREST.id,
            clipId: 'leanIn',
            object: laneway.props.radio,
          },
        ]
        for (const lookable of scene3Lookables) {
          registry.add(lookable)
        }

        graphs.set(SCENE3_RADIO_ARREST.id, SCENE3_RADIO_ARREST)

        titleCard = new TitleCard(hudRoot, '14 REGENT STREET, PRAHRAN', '26 FEBRUARY 1994 &middot; 22:30')
        break
      }

      case 'scene4': {
        interview = await buildInterviewRoom()
        world.add(interview.group)
        solids.push(...interview.solids)
        floors.push(...interview.floors)
        player.place(interview.spawn, interview.spawnYaw, 0)

        gates4 = new Scene4GateTracker(caseFile)
        gates4.onUnlocked = (gateId) => {
          console.debug('gate4', gateId)
        }

        setScene4ConcludePredicate(
          () =>
            gates4 !== undefined &&
            gates4.has('confront_hammer') &&
            gates4.has('confront_bootprint') &&
            gates4.has('confront_slip') &&
            (gates4.has('sterlings_hideout') || caseFile.has('sterlings_orders')),
        )

        renderer.toneMapping = NoToneMapping
        renderer.toneMappingExposure = 1
        s25Post = buildPost(renderer, scene, camera, () => [])
        s25Post.applyGrade(GRADES.precinct)

        const scene4Lookables: Lookable[] = [
          {
            id: 'interview.tape',
            description: 'Realistic CTR-80 dual-cassette police recorder. Red recording LED glowing.',
            examine: 'Formal caution and record of interview under Section 464A.',
            dialogueId: SCENE4_TAPE_CAUTION.id,
            clipId: 'leanIn',
            object: interview.props.tapeRecorder,
          },
          {
            id: 'interview.folder',
            description: 'Manila case folder stamped ST KILDA CID. Crime scene photos and forensics reports.',
            examine:
              'Forensics report: latent hammer prints match Rakov. Window mud matches Rakov size 10 workboots.',
            clipId: 'liftNote',
            object: interview.props.caseFolder,
          },
          {
            id: 'interview.victor',
            description: 'Victor Rakov seated across the table. Defensive posture, bruised denim jacket.',
            examine: 'Interrogate Victor Rakov.',
            dialogueId: SCENE4_VICTOR_INTERROGATION.id,
            object: interview.props.victorActor,
          },
          {
            id: 'interview.moretti',
            description: 'Constable Moretti seated by the wall, recording notes on a clipboard.',
            object: interview.props.morettiObserver,
          },
          {
            id: 'interview.door',
            description: 'Soundproof steel fire door. Wire-glass observation pane looking into the corridor.',
            object: interview.props.interviewDoor,
          },
        ]
        for (const lookable of scene4Lookables) {
          registry.add(lookable)
        }

        graphs.set(SCENE4_TAPE_CAUTION.id, SCENE4_TAPE_CAUTION)
        graphs.set(SCENE4_VICTOR_INTERROGATION.id, SCENE4_VICTOR_INTERROGATION)

        titleCard = new TitleCard(
          hudRoot,
          'ST KILDA CID &middot; INTERVIEW ROOM 1',
          '26 FEBRUARY 1994 &middot; 22:50',
        )
        break
      }

      case 'scene5': {
        pub = await buildMahoneysBar()
        world.add(pub.group)
        solids.push(...pub.solids)
        floors.push(...pub.floors)
        player.place(pub.spawn, pub.spawnYaw, 0)

        gates5 = new Scene5GateTracker(caseFile)
        gates5.onUnlocked = (gateId) => {
          console.debug('gate5', gateId)
        }

        renderer.toneMapping = NoToneMapping
        renderer.toneMappingExposure = 1
        s25Post = buildPost(renderer, scene, camera, () => [])
        s25Post.applyGrade(GRADES.pub)

        const scene5Lookables: Lookable[] = [
          {
            id: 'mahoneys.sterling',
            description: 'Kenneth Sterling behind the mahogany bar. Smug expression, dark tweed vest.',
            examine: 'Confront Kenneth Sterling.',
            dialogueId: SCENE5_STERLING_CONFRONTATION.id,
            object: pub.props.sterlingActor,
          },
          {
            id: 'mahoneys.bar',
            description: 'Dark mahogany bar counter with two chrome Carlton Draught fonts.',
            examine: 'Beer mats, cigarette burns, and sticky varnished timber.',
            object: pub.props.barCounter,
          },
          {
            id: 'mahoneys.brawl',
            description: 'Two punters brawling near the pool table over spilt Carlton pots.',
            examine: 'Two punters trading heavy blows by the pool table.',
            object: pub.props.brawlGroup,
          },
          {
            id: 'cellar.grille',
            description: 'Heavy security iron grille blocking the stairwell down to the beer cellar.',
            examine: 'Locked with a heavy brass mortise padlock stamped M.B. - CELLAR.',
            clipId: 'leanIn',
            object: pub.props.cellarDoor,
          },
          {
            id: 'cellar.safe',
            description: 'Chubb-pattern floor safe recessed into the wet bluestone foundation between the kegs.',
            examine: 'Heavy steel tumbler flush with the cellar floor.',
            dialogueId: SCENE5_CELLAR_SAFE.id,
            clipId: 'openLookClose',
            object: pub.props.floorSafe,
          },
          {
            id: 'mahoneys.exit',
            description: 'Back fire exit leading into the bluestone alley.',
            examine: 'Steel fire door with a push bar onto the back lane.',
            dialogueId: SCENE5_FINAL_ARREST.id,
            object: pub.props.exitDoor,
          },
          {
            id: 'mahoneys.moretti',
            description: 'Constable Moretti keeping an eye on the back exit.',
            examine: 'Standing off the back corridor by the pokies. Eyes on the cellar stairs.',
            dialogueId: SCENE5_FINAL_ARREST.id,
            object: pub.props.morettiActor,
          },
        ]
        for (const lookable of scene5Lookables) {
          registry.add(lookable)
        }

        graphs.set(SCENE5_STERLING_CONFRONTATION.id, SCENE5_STERLING_CONFRONTATION)
        graphs.set(SCENE5_CELLAR_SAFE.id, SCENE5_CELLAR_SAFE)
        graphs.set(SCENE5_FINAL_ARREST.id, SCENE5_FINAL_ARREST)

        titleCard = new TitleCard(
          hudRoot,
          "MAHONEY'S BAR &middot; FITZROY STREET",
          '27 FEBRUARY 1994 &middot; 00:30',
        )
        break
      }

      default:
        assertNever(id)
    }

    syncHandles()
    updatePrompt()
  }

  await mountScene(bootScene)
  if (bootScene !== scenes.currentId) {
    scenes.transitionTo(bootScene)
  } else {
    scenes.start()
  }

  const draw = (): void => {
    if (dusk !== undefined) dusk.render()
    else if (s25Post !== undefined) s25Post.render()
    else renderer.render(scene, camera)
  }

  const targetWorld = new Vector3()
  const targetBounds = new Box3()

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
    if (
      activeScene !== 'scene1' ||
      glovesDone ||
      captureMode ||
      hands.isPlaying ||
      lodge === undefined
    ) {
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
    if (
      hands.isPlaying ||
      notebook.isOpen ||
      dialogue.isActive ||
      (leapTerminal !== undefined && leapTerminal.visible)
    ) {
      return false
    }
    let target = look.target
    if (
      activeScene === 'scene1' &&
      rosie !== undefined &&
      target !== undefined &&
      target.dialogueId === undefined &&
      rosie.station === 'reception' &&
      (target.id === 'lodge.desk' ||
        target.id === 'lodge.ledger' ||
        target.id === 'lodge.phone' ||
        target.id === 'lodge.ashtray' ||
        target.id === 'lodge.keyRack')
    ) {
      target = registry.get('rosie')
    }
    if (target === undefined || target.dialogueId === undefined) {
      return false
    }
    if (target.id === 'cellar.safe' && !caseFile.has('cellar_key')) {
      return false
    }
    if (
      (target.id === 'laneway.radio' ||
        target.id === 'interview.tape' ||
        target.id === 'cellar.safe') &&
      !examinedIds.has(target.id)
    ) {
      return false
    }
    if (
      (target.id === 'mahoneys.exit' || target.id === 'mahoneys.moretti') &&
      !caseFile.has('sterling_ledger')
    ) {
      return false
    }

    const dialogueId =
      target.id === 'mahoneys.sterling' && caseFile.has('sterling_ledger')
        ? SCENE5_FINAL_ARREST.id
        : target.dialogueId

    const graph = graphs.get(dialogueId)
    if (graph === undefined) {
      console.warn(`No dialogue graph "${dialogueId}"`)
      return false
    }
    dialogue.start(graph)
    return true
  }

  function tryTag(): void {
    if (
      hands.isPlaying ||
      notebook.isOpen ||
      dialogue.isActive ||
      (leapTerminal !== undefined && leapTerminal.visible)
    ) {
      return
    }
    const target = look.target
    if (target === undefined) {
      return
    }
    if (target.taggable !== true) {
      hud.showExamine(target.id, 'Nothing here to bag.')
      return
    }
    if (activeScene !== 'scene1' || moretti === undefined) {
      hud.showExamine(target.id, 'Nothing here to bag.')
      return
    }
    if (gates !== undefined && gates.isBagged(target.id)) {
      hud.showExamine(target.id, "Moretti's got that one.")
      return
    }
    if (moretti.state === 'approaching' || moretti.state === 'bagging') {
      hud.showExamine(target.id, "He's on one already.")
      return
    }
    locate(target.object, targetWorld)
    emit('tag:requested', { objectId: target.id })
    moretti.sendTo(targetWorld, player.position, target.id)
  }

  function tryExamine(): void {
    if (
      hands.isPlaying ||
      notebook.isOpen ||
      dialogue.isActive ||
      (leapTerminal !== undefined && leapTerminal.visible)
    ) {
      return
    }
    const target = look.target
    if (target === undefined) {
      return
    }
    if (target.id === 'station.leap') {
      if (!caseFile.has('hammer_report')) {
        hud.showExamine(target.id, 'Wait for the forensics match before running LEAP.')
        return
      }
      leapTerminal?.open()
      return
    }
    if (target.id === 'cellar.safe' && !caseFile.has('cellar_key')) {
      hud.showExamine(target.id, 'Locked Chubb floor safe. Heavy brass keyway between the bolts.')
      return
    }
    if (target.examine === undefined) {
      return
    }
    if (target.clipId === undefined) {
      hud.showExamine(target.id, target.examine)
      return
    }
    if (!isClipId(target.clipId)) {
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

  hands.onComplete = (objectId) => {
    emit('examine:complete', { objectId })
    examinedIds.add(objectId)
    const lookable = registry.get(objectId)
    if (lookable?.examine !== undefined) {
      hud.showExamine(objectId, lookable.examine)
    }
    if (lookable?.evidenceId !== undefined) {
      caseFile.file(lookable.evidenceId, objectId)
    }
    if (objectId === 'station.coffee_urn' && gates2 !== undefined) {
      gates2.recordCoffee()
    }
    if (
      (objectId === 'laneway.radio' ||
        objectId === 'interview.tape' ||
        objectId === 'cellar.safe') &&
      lookable?.dialogueId !== undefined
    ) {
      const g = graphs.get(lookable.dialogueId)
      if (g !== undefined) dialogue.start(g)
    }
    examiningId = undefined
  }

  dialogue.onNodeEnter = (nodeId) => {
    gates4?.recordHeard(nodeId)
    gates5?.recordHeard(nodeId)

    if (nodeId === 'record_on') {
      caseFile.file('tape_caution', 'interview.tape')
    }
    if (nodeId === 'slip_break4') {
      caseFile.file('victor_confession', 'interview.victor')
    }
    if (nodeId === 'sterling_ans2') {
      caseFile.file('sterlings_orders', 'interview.victor')
    }
    if (nodeId === 'key_taken') {
      caseFile.file('cellar_key', 'mahoneys.sterling')
      pub?.setCellarUnlocked(true)
      const grille = registry.get('cellar.grille')
      if (grille !== undefined) {
        registry.remove('cellar.grille')
        registry.add({
          ...grille,
          examine: 'Unlocked brass padlock. Steel grille swung open onto the cellar steps.',
        })
      }
    }
    if (nodeId === 'safe_cracked') {
      pub?.setSafeOpened(true)
      audio.foley.safeOpen()
    }
    if (nodeId === 'ledger_secured') {
      caseFile.file('sterling_ledger', 'cellar.safe')
      pub?.setSterlingFleeing(true)
    }
    if (nodeId === 'final_blackout') {
      caseFile.file('cell_arrest', 'mahoneys.exit')
    }
  }

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
    soundtrack.duck(true)
  })
  events.on('dialogue:end', ({ nodeId }) => {
    soundtrack.duck(false)
    console.debug('dialogue end', nodeId)
    if (nodeId === 'mark.end') {
      caseFile.file('mark_statement', 'station.mark')
      caseFile.file('mahoneys_lead', 'station.mark')
    }
    if (nodeId === 'record_on') {
      caseFile.file('tape_caution', 'interview.tape')
    }
    if (nodeId === 'slip_break4') {
      caseFile.file('victor_confession', 'interview.victor')
    }
    if (nodeId === 'sterling_ans2') {
      caseFile.file('sterlings_orders', 'interview.victor')
    }
    if (nodeId === 'key_taken') {
      caseFile.file('cellar_key', 'mahoneys.sterling')
      pub?.setCellarUnlocked(true)
    }
    if (nodeId === 'ledger_secured') {
      caseFile.file('sterling_ledger', 'cellar.safe')
      pub?.setSterlingFleeing(true)
    }
    if (nodeId === 'wait' || nodeId === 'take') {
      if (gates2 !== undefined && !gates2.has('drop_hammer')) {
        gates2.recordHammerDrop()
        const hatch = registry.get('station.forensics_hatch')
        if (hatch !== undefined) {
          registry.remove('station.forensics_hatch')
          registry.add({
            ...hatch,
            dialogueId: FORENSICS_DONE.id,
          })
        }
      }
    }
    if (nodeId === 'final_blackout' || nodeId === 'watchhouse_ending') {
      caseFile.file('cell_arrest', 'mahoneys.exit')
      if (!sceneComplete) {
        sceneComplete = true
        audio.foley.cellSlam()
        hud.clearExamine()
        updatePrompt()
        emit('scene:complete', { id: 'scene5' })
        endingScreen = new EndingScreen(hudRoot, {
          evidenceCount: caseFile.size,
          onRestart: () => {
            localStorage.removeItem('paradise-lodge.save')
            window.location.search = ''
          },
        })
        syncHandles()
      }
    }
    if (sceneComplete) {
      return
    }
    if (activeScene === 'scene1' && nodeId === THEORISE_LAST_NODE) {
      sceneComplete = true
      registry.remove('moretti')
      hud.clearExamine()
      updatePrompt()
      emit('scene:complete', { id: 'scene1' })
    } else if (activeScene === 'scene2' && nodeId === SCENE2_THEORISE_LAST_NODE) {
      sceneComplete = true
      registry.remove('moretti')
      hud.clearExamine()
      updatePrompt()
      emit('scene:complete', { id: 'scene2' })
    } else if (activeScene === 'scene3' && nodeId === SCENE3_THEORISE_LAST_NODE) {
      sceneComplete = true
      caseFile.file('radio_arrest', 'laneway.radio')
      hud.clearExamine()
      updatePrompt()
      emit('scene:complete', { id: 'scene3' })
    } else if (activeScene === 'scene4' && nodeId === SCENE4_THEORISE_LAST_NODE) {
      sceneComplete = true
      caseFile.file('victor_confession', 'interview.victor')
      caseFile.file('sterlings_orders', 'interview.victor')
      hud.clearExamine()
      updatePrompt()
      emit('scene:complete', { id: 'scene4' })
    }
  })

  let transitionTimer: number | undefined
  events.on('scene:transition', ({ from, to }) => {
    if (captureMode || from === to || !isSceneId(to)) {
      return
    }
    if (transitionTimer !== undefined) {
      window.clearTimeout(transitionTimer)
    }
    transitionTimer = window.setTimeout(() => {
      transitionTimer = undefined
      void (async () => {
        disposeActiveScene()
        audio.setScene(to)
        soundtrack.play(to)
        await mountScene(to)
        scenes.transitionTo(to)
        scenes.fadeIn()
      })()
    }, 2500)
  })

  const unlockAudio = (): void => {
    audio.unlock()
    soundtrack.unlock()
  }
  canvas.addEventListener('click', unlockAudio)
  canvas.addEventListener('mousedown', unlockAudio)
  window.addEventListener('keydown', unlockAudio)

  input.onLockRefused = updatePrompt
  document.addEventListener('pointerlockchange', updatePrompt)
  updatePrompt()

  events.on('look:exit', ({ objectId }) => {
    if (examiningId !== undefined) {
      return
    }
    void objectId
    hud.clearExamine()
  })

  events.on('casefile:open', updatePrompt)
  events.on('casefile:close', updatePrompt)
  events.on('dialogue:start', updatePrompt)
  events.on('dialogue:end', updatePrompt)

  window.addEventListener('resize', () => {
    s25Post?.setSize(window.innerWidth, window.innerHeight)
  })

  const onEscape = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape') {
      return
    }
    if (leapTerminal !== undefined && leapTerminal.visible) {
      leapTerminal.close()
      return
    }
    if (examiningId !== undefined) {
      hands.cancel()
      examiningId = undefined
      hud.clearExamine()
      return
    }
    if (dialoguePanel.isOpen || !notebook.isOpen) {
      return
    }
    notebook.close()
  }
  window.addEventListener('keydown', onEscape)

  const loop = new Loop((delta) => {
    sceneElapsed += delta
    switch (activeScene) {
      case 'scene1':
        lodge?.update(sceneElapsed, player.position)
        dusk?.update(sceneElapsed, player.position)
        rosie?.update(delta, player.position)
        moretti?.update(delta, player.position)
        break
      case 'scene2':
        station?.update(sceneElapsed, player.position)
        moretti?.update(delta, player.position)
        break
      case 'scene3':
        laneway?.update(delta, player.position)
        break
      case 'scene4':
        interview?.update(delta)
        break
      case 'scene5':
        pub?.update(delta)
        break
      default:
        assertNever(activeScene)
    }

    s25Post?.setTime(sceneElapsed)
    audio.update(player.position)

    if (input.wasPressed('notebook')) {
      if (
        !coldOpenDone ||
        dialogue.isActive ||
        (leapTerminal !== undefined && leapTerminal.visible)
      ) {
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

    if (
      notebook.isOpen ||
      dialogue.isActive ||
      (leapTerminal !== undefined && leapTerminal.visible)
    ) {
      if (notebook.isOpen) {
        if (input.wasPressed('forward')) {
          notebook.moveSelection(-1)
        } else if (input.wasPressed('back')) {
          notebook.moveSelection(1)
        }
      }
      hands.update(delta)
      draw()
      input.endFrame()
      return
    }

    player.update(delta)
    tryGlovesOn()
    if (examiningId === undefined) {
      look.update()
    }
    if (gates !== undefined) {
      gates.update(player.position)
    }
    if (gates3 !== undefined) {
      gates3.update(player.position)
    }

    if (!coldOpenDone) {
      hands.update(delta)
      draw()
      input.endFrame()
      return
    }

    if (hands.isPlaying && examiningId !== undefined) {
      // Clip owns the frame. Esc cancel is handled via examiningId.
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

  if (devHandle !== undefined) {
    devHandle.loop = loop
  }

  loop.start()

  if (import.meta.env.DEV && devHandle !== undefined) {
    Reflect.set(window, '__lodge', devHandle)
    Reflect.set(window, '__SHOTS__', Object.fromEntries(listShots().map((n) => [n, true])))
    Reflect.set(window, '__APPLY_SHOT__', (name: string) => applyShot(name, shotCtx))

    if (captureMode) {
      const name = requestedShot ?? '1a'
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
