import {
  Group,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  Object3D,
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

const MODEL_URL = '/models/unit-a.glb'
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

/** Load the complete Blender-authored interior and restore its five baked atlases. */
export async function loadUnitA(): Promise<UnitA> {
  const [gltf, maps] = await Promise.all([
    new GLTFLoader().loadAsync(MODEL_URL),
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
