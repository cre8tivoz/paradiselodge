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

/**
 * Scene 4 — St Kilda CID Interview Room 1.
 *
 * 1994 institutional interrogation room.
 * Concrete cinderblock walls, heavy fire door with wire-glass observation pane,
 * humming overhead fluorescent tube, central laminate table with dual-spool
 * police tape recorder, manila case folder, seated Victor Rakov suspect,
 * and Constable Moretti observing with his clipboard.
 */

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

export interface InterviewProps {
  readonly tapeRecorder: Group
  readonly caseFolder: Group
  readonly victorActor: Group
  readonly morettiObserver: Group
  readonly interviewTable: Group
  readonly interviewDoor: Group
}

export interface InterviewWorld {
  readonly group: Group
  readonly solids: Box3[]
  readonly floors: WalkableRegion[]
  readonly props: InterviewProps
  readonly spawn: Vector3
  readonly spawnYaw: number
  update(delta: number): void
}

export async function buildInterviewRoom(): Promise<InterviewWorld> {
  const root = new Group()
  root.name = 'scene4-interview'

  const solids: Box3[] = []
  const floors: WalkableRegion[] = []

  // Materials
  const floorMat = floorMaterial() // grey municipal linoleum
  const wallLowerMat = new MeshStandardMaterial({
    color: new Color(0.28, 0.35, 0.32), // institutional olive-drab gloss wainscoting
    roughness: 0.35,
  })
  const wallUpperMat = new MeshStandardMaterial({
    color: new Color(0.76, 0.74, 0.68), // institutional dirty biscuit cream
    roughness: 0.85,
  })
  const ceilingMat = new MeshStandardMaterial({
    color: new Color(0.82, 0.80, 0.78), // acoustic ceiling tiles
    roughness: 0.9,
  })
  const doorMat = new MeshStandardMaterial({
    color: new Color(0.38, 0.28, 0.22), // heavy soundproof wood/fire door
    roughness: 0.6,
  })
  const tableMat = darkWoodMaterial(0.65)
  const steelMat = new MeshStandardMaterial({
    color: new Color(0.35, 0.38, 0.40),
    roughness: 0.5,
    metalness: 0.6,
  })
  const vinylMat = new MeshStandardMaterial({
    color: new Color(0.15, 0.18, 0.16),
    roughness: 0.5,
  })
  const wireGlassMat = new MeshStandardMaterial({
    color: new Color(0.55, 0.65, 0.65),
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.5,
    side: DoubleSide,
  })

  // --- 1. Room Envelope (6.0m x 4.8m x 3.0m high) ---
  const floorMesh = slab(new Box3(new Vector3(-3.0, -0.1, -2.4), new Vector3(3.0, 0.0, 2.4)), floorMat)
  root.add(floorMesh)
  floors.push(walk(aabb(-2.8, 2.8, -0.2, 0.0, -2.2, 2.2), 'floorboard'))

  const ceilingMesh = slab(new Box3(new Vector3(-3.0, 3.0, -2.4), new Vector3(3.0, 3.1, 2.4)), ceilingMat)
  root.add(ceilingMesh)

  // Walls (Two-tone: 0-1.2m lower wainscot, 1.2-3.0m upper cream)
  // North Wall (Z = 2.4)
  const wallNLower = slab(new Box3(new Vector3(-3.0, 0, 2.38), new Vector3(3.0, 1.2, 2.42)), wallLowerMat)
  const wallNUpper = slab(new Box3(new Vector3(-3.0, 1.2, 2.38), new Vector3(3.0, 3.0, 2.42)), wallUpperMat)
  root.add(wallNLower, wallNUpper)
  solids.push(aabb(-3.0, 3.0, 0, 3.0, 2.35, 2.45))

  // South Wall (Z = -2.4)
  const wallSLower = slab(new Box3(new Vector3(-3.0, 0, -2.42), new Vector3(3.0, 1.2, -2.38)), wallLowerMat)
  const wallSUpper = slab(new Box3(new Vector3(-3.0, 1.2, -2.42), new Vector3(3.0, 3.0, -2.38)), wallUpperMat)
  root.add(wallSLower, wallSUpper)
  solids.push(aabb(-3.0, 3.0, 0, 3.0, -2.45, -2.35))

  // East Wall (X = 3.0)
  const wallELower = slab(new Box3(new Vector3(2.98, 0, -2.4), new Vector3(3.02, 1.2, 2.4)), wallLowerMat)
  const wallEUpper = slab(new Box3(new Vector3(2.98, 1.2, -2.4), new Vector3(3.02, 3.0, 2.4)), wallUpperMat)
  root.add(wallELower, wallEUpper)
  solids.push(aabb(2.95, 3.05, 0, 3.0, -2.4, 2.4))

  // West Wall with Fire Door (X = -3.0)
  const wallW1Lower = slab(new Box3(new Vector3(-3.02, 0, -2.4), new Vector3(-2.98, 1.2, -0.6)), wallLowerMat)
  const wallW1Upper = slab(new Box3(new Vector3(-3.02, 1.2, -2.4), new Vector3(-2.98, 3.0, -0.6)), wallUpperMat)
  const wallW2Lower = slab(new Box3(new Vector3(-3.02, 0, 0.6), new Vector3(-2.98, 1.2, 2.4)), wallLowerMat)
  const wallW2Upper = slab(new Box3(new Vector3(-3.02, 1.2, 0.6), new Vector3(-2.98, 3.0, 2.4)), wallUpperMat)
  const wallWTop = slab(new Box3(new Vector3(-3.02, 2.2, -0.6), new Vector3(-2.98, 3.0, 0.6)), wallUpperMat)
  root.add(wallW1Lower, wallW1Upper, wallW2Lower, wallW2Upper, wallWTop)
  solids.push(
    aabb(-3.05, -2.95, 0, 3.0, -2.4, -0.6),
    aabb(-3.05, -2.95, 0, 3.0, 0.6, 2.4),
    aabb(-3.05, -2.95, 0, 3.0, -0.6, 0.6), // closed door solid
  )

  // Fire Door Leaf with Observation Window
  const interviewDoor = new Group()
  interviewDoor.name = 'interviewDoor'
  const doorLeaf = slab(new Box3(new Vector3(-2.99, 0.02, -0.58), new Vector3(-2.95, 2.18, 0.58)), doorMat)
  const wireGlass = slab(new Box3(new Vector3(-3.0, 1.35, -0.15), new Vector3(-2.94, 1.75, 0.15)), wireGlassMat)
  interviewDoor.add(doorLeaf, wireGlass)
  root.add(interviewDoor)

  // --- 2. Lighting ---
  const roomFill = new HemisphereLight(new Color(0xc2d0d8), new Color(0x3a352e), 0.5)
  root.add(roomFill)

  // Central overhead fluorescent fixture
  const battenHousing = slab(new Box3(new Vector3(-0.8, 2.9, -0.15), new Vector3(0.8, 2.98, 0.15)), steelMat)
  root.add(battenHousing)
  const tubeLight = new PointLight(new Color(0.9, 0.95, 1.0), 3.8, 7.5, 1.6)
  tubeLight.position.set(0, 2.85, 0)
  tubeLight.castShadow = true
  root.add(tubeLight)

  // Soft secondary warm fill
  const tableFill = new PointLight(new Color(1.0, 0.85, 0.65), 1.2, 4.0, 2.0)
  tableFill.position.set(0, 1.5, 0)
  root.add(tableFill)

  // --- 3. Interview Table & Chairs ---
  const interviewTable = new Group()
  interviewTable.name = 'interviewTable'
  const tabletop = slab(new Box3(new Vector3(-0.8, 0.72, -0.45), new Vector3(0.8, 0.76, 0.45)), tableMat)
  const leg1 = slab(new Box3(new Vector3(-0.76, 0, -0.41), new Vector3(-0.72, 0.72, -0.37)), steelMat)
  const leg2 = slab(new Box3(new Vector3(0.72, 0, -0.41), new Vector3(0.76, 0.72, -0.37)), steelMat)
  const leg3 = slab(new Box3(new Vector3(-0.76, 0, 0.37), new Vector3(-0.72, 0.72, 0.41)), steelMat)
  const leg4 = slab(new Box3(new Vector3(0.72, 0, 0.37), new Vector3(0.76, 0.72, 0.41)), steelMat)
  interviewTable.add(tabletop, leg1, leg2, leg3, leg4)
  root.add(interviewTable)
  solids.push(aabb(-0.82, 0.82, 0, 0.8, -0.48, 0.48))

  // Victor's chair (North side of table at Z = 0.9, facing South)
  const vChair = new Group()
  const vSeat = slab(new Box3(new Vector3(-0.25, 0.44, 0.7), new Vector3(0.25, 0.48, 1.1)), vinylMat)
  const vBack = slab(new Box3(new Vector3(-0.25, 0.48, 1.06), new Vector3(0.25, 0.88, 1.1)), steelMat)
  vChair.add(vSeat, vBack)
  root.add(vChair)
  solids.push(aabb(-0.28, 0.28, 0, 0.9, 0.68, 1.12))

  // Miller's chair (South side of table at Z = -0.9, facing North)
  const mChair = new Group()
  const mSeat = slab(new Box3(new Vector3(-0.25, 0.44, -1.1), new Vector3(0.25, 0.48, -0.7)), vinylMat)
  const mBack = slab(new Box3(new Vector3(-0.25, 0.48, -1.1), new Vector3(0.25, 0.88, -1.06)), steelMat)
  mChair.add(mSeat, mBack)
  root.add(mChair)
  solids.push(aabb(-0.28, 0.28, 0, 0.9, -1.12, -0.68))

  // --- 4. Props on the Table ---
  // Police Dual-Cassette Tape Recorder (CTR-80 style)
  const tapeRecorder = new Group()
  tapeRecorder.name = 'tapeRecorder'
  const recBodyMat = new MeshStandardMaterial({ color: new Color(0.18, 0.2, 0.22), roughness: 0.5, metalness: 0.3 })
  const spoolMat = new MeshStandardMaterial({ color: new Color(0.9, 0.9, 0.9), roughness: 0.4 })
  const ledMat = new MeshStandardMaterial({ color: new Color(1.0, 0.1, 0.1), roughness: 0.3 })

  const recBody = slab(new Box3(new Vector3(-0.45, 0.76, -0.15), new Vector3(-0.15, 0.83, 0.15)), recBodyMat)
  const spool1 = slab(new Box3(new Vector3(-0.4, 0.831, -0.05), new Vector3(-0.34, 0.833, 0.05)), spoolMat)
  const spool2 = slab(new Box3(new Vector3(-0.26, 0.831, -0.05), new Vector3(-0.2, 0.833, 0.05)), spoolMat)
  const recLed = slab(new Box3(new Vector3(-0.18, 0.831, 0.1), new Vector3(-0.16, 0.834, 0.12)), ledMat)

  const ledGlow = new PointLight(new Color(1.0, 0.1, 0.1), 0.6, 1.2, 2.0)
  ledGlow.position.set(-0.17, 0.86, 0.11)
  tapeRecorder.add(recBody, spool1, spool2, recLed, ledGlow)
  root.add(tapeRecorder)

  // Manila Case File Dossier on table
  const caseFolder = new Group()
  caseFolder.name = 'caseFolder'
  const manilaMat = new MeshStandardMaterial({ color: new Color(0.78, 0.68, 0.48), roughness: 0.8 })
  const paperMat = new MeshStandardMaterial({ color: new Color(0.92, 0.90, 0.85), roughness: 0.75 })
  const folderCover = slab(new Box3(new Vector3(0.12, 0.76, -0.2), new Vector3(0.55, 0.772, 0.2)), manilaMat)
  const paperSheet = slab(new Box3(new Vector3(0.14, 0.773, -0.18), new Vector3(0.52, 0.775, 0.18)), paperMat)
  caseFolder.add(folderCover, paperSheet)
  root.add(caseFolder)

  // Two ceramic mugs of lukewarm station coffee
  const mugMat = new MeshStandardMaterial({ color: new Color(0.85, 0.82, 0.75), roughness: 0.4 })
  const coffeeMat = new MeshStandardMaterial({ color: new Color(0.15, 0.08, 0.05), roughness: 0.3 })
  const mugV = new Mesh(new CylinderGeometry(0.045, 0.045, 0.09, 12), mugMat)
  mugV.position.set(-0.05, 0.805, 0.22)
  const coffeeV = new Mesh(new CylinderGeometry(0.042, 0.042, 0.01, 12), coffeeMat)
  coffeeV.position.set(-0.05, 0.84, 0.22)
  const mugM = new Mesh(new CylinderGeometry(0.045, 0.045, 0.09, 12), mugMat)
  mugM.position.set(0.05, 0.805, -0.22)
  root.add(mugV, coffeeV, mugM)

  // Glass ashtray
  const ashtrayMat = new MeshStandardMaterial({ color: new Color(0.4, 0.5, 0.5), roughness: 0.2, transparent: true, opacity: 0.7 })
  const ashtrayMesh = new Mesh(new CylinderGeometry(0.06, 0.06, 0.025, 12), ashtrayMat)
  ashtrayMesh.position.set(0.0, 0.772, 0.0)
  root.add(ashtrayMesh)

  // --- 5. Suspect Actor — Victor Rakov (photo-mapped glTF, seated) ---
  const victorGltf = await new GLTFLoader().loadAsync('/models/victor.glb')
  prepareCharacterLook(victorGltf.scene, { contactShadow: false, roughness: 0.78, rimStrength: 0.18 })

  const victorActor = new Group()
  victorActor.name = 'victorActor'
  victorActor.add(victorGltf.scene)
  victorActor.position.set(0, 0, 0.88)
  victorActor.rotation.y = 0 // local -Z faces south directly across the table at Miller
  root.add(victorActor)

  const vHips = requireNode(victorGltf.scene, 'hips')
  const vChest = requireNode(victorGltf.scene, 'chest')
  const vHead = requireNode(victorGltf.scene, 'head')
  const vLegs = (['l', 'r'] as const).map((side) => ({
    hip: requireNode(victorGltf.scene, `leg_${side}_0`),
    knee: requireNode(victorGltf.scene, `leg_${side}_1`),
  }))
  const vArms = (['l', 'r'] as const).map((side) => ({
    side,
    shoulder: requireNode(victorGltf.scene, `arm_${side}_0`),
    elbow: requireNode(victorGltf.scene, `arm_${side}_1`),
  }))

  vHips.position.y = 0.50
  for (const leg of vLegs) {
    leg.hip.rotation.x = 1.48
    leg.knee.rotation.x = -1.48
  }
  const vChestBase = -0.14
  vChest.rotation.x = vChestBase
  vHead.rotation.x = 0.08
  for (const arm of vArms) {
    const bind = arm.shoulder.quaternion.clone()
    arm.shoulder.rotation.set(0.68, 0, arm.side === 'l' ? 0.14 : -0.14)
    arm.shoulder.quaternion.multiply(bind)
    arm.elbow.rotation.x = 0.82
  }

  // --- 6. Observer Actor — Constable Moretti (photo-mapped glTF, seated on East wall) ---
  const obsChair = new Group()
  const obsSeat = slab(new Box3(new Vector3(2.05, 0.44, -0.25), new Vector3(2.45, 0.48, 0.25)), vinylMat)
  const obsBack = slab(new Box3(new Vector3(2.41, 0.48, -0.25), new Vector3(2.45, 0.88, 0.25)), steelMat)
  obsChair.add(obsSeat, obsBack)
  root.add(obsChair)

  const morettiGltf = await new GLTFLoader().loadAsync('/models/moretti.glb')
  prepareCharacterLook(morettiGltf.scene, { contactShadow: false, roughness: 0.78, rimStrength: 0.18 })

  const morettiObserver = new Group()
  morettiObserver.name = 'morettiObserver'
  morettiObserver.add(morettiGltf.scene)
  morettiObserver.position.set(2.25, 0, 0.0)
  morettiObserver.rotation.y = Math.PI / 2 // local -Z faces West toward the table
  root.add(morettiObserver)
  solids.push(aabb(2.0, 2.5, 0, 1.3, -0.3, 0.3))

  const mHips = requireNode(morettiGltf.scene, 'hips')
  const mChest = requireNode(morettiGltf.scene, 'chest')
  const mHead = requireNode(morettiGltf.scene, 'head')
  const mLegs = (['l', 'r'] as const).map((side) => ({
    hip: requireNode(morettiGltf.scene, `leg_${side}_0`),
    knee: requireNode(morettiGltf.scene, `leg_${side}_1`),
  }))
  const mArms = (['l', 'r'] as const).map((side) => ({
    side,
    shoulder: requireNode(morettiGltf.scene, `arm_${side}_0`),
    elbow: requireNode(morettiGltf.scene, `arm_${side}_1`),
  }))

  mHips.position.y = 0.50
  for (const leg of mLegs) {
    leg.hip.rotation.x = 1.48
    leg.knee.rotation.x = -1.48
  }
  mChest.rotation.x = -0.06
  mHead.rotation.y = -0.22 // slight glance toward Victor at North side of table
  mHead.rotation.x = -0.08
  for (const arm of mArms) {
    const bind = arm.shoulder.quaternion.clone()
    arm.shoulder.rotation.set(0.52, 0, arm.side === 'l' ? 0.14 : -0.14)
    arm.shoulder.quaternion.multiply(bind)
    arm.elbow.rotation.x = 0.90
  }

  // Clipboard resting across Moretti's knees
  const clipMat = new MeshStandardMaterial({ color: new Color(0.5, 0.4, 0.3), roughness: 0.6 })
  const mObsClip = new Mesh(new BoxGeometry(0.24, 0.018, 0.32), clipMat)
  mObsClip.position.set(0, 0.54, -0.34)
  const mObsSheet = new Mesh(new BoxGeometry(0.20, 0.006, 0.28), paperMat)
  mObsSheet.position.set(0, 0.552, -0.34)
  morettiObserver.add(mObsClip, mObsSheet)

  // Player spawn: south side of table facing +Z North across table at Victor
  const spawn = new Vector3(0, 0, -1.45)
  const spawnYaw = Math.PI

  let elapsed = 0

  return {
    group: root,
    solids,
    floors,
    props: {
      tapeRecorder,
      caseFolder,
      victorActor,
      morettiObserver,
      interviewTable,
      interviewDoor,
    },
    spawn,
    spawnYaw,
    update(delta: number): void {
      elapsed += delta
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 5.0)
      ledGlow.intensity = 0.3 + 0.4 * pulse
      vChest.rotation.x = vChestBase + Math.sin(elapsed * 1.25) * 0.012
      vHead.rotation.y = Math.sin(elapsed * 0.45) * 0.05
    },
  }
}
