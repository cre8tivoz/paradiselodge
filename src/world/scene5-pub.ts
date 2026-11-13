import {
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
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
import { darkWoodMaterial } from '../materials/look.ts'
import { prepareCharacterLook } from '../npc/character-look.ts'

/**
 * Scene 5 — Mahoney's Bar, Fitzroy Street, St Kilda.
 *
 * 1994 Melbourne public bar and beer cellar.
 * Dark mahogany bar counter with chrome taps and back-lit optics mirror,
 * worn Axminster pub carpet, slate pool table under cone pendant light,
 * corner video poker machines, and a reinforced grille door leading down
 * bluestone steps to the beer keg cellar with Chubb floor safe.
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

function walk(box: Box3, surface: Surface = 'carpet'): WalkableRegion {
  return {
    box: new Box3(
      new Vector3(box.min.x, box.min.y, box.min.z),
      new Vector3(box.max.x, box.max.y, box.max.z),
    ),
    surface,
  }
}

export interface PubProps {
  readonly sterlingActor: Group
  readonly morettiActor: Group
  readonly brawlGroup: Group
  readonly cellarDoor: Group
  readonly floorSafe: Group
  readonly ledgerMesh: Mesh
  readonly poolTable: Group
  readonly barCounter: Group
  readonly exitDoor: Group
}

export interface PubWorld {
  readonly group: Group
  readonly solids: Box3[]
  readonly floors: WalkableRegion[]
  readonly props: PubProps
  readonly spawn: Vector3
  readonly spawnYaw: number
  update(delta: number): void
  setBrawlActive(active: boolean): void
  setCellarUnlocked(unlocked: boolean): void
  setSafeOpened(opened: boolean): void
  setSterlingFleeing(fleeing: boolean): void
}

export async function buildMahoneysBar(): Promise<PubWorld> {
  const root = new Group()
  root.name = 'scene5-pub'

  const solids: Box3[] = []
  const floors: WalkableRegion[] = []

  // Materials
  const carpetMat = new MeshStandardMaterial({
    color: new Color(0.35, 0.12, 0.14), // worn burgundy Axminster pub carpet
    roughness: 0.95,
  })
  const timberLowerMat = new MeshStandardMaterial({
    color: new Color(0.24, 0.15, 0.10), // dark varnished Victorian wainscoting
    roughness: 0.45,
  })
  const wallUpperMat = new MeshStandardMaterial({
    color: new Color(0.68, 0.58, 0.42), // aged tobacco-stained amber plaster
    roughness: 0.85,
  })
  const ceilingMat = new MeshStandardMaterial({
    color: new Color(0.30, 0.26, 0.22), // smoke-stained pressed metal ceiling
    roughness: 0.9,
  })
  const mahoganyMat = darkWoodMaterial(0.4)
  const chromeMat = new MeshStandardMaterial({
    color: new Color(0.85, 0.85, 0.90),
    metalness: 0.85,
    roughness: 0.2,
  })
  const brassMat = new MeshStandardMaterial({
    color: new Color(0.88, 0.72, 0.32),
    metalness: 0.75,
    roughness: 0.3,
  })
  const mirrorMat = new MeshStandardMaterial({
    color: new Color(0.40, 0.45, 0.50),
    metalness: 0.95,
    roughness: 0.1,
  })
  const greenBaizeMat = new MeshStandardMaterial({
    color: new Color(0.08, 0.36, 0.18), // pool table cloth
    roughness: 0.9,
  })
  const bluestoneMat = new MeshStandardMaterial({
    color: new Color(0.24, 0.26, 0.29), // cellar damp bluestone
    roughness: 0.8,
  })
  const safeSteelMat = new MeshStandardMaterial({
    color: new Color(0.18, 0.20, 0.22),
    metalness: 0.7,
    roughness: 0.4,
  })

  // -------------------------------------------------------------------------
  // 1. Room Shell (Main Public Bar: 12m wide x 12m deep x 3.6m high)
  // -------------------------------------------------------------------------
  const floorMesh = slab(aabb(-6, 6, -0.15, 0, -6, 6), carpetMat)
  root.add(floorMesh)
  floors.push(walk(aabb(-5.7, 5.7, -0.2, 0.0, -6.02, 5.7), 'carpet'))

  const ceilMesh = slab(aabb(-6, 6, 3.6, 3.75, -6, 6), ceilingMat)
  root.add(ceilMesh)

  // South Wall (Front Entrance onto Fitzroy St)
  root.add(slab(aabb(-6, 6, 0, 1.3, 5.9, 6.1), timberLowerMat))
  root.add(slab(aabb(-6, 6, 1.3, 3.6, 5.9, 6.1), wallUpperMat))
  solids.push(aabb(-6, 6, 0, 3.6, 5.8, 6.2))

  // East Wall
  root.add(slab(aabb(5.9, 6.1, 0, 1.3, -6, 6), timberLowerMat))
  root.add(slab(aabb(5.9, 6.1, 1.3, 3.6, -6, 6), wallUpperMat))
  solids.push(aabb(5.8, 6.2, 0, 3.6, -6, 6))

  // Recessed back fire-exit door on East wall NE corridor (z = -5.0 to -4.0)
  const exitDoor = new Group()
  exitDoor.name = 'exitDoor'
  const exitSignMat = new MeshStandardMaterial({
    color: new Color(0x10381e),
    emissive: new Color(0x22ff66),
    emissiveIntensity: 1.8,
    roughness: 0.25,
  })
  exitDoor.add(
    // Steel jambs & transom
    slab(aabb(5.82, 5.91, 0, 2.24, -5.06, -4.96), safeSteelMat),
    slab(aabb(5.82, 5.91, 0, 2.24, -4.04, -3.94), safeSteelMat),
    slab(aabb(5.82, 5.91, 2.18, 2.26, -5.06, -3.94), safeSteelMat),
    // Recessed fire-door leaf
    slab(aabb(5.85, 5.90, 0.02, 2.18, -4.96, -4.04), safeSteelMat),
    // Chrome crash / push bar + mounts
    slab(aabb(5.79, 5.85, 0.98, 1.05, -4.88, -4.12), chromeMat),
    slab(aabb(5.81, 5.86, 0.97, 1.06, -4.90, -4.84), chromeMat),
    slab(aabb(5.81, 5.86, 0.97, 1.06, -4.16, -4.10), chromeMat),
    // Illuminated green EXIT box over lintel
    slab(aabb(5.81, 5.90, 2.26, 2.42, -4.70, -4.30), exitSignMat),
  )
  root.add(exitDoor)

  // West Wall (behind Bar Counter)
  root.add(slab(aabb(-6.1, -5.9, 0, 1.3, -6, 6), timberLowerMat))
  root.add(slab(aabb(-6.1, -5.9, 1.3, 3.6, -6, 6), wallUpperMat))
  solids.push(aabb(-6.2, -5.8, 0, 3.6, -6, 6))

  // North Wall (with Cellar doorway opening at x = -4.2 to -2.5)
  root.add(slab(aabb(-2.5, 6, 0, 1.3, -6.1, -5.9), timberLowerMat))
  root.add(slab(aabb(-2.5, 6, 1.3, 3.6, -6.1, -5.9), wallUpperMat))
  solids.push(aabb(-2.5, 6, 0, 3.6, -6.2, -5.8))

  root.add(slab(aabb(-6, -4.2, 0, 1.3, -6.1, -5.9), timberLowerMat))
  root.add(slab(aabb(-6, -4.2, 1.3, 3.6, -6.1, -5.9), wallUpperMat))
  solids.push(aabb(-6, -4.2, 0, 3.6, -6.2, -5.8))

  // Lintel above cellar doorway
  root.add(slab(aabb(-4.2, -2.5, 2.4, 3.6, -6.1, -5.9), wallUpperMat))

  // -------------------------------------------------------------------------
  // 2. Mahogany Bar Counter & Optics Back-Bar
  // -------------------------------------------------------------------------
  const barCounter = new Group()
  barCounter.name = 'bar-counter'

  const counterTop = slab(aabb(-3.6, -2.9, 1.05, 1.15, -4.5, 2.5), mahoganyMat)
  const counterBody = slab(aabb(-3.5, -3.0, 0, 1.05, -4.4, 2.4), timberLowerMat)
  const brassFootRail = slab(aabb(-2.85, -2.75, 0.15, 0.25, -4.3, 2.3), brassMat)
  barCounter.add(counterTop, counterBody, brassFootRail)
  solids.push(aabb(-3.7, -2.8, 0, 1.2, -4.6, 2.6))

  // Beer taps (two chrome fonts)
  for (const tz of [-1.5, 0.5]) {
    const tapCol = new Mesh(new CylinderGeometry(0.04, 0.05, 0.45, 12), chromeMat)
    tapCol.position.set(-3.25, 1.35, tz)
    const tapHead = new Mesh(new BoxGeometry(0.12, 0.08, 0.18), chromeMat)
    tapHead.position.set(-3.25, 1.55, tz)
    const tapHandle = new Mesh(new CylinderGeometry(0.015, 0.015, 0.18, 8), mahoganyMat)
    tapHandle.position.set(-3.25, 1.68, tz)
    barCounter.add(tapCol, tapHead, tapHandle)
  }

  // Back-Bar optics shelf against west wall
  const backShelf = slab(aabb(-5.8, -5.2, 0.85, 0.95, -4.2, 2.2), mahoganyMat)
  const backShelfUpper = slab(aabb(-5.8, -5.2, 1.75, 1.85, -4.2, 2.2), mahoganyMat)
  const backMirror = slab(aabb(-5.85, -5.78, 0.95, 2.5, -4.0, 2.0), mirrorMat)
  barCounter.add(backShelf, backShelfUpper, backMirror)
  solids.push(aabb(-5.9, -5.1, 0, 2.6, -4.3, 2.3))

  root.add(barCounter)

  // -------------------------------------------------------------------------
  // 3. Pool Table & Lights
  // -------------------------------------------------------------------------
  const poolTable = new Group()
  poolTable.name = 'pool-table'
  const tableBase = slab(aabb(1.15, 3.65, 0, 0.75, -2.25, 0.25), timberLowerMat)
  const baize = slab(aabb(1.25, 3.55, 0.75, 0.85, -2.15, 0.15), greenBaizeMat)
  const tableCushion = slab(aabb(1.15, 3.65, 0.80, 0.92, -2.25, 0.25), mahoganyMat)
  poolTable.add(tableBase, baize, tableCushion)
  solids.push(aabb(1.1, 3.7, 0, 1.0, -2.3, 0.3))

  const poolLightCone = new Mesh(new CylinderGeometry(0.08, 0.45, 0.35, 16, 1, true), greenBaizeMat)
  poolLightCone.position.set(2.4, 2.3, -1.0)
  const poolBulb = new PointLight(0xffdf88, 2.2, 7)
  poolBulb.position.set(2.4, 2.15, -1.0)
  poolLightCone.add(poolBulb)
  poolTable.add(poolLightCone)

  root.add(poolTable)

  // -------------------------------------------------------------------------
  // 4. Video Poker Machines (Pokies Corner at x = 4.6 to 5.6, z = 3.0 to 5.2)
  // -------------------------------------------------------------------------
  const pokieGroup = new Group()
  pokieGroup.name = 'pokies'
  for (let i = 0; i < 3; i += 1) {
    const pz = 3.3 + i * 0.75
    const cabinet = slab(aabb(4.6, 5.6, 0, 1.75, pz - 0.3, pz + 0.3), safeSteelMat)
    const crtScreen = slab(
      aabb(4.55, 4.62, 1.05, 1.55, pz - 0.22, pz + 0.22),
      new MeshStandardMaterial({
        color: new Color(i === 0 ? 0x0055ff : i === 1 ? 0xffaa00 : 0x00ff88),
        emissive: new Color(i === 0 ? 0x002288 : i === 1 ? 0x884400 : 0x006633),
        roughness: 0.2,
      }),
    )
    pokieGroup.add(cabinet, crtScreen)
    solids.push(aabb(4.5, 5.7, 0, 1.8, pz - 0.35, pz + 0.35))
  }
  root.add(pokieGroup)

  // -------------------------------------------------------------------------
  // 5. Back Stairwell & Beer Keg Cellar
  // -------------------------------------------------------------------------
  const cellarGroup = new Group()
  cellarGroup.name = 'cellar'

  // 8 bluestone treads descending z = -6.0 -> -10.0 (0.25m step <= PLAYER.stepUp / stepDown)
  for (let i = 1; i <= 8; i += 1) {
    const topY = -i * 0.25
    const z1 = -6.0 - (i - 1) * 0.5
    const z0 = -6.0 - i * 0.5
    cellarGroup.add(slab(aabb(-4.2, -2.5, topY - 0.22, topY, z0, z1), bluestoneMat))
    floors.push(walk(aabb(-4.1, -2.6, topY - 0.2, topY, z0, z1), 'bluestone'))
  }

  const cellarFloor = slab(aabb(-5.5, -1.5, -2.15, -2.0, -15.0, -10.0), bluestoneMat)
  cellarGroup.add(cellarFloor)
  floors.push(walk(aabb(-5.2, -1.8, -2.2, -2.0, -14.7, -9.95), 'bluestone'))

  // Stairwell enclosure (headroom y = 2.4m above stairs, drops cleanly to cellar ceiling at z = -10.0)
  cellarGroup.add(slab(aabb(-4.35, -4.2, -2.1, 2.45, -10.0, -6.0), bluestoneMat))
  cellarGroup.add(slab(aabb(-2.5, -2.35, -2.1, 2.45, -10.0, -6.0), bluestoneMat))
  cellarGroup.add(slab(aabb(-4.35, -2.35, 2.4, 2.55, -10.0, -6.0), bluestoneMat))
  cellarGroup.add(slab(aabb(-4.35, -2.35, 0.2, 2.45, -10.15, -10.0), bluestoneMat))
  solids.push(
    aabb(-4.4, -4.18, -2.1, 2.5, -10.0, -6.0),
    aabb(-2.52, -2.3, -2.1, 2.5, -10.0, -6.0),
  )

  // Cellar room ceiling & perimeter walls (z = -10.0 to -15.2, floor y = -2.0, ceiling y = +0.2)
  cellarGroup.add(slab(aabb(-5.8, -1.2, 0.2, 0.35, -15.2, -10.0), bluestoneMat))
  // North cellar wall
  cellarGroup.add(slab(aabb(-5.8, -1.2, -2.1, 0.35, -15.2, -14.8), bluestoneMat))
  solids.push(aabb(-5.9, -1.1, -2.1, 0.4, -15.3, -14.7))
  // West cellar wall
  cellarGroup.add(slab(aabb(-5.8, -5.3, -2.1, 0.35, -15.0, -9.85), bluestoneMat))
  solids.push(aabb(-5.9, -5.2, -2.1, 0.4, -15.0, -9.85))
  // East cellar wall
  cellarGroup.add(slab(aabb(-1.7, -1.2, -2.1, 0.35, -15.0, -9.85), bluestoneMat))
  solids.push(aabb(-1.8, -1.1, -2.1, 0.4, -15.0, -9.85))
  // South cellar bulkhead side returns around stairs
  cellarGroup.add(slab(aabb(-5.8, -4.2, -2.1, 0.35, -10.15, -9.95), bluestoneMat))
  cellarGroup.add(slab(aabb(-2.5, -1.2, -2.1, 0.35, -10.15, -9.95), bluestoneMat))
  solids.push(
    aabb(-5.9, -4.15, -2.1, 0.4, -10.2, -9.75),
    aabb(-2.55, -1.1, -2.1, 0.4, -10.2, -9.75),
  )

  // Fixed door jambs/header around cellar entrance at z = -6.0
  cellarGroup.add(slab(aabb(-4.26, -4.18, 0, 2.4, -6.06, -5.94), safeSteelMat))
  cellarGroup.add(slab(aabb(-2.52, -2.44, 0, 2.4, -6.06, -5.94), safeSteelMat))
  cellarGroup.add(slab(aabb(-4.26, -2.44, 2.34, 2.42, -6.06, -5.94), safeSteelMat))

  // Cellar Grille / Gate hinged at west jamb (-4.2, 0, -6.0)
  const cellarDoor = new Group()
  cellarDoor.name = 'cellar-grille'
  cellarDoor.position.set(-4.2, 0, -6.0)
  cellarDoor.add(
    slab(aabb(0, 1.7, 2.28, 2.34, -0.04, 0.04), safeSteelMat),
    slab(aabb(0, 1.7, 1.12, 1.18, -0.04, 0.04), safeSteelMat),
    slab(aabb(0, 1.7, 0.02, 0.08, -0.04, 0.04), safeSteelMat),
  )
  for (let bx = 0.15; bx <= 1.65; bx += 0.25) {
    const bar = new Mesh(new CylinderGeometry(0.018, 0.018, 2.3, 8), safeSteelMat)
    bar.position.set(bx, 1.15, 0)
    cellarDoor.add(bar)
  }
  const brassPadlock = new Mesh(new BoxGeometry(0.12, 0.16, 0.08), brassMat)
  brassPadlock.position.set(1.52, 1.1, 0.06)
  cellarDoor.add(brassPadlock)
  cellarGroup.add(cellarDoor)

  // Solid blocker released when cellar gate is unlocked
  const cellarBlocker = aabb(-4.2, -2.5, 0, 2.4, -6.15, -5.85)
  solids.push(cellarBlocker)

  // Beer Kegs in cellar
  const kegMat = new MeshStandardMaterial({
    color: new Color(0.72, 0.75, 0.78),
    metalness: 0.8,
    roughness: 0.35,
  })
  for (let kz = -11.5; kz >= -14.0; kz -= 1.1) {
    const kegLeft = new Mesh(new CylinderGeometry(0.32, 0.32, 0.75, 14), kegMat)
    kegLeft.position.set(-4.6, -1.62, kz)
    const kegRight = new Mesh(new CylinderGeometry(0.32, 0.32, 0.75, 14), kegMat)
    kegRight.position.set(-2.4, -1.62, kz)
    cellarGroup.add(kegLeft, kegRight)
    solids.push(aabb(-5.0, -4.2, -2.0, -1.0, kz - 0.4, kz + 0.4))
    solids.push(aabb(-2.8, -2.0, -2.0, -1.0, kz - 0.4, kz + 0.4))
  }

  // Chubb Floor Safe in cellar floor at x = -3.5, z = -13.0, y = -2.0
  const floorSafe = new Group()
  floorSafe.name = 'floor-safe'
  const safeFrame = slab(aabb(-3.85, -3.15, -2.05, -1.95, -13.35, -12.65), safeSteelMat)
  const safeLidPivot = new Group()
  safeLidPivot.position.set(-3.5, -1.95, -13.3)
  const safeLid = slab(aabb(-0.3, 0.3, -0.02, 0.02, 0, 0.6), safeSteelMat)
  const safeDial = new Mesh(new CylinderGeometry(0.04, 0.04, 0.03, 12), brassMat)
  safeDial.position.set(0, 0.035, 0.3)
  safeLidPivot.add(safeLid, safeDial)
  floorSafe.add(safeFrame, safeLidPivot)

  // Extortion Ledger inside the safe
  const ledgerMat = new MeshStandardMaterial({
    color: new Color(0.12, 0.12, 0.14),
    roughness: 0.5,
  })
  const ledgerMesh = new Mesh(new BoxGeometry(0.28, 0.06, 0.38), ledgerMat)
  ledgerMesh.position.set(-3.5, -1.97, -13.0)
  floorSafe.add(ledgerMesh)

  cellarGroup.add(floorSafe)
  root.add(cellarGroup)

  // -------------------------------------------------------------------------
  // 6. Actors: Kenneth Sterling, Constable Moretti, Punters Brawl
  // -------------------------------------------------------------------------
  const gltfLoader = new GLTFLoader()
  const [sterlingGltf, morettiGltf] = await Promise.all([
    gltfLoader.loadAsync('/models/sterling.glb'),
    gltfLoader.loadAsync('/models/moretti.glb'),
  ])

  prepareCharacterLook(sterlingGltf.scene, { contactShadow: true, roughness: 0.78, rimStrength: 0.22 })
  prepareCharacterLook(morettiGltf.scene, { contactShadow: true, roughness: 0.78, rimStrength: 0.22 })

  // Kenneth Sterling behind the bar counter facing Miller/East across the bar
  const sterlingActor = new Group()
  sterlingActor.name = 'actor-sterling'
  sterlingActor.add(sterlingGltf.scene)
  sterlingActor.position.set(-4.5, 0, -1.0)
  sterlingActor.rotation.y = -Math.PI * 0.55
  root.add(sterlingActor)

  const sChest = requireNode(sterlingGltf.scene, 'chest')
  const sArms = (['l', 'r'] as const).map((side) => ({
    side,
    shoulder: requireNode(sterlingGltf.scene, `arm_${side}_0`),
    elbow: requireNode(sterlingGltf.scene, `arm_${side}_1`),
  }))
  for (const arm of sArms) {
    const bind = arm.shoulder.quaternion.clone()
    arm.shoulder.rotation.set(0.32, 0, arm.side === 'l' ? 0.08 : -0.08)
    arm.shoulder.quaternion.multiply(bind)
    arm.elbow.rotation.x = 0.65
  }
  const sVestChain = new Mesh(new BoxGeometry(0.11, 0.025, 0.02), brassMat)
  sVestChain.position.set(-0.07, 0.24, -0.135)
  sChest.add(sVestChain)

  // Constable Moretti standing inside the entrance near bar/pool table
  const morettiActor = new Group()
  morettiActor.name = 'actor-moretti'
  morettiActor.add(morettiGltf.scene)
  morettiActor.position.set(0.8, 0, 1.8)
  morettiActor.rotation.y = 0.45
  root.add(morettiActor)
  const morettiSolidBox = aabb(0.52, 1.08, 0, 1.85, 1.52, 2.08)
  solids.push(morettiSolidBox)

  const mChest = requireNode(morettiGltf.scene, 'chest')

  // Bar Brawl group (two brawling punters at x = 3.2, z = 0.8 near pool table)
  const brawlGroup = new Group()
  brawlGroup.name = 'actor-brawl'
  const punter1Mat = new MeshStandardMaterial({ color: new Color(0.25, 0.30, 0.45), roughness: 0.75 })
  const punter2Mat = new MeshStandardMaterial({ color: new Color(0.45, 0.22, 0.20), roughness: 0.75 })
  const punterHeadMat = new MeshStandardMaterial({ color: new Color(0.68, 0.52, 0.42), roughness: 0.7 })
  const p1 = new Group()
  const p1Body = new Mesh(new BoxGeometry(0.45, 0.65, 0.28), punter1Mat)
  p1Body.position.y = 1.2
  const p1Head = new Mesh(new CylinderGeometry(0.1, 0.1, 0.22, 10), punterHeadMat)
  p1Head.position.y = 1.66
  p1.add(p1Body, p1Head)
  p1.position.set(-0.25, 0, 0)

  const p2 = new Group()
  const p2Body = new Mesh(new BoxGeometry(0.45, 0.65, 0.28), punter2Mat)
  p2Body.position.y = 1.2
  const p2Head = new Mesh(new CylinderGeometry(0.1, 0.1, 0.22, 10), punterHeadMat)
  p2Head.position.y = 1.66
  p2.add(p2Body, p2Head)
  p2.position.set(0.25, 0, 0)

  brawlGroup.add(p1, p2)
  brawlGroup.position.set(3.2, 0, 0.8)
  root.add(brawlGroup)

  // -------------------------------------------------------------------------
  // 7. Lighting
  // -------------------------------------------------------------------------
  const pubFill = new HemisphereLight(new Color(0x9a7a5c), new Color(0x2a1814), 0.42)
  root.add(pubFill)

  const barLight = new PointLight(0xffb866, 2.6, 10)
  barLight.position.set(-3.5, 2.5, -1.0)
  root.add(barLight)

  const opticsLight = new PointLight(0xffa044, 1.4, 6)
  opticsLight.position.set(-5.4, 2.0, -1.0)
  root.add(opticsLight)

  const stairLight = new PointLight(0xffd28a, 1.8, 7)
  stairLight.position.set(-3.35, 1.8, -7.8)
  root.add(stairLight)

  const cellarLight = new PointLight(0x99ddff, 2.6, 11)
  cellarLight.position.set(-3.5, -0.1, -12.5)
  root.add(cellarLight)

  const neonLight = new PointLight(0xff6622, 1.1, 8)
  neonLight.position.set(0, 2.2, 5.2)
  root.add(neonLight)

  const exitSignLight = new PointLight(0x33ff77, 1.2, 5.5)
  exitSignLight.position.set(5.5, 2.35, -4.5)
  root.add(exitSignLight)

  const exitCorridorLight = new PointLight(0xffc888, 1.4, 7.5)
  exitCorridorLight.position.set(4.4, 2.9, -4.2)
  root.add(exitCorridorLight)

  // Spawn position: inside south entrance facing Sterling behind the bar
  const spawn = new Vector3(0.0, 0.0, 3.8)
  const spawnYaw = 0.65

  let elapsed = 0
  let brawlTimer = 0

  return {
    group: root,
    solids,
    floors,
    props: {
      sterlingActor,
      morettiActor,
      brawlGroup,
      cellarDoor,
      floorSafe,
      ledgerMesh,
      poolTable,
      barCounter,
      exitDoor,
    },
    spawn,
    spawnYaw,
    update(delta: number) {
      elapsed += delta
      brawlTimer += delta * 6
      p1.position.x = -0.25 + Math.sin(brawlTimer) * 0.08
      p2.position.x = 0.25 - Math.sin(brawlTimer) * 0.08
      p1.rotation.z = Math.sin(brawlTimer * 1.5) * 0.1
      p2.rotation.z = -Math.sin(brawlTimer * 1.5) * 0.1
      sChest.rotation.x = Math.sin(elapsed * 1.1) * 0.012
      mChest.rotation.x = Math.sin(elapsed * 1.2 + 1.0) * 0.01
    },
    setBrawlActive(active: boolean) {
      brawlGroup.visible = active
    },
    setCellarUnlocked(unlocked: boolean) {
      if (unlocked) {
        cellarDoor.rotation.y = -Math.PI * 0.48
        cellarBlocker.makeEmpty()
        brassPadlock.visible = false
      } else {
        cellarDoor.rotation.y = 0
        cellarBlocker.min.set(-4.2, 0, -6.15)
        cellarBlocker.max.set(-2.5, 2.4, -5.85)
        brassPadlock.visible = true
      }
    },
    setSafeOpened(opened: boolean) {
      if (opened) {
        safeLidPivot.rotation.x = -Math.PI * 0.48
        ledgerMesh.position.y = -1.86
      } else {
        safeLidPivot.rotation.x = 0
        ledgerMesh.position.y = -1.97
      }
    },
    setSterlingFleeing(fleeing: boolean) {
      if (fleeing) {
        sterlingActor.position.set(5.15, 0, -4.5)
        sterlingActor.rotation.y = Math.PI * 0.5
        morettiActor.position.set(4.15, 0, -4.1)
        morettiActor.rotation.y = -Math.PI * 0.38
        morettiSolidBox.makeEmpty()
      } else {
        sterlingActor.position.set(-4.5, 0, -1.0)
        sterlingActor.rotation.y = -Math.PI * 0.55
        morettiActor.position.set(0.8, 0, 1.8)
        morettiActor.rotation.y = 0.45
        morettiSolidBox.min.set(0.52, 0, 1.52)
        morettiSolidBox.max.set(1.08, 1.85, 2.08)
      }
    },
  }
}
