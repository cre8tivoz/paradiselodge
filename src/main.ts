import './style.css'
import { Box3, Group, Scene, Vector3 } from 'three'
import * as events from './core/events.ts'
import { emit } from './core/events.ts'
import { Input } from './core/input.ts'
import { Loop } from './core/loop.ts'
import { createViewport } from './render/renderer.ts'
import { loadEnvironment } from './render/environment.ts'
import type { Environment } from './render/environment.ts'
import { buildSceneLighting } from './render/lighting.ts'
import { readLookMode } from './render/look-mode.ts'
import { installDuskLook } from './render/dusk.ts'
import { buildLodge } from './world/lodge.ts'
import { loadLodgeExterior } from './world/lodge-exterior.ts'
import { loadCommodore } from './world/commodore.ts'
import { buildVerandah } from './world/verandah.ts'
import { buildYard } from './world/yard.ts'
import { buildRoom1A } from './world/room1a.ts'
import { loadUnitA } from './world/unit-a.ts'
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
import { buildRosie, type Rosie } from './npc/rosie.ts'
import { buildMoretti } from './npc/moretti.ts'
import { MORETTI_BAG } from './dialogue/graphs/moretti-bag.ts'
import { MORETTI_STANDBY, MORETTI_THEORISE, THEORISE_LAST_NODE } from './dialogue/graphs/moretti-exit.ts'
import { buildStation } from './world/scene2-station.ts'
import type { StationWorld } from './world/scene2-station.ts'
import { Scene2GateTracker } from './case/gates-scene2.ts'
import { LeapTerminal } from './ui/leap-terminal.ts'
import { FORENSICS_INTAKE, FORENSICS_DONE } from './dialogue/graphs/forensics-tech.ts'
import { MARK_INTERVIEW } from './dialogue/graphs/mark-interview.ts'
import {
  MORETTI_STATION_STANDBY,
  MORETTI_STATION_INTERVIEW,
  MORETTI_STATION_EXIT,
  SCENE2_THEORISE_LAST_NODE,
} from './dialogue/graphs/moretti-scene2.ts'
import { buildLaneway, type LanewayWorld } from './world/scene3-laneway.ts'
import { Scene3GateTracker } from './case/gates-scene3.ts'
import { SCENE3_RADIO_ARREST, SCENE3_THEORISE_LAST_NODE } from './dialogue/graphs/scene3-radio.ts'
import { SoundtrackPlayer } from './audio/soundtrack.ts'
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
  const world = new Group()

  const caseFile = new CaseFile()
  const scenes = new SceneManager(hudRoot, caseFile)
  if (scenes.stored?.evidence) {
    for (const id of scenes.stored.evidence) {
      caseFile.file(id, 'prior_save')
    }
  }

  const params = new URLSearchParams(window.location.search)
  const requestedShot = params.get('shot')
  const isScene2 =
    scenes.currentId === 'scene2' ||
    (requestedShot !== null && requestedShot.startsWith('station-'))
  const isScene3 =
    scenes.currentId === 'scene3' ||
    (requestedShot !== null && requestedShot.startsWith('laneway-'))

  let station: StationWorld | undefined
  let laneway: LanewayWorld | undefined
  let lodge: ReturnType<typeof buildLodge> | undefined
  let rosie: Rosie | undefined
  let dusk: Awaited<ReturnType<typeof installDuskLook>> | undefined
  let environment: Environment | undefined
  let gates: GateTracker | undefined
  let gates2: Scene2GateTracker | undefined
  let gates3: Scene3GateTracker | undefined
  let leapTerminal: LeapTerminal | undefined

  const solids: Box3[] = []
  const floors: any[] = []
  let spawnPos: Vector3
  let spawnYaw: number
  const lookables: Lookable[] = []
  const graphs = new Map<string, DialogueGraph>()

  if (isScene3) {
    laneway = buildLaneway()
    world.add(laneway.group)
    solids.push(...laneway.solids)
    floors.push(...laneway.floors)
    spawnPos = laneway.spawn
    spawnYaw = laneway.spawnYaw

    gates3 = new Scene3GateTracker(caseFile)

    lookables.push(
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
        dialogueId: 'scene3.radio.arrest',
        clipId: 'leanIn',
        evidenceId: 'radio_arrest',
        object: laneway.props.radio,
      },
    )

    graphs.set(SCENE3_RADIO_ARREST.id, SCENE3_RADIO_ARREST)
  } else if (isScene2) {
    station = buildStation()
    world.add(station.group)
    solids.push(...station.solids)
    floors.push(...station.floors)
    spawnPos = station.spawn
    spawnYaw = station.spawnYaw

    gates2 = new Scene2GateTracker(caseFile)
    leapTerminal = new LeapTerminal(hudRoot, caseFile)

    lookables.push(
      {
        id: 'station.forensics_hatch',
        description: 'Forensics intake counter. Wire-glass hatch with a bell.',
        examine: 'Drop the tagged hammer into the intake tray.',
        dialogueId: 'forensics.intake',
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
        object: station.props.forensicsReport,
      },
      {
        id: 'station.report',
        description: 'Manila folder from Forensics. Wet ink stamp: MATCH FOUND.',
        examine: 'Latent prints on the handle match Victor Rakov. Associated with the King Street Crew.',
        clipId: 'liftNote',
        evidenceId: 'hammer_report',
        object: station.props.forensicsReport,
      },
      {
        id: 'station.leap',
        description: 'Green phosphor CRT terminal. Victoria Police LEAP mainframe.',
        examine: 'Query Victor Rakov criminal record on the mainframe.',
        clipId: 'leanIn',
        evidenceId: 'rakov_profile',
        object: station.props.leapTerminal,
      },
      {
        id: 'station.mark',
        description: 'Mark sitting in the interview cubicle, head down in his hands.',
        dialogueId: 'mark.interview',
        object: station.props.markActor,
      },
    )

    graphs.set(FORENSICS_INTAKE.id, FORENSICS_INTAKE)
    graphs.set(FORENSICS_DONE.id, FORENSICS_DONE)
    graphs.set(MARK_INTERVIEW.id, MARK_INTERVIEW)
    graphs.set(MORETTI_STATION_STANDBY.id, MORETTI_STATION_STANDBY)
    graphs.set(MORETTI_STATION_INTERVIEW.id, MORETTI_STATION_INTERVIEW)
    graphs.set(MORETTI_STATION_EXIT.id, MORETTI_STATION_EXIT)
  } else {
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

    const lodgeProps = { ...lodge.props, ...unitA.props }

    const verandah = buildVerandah()
    world.add(verandah.group)

    const yard = buildYard()
    world.add(yard.group)

    rosie = await buildRosie()
    world.add(rosie.root)

    const lighting = buildSceneLighting()
    scene.add(lighting.group)

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
    spawnPos = lodge.spawn
    spawnYaw = lodge.spawnYaw
    gates = new GateTracker(caseFile)

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

    lookables.push(
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
    )

    graphs.set(ROSIE_RECEPTION.id, ROSIE_RECEPTION)
    graphs.set(ROSIE_PARLOUR.id, ROSIE_PARLOUR)
    graphs.set(MORETTI_STANDBY.id, MORETTI_STANDBY)
    graphs.set(MORETTI_THEORISE.id, MORETTI_THEORISE)
    for (const graph of Object.values(MORETTI_BAG)) {
      graphs.set(graph.id, graph)
    }
  }
  scene.add(world)
  scene.add(camera)

  const audio = new Audio()
  const soundtrack = new SoundtrackPlayer()
  soundtrack.play(isScene3 ? 'scene3' : isScene2 ? 'scene2' : 'scene1')

  const input = new Input(canvas)
  const solver = new BoxCollisionSolver(solids, floors)
  const player = new PlayerController(camera, input, solver, spawnPos, spawnYaw)

  const morettiSpawn = isScene2 ? new Vector3(1.2, 0, 0.8) : isScene3 ? new Vector3(0, -100, 0) : undefined
  const morettiYaw = isScene2 ? Math.PI : undefined
  const moretti = await buildMoretti(solver, morettiSpawn, morettiYaw)
  if (!isScene3) {
    world.add(moretti.root)
    solids.push(...moretti.solids)
  }

  const draw = (): void => {
    if (dusk !== undefined) dusk.render()
    else renderer.render(scene, camera)
  }

  const registry = new LookRegistry()
  for (const lookable of lookables) {
    registry.add(lookable)
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
  if (!isScene2 && !isScene3 && rosie !== undefined) {
    registerRosie()
  }

  const registerMoretti = (): void => {
    if (isScene3) {
      registry.remove('moretti')
      return
    }
    registry.remove('moretti')
    let dialogueId = MORETTI_STANDBY.id
    if (isScene2) {
      if (gates2?.allUnlocked) {
        dialogueId = MORETTI_STATION_EXIT.id
      } else if (gates2?.has('hammer_report')) {
        dialogueId = MORETTI_STATION_INTERVIEW.id
      } else {
        dialogueId = MORETTI_STATION_STANDBY.id
      }
    } else if (gates?.allUnlocked) {
      dialogueId = MORETTI_THEORISE.id
    }
    registry.add({
      id: 'moretti',
      description: 'Constable Moretti.',
      dialogueId,
      object: moretti.root,
    })
  }
  if (!isScene3) {
    registerMoretti()
  }

  const look = new LookRaycaster(camera, registry, world)
  const hands = await Hands.create(camera)
  const notebook = new Notebook(hudRoot, caseFile)
  const dialogue = new DialogueRunner()
  const dialoguePanel = new DialoguePanel(hudRoot, dialogue)

  const hud = new Hud(hudRoot, (id) => {
    if (!isScene2 && !isScene3 && rosie !== undefined && id === 'lodge.desk' && rosie.station === 'reception') {
      return 'Reception desk. A woman behind it.'
    }
    return registry.get(id)?.description
  })

  let sceneComplete = false
  let glovesDone = false
  const captureMode = new URLSearchParams(window.location.search).get('capture') === '1'

  scenes.start()

  new TitleCard(
    hudRoot,
    isScene3 ? '14 REGENT STREET, PRAHRAN' : isScene2 ? 'ST KILDA PRECINCT' : 'ST KILDA',
    isScene3 ? '26 FEBRUARY 1994 &middot; 22:30' : isScene2 ? '26 FEBRUARY 1994 &middot; 21:15' : '26 FEBRUARY 1994',
  )

  let coldOpenDone = isScene2 || isScene3 ? true : false

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
    if (isScene2 || isScene3 || glovesDone || captureMode || hands.isPlaying || lodge === undefined) {
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
      !isScene2 &&
      !isScene3 &&
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
    const graph = graphs.get(target.dialogueId)
    if (graph === undefined) {
      console.warn(`No dialogue graph "${target.dialogueId}"`)
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
    if (target.id === 'station.leap' && leapTerminal !== undefined) {
      leapTerminal.open()
      return
    }
    if (target.examine === undefined) {
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

  hands.onComplete = (objectId) => {
    emit('examine:complete', { objectId })
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
    if (objectId === 'laneway.radio' && lookable?.dialogueId !== undefined) {
      const g = graphs.get(lookable.dialogueId)
      if (g) dialogue.start(g)
    }
    examiningId = undefined
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
  })
  events.on('dialogue:end', ({ nodeId }) => {
    console.debug('dialogue end', nodeId)
    if (nodeId === 'mark.end') {
      caseFile.file('mark_statement', 'station.mark')
      caseFile.file('mahoneys_lead', 'station.mark')
    }
    if (nodeId === 'wait' || nodeId === 'take') {
      if (gates2 !== undefined && !gates2.has('drop_hammer')) {
        gates2.recordHammerDrop()
        const hatch = registry.get('station.forensics_hatch')
        if (hatch !== undefined) {
          registry.remove('station.forensics_hatch')
          registry.add({
            ...hatch,
            dialogueId: 'forensics.done',
          })
        }
      }
    }
    if (sceneComplete) {
      return
    }
    if (!isScene2 && !isScene3 && nodeId === THEORISE_LAST_NODE) {
      sceneComplete = true
      registry.remove('moretti')
      hud.clearExamine()
      updatePrompt()
      emit('scene:complete', { id: 'scene1' })
    } else if (isScene2 && nodeId === SCENE2_THEORISE_LAST_NODE) {
      sceneComplete = true
      registry.remove('moretti')
      hud.clearExamine()
      updatePrompt()
      emit('scene:complete', { id: 'scene2' })
    } else if (isScene3 && nodeId === SCENE3_THEORISE_LAST_NODE) {
      sceneComplete = true
      caseFile.file('radio_arrest', 'laneway.radio')
      hud.clearExamine()
      updatePrompt()
      emit('scene:complete', { id: 'scene3' })
    }
  })

  if (gates !== undefined) {
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

      if (gates.allUnlocked) {
        registerMoretti()
      }
    }
  }

  if (gates2 !== undefined) {
    gates2.onUnlocked = (gateId) => {
      console.debug('gate2', gateId)
      registerMoretti()
    }
  }

  if (gates3 !== undefined) {
    gates3.onUnlocked = (gateId) => {
      console.debug('gate3', gateId)
    }
  }

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

  let elapsed = 0

  const loop = new Loop((delta) => {
    elapsed += delta
    if (isScene3 && laneway !== undefined) {
      laneway.update(delta, player.position)
    } else if (isScene2 && station !== undefined) {
      station.update(elapsed, player.position)
    } else if (lodge !== undefined) {
      lodge.update(elapsed, player.position)
      if (dusk !== undefined) dusk.update(elapsed, player.position)
      if (rosie !== undefined) rosie.update(delta, player.position)
    }
    audio.update(player.position)
    if (!isScene3) {
      moretti.update(delta, player.position)
    }

    if (input.wasPressed('notebook')) {
      if (!coldOpenDone || dialogue.isActive || (leapTerminal !== undefined && leapTerminal.visible)) {
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

    if (notebook.isOpen || dialogue.isActive || (leapTerminal !== undefined && leapTerminal.visible)) {
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

  loop.start()

  if (import.meta.env.DEV) {
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
      station,
      laneway,
      rosie,
      moretti,
      gates,
      gates2,
      gates3,
      solver,
      audio,
      soundtrack,
      scenes,
      clips: CLIPS,
      Vector3,
    })

    const shotCtx = { player, hands, hud, hudRoot, rosie, station, laneway }
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
