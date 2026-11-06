import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Vector3,
} from 'three'
import { aabb } from './kit.ts'
import type { WalkableRegion } from './collision.ts'
import { darkWoodMaterial, asphaltMaterial } from '../materials/look.ts'

/**
 * Scene 3 — 14 Regent Street & Prahran Bluestone Laneway Foot Chase.
 *
 * 1994 inner-Melbourne back-alley environment.
 * Regent street front with parked fleet Commodore, weatherboard worker's cottage,
 * and narrow bluestone alley flanked by high paling and corrugated iron fences.
 *
 * Includes Victor Rakov runner NPC who sprints down the alley and vaults the
 * corrugated iron perimeter fence onto Commercial Road.
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

function walk(box: Box3, surface: 'floorboard' | 'bitumen' = 'bitumen'): WalkableRegion {
  return {
    box: new Box3(
      new Vector3(box.min.x, box.min.y, box.min.z),
      new Vector3(box.max.x, box.max.y, box.max.z),
    ),
    surface,
  }
}

export interface LanewayProps {
  readonly cottageDoor: Group
  readonly cottageSlip: Group
  readonly victorRunner: Group
  readonly lanewayFence: Group
  readonly bootprint: Group
  readonly wheelieBin: Group
  readonly pallets: Group
  readonly commodore: Group
  readonly radio: Group
}

export interface LanewayWorld {
  readonly group: Group
  readonly solids: Box3[]
  readonly floors: WalkableRegion[]
  readonly props: LanewayProps
  readonly spawn: Vector3
  readonly spawnYaw: number
  readonly isVictorOverFence: boolean
  triggerVictorSprint(): void
  update(delta: number, playerPos: Vector3): void
}

export function buildLaneway(): LanewayWorld {
  const root = new Group()
  root.name = 'scene3-laneway'

  const solids: Box3[] = []
  const floors: WalkableRegion[] = []

  // Melbourne night sky ambient and soft moon light
  const nightAmbient = new AmbientLight(new Color(0.12, 0.16, 0.24), 0.8)
  const moonLight = new DirectionalLight(new Color(0.32, 0.40, 0.55), 0.9)
  moonLight.position.set(5.0, 16.0, 5.0)
  root.add(nightAmbient, moonLight)

  // Materials
  const asphaltMat = asphaltMaterial()
  const bluestoneMat = new MeshStandardMaterial({
    color: new Color(0.24, 0.27, 0.30), // wet dark Melbourne bluestone
    roughness: 0.35,
    metalness: 0.1,
  })
  const timberMat = darkWoodMaterial(0.7)
  const weatherboardMat = new MeshStandardMaterial({
    color: new Color(0.78, 0.74, 0.68), // peeling municipal off-white paint
    roughness: 0.85,
  })
  const corrugatedMat = new MeshStandardMaterial({
    color: new Color(0.55, 0.58, 0.60), // galvanised zinc / rusted iron
    roughness: 0.5,
    metalness: 0.55,
    side: DoubleSide,
  })
  const brickMat = new MeshStandardMaterial({
    color: new Color(0.58, 0.28, 0.22), // red brick chimney
    roughness: 0.9,
  })
  const mudMat = new MeshStandardMaterial({
    color: new Color(0.22, 0.18, 0.14), // wet Melbourne clay mud
    roughness: 0.3,
  })

  // --- 1. Regent Street Front (Z: 9.0 to 18.0, X: -10.0 to 10.0) ---
  const streetMesh = slab(new Box3(new Vector3(-10.0, -0.25, 9.0), new Vector3(10.0, 0.0, 18.0)), asphaltMat)
  root.add(streetMesh)
  floors.push(walk(new Box3(new Vector3(-9.5, -0.05, 9.2), new Vector3(9.5, 0.05, 17.5)), 'bitumen'))

  // Concrete footpath & curb (Z: 7.5 to 9.0)
  const curbMat = new MeshStandardMaterial({ color: new Color(0.52, 0.50, 0.48), roughness: 0.75 })
  const curbMesh = slab(new Box3(new Vector3(-10.0, 0.0, 7.5), new Vector3(10.0, 0.15, 9.0)), curbMat)
  root.add(curbMesh)
  floors.push(walk(new Box3(new Vector3(-9.5, 0.1, 7.6), new Vector3(9.5, 0.2, 8.9)), 'bitumen'))

  // Street boundary solids
  solids.push(aabb(-10.0, 0, 17.5, 10.0, 3.0, 18.0)) // South street limit
  solids.push(aabb(-10.2, 0, 7.0, -9.8, 3.0, 18.0)) // West street limit
  solids.push(aabb(9.8, 0, 7.0, 10.2, 3.0, 18.0)) // East street limit

  // Sodium streetlight casting amber glow over Regent Street curb
  const streetLight = new PointLight(new Color(1.0, 0.72, 0.32), 4.5, 16, 1.8)
  streetLight.position.set(-4.5, 4.5, 10.5)
  streetLight.castShadow = true
  root.add(streetLight)

  // Streetlight pole
  const poleMat = new MeshStandardMaterial({ color: new Color(0.2, 0.22, 0.25), roughness: 0.6 })
  const pole = new Mesh(new CylinderGeometry(0.08, 0.1, 4.5, 10), poleMat)
  pole.position.set(-4.5, 2.25, 10.5)
  root.add(pole)
  solids.push(aabb(-4.65, 0, 10.35, -4.35, 4.5, 10.65))

  // Parked Commodore on Regent Street (X: -5.5 to -3.5, Z: 10.5 to 15.2)
  const commodore = new Group()
  commodore.name = 'commodore'
  const carBodyMat = new MeshStandardMaterial({ color: new Color(0.78, 0.72, 0.54), roughness: 0.65 }) // fleet beige
  const carGlassMat = new MeshStandardMaterial({ color: new Color(0.12, 0.15, 0.22), roughness: 0.2, metalness: 0.8 })
  const carTyreMat = new MeshStandardMaterial({ color: new Color(0.1, 0.1, 0.1), roughness: 0.9 })
  const CX = -4.5
  const CZ = 13.0
  const CY = 0.0

  const carLower = slab(new Box3(new Vector3(CX - 0.85, CY + 0.25, CZ - 2.2), new Vector3(CX + 0.85, CY + 0.75, CZ + 2.2)), carBodyMat)
  const carCabin = slab(new Box3(new Vector3(CX - 0.78, CY + 0.75, CZ - 1.2), new Vector3(CX + 0.78, CY + 1.28, CZ + 1.0)), carGlassMat)
  commodore.add(carLower, carCabin)
  for (const wx of [CX - 0.82, CX + 0.82]) {
    for (const wz of [CZ - 1.4, CZ + 1.4]) {
      const wheel = slab(new Box3(new Vector3(wx - 0.08, CY, wz - 0.3), new Vector3(wx + 0.08, CY + 0.34, wz + 0.3)), carTyreMat)
      commodore.add(wheel)
    }
  }
  root.add(commodore)
  solids.push(aabb(CX - 1.0, 0, CZ - 2.3, CX + 1.0, 1.4, CZ + 2.3))

  // --- 2. 14 Regent Street Worker Cottage (X: -7.5 to -1.2, Z: -2.0 to 7.5) ---
  // Weatherboard Cottage Front Porch & Awning
  const porchMesh = slab(new Box3(new Vector3(-6.5, 0.15, 5.5), new Vector3(-1.5, 0.2, 7.5)), timberMat)
  root.add(porchMesh)
  floors.push(walk(new Box3(new Vector3(-6.3, 0.15, 5.6), new Vector3(-1.7, 0.25, 7.4)), 'floorboard'))

  // Cottage Roof & Awning
  const awning = slab(new Box3(new Vector3(-6.8, 2.4, 5.2), new Vector3(-1.2, 2.5, 7.6)), corrugatedMat)
  root.add(awning)

  // Cottage Front Wall with Doorway
  const cottageWallL = slab(new Box3(new Vector3(-6.5, 0.2, 5.4), new Vector3(-3.8, 3.2, 5.6)), weatherboardMat)
  const cottageWallR = slab(new Box3(new Vector3(-2.8, 0.2, 5.4), new Vector3(-1.5, 3.2, 5.6)), weatherboardMat)
  const cottageWallTop = slab(new Box3(new Vector3(-3.8, 2.2, 5.4), new Vector3(-2.8, 3.2, 5.6)), weatherboardMat)
  root.add(cottageWallL, cottageWallR, cottageWallTop)
  solids.push(
    aabb(-6.5, 0, 5.4, -3.8, 3.2, 5.6),
    aabb(-2.8, 0, 5.4, -1.5, 3.2, 5.6),
  )

  // Side Laneway Wall of Cottage (X = -1.5, Z: -2.0 to 5.4)
  const cottageSideWall = slab(new Box3(new Vector3(-1.6, 0.2, -2.0), new Vector3(-1.4, 3.2, 5.4)), weatherboardMat)
  root.add(cottageSideWall)
  solids.push(aabb(-1.6, 0, -2.0, -1.4, 3.2, 5.4))

  // Red brick chimney on cottage side
  const chimney = slab(new Box3(new Vector3(-1.7, 0, 0.5), new Vector3(-1.1, 4.2, 1.5)), brickMat)
  root.add(chimney)
  solids.push(aabb(-1.7, 0, 0.5, -1.1, 4.2, 1.5))

  // Front door standing ajar
  const cottageDoor = new Group()
  cottageDoor.name = 'cottageDoor'
  const doorMat = new MeshStandardMaterial({ color: new Color(0.3, 0.18, 0.12), roughness: 0.7 })
  const doorLeaf = slab(new Box3(new Vector3(-3.8, 0.2, 5.4), new Vector3(-3.0, 2.2, 5.48)), doorMat)
  doorLeaf.rotation.y = 0.55 // standing open
  cottageDoor.add(doorLeaf)
  root.add(cottageDoor)

  // Warm tungsten light spilling out of cottage doorway
  const cottageLight = new PointLight(new Color(1.0, 0.78, 0.45), 2.2, 6, 2)
  cottageLight.position.set(-3.2, 1.8, 4.8)
  root.add(cottageLight)

  // Table on porch with dropped slip of paper
  const cottageSlip = new Group()
  cottageSlip.name = 'cottageSlip'
  const smallTable = slab(new Box3(new Vector3(-2.6, 0.2, 5.8), new Vector3(-1.8, 0.85, 6.6)), timberMat)
  const slipMat = new MeshStandardMaterial({ color: new Color(0.92, 0.90, 0.82), roughness: 0.8 })
  const paper = slab(new Box3(new Vector3(-2.3, 0.86, 6.1), new Vector3(-2.1, 0.87, 6.35)), slipMat)
  cottageSlip.add(smallTable, paper)
  root.add(cottageSlip)
  solids.push(aabb(-2.6, 0, 5.8, -1.8, 0.9, 6.6))

  // Front timber wicket fence along Regent Street (X: -7.5 to -1.5, Z = 7.5)
  const frontFence = slab(new Box3(new Vector3(-7.5, 0.15, 7.4), new Vector3(-1.5, 1.15, 7.55)), timberMat)
  root.add(frontFence)
  solids.push(aabb(-7.5, 0, 7.4, -1.5, 1.2, 7.55))

  // --- 3. Bluestone Laneway (X: -1.2 to 2.4, Z: -20.5 to 7.5) ---
  // ~28m long narrow bluestone alley
  const alleyFloor = slab(new Box3(new Vector3(-1.3, -0.2, -20.5), new Vector3(2.5, 0.05, 7.5)), bluestoneMat)
  root.add(alleyFloor)
  floors.push(walk(new Box3(new Vector3(-1.1, 0.0, -20.2), new Vector3(2.3, 0.1, 7.4)), 'floorboard'))

  // Left boundary fences continuing past cottage (Z: -20.5 to -2.0)
  // Rear corrugated iron fence & weathered palings
  const alleyLeftFence1 = slab(new Box3(new Vector3(-1.5, 0, -11.0), new Vector3(-1.3, 2.3, -2.0)), timberMat)
  const alleyLeftFence2 = slab(new Box3(new Vector3(-1.5, 0, -20.5), new Vector3(-1.3, 2.3, -11.0)), corrugatedMat)
  root.add(alleyLeftFence1, alleyLeftFence2)
  solids.push(
    aabb(-1.5, 0, -11.0, -1.3, 2.4, -2.0),
    aabb(-1.5, 0, -20.5, -1.3, 2.4, -11.0),
  )

  // Right boundary fence: continuous 2.3m high paling fence from Regent St to the end
  const alleyRightFence = slab(new Box3(new Vector3(2.4, 0, -20.5), new Vector3(2.6, 2.3, 7.5)), timberMat)
  root.add(alleyRightFence)
  solids.push(aabb(2.4, 0, -20.5, 2.6, 2.4, 7.5))

  // Alley sodium lamps for moody noir lighting
  const alleyLamp1 = new PointLight(new Color(1.0, 0.75, 0.35), 3.2, 10, 2)
  alleyLamp1.position.set(0.5, 3.2, -2.0)
  const alleyLamp2 = new PointLight(new Color(0.9, 0.85, 0.65), 3.0, 11, 2)
  alleyLamp2.position.set(0.5, 3.2, -12.5)
  root.add(alleyLamp1, alleyLamp2)

  // --- Obstacles in Laneway ---
  // Green plastic wheelie bin at Z = 1.0, X = 1.6
  const wheelieBin = new Group()
  wheelieBin.name = 'wheelieBin'
  const binMat = new MeshStandardMaterial({ color: new Color(0.18, 0.42, 0.22), roughness: 0.55 })
  const binBody = slab(new Box3(new Vector3(1.3, 0.05, 0.6), new Vector3(1.9, 1.05, 1.3)), binMat)
  wheelieBin.add(binBody)
  root.add(wheelieBin)
  solids.push(aabb(1.3, 0, 0.6, 1.9, 1.1, 1.3))

  // Stack of timber pallets at Z = -7.0, X = -1.2
  const pallets = new Group()
  pallets.name = 'pallets'
  const pallet1 = slab(new Box3(new Vector3(-1.2, 0.05, -7.5), new Vector3(-0.3, 0.25, -6.5)), timberMat)
  const pallet2 = slab(new Box3(new Vector3(-1.2, 0.25, -7.5), new Vector3(-0.3, 0.45, -6.5)), timberMat)
  pallets.add(pallet1, pallet2)
  root.add(pallets)
  solids.push(aabb(-1.2, 0, -7.5, -0.3, 0.5, -6.5))

  // Clothesline strung across alley at Z = -14.0 (Y = 2.1)
  const lineMat = new MeshStandardMaterial({ color: new Color(0.8, 0.8, 0.8), roughness: 0.5 })
  const lineGeom = new CylinderGeometry(0.008, 0.008, 3.7, 6)
  const lineMesh = new Mesh(lineGeom, lineMat)
  lineMesh.position.set(0.55, 2.15, -14.0)
  lineMesh.rotation.z = Math.PI / 2
  root.add(lineMesh)

  // --- 4. Dead-End Corrugated Iron Fence (Z = -20.2 to -20.5, X: -1.4 to 2.5) ---
  const lanewayFence = new Group()
  lanewayFence.name = 'lanewayFence'
  const fencePostMat = new MeshStandardMaterial({ color: new Color(0.28, 0.22, 0.16), roughness: 0.8 })
  const postL = new Mesh(new BoxGeometry(0.15, 2.6, 0.15), fencePostMat)
  postL.position.set(-1.3, 1.3, -20.3)
  const postR = new Mesh(new BoxGeometry(0.15, 2.6, 0.15), fencePostMat)
  postR.position.set(2.4, 1.3, -20.3)
  const ironSheets = slab(new Box3(new Vector3(-1.35, 0.05, -20.35), new Vector3(2.45, 2.35, -20.25)), corrugatedMat)
  lanewayFence.add(postL, postR, ironSheets)
  root.add(lanewayFence)
  solids.push(aabb(-1.5, 0, -20.5, 2.6, 3.0, -20.1)) // Unclimbable solid for Miller

  // Bootprint in the wet clay mud below the fence
  const bootprint = new Group()
  bootprint.name = 'bootprint'
  const mudPatch = slab(new Box3(new Vector3(0.2, 0.05, -19.9), new Vector3(1.1, 0.07, -19.0)), mudMat)
  const printIndentation = slab(new Box3(new Vector3(0.48, 0.071, -19.65), new Vector3(0.68, 0.073, -19.35)), bluestoneMat)
  bootprint.add(mudPatch, printIndentation)
  root.add(bootprint)

  // Police VHF Handheld Radio Unit on the fence rail
  const radio = new Group()
  radio.name = 'lanewayRadio'
  const radioBodyMat = new MeshStandardMaterial({ color: new Color(0.12, 0.12, 0.14), roughness: 0.6, metalness: 0.2 })
  const radioAntennaMat = new MeshStandardMaterial({ color: new Color(0.2, 0.2, 0.2), roughness: 0.8 })
  const rBody = slab(new Box3(new Vector3(0.7, 1.15, -20.2), new Vector3(0.85, 1.35, -20.1)), radioBodyMat)
  const rAntenna = slab(new Box3(new Vector3(0.72, 1.35, -20.17), new Vector3(0.74, 1.55, -20.13)), radioAntennaMat)
  radio.add(rBody, rAntenna)
  root.add(radio)

  // --- 5. Victor Rakov Runner Actor ---
  const victorRunner = new Group()
  victorRunner.name = 'victorRunner'
  const jacketMat = new MeshStandardMaterial({ color: new Color(0.18, 0.24, 0.35), roughness: 0.6 }) // denim jacket
  const jeansMat = new MeshStandardMaterial({ color: new Color(0.12, 0.15, 0.22), roughness: 0.7 })
  const bootMat = new MeshStandardMaterial({ color: new Color(0.18, 0.14, 0.10), roughness: 0.8 })
  const skinMat = new MeshStandardMaterial({ color: new Color(0.68, 0.52, 0.42), roughness: 0.7 })

  // Torso (broad shoulders, stocky build per LEAP)
  const vTorso = new Mesh(new BoxGeometry(0.46, 0.58, 0.28), jacketMat)
  vTorso.position.y = 1.15
  vTorso.castShadow = true

  // Head
  const vHead = new Mesh(new CylinderGeometry(0.11, 0.1, 0.24, 12), skinMat)
  vHead.position.y = 1.58
  vHead.castShadow = true

  // Legs
  const vLegL = new Mesh(new BoxGeometry(0.18, 0.72, 0.18), jeansMat)
  vLegL.position.set(-0.14, 0.5, 0)
  vLegL.castShadow = true
  const vLegR = new Mesh(new BoxGeometry(0.18, 0.72, 0.18), jeansMat)
  vLegR.position.set(0.14, 0.5, 0)
  vLegR.castShadow = true

  // Boots
  const vBootL = new Mesh(new BoxGeometry(0.18, 0.14, 0.28), bootMat)
  vBootL.position.set(-0.14, 0.07, 0.05)
  const vBootR = new Mesh(new BoxGeometry(0.18, 0.14, 0.28), bootMat)
  vBootR.position.set(0.14, 0.07, 0.05)

  victorRunner.add(vTorso, vHead, vLegL, vLegR, vBootL, vBootR)
  // Initial position: standing in the side alley near the cottage
  victorRunner.position.set(0.5, 0, 4.0)
  victorRunner.rotation.y = Math.PI // facing toward Regent Street / Miller
  root.add(victorRunner)

  // Waypoints for Victor's sprint down the laneway
  const WAYPOINTS = [
    new Vector3(0.5, 0, 2.0),
    new Vector3(0.2, 0, -3.0),
    new Vector3(0.8, 0, -8.0),
    new Vector3(0.3, 0, -14.0),
    new Vector3(0.6, 0, -19.5),
  ]

  let victorState: 'waiting' | 'sprinting' | 'vaulting' | 'gone' = 'waiting'
  let currentWpIndex = 0
  let vaultTimer = 0
  const SPRINT_SPEED = 6.4 // m/s sprint

  function triggerVictorSprint(): void {
    if (victorState !== 'waiting') return
    victorState = 'sprinting'
    currentWpIndex = 0
  }

  // Player spawn: driver side of parked Commodore on Regent Street
  const spawn = new Vector3(-2.2, 0, 12.0)
  const spawnYaw = Math.PI // facing -Z into the cottage and laneway

  return {
    group: root,
    solids,
    floors,
    props: {
      cottageDoor,
      cottageSlip,
      victorRunner,
      lanewayFence,
      bootprint,
      wheelieBin,
      pallets,
      commodore,
      radio,
    },
    spawn,
    spawnYaw,
    get isVictorOverFence(): boolean {
      return victorState === 'gone' || victorState === 'vaulting'
    },
    triggerVictorSprint,
    update(delta: number, playerPos: Vector3): void {
      // Trigger sprint if player approaches within 7.5m (Z < 8.5)
      if (victorState === 'waiting' && playerPos.z < 8.5) {
        triggerVictorSprint()
      }

      if (victorState === 'sprinting') {
        const targetWp = WAYPOINTS[currentWpIndex]
        if (targetWp !== undefined) {
          const dx = targetWp.x - victorRunner.position.x
          const dz = targetWp.z - victorRunner.position.z
          const dist = Math.hypot(dx, dz)
          const move = SPRINT_SPEED * delta

          victorRunner.rotation.y = Math.atan2(-dx, -dz)

          // Running leg stride animation
          const legSwing = Math.sin(Date.now() * 0.015) * 0.45
          vLegL.rotation.x = legSwing
          vLegR.rotation.x = -legSwing

          if (dist <= move) {
            victorRunner.position.copy(targetWp)
            currentWpIndex++
            if (currentWpIndex >= WAYPOINTS.length) {
              victorState = 'vaulting'
              vaultTimer = 0
            }
          } else {
            victorRunner.position.x += (dx / dist) * move
            victorRunner.position.z += (dz / dist) * move
          }
        }
      } else if (victorState === 'vaulting') {
        vaultTimer += delta
        // Scramble up and over the 2.3m fence
        if (vaultTimer < 0.6) {
          const t = vaultTimer / 0.6
          victorRunner.position.y = t * 2.2 // rise to top of fence
          victorRunner.position.z = -19.5 - t * 0.6
        } else if (vaultTimer < 1.0) {
          const t = (vaultTimer - 0.6) / 0.4
          victorRunner.position.y = 2.2 - t * 2.2 // drop over
          victorRunner.position.z = -20.1 - t * 1.0
        } else {
          victorState = 'gone'
          victorRunner.visible = false
        }
      }
    },
  }
}
