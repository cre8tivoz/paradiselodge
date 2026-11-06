import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
  Vector3,
} from 'three'
import { aabb } from './kit.ts'
import type { WalkableRegion } from './collision.ts'
import { darkWoodMaterial } from '../materials/look.ts'

/**
 * Scene 5 — Mahoney's Bar, Fitzroy Street, St Kilda.
 *
 * 1994 Melbourne public bar and beer cellar.
 * Dark mahogany bar counter with chrome taps and back-lit optics mirror,
 * worn Axminster pub carpet, slate pool table under cone pendant light,
 * corner video poker machines, and a reinforced back door leading down
 * concrete steps to the bluestone beer keg cellar with Chub floor safe.
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

function walk(box: Box3, surface: 'carpet' | 'floorboard' = 'carpet'): WalkableRegion {
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
}

export function buildMahoneysBar(): PubWorld {
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
    color: new Color(0.22, 0.24, 0.26), // cellar damp bluestone
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
  // Floor
  const floorMesh = slab(aabb(-6, -0.15, -6, 6, 0, 6), carpetMat)
  floorMesh.receiveShadow = true
  root.add(floorMesh)
  floors.push(walk(aabb(-5.5, -0.05, -5.5, 5.5, 0.1, 5.5), 'carpet'))

  // Ceiling
  const ceilMesh = slab(aabb(-6, 3.6, -6, 6, 3.75, 6), ceilingMat)
  root.add(ceilMesh)

  // South Wall (Front Entrance onto Fitzroy St)
  root.add(slab(aabb(-6, 0, 5.9, 6, 1.3, 6.1), timberLowerMat))
  root.add(slab(aabb(-6, 1.3, 5.9, 6, 3.6, 6.1), wallUpperMat))
  solids.push(aabb(-6, 0, 5.8, 6, 3.6, 6.2))

  // East Wall
  root.add(slab(aabb(5.9, 0, -6, 6.1, 1.3, 6), timberLowerMat))
  root.add(slab(aabb(5.9, 1.3, -6, 6.1, 3.6, 6), wallUpperMat))
  solids.push(aabb(5.8, 0, -6, 6.2, 3.6, 6))

  // West Wall (behind Bar Counter)
  root.add(slab(aabb(-6.1, 0, -6, -5.9, 1.3, 6), timberLowerMat))
  root.add(slab(aabb(-6.1, 1.3, -6, -5.9, 3.6, 6), wallUpperMat))
  solids.push(aabb(-6.2, 0, -6, -5.8, 3.6, 6))

  // North Wall (with Cellar doorway opening at x = -4 to -2.5)
  // East side of north wall
  root.add(slab(aabb(-2.5, 0, -6.1, 6, 1.3, -5.9), timberLowerMat))
  root.add(slab(aabb(-2.5, 1.3, -6.1, 6, 3.6, -5.9), wallUpperMat))
  solids.push(aabb(-2.5, 0, -6.2, 6, 3.6, -5.8))
  // West side of north wall
  root.add(slab(aabb(-6, 0, -6.1, -4.2, 1.3, -5.9), timberLowerMat))
  root.add(slab(aabb(-6, 1.3, -6.1, -4.2, 3.6, -5.9), wallUpperMat))
  solids.push(aabb(-6, 0, -6.2, -4.2, 3.6, -5.8))
  // Lintel above cellar doorway
  root.add(slab(aabb(-4.2, 2.4, -6.1, -2.5, 3.6, -5.9), wallUpperMat))

  // -------------------------------------------------------------------------
  // 2. Mahogany Bar Counter & Optics Back-Bar
  // -------------------------------------------------------------------------
  const barCounter = new Group()
  barCounter.name = 'bar-counter'

  // Front bar counter: x = -3.2, z = -4.5 to +2.5, height = 1.1m, depth = 0.7m
  const counterTop = slab(aabb(-3.6, 1.05, -4.5, -2.9, 1.15, 2.5), mahoganyMat)
  const counterBody = slab(aabb(-3.5, 0, -4.4, -3.0, 1.05, 2.4), timberLowerMat)
  const brassFootRail = slab(aabb(-2.85, 0.15, -4.3, -2.75, 0.25, 2.3), brassMat)
  barCounter.add(counterTop, counterBody, brassFootRail)
  solids.push(aabb(-3.7, 0, -4.6, -2.8, 1.2, 2.6))

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

  // Back-Bar optics shelf against west wall (x = -5.8 to -5.2, z = -4.5 to +2.5)
  const backShelf = slab(aabb(-5.8, 0.85, -4.2, -5.2, 0.95, 2.2), mahoganyMat)
  const backShelfUpper = slab(aabb(-5.8, 1.75, -4.2, -5.2, 1.85, 2.2), mahoganyMat)
  const backMirror = slab(aabb(-5.85, 0.95, -4.0, -5.78, 2.5, 2.0), mirrorMat)
  barCounter.add(backShelf, backShelfUpper, backMirror)
  solids.push(aabb(-5.9, 0, -4.3, -5.1, 2.6, 2.3))

  root.add(barCounter)

  // -------------------------------------------------------------------------
  // 3. Pool Table & Lights
  // -------------------------------------------------------------------------
  const poolTable = new Group()
  poolTable.name = 'pool-table'
  // 2.4m x 1.3m table centered at x = 2.4, z = -1.0
  const tableBase = slab(aabb(1.15, 0, -2.25, 3.65, 0.75, 0.25), timberLowerMat)
  const baize = slab(aabb(1.25, 0.75, -2.15, 3.55, 0.85, 0.15), greenBaizeMat)
  const tableCushion = slab(aabb(1.15, 0.80, -2.25, 3.65, 0.92, 0.25), mahoganyMat)
  poolTable.add(tableBase, baize, tableCushion)
  solids.push(aabb(1.1, 0, -2.3, 3.7, 1.0, 0.3))

  // Low hanging pool table light
  const poolLightCone = new Mesh(new CylinderGeometry(0.08, 0.45, 0.35, 16, 1, true), greenBaizeMat)
  poolLightCone.position.set(2.4, 2.3, -1.0)
  const poolBulb = new PointLight(0xffdf88, 1.6, 6)
  poolBulb.position.set(2.4, 2.15, -1.0)
  poolLightCone.add(poolBulb)
  poolTable.add(poolLightCone)

  root.add(poolTable)

  // -------------------------------------------------------------------------
  // 4. Video Poker Machines (Pokies Corner at x = 4.2 to 5.6, z = 3.0 to 5.2)
  // -------------------------------------------------------------------------
  const pokieGroup = new Group()
  pokieGroup.name = 'pokies'
  for (let i = 0; i < 3; i += 1) {
    const pz = 3.3 + i * 0.75
    const cabinet = slab(aabb(4.6, 0, pz - 0.3, 5.6, 1.75, pz + 0.3), safeSteelMat)
    const crtScreen = slab(
      aabb(4.55, 1.05, pz - 0.22, 4.62, 1.55, pz + 0.22),
      new MeshStandardMaterial({
        color: new Color(i === 0 ? 0x0055ff : i === 1 ? 0xffaa00 : 0x00ff88),
        emissive: new Color(i === 0 ? 0x002288 : i === 1 ? 0x884400 : 0x006633),
        roughness: 0.2,
      }),
    )
    pokieGroup.add(cabinet, crtScreen)
    solids.push(aabb(4.5, 0, pz - 0.35, 5.7, 1.8, pz + 0.35))
  }
  root.add(pokieGroup)

  // -------------------------------------------------------------------------
  // 5. Back Hallway & Beer Keg Cellar
  // -------------------------------------------------------------------------
  const cellarGroup = new Group()
  cellarGroup.name = 'cellar'

  // Back hallway / stairwell leading down (x = -4.2 to -2.5, z = -6.0 to -11.0)
  // Hallway floor steps down from y = 0 to y = -2.0
  const stair1 = slab(aabb(-4.2, -0.35, -7.0, -2.5, -0.2, -6.0), bluestoneMat)
  const stair2 = slab(aabb(-4.2, -0.75, -8.0, -2.5, -0.6, -7.0), bluestoneMat)
  const stair3 = slab(aabb(-4.2, -1.15, -9.0, -2.5, -1.0, -8.0), bluestoneMat)
  const stair4 = slab(aabb(-4.2, -1.55, -10.0, -2.5, -1.4, -9.0), bluestoneMat)
  const cellarFloor = slab(aabb(-5.5, -2.15, -15.0, -1.5, -2.0, -10.0), bluestoneMat)
  cellarGroup.add(stair1, stair2, stair3, stair4, cellarFloor)

  // Cellar walkable areas
  floors.push(walk(aabb(-4.0, -0.3, -7.0, -2.7, 0.0, -6.0), 'floorboard'))
  floors.push(walk(aabb(-4.0, -0.7, -8.0, -2.7, -0.4, -7.0), 'floorboard'))
  floors.push(walk(aabb(-4.0, -1.1, -9.0, -2.7, -0.8, -8.0), 'floorboard'))
  floors.push(walk(aabb(-4.0, -1.5, -10.0, -2.7, -1.2, -9.0), 'floorboard'))
  floors.push(walk(aabb(-5.2, -2.1, -14.5, -1.8, -1.8, -10.0), 'floorboard'))

  // Cellar perimeter walls and ceiling (fully enclosing the bluestone basement)
  // Ceiling over cellar (y = 0.0 to 0.15)
  cellarGroup.add(slab(aabb(-5.8, 0.0, -15.2, -1.2, 0.15, -6.0), bluestoneMat))
  // North cellar wall
  cellarGroup.add(slab(aabb(-5.8, -2.1, -15.2, -1.2, 0.1, -14.8), bluestoneMat))
  solids.push(aabb(-5.9, -2.1, -15.3, -1.1, 0.2, -14.7))
  // West cellar wall
  cellarGroup.add(slab(aabb(-5.8, -2.1, -15.0, -5.3, 0.1, -6.0), bluestoneMat))
  solids.push(aabb(-5.9, -2.1, -15.0, -5.2, 0.2, -6.0))
  // East cellar wall
  cellarGroup.add(slab(aabb(-1.7, -2.1, -15.0, -1.2, 0.1, -6.0), bluestoneMat))
  solids.push(aabb(-1.8, -2.1, -15.0, -1.1, 0.2, -6.0))
  // South cellar wall around opening
  cellarGroup.add(slab(aabb(-5.8, -2.1, -6.1, -4.2, 0.1, -5.9), bluestoneMat))
  cellarGroup.add(slab(aabb(-2.5, -2.1, -6.1, -1.2, 0.1, -5.9), bluestoneMat))

  // Cellar Grille / Gate at z = -6.0
  const cellarDoor = new Group()
  cellarDoor.name = 'cellar-grille'
  const doorFrame = slab(aabb(-4.2, 0, -6.05, -2.5, 2.4, -5.95), safeSteelMat)
  // Grille bars
  for (let bx = -4.0; bx <= -2.7; bx += 0.25) {
    const bar = new Mesh(new CylinderGeometry(0.018, 0.018, 2.3, 8), safeSteelMat)
    bar.position.set(bx, 1.15, -6.0)
    cellarDoor.add(bar)
  }
  const brassPadlock = new Mesh(new BoxGeometry(0.12, 0.16, 0.08), brassMat)
  brassPadlock.position.set(-2.7, 1.1, -5.9)
  cellarDoor.add(doorFrame, brassPadlock)
  cellarGroup.add(cellarDoor)

  // Beer Kegs in cellar (stacked cylindrical aluminium kegs)
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
    solids.push(aabb(-5.0, -2.0, kz - 0.4, -4.2, -1.0, kz + 0.4))
    solids.push(aabb(-2.8, -2.0, kz - 0.4, -2.0, -1.0, kz + 0.4))
  }

  // Chub Floor Safe in cellar floor at x = -3.5, z = -13.0, y = -2.0
  const floorSafe = new Group()
  floorSafe.name = 'floor-safe'
  const safeFrame = slab(aabb(-3.85, -2.05, -13.35, -3.15, -1.95, -12.65), safeSteelMat)
  const safeLid = slab(aabb(-3.8, -1.98, -13.3, -3.2, -1.94, -12.7), safeSteelMat)
  const safeDial = new Mesh(new CylinderGeometry(0.04, 0.04, 0.03, 12), brassMat)
  safeDial.position.set(-3.5, -1.92, -13.0)
  floorSafe.add(safeFrame, safeLid, safeDial)

  // Extortion Ledger inside the safe
  const ledgerMat = new MeshStandardMaterial({
    color: new Color(0.12, 0.12, 0.14), // black vinyl ledger
    roughness: 0.5,
  })
  const ledgerMesh = new Mesh(new BoxGeometry(0.28, 0.06, 0.38), ledgerMat)
  ledgerMesh.position.set(-3.5, -1.94, -13.0)
  floorSafe.add(ledgerMesh)

  cellarGroup.add(floorSafe)
  root.add(cellarGroup)

  // -------------------------------------------------------------------------
  // 6. Actors: Kenneth Sterling, Constable Moretti, Punters Brawl
  // -------------------------------------------------------------------------
  // Kenneth Sterling (behind the bar at x = -4.5, z = -1.0)
  const sterlingActor = new Group()
  sterlingActor.name = 'actor-sterling'
  const sTweedVestMat = new MeshStandardMaterial({
    color: new Color(0.25, 0.22, 0.18), // dark brown tweed vest
    roughness: 0.8,
  })
  const sShirtMat = new MeshStandardMaterial({
    color: new Color(0.85, 0.85, 0.82), // rolled-up white sleeves
    roughness: 0.6,
  })
  const sHeadMat = new MeshStandardMaterial({
    color: new Color(0.82, 0.68, 0.58),
    roughness: 0.7,
  })
  const sHairMat = new MeshStandardMaterial({
    color: new Color(0.15, 0.12, 0.10), // slicked back dark hair
    roughness: 0.3,
  })

  // Torso & head
  const sTorso = new Mesh(new BoxGeometry(0.48, 0.65, 0.28), sTweedVestMat)
  sTorso.position.set(0, 1.25, 0)
  const sArmL = new Mesh(new CylinderGeometry(0.07, 0.07, 0.55, 8), sShirtMat)
  sArmL.position.set(-0.32, 1.25, 0)
  const sArmR = new Mesh(new CylinderGeometry(0.07, 0.07, 0.55, 8), sShirtMat)
  sArmR.position.set(0.32, 1.25, 0)
  const sHead = new Mesh(new SphereGeometry(0.14, 12, 12), sHeadMat)
  sHead.position.set(0, 1.72, 0)
  const sHair = new Mesh(new SphereGeometry(0.15, 12, 8), sHairMat)
  sHair.position.set(0, 1.76, -0.02)
  sHair.scale.set(0.95, 0.55, 1.0)
  // Pocket watch / brass key chain glint on vest
  const sVestChain = new Mesh(new BoxGeometry(0.12, 0.03, 0.02), brassMat)
  sVestChain.position.set(-0.1, 1.15, 0.15)

  sterlingActor.add(sTorso, sArmL, sArmR, sHead, sHair, sVestChain)
  sterlingActor.position.set(-4.5, 0, -1.0)
  sterlingActor.rotation.y = Math.PI * 0.45 // facing Miller at the counter
  root.add(sterlingActor)

  // Constable Moretti (standing near entrance / pool table at x = 0.5, z = 1.5)
  const morettiActor = new Group()
  morettiActor.name = 'actor-moretti'
  const mUniformMat = new MeshStandardMaterial({
    color: new Color(0.10, 0.14, 0.22), // VicPol dark navy
    roughness: 0.75,
  })
  const mTorso = new Mesh(new BoxGeometry(0.5, 0.7, 0.3), mUniformMat)
  mTorso.position.set(0, 1.25, 0)
  const mHead = new Mesh(new SphereGeometry(0.14, 12, 12), sHeadMat)
  mHead.position.set(0, 1.74, 0)
  const mCap = new Mesh(new CylinderGeometry(0.18, 0.17, 0.1, 12), mUniformMat)
  mCap.position.set(0, 1.84, 0)
  morettiActor.add(mTorso, mHead, mCap)
  morettiActor.position.set(0.5, 0, 1.5)
  morettiActor.rotation.y = -Math.PI * 0.25
  root.add(morettiActor)

  // Bar Brawl group (two brawling punters at x = 3.2, z = 0.5 near pool table)
  const brawlGroup = new Group()
  brawlGroup.name = 'actor-brawl'
  const punter1Mat = new MeshStandardMaterial({ color: new Color(0.25, 0.30, 0.45) })
  const punter2Mat = new MeshStandardMaterial({ color: new Color(0.45, 0.22, 0.20) })
  const p1 = new Mesh(new BoxGeometry(0.45, 0.65, 0.28), punter1Mat)
  p1.position.set(-0.25, 1.25, 0)
  const p2 = new Mesh(new BoxGeometry(0.45, 0.65, 0.28), punter2Mat)
  p2.position.set(0.25, 1.25, 0)
  brawlGroup.add(p1, p2)
  brawlGroup.position.set(3.2, 0, 0.8)
  root.add(brawlGroup)

  // -------------------------------------------------------------------------
  // 7. Lighting
  // -------------------------------------------------------------------------
  const ambient = new AmbientLight(0xffeedd, 0.32)
  root.add(ambient)

  // Warm amber light over the mahogany bar
  const barLight = new PointLight(0xffb866, 1.4, 8)
  barLight.position.set(-3.5, 2.5, -1.0)
  root.add(barLight)

  // Back-bar optics warm glow
  const opticsLight = new PointLight(0xffa044, 0.9, 5)
  opticsLight.position.set(-5.4, 2.0, -1.0)
  root.add(opticsLight)

  // Cool fluorescent light down in the beer cellar
  const cellarLight = new PointLight(0x99ddff, 1.2, 9)
  cellarLight.position.set(-3.5, -0.6, -12.5)
  root.add(cellarLight)

  // Entrance street neon glow through south windows (deep amber/cyan)
  const neonLight = new PointLight(0xff6622, 0.8, 7)
  neonLight.position.set(0, 2.2, 5.2)
  root.add(neonLight)

  // Spawn position (just inside the south entrance facing the mahogany bar)
  const spawn = new Vector3(0.0, 0.0, 3.8)
  const spawnYaw = Math.PI // facing North towards the bar counter

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
    },
    spawn,
    spawnYaw,
    update(delta: number) {
      // Gentle brawl jostle animation
      brawlTimer += delta * 6
      p1.position.x = -0.25 + Math.sin(brawlTimer) * 0.08
      p2.position.x = 0.25 - Math.sin(brawlTimer) * 0.08
      p1.rotation.z = Math.sin(brawlTimer * 1.5) * 0.1
      p2.rotation.z = -Math.sin(brawlTimer * 1.5) * 0.1
    },
    setBrawlActive(active: boolean) {
      brawlGroup.visible = active
    },
    setCellarUnlocked(unlocked: boolean) {
      if (unlocked) {
        // Swing the cellar door open
        cellarDoor.rotation.y = -Math.PI * 0.45
      }
    },
    setSafeOpened(opened: boolean) {
      if (opened) {
        safeLid.position.y = -1.75
        safeLid.rotation.x = -Math.PI * 0.4
        ledgerMesh.position.y = -1.82
      }
    },
  }
}
