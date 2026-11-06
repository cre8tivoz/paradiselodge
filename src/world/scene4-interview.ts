import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Vector3,
} from 'three'
import { aabb } from './kit.ts'
import type { WalkableRegion } from './collision.ts'
import { darkWoodMaterial, floorMaterial } from '../materials/look.ts'

/**
 * Scene 4 — St Kilda CID Interview Room 1.
 *
 * 1994 institutional interrogation room.
 * Concrete cinderblock walls, heavy fire door with wire-glass observation pane,
 * humming overhead fluorescent tube, central laminate table with dual-spool
 * police tape recorder, manila case folder, and seated Victor Rakov suspect.
 */

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

function walk(box: Box3, surface: 'floorboard' | 'carpet' = 'floorboard'): WalkableRegion {
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

export function buildInterviewRoom(): InterviewWorld {
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
  // Floor
  const floorMesh = slab(new Box3(new Vector3(-3.0, -0.1, -2.4), new Vector3(3.0, 0.0, 2.4)), floorMat)
  root.add(floorMesh)
  floors.push(walk(new Box3(new Vector3(-2.8, -0.05, -2.2), new Vector3(2.8, 0.05, 2.2)), 'floorboard'))

  // Ceiling
  const ceilingMesh = slab(new Box3(new Vector3(-3.0, 3.0, -2.4), new Vector3(3.0, 3.1, 2.4)), ceilingMat)
  root.add(ceilingMesh)

  // Walls (Two-tone: 0-1.2m lower wainscot, 1.2-3.0m upper cream)
  // North Wall (Z = 2.4)
  const wallNLower = slab(new Box3(new Vector3(-3.0, 0, 2.38), new Vector3(3.0, 1.2, 2.42)), wallLowerMat)
  const wallNUpper = slab(new Box3(new Vector3(-3.0, 1.2, 2.38), new Vector3(3.0, 3.0, 2.42)), wallUpperMat)
  root.add(wallNLower, wallNUpper)
  solids.push(aabb(-3.0, 0, 2.35, 3.0, 3.0, 2.45))

  // South Wall (Z = -2.4)
  const wallSLower = slab(new Box3(new Vector3(-3.0, 0, -2.42), new Vector3(3.0, 1.2, -2.38)), wallLowerMat)
  const wallSUpper = slab(new Box3(new Vector3(-3.0, 1.2, -2.42), new Vector3(3.0, 3.0, -2.38)), wallUpperMat)
  root.add(wallSLower, wallSUpper)
  solids.push(aabb(-3.0, 0, -2.45, 3.0, 3.0, -2.35))

  // East Wall (X = 3.0)
  const wallELower = slab(new Box3(new Vector3(2.98, 0, -2.4), new Vector3(3.02, 1.2, 2.4)), wallLowerMat)
  const wallEUpper = slab(new Box3(new Vector3(2.98, 1.2, -2.4), new Vector3(3.02, 3.0, 2.4)), wallUpperMat)
  root.add(wallELower, wallEUpper)
  solids.push(aabb(2.95, 0, -2.4, 3.05, 3.0, 2.4))

  // West Wall with Fire Door (X = -3.0)
  const wallW1Lower = slab(new Box3(new Vector3(-3.02, 0, -2.4), new Vector3(-2.98, 1.2, -0.6)), wallLowerMat)
  const wallW1Upper = slab(new Box3(new Vector3(-3.02, 1.2, -2.4), new Vector3(-2.98, 3.0, -0.6)), wallUpperMat)
  const wallW2Lower = slab(new Box3(new Vector3(-3.02, 0, 0.6), new Vector3(-2.98, 1.2, 2.4)), wallLowerMat)
  const wallW2Upper = slab(new Box3(new Vector3(-3.02, 1.2, 0.6), new Vector3(-2.98, 3.0, 2.4)), wallUpperMat)
  const wallWTop = slab(new Box3(new Vector3(-3.02, 2.2, -0.6), new Vector3(-2.98, 3.0, 0.6)), wallUpperMat)
  root.add(wallW1Lower, wallW1Upper, wallW2Lower, wallW2Upper, wallWTop)
  solids.push(
    aabb(-3.05, 0, -2.4, -2.95, 3.0, -0.6),
    aabb(-3.05, 0, 0.6, -2.95, 3.0, 2.4),
    aabb(-3.05, 0, -0.6, -2.95, 3.0, 0.6), // closed door solid
  )

  // Fire Door Leaf with Observation Window
  const interviewDoor = new Group()
  interviewDoor.name = 'interviewDoor'
  const doorLeaf = slab(new Box3(new Vector3(-2.99, 0.02, -0.58), new Vector3(-2.95, 2.18, 0.58)), doorMat)
  const wireGlass = slab(new Box3(new Vector3(-3.0, 1.35, -0.15), new Vector3(-2.94, 1.75, 0.15)), wireGlassMat)
  interviewDoor.add(doorLeaf, wireGlass)
  root.add(interviewDoor)

  // --- 2. Lighting ---
  // Cool ambient light bounce
  const ambientLight = new AmbientLight(new Color(0.18, 0.22, 0.26), 0.75)
  root.add(ambientLight)

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
  // Laminate tabletop (1.6m wide, 0.9m deep, 0.75m high)
  const tabletop = slab(new Box3(new Vector3(-0.8, 0.72, -0.45), new Vector3(0.8, 0.76, 0.45)), tableMat)
  // Steel square legs
  const leg1 = slab(new Box3(new Vector3(-0.76, 0, -0.41), new Vector3(-0.72, 0.72, -0.37)), steelMat)
  const leg2 = slab(new Box3(new Vector3(0.72, 0, -0.41), new Vector3(0.76, 0.72, -0.37)), steelMat)
  const leg3 = slab(new Box3(new Vector3(-0.76, 0, 0.37), new Vector3(-0.72, 0.72, 0.41)), steelMat)
  const leg4 = slab(new Box3(new Vector3(0.72, 0, 0.37), new Vector3(0.76, 0.72, 0.41)), steelMat)
  interviewTable.add(tabletop, leg1, leg2, leg3, leg4)
  root.add(interviewTable)
  solids.push(aabb(-0.82, 0, -0.48, 0.82, 0.8, 0.48))

  // Victor's chair (North side of table at Z = 0.85, facing South)
  const vChair = new Group()
  const vSeat = slab(new Box3(new Vector3(-0.25, 0.44, 0.7), new Vector3(0.25, 0.48, 1.1)), vinylMat)
  const vBack = slab(new Box3(new Vector3(-0.25, 0.48, 1.06), new Vector3(0.25, 0.88, 1.1)), steelMat)
  vChair.add(vSeat, vBack)
  root.add(vChair)
  solids.push(aabb(-0.28, 0, 0.68, 0.28, 0.9, 1.12))

  // Miller's chair (South side of table at Z = -0.85, facing North)
  const mChair = new Group()
  const mSeat = slab(new Box3(new Vector3(-0.25, 0.44, -1.1), new Vector3(0.25, 0.48, -0.7)), vinylMat)
  const mBack = slab(new Box3(new Vector3(-0.25, 0.48, -1.1), new Vector3(0.25, 0.88, -1.06)), steelMat)
  mChair.add(mSeat, mBack)
  root.add(mChair)
  solids.push(aabb(-0.28, 0, -1.12, 0.28, 0.9, -0.68))

  // --- 4. Props on the Table ---
  // Police Dual-Cassette Tape Recorder (Realistic CTR-80 style)
  const tapeRecorder = new Group()
  tapeRecorder.name = 'tapeRecorder'
  const recBodyMat = new MeshStandardMaterial({ color: new Color(0.18, 0.2, 0.22), roughness: 0.5, metalness: 0.3 })
  const spoolMat = new MeshStandardMaterial({ color: new Color(0.9, 0.9, 0.9), roughness: 0.4 })
  const ledMat = new MeshStandardMaterial({ color: new Color(1.0, 0.1, 0.1), roughness: 0.3 })

  const recBody = slab(new Box3(new Vector3(-0.45, 0.76, -0.15), new Vector3(-0.15, 0.83, 0.15)), recBodyMat)
  const spool1 = slab(new Box3(new Vector3(-0.4, 0.831, -0.05), new Vector3(-0.34, 0.833, 0.05)), spoolMat)
  const spool2 = slab(new Box3(new Vector3(-0.26, 0.831, -0.05), new Vector3(-0.2, 0.833, 0.05)), spoolMat)
  const recLed = slab(new Box3(new Vector3(-0.18, 0.831, 0.1), new Vector3(-0.16, 0.834, 0.12)), ledMat)

  // Small red LED glow
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

  // Glass ashtray with butt
  const ashtrayMat = new MeshStandardMaterial({ color: new Color(0.4, 0.5, 0.5), roughness: 0.2, transparent: true, opacity: 0.7 })
  const ashtrayMesh = new Mesh(new CylinderGeometry(0.06, 0.06, 0.025, 12), ashtrayMat)
  ashtrayMesh.position.set(0.0, 0.772, 0.0)
  root.add(ashtrayMesh)

  // --- 5. Suspect Actor — Victor Rakov ---
  const victorActor = new Group()
  victorActor.name = 'victorActor'
  const jacketMat = new MeshStandardMaterial({ color: new Color(0.18, 0.24, 0.35), roughness: 0.65 }) // mud-spattered denim
  const jeansMat = new MeshStandardMaterial({ color: new Color(0.12, 0.15, 0.22), roughness: 0.7 })
  const bootMat = new MeshStandardMaterial({ color: new Color(0.18, 0.14, 0.10), roughness: 0.8 })
  const skinMat = new MeshStandardMaterial({ color: new Color(0.68, 0.52, 0.42), roughness: 0.7 })

  // Seated torso (slumped forward defensively across table)
  const vTorso = new Mesh(new BoxGeometry(0.46, 0.55, 0.30), jacketMat)
  vTorso.position.set(0, 0.78, 0.85)
  vTorso.rotation.x = 0.12 // leaning forward toward Miller
  vTorso.castShadow = true

  // Head (lowered, hostile glare)
  const vHead = new Mesh(new CylinderGeometry(0.11, 0.1, 0.24, 12), skinMat)
  vHead.position.set(0, 1.16, 0.82)
  vHead.rotation.x = -0.1
  vHead.castShadow = true

  // Folded arms on table edge
  const vArms = new Mesh(new BoxGeometry(0.48, 0.14, 0.18), jacketMat)
  vArms.position.set(0, 0.79, 0.58)
  vArms.castShadow = true

  // Seated thighs
  const vThighs = new Mesh(new BoxGeometry(0.42, 0.16, 0.42), jeansMat)
  vThighs.position.set(0, 0.48, 0.72)

  // Lower legs
  const vShinL = new Mesh(new BoxGeometry(0.16, 0.44, 0.16), jeansMat)
  vShinL.position.set(-0.13, 0.24, 0.56)
  const vShinR = new Mesh(new BoxGeometry(0.16, 0.44, 0.16), jeansMat)
  vShinR.position.set(0.13, 0.24, 0.56)

  // Scuffed boots
  const vBootL = new Mesh(new BoxGeometry(0.16, 0.12, 0.26), bootMat)
  vBootL.position.set(-0.13, 0.06, 0.6)
  const vBootR = new Mesh(new BoxGeometry(0.16, 0.12, 0.26), bootMat)
  vBootR.position.set(0.13, 0.06, 0.6)

  victorActor.add(vTorso, vHead, vArms, vThighs, vShinL, vShinR, vBootL, vBootR)
  root.add(victorActor)

  // --- 6. Observer Actor — Constable Moretti ---
  const morettiObserver = new Group()
  morettiObserver.name = 'morettiObserver'
  const uniformMat = new MeshStandardMaterial({ color: new Color(0.14, 0.22, 0.38), roughness: 0.6 }) // VicPol summer blue
  const mObsTorso = new Mesh(new BoxGeometry(0.44, 0.56, 0.28), uniformMat)
  mObsTorso.position.set(2.2, 0.76, 0.0)
  mObsTorso.rotation.y = -Math.PI / 2 // facing west toward table
  const mObsHead = new Mesh(new CylinderGeometry(0.11, 0.1, 0.24, 12), skinMat)
  mObsHead.position.set(2.2, 1.15, 0.0)
  // Clipboard on knees
  const clipMat = new MeshStandardMaterial({ color: new Color(0.5, 0.4, 0.3), roughness: 0.6 })
  const mObsClip = new Mesh(new BoxGeometry(0.24, 0.02, 0.32), clipMat)
  mObsClip.position.set(1.95, 0.52, 0.0)
  morettiObserver.add(mObsTorso, mObsHead, mObsClip)
  root.add(morettiObserver)
  solids.push(aabb(1.9, 0, -0.3, 2.4, 1.2, 0.3))

  // Player spawn: south side of table, facing north directly at Victor and the tape recorder
  const spawn = new Vector3(0, 0, -1.25)
  const spawnYaw = 0 // facing +Z towards Victor

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
    update(_delta: number): void {
      // Subtle pulse on the recording LED
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005)
      ledGlow.intensity = 0.3 + 0.4 * pulse
    },
  }
}
