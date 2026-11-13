import {
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
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
import { darkWoodMaterial, asphaltMaterial } from '../materials/look.ts'
import { prepareCharacterLook } from '../npc/character-look.ts'

/**
 * Scene 3 — 14 Regent Street & Prahran Bluestone Laneway Foot Chase.
 *
 * 1994 inner-Melbourne back-alley environment.
 * Regent Street front with parked fleet Commodore, weatherboard worker's cottage,
 * and narrow bluestone alley flanked by high paling and corrugated iron fences.
 *
 * Includes Victor Rakov runner NPC who sprints down the alley and vaults the
 * corrugated iron perimeter fence onto Commercial Road.
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

function walk(box: Box3, surface: Surface = 'bitumen'): WalkableRegion {
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

export async function buildLaneway(): Promise<LanewayWorld> {
  const root = new Group()
  root.name = 'scene3-laneway'

  const solids: Box3[] = []
  const floors: WalkableRegion[] = []

  // Melbourne night sky hemisphere fill and soft moon light
  const nightSkyFill = new HemisphereLight(new Color(0x283652), new Color(0x161412), 0.55)
  const moonLight = new DirectionalLight(new Color(0.32, 0.40, 0.55), 0.9)
  moonLight.position.set(5.0, 16.0, 5.0)
  root.add(nightSkyFill, moonLight)

  // Materials
  const asphaltMat = asphaltMaterial(false)
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
  floors.push(walk(aabb(-9.5, 9.5, -0.2, 0.0, 9.0, 17.5), 'bitumen'))

  // Concrete footpath & curb (Z: 7.5 to 9.0)
  const curbMat = new MeshStandardMaterial({ color: new Color(0.52, 0.50, 0.48), roughness: 0.75 })
  const curbMesh = slab(new Box3(new Vector3(-10.0, 0.0, 7.5), new Vector3(10.0, 0.15, 9.0)), curbMat)
  root.add(curbMesh)
  floors.push(walk(aabb(-9.5, 9.5, -0.05, 0.15, 7.4, 9.0), 'bitumen'))

  // Street boundary solids
  solids.push(aabb(-10.0, 10.0, 0, 3.0, 17.5, 18.0)) // South street limit
  solids.push(aabb(-10.2, -9.8, 0, 3.0, 7.0, 18.0)) // West street limit
  solids.push(aabb(9.8, 10.2, 0, 3.0, 7.0, 18.0)) // East street limit

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
  solids.push(aabb(-4.65, -4.35, 0, 4.5, 10.35, 10.65))

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
  solids.push(aabb(CX - 1.0, CX + 1.0, 0, 1.4, CZ - 2.3, CZ + 2.3))

  // --- 2. 14 Regent Street Worker Cottage (X: -7.5 to -1.2, Z: -2.0 to 7.5) ---
  // Weatherboard Cottage Front Porch & Awning
  const porchMesh = slab(new Box3(new Vector3(-6.5, 0.15, 5.5), new Vector3(-1.5, 0.2, 7.5)), timberMat)
  root.add(porchMesh)
  floors.push(walk(aabb(-6.3, -1.5, 0.0, 0.2, 5.6, 7.5), 'floorboard'))

  // Cottage Roof & Awning
  const awning = slab(new Box3(new Vector3(-6.8, 2.4, 5.2), new Vector3(-1.2, 2.5, 7.6)), corrugatedMat)
  root.add(awning)

  // Cottage Front Wall with Doorway (X: -3.8 to -2.8)
  const cottageWallL = slab(new Box3(new Vector3(-6.5, 0.2, 5.4), new Vector3(-3.8, 3.2, 5.6)), weatherboardMat)
  const cottageWallR = slab(new Box3(new Vector3(-2.8, 0.2, 5.4), new Vector3(-1.5, 3.2, 5.6)), weatherboardMat)
  const cottageWallTop = slab(new Box3(new Vector3(-3.8, 2.2, 5.4), new Vector3(-2.8, 3.2, 5.6)), weatherboardMat)
  root.add(cottageWallL, cottageWallR, cottageWallTop)
  solids.push(
    aabb(-6.5, -3.8, 0, 3.2, 5.4, 5.6),
    aabb(-2.8, -1.5, 0, 3.2, 5.4, 5.6),
  )

  // Side Laneway Wall of Cottage (X = -1.5, Z: -2.0 to 5.4)
  const cottageSideWall = slab(new Box3(new Vector3(-1.6, 0.2, -2.0), new Vector3(-1.4, 3.2, 5.4)), weatherboardMat)
  root.add(cottageSideWall)
  solids.push(aabb(-1.6, -1.4, 0, 3.2, -2.0, 5.4))

  // Red brick chimney on cottage side
  const chimney = slab(new Box3(new Vector3(-1.7, 0, 0.5), new Vector3(-1.1, 4.2, 1.5)), brickMat)
  root.add(chimney)
  solids.push(aabb(-1.7, -1.1, 0, 4.2, 0.5, 1.5))

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
  solids.push(aabb(-2.6, -1.8, 0, 0.9, 5.8, 6.6))

  // Front timber wicket fence along Regent Street (leaving open gate aligned with cottage doorway)
  const frontFenceL = slab(new Box3(new Vector3(-7.5, 0.15, 7.4), new Vector3(-3.9, 1.15, 7.55)), timberMat)
  const frontFenceR = slab(new Box3(new Vector3(-2.7, 0.15, 7.4), new Vector3(-1.5, 1.15, 7.55)), timberMat)
  root.add(frontFenceL, frontFenceR)
  solids.push(
    aabb(-7.5, -3.9, 0, 1.2, 7.4, 7.55),
    aabb(-2.7, -1.5, 0, 1.2, 7.4, 7.55),
  )

  // --- 3. Bluestone Laneway (X: -1.2 to 2.4, Z: -20.5 to 7.5) ---
  const alleyFloor = slab(new Box3(new Vector3(-1.3, -0.2, -20.5), new Vector3(2.5, 0.0, 7.5)), bluestoneMat)
  root.add(alleyFloor)
  floors.push(walk(aabb(-1.1, 2.3, -0.2, 0.0, -20.2, 7.5), 'bluestone'))

  // Left boundary fences continuing past cottage (Z: -20.5 to -2.0)
  const alleyLeftFence1 = slab(new Box3(new Vector3(-1.5, 0, -11.0), new Vector3(-1.3, 2.3, -2.0)), timberMat)
  const alleyLeftFence2 = slab(new Box3(new Vector3(-1.5, 0, -20.5), new Vector3(-1.3, 2.3, -11.0)), corrugatedMat)
  root.add(alleyLeftFence1, alleyLeftFence2)
  solids.push(
    aabb(-1.5, -1.3, 0, 2.4, -11.0, -2.0),
    aabb(-1.5, -1.3, 0, 2.4, -20.5, -11.0),
  )

  // Right boundary fence: continuous 2.3m high paling fence from Regent St to the end
  const alleyRightFence = slab(new Box3(new Vector3(2.4, 0, -20.5), new Vector3(2.6, 2.3, 7.5)), timberMat)
  root.add(alleyRightFence)
  solids.push(aabb(2.4, 2.6, 0, 2.4, -20.5, 7.5))

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
  const binBody = slab(new Box3(new Vector3(1.3, 0.0, 0.6), new Vector3(1.9, 1.05, 1.3)), binMat)
  wheelieBin.add(binBody)
  root.add(wheelieBin)
  solids.push(aabb(1.3, 1.9, 0, 1.1, 0.6, 1.3))

  // Stack of timber pallets at Z = -7.0, X = -1.2
  const pallets = new Group()
  pallets.name = 'pallets'
  const pallet1 = slab(new Box3(new Vector3(-1.2, 0.0, -7.5), new Vector3(-0.3, 0.2, -6.5)), timberMat)
  const pallet2 = slab(new Box3(new Vector3(-1.2, 0.2, -7.5), new Vector3(-0.3, 0.4, -6.5)), timberMat)
  pallets.add(pallet1, pallet2)
  root.add(pallets)
  solids.push(aabb(-1.2, -0.3, 0, 0.5, -7.5, -6.5))

  // Clothesline strung across alley at Z = -14.0 (Y = 2.15)
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
  const ironSheets = slab(new Box3(new Vector3(-1.35, 0.0, -20.35), new Vector3(2.45, 2.35, -20.25)), corrugatedMat)
  lanewayFence.add(postL, postR, ironSheets)
  root.add(lanewayFence)
  solids.push(aabb(-1.5, 2.6, 0, 3.0, -20.5, -20.1)) // Unclimbable solid for Miller

  // Bootprint in the wet clay mud below the fence
  const bootprint = new Group()
  bootprint.name = 'bootprint'
  const mudPatch = slab(new Box3(new Vector3(0.2, 0.002, -19.9), new Vector3(1.1, 0.025, -19.0)), mudMat)
  const printIndentation = slab(new Box3(new Vector3(0.48, 0.026, -19.65), new Vector3(0.68, 0.029, -19.35)), bluestoneMat)
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

  // --- 5. Victor Rakov Runner Actor (photo-mapped glTF) ---
  const victorGltf = await new GLTFLoader().loadAsync('/models/victor.glb')
  prepareCharacterLook(victorGltf.scene, { contactShadow: true, roughness: 0.78, rimStrength: 0.24 })

  const victorRunner = new Group()
  victorRunner.name = 'victorRunner'
  victorRunner.add(victorGltf.scene)
  // Initial position: standing in the side alley mouth facing Regent Street / Miller
  victorRunner.position.set(0.5, 0, 4.0)
  victorRunner.rotation.y = Math.PI
  root.add(victorRunner)

  const vHips = requireNode(victorGltf.scene, 'hips')
  const vChest = requireNode(victorGltf.scene, 'chest')
  const vHipsY = vHips.position.y
  const vLegs = (['l', 'r'] as const).map((side) => ({
    hip: requireNode(victorGltf.scene, `leg_${side}_0`),
    knee: requireNode(victorGltf.scene, `leg_${side}_1`),
    foot: requireNode(victorGltf.scene, `foot_${side}`),
  }))
  const vArms = (['l', 'r'] as const).map((side) => {
    const shoulder = requireNode(victorGltf.scene, `arm_${side}_0`)
    return {
      shoulder,
      elbow: requireNode(victorGltf.scene, `arm_${side}_1`),
      bind: shoulder.quaternion.clone(),
    }
  })

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
  let runTime = 0
  const SPRINT_SPEED = 6.4

  function triggerVictorSprint(): void {
    if (victorState !== 'waiting') return
    victorState = 'sprinting'
    currentWpIndex = 0
  }

  // Player spawn: driver side of parked Commodore on Regent Street, facing -Z
  const spawn = new Vector3(-2.2, 0, 12.0)
  const spawnYaw = 0

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
      runTime += delta

      // Trigger sprint if player approaches within 7.5m (Z < 8.5)
      if (victorState === 'waiting' && playerPos.z < 8.5) {
        triggerVictorSprint()
      }

      if (victorState === 'waiting') {
        vChest.rotation.x = Math.sin(runTime * 1.4) * 0.014
      } else if (victorState === 'sprinting') {
        let remaining = SPRINT_SPEED * delta
        while (remaining > 1e-5 && victorState === 'sprinting') {
          const targetWp = WAYPOINTS[currentWpIndex]
          if (targetWp === undefined) {
            victorState = 'vaulting'
            vaultTimer = 0
            break
          }
          const dx = targetWp.x - victorRunner.position.x
          const dz = targetWp.z - victorRunner.position.z
          const dist = Math.hypot(dx, dz)
          if (dist > 1e-4) {
            victorRunner.rotation.y = Math.atan2(-dx, -dz)
          }
          if (dist <= remaining) {
            victorRunner.position.copy(targetWp)
            remaining -= dist
            currentWpIndex += 1
            if (currentWpIndex >= WAYPOINTS.length) {
              victorState = 'vaulting'
              vaultTimer = 0
            }
          } else {
            victorRunner.position.x += (dx / dist) * remaining
            victorRunner.position.z += (dz / dist) * remaining
            remaining = 0
          }
        }

        const stridePhase = runTime * 11.5
        vChest.rotation.x = -0.24
        vHips.position.y = vHipsY + Math.abs(Math.sin(stridePhase)) * 0.036
        for (let i = 0; i < vLegs.length; i += 1) {
          const leg = vLegs[i]
          const phase = stridePhase + (i === 0 ? 0 : Math.PI)
          const swing = Math.sin(phase) * 0.78
          const flex = Math.max(0.12, -Math.sin(phase - 0.55)) * 1.35
          leg.hip.rotation.x = swing
          leg.knee.rotation.x = -flex
          leg.foot.rotation.x = -swing * 0.35 + flex * 0.45
        }
        for (let i = 0; i < vArms.length; i += 1) {
          const arm = vArms[i]
          const phase = stridePhase + (i === 0 ? Math.PI : 0)
          arm.shoulder.rotation.set(0.28 + Math.sin(phase) * 0.75, 0, 0)
          arm.shoulder.quaternion.multiply(arm.bind)
          arm.elbow.rotation.x = 1.05 + Math.max(0, Math.sin(phase)) * 0.35
        }
      } else if (victorState === 'vaulting') {
        vaultTimer += delta
        victorRunner.rotation.y = 0 // facing -Z toward dead-end fence
        vChest.rotation.x = -0.35
        for (const leg of vLegs) {
          leg.hip.rotation.x = 0.9
          leg.knee.rotation.x = -1.25
        }
        for (const arm of vArms) {
          arm.shoulder.rotation.set(1.65, 0, 0)
          arm.shoulder.quaternion.multiply(arm.bind)
          arm.elbow.rotation.x = 0.65
        }
        // Scramble up and over the 2.3m corrugated iron fence
        if (vaultTimer < 0.6) {
          const t = vaultTimer / 0.6
          victorRunner.position.y = t * 2.2
          victorRunner.position.z = -19.5 - t * 0.6
        } else if (vaultTimer < 1.0) {
          const t = (vaultTimer - 0.6) / 0.4
          victorRunner.position.y = 2.2 - t * 2.2
          victorRunner.position.z = -20.1 - t * 1.0
        } else {
          victorState = 'gone'
          victorRunner.visible = false
        }
      }
    },
  }
}
