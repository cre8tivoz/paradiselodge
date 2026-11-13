import {
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Vector3,
} from 'three'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { aabb } from './kit.ts'
import type { WalkableRegion } from './collision.ts'
import type { Surface } from '../core/events.ts'
import { darkWoodMaterial, floorMaterial } from '../materials/look.ts'
import { prepareCharacterLook } from '../npc/character-look.ts'

function requireNode(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name)
  if (found === undefined) {
    throw new Error(`Character glTF missing node "${name}"`)
  }
  return found
}

function slab(box: Box3, material: MeshStandardMaterial): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z),
    material,
  )
  mesh.position.set(
    (box.min.x + box.max.x) / 2,
    (box.min.y + box.max.y) / 2,
    (box.min.z + box.max.z) / 2,
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function walk(box: Box3, surface: Surface = 'floorboard'): WalkableRegion {
  return {
    box: new Box3(
      new Vector3(box.min.x, box.min.y, box.min.z),
      new Vector3(box.max.x, box.max.y, box.max.z),
    ),
    surface,
  }
}

function metalMaterial(color: Color, roughness = 0.5, metalness = 0.6): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness })
}

function plasterMaterial(color: Color): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 })
}

/**
 * Scene 2 — St Kilda Police Station Bullpen & Forensics Intake.
 *
 * 1994 Victoria Police precinct interior.
 * Bullpen desks, green-phosphor LEAP CRT terminal, break bench with
 * electric coffee urn, forensics intake hatch, and interview room.
 */

export interface StationProps {
  readonly forensicsHatch: Group
  readonly urn: Group
  readonly leapTerminal: Group
  readonly forensicsReport: Group
  readonly deskGroup: Group
  readonly markChair: Group
  readonly noticeboard: Group
  readonly deskLampLight: PointLight
  readonly markActor: Group
}

export interface StationWorld {
  readonly group: Group
  readonly solids: Box3[]
  readonly floors: WalkableRegion[]
  readonly props: StationProps
  readonly spawn: Vector3
  readonly spawnYaw: number
  update(elapsed: number, playerPos: Vector3): void
}

export async function buildStation(): Promise<StationWorld> {
  const root = new Group()
  root.name = 'scene2-station'

  const solids: Box3[] = []
  const floors: WalkableRegion[] = []

  // Materials
  const floorMat = floorMaterial() // municipal linoleum / low-pile carpet
  const wallMat = plasterMaterial(new Color(0.72, 0.68, 0.60)) // institutional cream/biscuit
  const ceilingMat = plasterMaterial(new Color(0.82, 0.82, 0.80))
  const woodMat = darkWoodMaterial(0.65)
  const steelMat = metalMaterial(new Color(0.35, 0.38, 0.40), 0.55, 0.6)
  const glassMat = new MeshStandardMaterial({
    color: new Color(0.6, 0.75, 0.75),
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.45,
    side: DoubleSide,
  })

  // --- Room Shell (14m wide x 10m deep x 3.2m high) ---
  // X: -7.0 to +7.0, Z: -5.0 to +5.0, Y: 0.0 to 3.2
  const floorMesh = slab(new Box3(new Vector3(-7.0, -0.2, -5.0), new Vector3(7.0, 0.0, 5.0)), floorMat)
  root.add(floorMesh)
  floors.push(walk(aabb(-6.8, 6.8, -0.2, 0.0, -4.8, 4.8), 'floorboard'))

  const ceilingMesh = slab(new Box3(new Vector3(-7.0, 3.2, -5.0), new Vector3(7.0, 3.4, 5.0)), ceilingMat)
  root.add(ceilingMesh)

  // Outer boundary walls
  // Back wall (Z = -5.0)
  const backWall = slab(new Box3(new Vector3(-7.0, 0, -5.2), new Vector3(7.0, 3.2, -5.0)), wallMat)
  root.add(backWall)
  solids.push(aabb(-7.0, 7.0, 0, 3.2, -5.2, -5.0))

  // Front wall with window frame (Z = +5.0)
  const frontWallL = slab(new Box3(new Vector3(-7.0, 0, 5.0), new Vector3(-2.0, 3.2, 5.2)), wallMat)
  const frontWallR = slab(new Box3(new Vector3(2.0, 0, 5.0), new Vector3(7.0, 3.2, 5.2)), wallMat)
  const frontWallTop = slab(new Box3(new Vector3(-2.0, 2.6, 5.0), new Vector3(2.0, 3.2, 5.2)), wallMat)
  const frontWallBottom = slab(new Box3(new Vector3(-2.0, 0, 5.0), new Vector3(2.0, 0.8, 5.2)), wallMat)
  root.add(frontWallL, frontWallR, frontWallTop, frontWallBottom)
  solids.push(
    aabb(-7.0, -2.0, 0, 3.2, 5.0, 5.2),
    aabb(2.0, 7.0, 0, 3.2, 5.0, 5.2),
    aabb(-2.0, 2.0, 0, 3.2, 5.0, 5.2),
  )

  // Venetian blinds over front window
  const blindsGroup = new Group()
  const blindGeom = new BoxGeometry(3.9, 0.03, 0.08)
  const blindMat = metalMaterial(new Color(0.85, 0.82, 0.78), 0.7, 0.2)
  for (let y = 0.9; y < 2.55; y += 0.09) {
    const slat = new Mesh(blindGeom, blindMat)
    slat.position.set(0, y, 5.05)
    slat.rotation.x = 0.25
    blindsGroup.add(slat)
  }
  root.add(blindsGroup)

  // Left wall (X = -7.0)
  const leftWall = slab(new Box3(new Vector3(-7.2, 0, -5.0), new Vector3(-7.0, 3.2, 5.0)), wallMat)
  root.add(leftWall)
  solids.push(aabb(-7.2, -7.0, 0, 3.2, -5.0, 5.0))

  // Right wall (X = +7.0)
  const rightWall = slab(new Box3(new Vector3(7.0, 0, -5.0), new Vector3(7.2, 3.2, 5.0)), wallMat)
  root.add(rightWall)
  solids.push(aabb(7.0, 7.2, 0, 3.2, -5.0, 5.0))

  // --- Interview Room 2 Partition (X: 3.5 to 7.0, Z: -1.5 to -5.0) ---
  // Front partition wall (Z = -1.5, X: 3.5 to 7.0) with doorway from 3.5 to 4.6
  const interFrontL = slab(new Box3(new Vector3(4.6, 0, -1.6), new Vector3(7.0, 3.2, -1.4)), wallMat)
  const interFrontLintel = slab(new Box3(new Vector3(3.5, 2.2, -1.6), new Vector3(4.6, 3.2, -1.4)), wallMat)
  root.add(interFrontL, interFrontLintel)
  solids.push(aabb(4.6, 7.0, 0, 3.2, -1.6, -1.4))

  // Left partition wall with observation window (X = 3.5, Z: -5.0 to -1.4)
  const interSideBack = slab(new Box3(new Vector3(3.4, 0, -5.0), new Vector3(3.6, 3.2, -4.5)), wallMat)
  const interSideFront = slab(new Box3(new Vector3(3.4, 0, -2.0), new Vector3(3.6, 3.2, -1.4)), wallMat)
  const interSideBot = slab(new Box3(new Vector3(3.4, 0, -4.5), new Vector3(3.6, 1.0, -2.0)), wallMat)
  const interSideTop = slab(new Box3(new Vector3(3.4, 2.4, -4.5), new Vector3(3.6, 3.2, -2.0)), wallMat)
  const interSideGlass = slab(new Box3(new Vector3(3.48, 1.0, -4.5), new Vector3(3.52, 2.4, -2.0)), glassMat)
  root.add(interSideBack, interSideFront, interSideBot, interSideTop, interSideGlass)
  solids.push(aabb(3.4, 3.6, 0, 3.2, -5.0, -1.4))

  // --- Forensics Intake Hatch (Back wall: X: -3.8 to -1.2, Z: -4.8) ---
  const forensicsHatch = new Group()
  forensicsHatch.name = 'forensicsHatch'
  const counterTop = slab(new Box3(new Vector3(-3.8, 0.95, -4.8), new Vector3(-1.2, 1.05, -3.9)), woodMat)
  const counterBase = slab(new Box3(new Vector3(-3.7, 0, -4.75), new Vector3(-1.3, 0.95, -4.0)), wallMat)
  // Window frame above counter
  const hatchGlass = slab(new Box3(new Vector3(-3.5, 1.05, -4.4), new Vector3(-1.5, 2.3, -4.38)), glassMat)
  // Service bell
  const bellMat = metalMaterial(new Color(0.9, 0.75, 0.3), 0.25, 0.85)
  const bell = new Mesh(new CylinderGeometry(0.08, 0.1, 0.08, 16), bellMat)
  bell.position.set(-2.5, 1.09, -4.2)
  forensicsHatch.add(counterTop, counterBase, hatchGlass, bell)
  root.add(forensicsHatch)
  solids.push(aabb(-3.8, -1.2, 0, 2.4, -4.8, -3.9))

  // --- Break Station: Bench & Coffee Urn (Left wall: X: -6.8 to -5.5, Z: 0.5 to 2.5) ---
  const breakBench = slab(new Box3(new Vector3(-6.8, 0, 0.5), new Vector3(-5.5, 0.9, 2.5)), woodMat)
  root.add(breakBench)
  solids.push(aabb(-6.8, -5.5, 0, 0.9, 0.5, 2.5))

  const urn = new Group()
  urn.name = 'coffeeUrn'
  const urnBody = new Mesh(
    new CylinderGeometry(0.2, 0.2, 0.65, 20),
    metalMaterial(new Color(0.85, 0.85, 0.88), 0.3, 0.8),
  )
  urnBody.position.set(-6.15, 1.25, 1.5)

  const urnTap = new Mesh(
    new CylinderGeometry(0.02, 0.02, 0.08, 8),
    metalMaterial(new Color(0.2, 0.2, 0.2), 0.4, 0.5),
  )
  urnTap.position.set(-5.92, 1.08, 1.5)
  urnTap.rotation.z = Math.PI / 2

  // Indicator light on urn
  const urnLight = new PointLight(new Color(1.0, 0.15, 0.05), 0.8, 1.5, 2)
  urnLight.position.set(-5.9, 1.05, 1.5)

  // Nescafe tin & chipped ceramic mug
  const mugMat = new MeshStandardMaterial({ color: new Color(0.88, 0.85, 0.80), roughness: 0.4 })
  const mug = new Mesh(new CylinderGeometry(0.06, 0.055, 0.12, 12), mugMat)
  mug.position.set(-5.85, 0.96, 1.8)

  urn.add(urnBody, urnTap, urnLight, mug)
  root.add(urn)

  // --- Noticeboard on left wall ---
  const noticeboard = new Group()
  const boardSlab = slab(
    new Box3(new Vector3(-6.98, 1.4, -1.5), new Vector3(-6.92, 2.6, 0.2)),
    darkWoodMaterial(0.8),
  )
  noticeboard.add(boardSlab)
  root.add(noticeboard)

  // --- Miller's Desk (X: -2.8 to -0.8, Z: 0.5 to 1.8) ---
  const deskGroup = new Group()
  deskGroup.name = 'millerDesk'
  const deskMesh = slab(new Box3(new Vector3(-2.8, 0, 0.5), new Vector3(-0.8, 0.75, 1.8)), steelMat)
  const deskTop = slab(new Box3(new Vector3(-2.85, 0.75, 0.45), new Vector3(-0.75, 0.79, 1.85)), woodMat)
  deskGroup.add(deskMesh, deskTop)
  root.add(deskGroup)
  solids.push(aabb(-2.85, -0.75, 0, 0.79, 0.45, 1.85))

  // Banker's Desk Lamp on Miller's desk
  const lampMat = metalMaterial(new Color(0.2, 0.45, 0.25), 0.35, 0.7) // green enamel shade
  const lampBase = new Mesh(new CylinderGeometry(0.1, 0.12, 0.04, 12), lampMat)
  lampBase.position.set(-1.05, 0.81, 0.65)
  const lampPole = new Mesh(new CylinderGeometry(0.015, 0.015, 0.35, 8), lampMat)
  lampPole.position.set(-1.05, 0.98, 0.65)
  const lampShade = new Mesh(new CylinderGeometry(0.08, 0.12, 0.18, 12), lampMat)
  lampShade.position.set(-1.05, 1.15, 0.72)
  lampShade.rotation.x = Math.PI / 3
  root.add(lampBase, lampPole, lampShade)

  const deskLampLight = new PointLight(new Color(1.0, 0.82, 0.52), 4.2, 7.5, 1.6)
  deskLampLight.position.set(-1.05, 1.12, 0.78)
  deskLampLight.castShadow = true
  root.add(deskLampLight)

  // LEAP CRT Terminal on Miller's desk
  const leapTerminal = new Group()
  leapTerminal.name = 'leapTerminal'
  const monitorMat = new MeshStandardMaterial({ color: new Color(0.78, 0.76, 0.70), roughness: 0.55 }) // 1990s beige plastic
  const monitor = new Mesh(new BoxGeometry(0.42, 0.38, 0.42), monitorMat)
  monitor.position.set(-1.85, 1.02, 1.05)
  // Screen face
  const screenMat = new MeshStandardMaterial({
    color: new Color(0.05, 0.12, 0.06),
    emissive: new Color(0.12, 0.65, 0.25),
    emissiveIntensity: 0.75,
    roughness: 0.2,
  })
  const screen = new Mesh(new BoxGeometry(0.32, 0.26, 0.02), screenMat)
  screen.position.set(-1.85, 1.04, 0.83)
  // Keyboard
  const keyboard = new Mesh(new BoxGeometry(0.44, 0.04, 0.18), monitorMat)
  keyboard.position.set(-1.85, 0.81, 0.65)

  const crtGlow = new PointLight(new Color(0.2, 0.9, 0.4), 1.2, 3.0, 2)
  crtGlow.position.set(-1.85, 1.05, 0.7)

  leapTerminal.add(monitor, screen, keyboard, crtGlow)
  root.add(leapTerminal)

  // Forensics Manila Folder on Miller's desk (revealed once hammer is lodged & analysed)
  const forensicsReport = new Group()
  forensicsReport.name = 'forensicsReport'
  const folderMat = new MeshStandardMaterial({
    color: new Color(0.86, 0.76, 0.52),
    roughness: 0.8,
  })
  const folder = new Mesh(new BoxGeometry(0.32, 0.02, 0.24), folderMat)
  folder.position.set(-1.35, 0.8, 1.25)
  forensicsReport.add(folder)
  forensicsReport.visible = false
  root.add(forensicsReport)

  // --- Partner / Moretti Desk ---
  const partnerDesk = slab(new Box3(new Vector3(0.5, 0, 0.5), new Vector3(2.5, 0.75, 1.8)), steelMat)
  const partnerDeskTop = slab(new Box3(new Vector3(0.45, 0.75, 0.45), new Vector3(2.55, 0.79, 1.85)), woodMat)
  root.add(partnerDesk, partnerDeskTop)
  solids.push(aabb(0.45, 2.55, 0, 0.79, 0.45, 1.85))

  // --- Interview Room 2 Table & Chairs ---
  const tableTop = slab(new Box3(new Vector3(4.5, 0.72, -3.8), new Vector3(6.2, 0.76, -2.6)), woodMat)
  const tableLeg1 = new Mesh(new CylinderGeometry(0.04, 0.04, 0.72, 8), steelMat)
  tableLeg1.position.set(4.65, 0.36, -3.65)
  const tableLeg2 = new Mesh(new CylinderGeometry(0.04, 0.04, 0.72, 8), steelMat)
  tableLeg2.position.set(6.05, 0.36, -3.65)
  const tableLeg3 = new Mesh(new CylinderGeometry(0.04, 0.04, 0.72, 8), steelMat)
  tableLeg3.position.set(4.65, 0.36, -2.75)
  const tableLeg4 = new Mesh(new CylinderGeometry(0.04, 0.04, 0.72, 8), steelMat)
  tableLeg4.position.set(6.05, 0.36, -2.75)
  root.add(tableTop, tableLeg1, tableLeg2, tableLeg3, tableLeg4)
  solids.push(aabb(4.5, 6.2, 0, 0.76, -3.8, -2.6))

  const markChair = new Group()
  const chairMat = new MeshStandardMaterial({ color: new Color(0.2, 0.22, 0.25), roughness: 0.6 })
  const chairSeat = new Mesh(new BoxGeometry(0.42, 0.06, 0.42), chairMat)
  chairSeat.position.set(5.35, 0.44, -4.1)
  const chairBack = new Mesh(new BoxGeometry(0.42, 0.42, 0.05), chairMat)
  chairBack.position.set(5.35, 0.68, -4.28)
  markChair.add(chairSeat, chairBack)
  root.add(markChair)
  solids.push(aabb(5.1, 5.6, 0, 0.9, -4.3, -3.9))

  // --- Mark Vance (photo-mapped glTF, seated in Interview Room 2) ---
  const markGltf = await new GLTFLoader().loadAsync('/models/mark.glb')
  prepareCharacterLook(markGltf.scene, { contactShadow: false, roughness: 0.78, rimStrength: 0.2 })

  const markActor = new Group()
  markActor.name = 'markActor'
  markActor.add(markGltf.scene)
  markActor.position.set(5.35, 0, -4.08)
  markActor.rotation.y = Math.PI // facing +Z toward the table and Miller
  root.add(markActor)

  const markHips = requireNode(markGltf.scene, 'hips')
  const markChest = requireNode(markGltf.scene, 'chest')
  const markHead = requireNode(markGltf.scene, 'head')
  const markLegs = (['l', 'r'] as const).map((side) => ({
    hip: requireNode(markGltf.scene, `leg_${side}_0`),
    knee: requireNode(markGltf.scene, `leg_${side}_1`),
  }))
  const markArms = (['l', 'r'] as const).map((side) => ({
    side,
    shoulder: requireNode(markGltf.scene, `arm_${side}_0`),
    elbow: requireNode(markGltf.scene, `arm_${side}_1`),
  }))

  markHips.position.y = 0.50
  for (const leg of markLegs) {
    leg.hip.rotation.x = 1.48
    leg.knee.rotation.x = -1.48
  }
  const markChestBase = -0.22
  markChest.rotation.x = markChestBase
  markHead.rotation.x = -0.32
  for (const arm of markArms) {
    const bind = arm.shoulder.quaternion.clone()
    arm.shoulder.rotation.set(0.56, 0, arm.side === 'l' ? 0.14 : -0.14)
    arm.shoulder.quaternion.multiply(bind)
    arm.elbow.rotation.x = 0.84
  }

  // --- Overhead Fluorescent & Soft Skylight Fill ---
  const bullpenFill = new HemisphereLight(new Color(0xd0dce8), new Color(0x4a4238), 0.45)
  root.add(bullpenFill)

  const tube1 = new PointLight(new Color(0.85, 0.92, 1.0), 3.5, 12, 1.8)
  tube1.position.set(-2.0, 3.0, -1.0)
  const tube2 = new PointLight(new Color(0.85, 0.92, 1.0), 3.5, 12, 1.8)
  tube2.position.set(-2.0, 3.0, 2.5)
  const tubeInterview = new PointLight(new Color(0.9, 0.88, 0.8), 2.8, 8, 1.6)
  tubeInterview.position.set(5.35, 2.9, -3.2)
  root.add(tube1, tube2, tubeInterview)

  // Spawn position: In front of the entry doors facing -Z into the bullpen
  const spawn = new Vector3(-1.5, 0, 3.6)
  const spawnYaw = 0

  return {
    group: root,
    solids,
    floors,
    props: {
      forensicsHatch,
      urn,
      leapTerminal,
      forensicsReport,
      deskGroup,
      markChair,
      noticeboard,
      deskLampLight,
      markActor,
    },
    spawn,
    spawnYaw,
    update(elapsed: number, _playerPos: Vector3): void {
      crtGlow.intensity = 1.1 + Math.sin(elapsed * 8) * 0.15
      markChest.rotation.x = markChestBase + Math.sin(elapsed * 1.35) * 0.015
    },
  }
}
