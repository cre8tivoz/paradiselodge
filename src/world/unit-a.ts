import {
  Box3,
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
  type Texture,
} from 'three'
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

type UnitASpace = 'room1a' | 'parlour' | 'reception' | 'staircase' | 'hallway'

export interface UnitA {
  readonly scene: Group
  readonly props: {
    readonly stairs: Object3D
    readonly desk: Object3D
    readonly keyRack: Object3D
    readonly ledger: Object3D
    readonly phone: Object3D
    readonly ashtray: Object3D
    readonly armchair: Object3D
    readonly parlourTable: Object3D
    readonly diary: Object3D
    readonly television: Object3D
    readonly standardLamp: Object3D
  }
}

const REMOTE_MODEL_URL =
  'https://pub-fb1257653b9c4da0a314baa163938921.r2.dev/models/unit-a-4ae83b93.glb'
const LOCAL_MODEL_URL = '/models/unit-a.glb'
const MODEL_URL = import.meta.env.DEV ? LOCAL_MODEL_URL : REMOTE_MODEL_URL
const BAKE_URL = '/textures/bake'
const SPACES: UnitASpace[] = ['room1a', 'parlour', 'reception', 'staircase', 'hallway']
const LIGHTMAP_INTENSITY = 14

function need(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name)
  if (found === undefined) {
    throw new Error(`unit-a.glb has no node called "${name}"`)
  }
  return found
}

function spaceOf(object: Object3D): UnitASpace | undefined {
  for (let node: Object3D | null = object; node !== null; node = node.parent) {
    const tagged = node.userData.unit_a_space
    if (SPACES.includes(tagged as UnitASpace)) return tagged as UnitASpace
    if (node.name.startsWith('reception_')) return 'reception'
    if (node.name.startsWith('parlour_')) return 'parlour'
    if (node.name.startsWith('staircase_')) return 'staircase'
    if (node.name.startsWith('first_floor_hall_')) return 'hallway'
  }
  return undefined
}

async function loadLightmaps(): Promise<Record<UnitASpace, Texture>> {
  const loader = new EXRLoader()
  const loaded = await Promise.all(
    SPACES.map((space) => loader.loadAsync(`${BAKE_URL}/unit-a_${space}.exr`)),
  )
  const maps = {} as Record<UnitASpace, Texture>
  SPACES.forEach((space, index) => {
    const map = loaded[index]
    if (map === undefined) throw new Error(`Unit A lightmap ${space} failed to load`)
    map.colorSpace = NoColorSpace
    map.channel = 1
    map.flipY = true
    map.needsUpdate = true
    maps[space] = map
  })
  return maps
}

function applyLightmaps(root: Object3D, maps: Record<UnitASpace, Texture>): void {
  const cache = new Map<string, MeshStandardMaterial>()
  const counts = new Map<UnitASpace, number>()

  root.traverse((object) => {
    if (!(object instanceof Mesh)) return
    object.castShadow = true
    object.receiveShadow = true

    const space = spaceOf(object)
    if (space === undefined || object.geometry.getAttribute('uv1') === undefined) return
    const source = object.material
    if (!(source instanceof MeshStandardMaterial)) return

    const key = `${source.uuid}:${space}`
    let material = cache.get(key)
    if (material === undefined) {
      material = source.clone()
      material.lightMap = maps[space]
      material.lightMapIntensity = LIGHTMAP_INTENSITY
      material.needsUpdate = true
      cache.set(key, material)
    }
    object.material = material
    counts.set(space, (counts.get(space) ?? 0) + 1)
  })

  const empty = SPACES.filter((space) => (counts.get(space) ?? 0) === 0)
  if (empty.length > 0) throw new Error(`Unit A lightmaps matched no meshes: ${empty.join(', ')}`)
}

function collectStairs(scene: Group): Group {
  const stairs = new Group()
  stairs.name = 'stairs'
  const roots = scene.children.filter((child) => spaceOf(child) === 'staircase')
  roots.forEach((child) => stairs.add(child))
  scene.add(stairs)
  return stairs
}

function makeDoorPlaqueTexture(label: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx !== null) {
    ctx.fillStyle = '#8b6f3b'
    ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = '#b8944f'
    ctx.fillRect(8, 8, 112, 112)
    ctx.strokeStyle = '#3a2a12'
    ctx.lineWidth = 4
    ctx.strokeRect(10, 10, 108, 108)
    // Corner screws
    ctx.fillStyle = '#3a2a12'
    for (const [sx, sy] of [
      [18, 18],
      [110, 18],
      [18, 110],
      [110, 110],
    ] as const) {
      ctx.beginPath()
      ctx.arc(sx, sy, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    // Engraved lettering
    ctx.fillStyle = '#1d1409'
    ctx.font = 'bold 56px Georgia, "Times New Roman", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 64, 67)
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function attachPlaqueOverlay(parent: Object3D, pos: Vector3, label: string, withBacking: boolean): void {
  const group = new Group()
  group.name = `hall_plaque_${label}`
  group.position.copy(pos)
  if (withBacking) {
    const backing = new Mesh(
      new BoxGeometry(0.012, 0.15, 0.15),
      new MeshStandardMaterial({ color: 0x6f572c, roughness: 0.48, metalness: 0.65 }),
    )
    group.add(backing)
  }
  const face = new Mesh(
    new PlaneGeometry(0.146, 0.146),
    new MeshStandardMaterial({
      map: makeDoorPlaqueTexture(label),
      roughness: 0.42,
      metalness: 0.55,
      envMapIntensity: 0.6,
    }),
  )
  face.rotation.y = -Math.PI / 2
  face.position.x = withBacking ? -0.007 : -0.002
  face.castShadow = false
  face.receiveShadow = true
  group.add(face)
  parent.add(group)
}

/**
 * Stamps numbered brass plaques (`1A`, `1B`, `1C`) onto the upstairs corridor
 * doors and jambs so the hallway rooms read clearly in both Dusk and Day modes.
 */
export function installDoorNumberPlates(unitAScene: Object3D, roomGroup: Object3D): void {
  unitAScene.updateMatrixWorld(true)
  roomGroup.updateMatrixWorld(true)

  const mountExisting = (nodeName: string, label: string): void => {
    const plate = unitAScene.getObjectByName(nodeName)
    if (plate === undefined) return
    const box = new Box3().setFromObject(plate)
    if (box.isEmpty()) return
    const center = box.getCenter(new Vector3())
    attachPlaqueOverlay(unitAScene, new Vector3(box.min.x, center.y, center.z), label, false)
  }

  mountExisting('first_floor_hall_door_3_number_plate', '1B')
  mountExisting('first_floor_hall_door_2_number_plate', '1C')

  const pier1A = roomGroup.getObjectByName('wall_hall_pier0')
  if (pier1A !== undefined) {
    const pierBox = new Box3().setFromObject(pier1A)
    if (!pierBox.isEmpty()) {
      attachPlaqueOverlay(unitAScene, new Vector3(pierBox.min.x - 0.006, 4.905, pierBox.min.z + 0.18), '1A', true)
    }
  }
}

/** Load the complete Blender-authored interior and restore its five baked atlases. */
export async function loadUnitA(): Promise<UnitA> {
  const loader = new GLTFLoader()
  const loadModel = async () => {
    try {
      return await loader.loadAsync(MODEL_URL)
    } catch (err) {
      if (MODEL_URL !== LOCAL_MODEL_URL) {
        console.warn('Failed to load remote Unit A model, falling back to local:', err)
        return await loader.loadAsync(LOCAL_MODEL_URL)
      }
      throw err
    }
  }

  const [gltf, maps] = await Promise.all([
    loadModel(),
    loadLightmaps(),
  ])
  const scene = gltf.scene
  scene.name = 'unit-a'
  applyLightmaps(scene, maps)
  const stairs = collectStairs(scene)

  return {
    scene,
    props: {
      stairs,
      desk: need(scene, 'desk'),
      keyRack: need(scene, 'keyRack'),
      ledger: need(scene, 'ledger'),
      phone: need(scene, 'phone'),
      ashtray: need(scene, 'ashtray'),
      armchair: need(scene, 'armchair'),
      parlourTable: need(scene, 'parlourTable'),
      diary: need(scene, 'diary'),
      television: need(scene, 'television'),
      standardLamp: need(scene, 'standardLamp'),
    },
  }
}
