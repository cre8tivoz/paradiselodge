import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  Object3D,
  Vector3,
  type Texture,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js'
import { CRYSTAL_LENGTH, CRYSTAL_SPINE_OFFSET, buildCrystalProp } from './crystal.ts'
import type { CrystalProp } from './crystal.ts'
import type { WalkableRegion } from './collision.ts'

/**
 * Room 1A. Corner room, upstairs. Fixed 3pm sun through the sash.
 *
 * BRIEF.md: the light is the point. Everything in here happened at 2am in the
 * dark. Whoever arranged it never saw it like this.
 *
 * **This file is a loader and a prop registry. It does not build geometry.**
 * The room is `public/models/room1a.glb`, assembled in Blender out of sourced
 * furniture and baked in Cycles by `tools/blender/build_room1a.py` and
 * `bake_room1a.py`. Reset steps 4 to 6. Move a wall in the script, not here.
 *
 * What is still this file's job:
 *
 * - resolving the node names the rest of the game holds ids for
 * - putting the baked indirect light back on the materials
 * - baking collision boxes and the walkable floor off the loaded geometry
 * - placing Crystal, who is not part of the room and is never baked into it
 *
 * Built at the origin and placed into the lodge by the caller. Local -Z is the
 * hall door and local +Z is the sash, so the placement rotation decides which
 * way the room faces; collision boxes are baked after the transform is applied,
 * which is why the placement is an argument and not something you set later.
 */

/** Where the room sits in the lodge. */
export interface Room1APlacement {
  readonly position: Vector3
  readonly rotationY: number
}

export interface Room1A {
  readonly group: Group
  readonly solids: Box3[]
  readonly floors: WalkableRegion[]
  readonly spawn: Vector3
  /** Initial yaw so Miller faces into the room toward the window. */
  readonly spawnYaw: number
  readonly crystal: CrystalProp
  readonly props: {
    readonly bed: Object3D
    readonly dresser: Object3D
    readonly drawer: Object3D
    readonly wardrobe: Object3D
    readonly chair: Object3D
    readonly sideTable: Object3D
    readonly sash: Object3D
    readonly sill: Object3D
    /** The second sash, in the street elevation. Shut. */
    readonly frontWindow: Object3D
    readonly frame: Object3D
    readonly magazines: Object3D
    readonly map: Object3D
    readonly note: Object3D
    readonly lighter: Object3D
    /** Hall door leaf, standing open against the wall. */
    readonly door: Object3D
    /** The way out onto the verandah. Also standing open. */
    readonly verandahDoor: Object3D
  }
}

const MODEL_URL = '/models/room1a.glb'
const BAKE_URL = '/textures/bake'

/**
 * Which lightmap each node belongs to.
 *
 * The bake packs one 2048 atlas per surface group rather than one per object,
 * and the split has to be repeated here because a glTF carries no idea of it.
 * `tools/blender/bake_room1a.py` holds the same three lists. **Change one,
 * change the other**, or a mesh comes back unlit and nothing reports it.
 */
type BakeGroup = 'shell' | 'joinery' | 'furniture'

const SHELL = ['floor', 'ceiling', 'wall_', 'skirt_', 'rail_', 'cornice_']
const JOINERY = ['sash', 'front', 'sill', 'door', 'verandahDoor']
const FURNITURE = [
  'rug', 'wardrobe', 'bed', 'dresser', 'sideTable', 'chair', 'chair2',
  'bedding', 'mattress', 'frame', 'magazines', 'map', 'note', 'lighter',
  'syringe',
]

/**
 * What Miller cannot walk through.
 *
 * Prefixes, matched against the node the mesh hangs under, because a sourced
 * wardrobe is thirty meshes called things like `Loft037__0` and one box round
 * the lot of it is both cheaper and more honest than thirty.
 *
 * The doors are not in here. The doorway is the only way in and out of 1A, and
 * a leaf you can walk through beats a room you cannot leave.
 */
const SOLID = ['wall_', 'wardrobe', 'bed', 'dresser', 'sideTable', 'chair', 'chair2', 'mattress']

/**
 * What Crystal lies on.
 *
 * Measured off the loaded room, not off the Blender scene and not off the kit
 * bed. Three different numbers were in play and only one of them is the one she
 * touches:
 *
 *     0.56    the kit bed's mattress top. What this used to say, and wrong by
 *             twelve centimetres now
 *     0.4831  the spread's median over the mattress, measured in Blender
 *     0.438   the sourced mattress's top as it arrives in the .glb
 *
 * All three are the wrong surface, and so was 0.62, which was measured against
 * the thrown blanket that used to be here. **Measure this again whenever the
 * bedding changes.** It is the one number in the room that is not the room's:
 * she is loaded separately and placed onto geometry that arrives in the .glb.
 *
 * The way to measure it is to raycast straight down onto the spread in the
 * running game, over the footprint she actually occupies, and never to read it
 * off a bounding box. A bedspread's box bottom is its hem and its box top is a
 * fold crest, so both ends of it lie by ten centimetres.
 *
 * The sourced bedspread's flat sits at 0.505 to 0.54 local over the mattress.
 * 0.505 puts her a centimetre into it at the low end of that, which is a body
 * on a bed rather than a body over one.
 */
const SPREAD_TOP = 0.505

/** Head end of the bed, in room local z. The sourced frame runs -0.85 to 1.15. */
const BED_HEAD_Z = -0.8
const BED_CENTRE_X = -1.45

/**
 * How much of the bake lands.
 *
 * 1 is the map as measured. It is here as a number rather than inline because
 * it is the one dial worth having between a physically correct bake and a room
 * that reads right, and because `scene.environmentIntensity` is still carrying
 * some of the same job for the rest of the lodge.
 */
const LIGHTMAP_INTENSITY = 14

function loadModel(): Promise<Group> {
  return new GLTFLoader()
    .loadAsync(MODEL_URL)
    .then((gltf) => gltf.scene)
}

async function loadLightmaps(): Promise<Record<BakeGroup, Texture>> {
  const loader = new EXRLoader()
  const names: BakeGroup[] = ['shell', 'joinery', 'furniture']
  const loaded = await Promise.all(
    names.map((name) => loader.loadAsync(`${BAKE_URL}/room1a_${name}.exr`)),
  )
  const out = {} as Record<BakeGroup, Texture>
  names.forEach((name, i) => {
    const tex = loaded[i]
    if (tex === undefined) {
      throw new Error(`lightmap ${name} failed to load`)
    }
    /*
     * Not a colour map. This is irradiance with the albedo deliberately left
     * out of it, so the sRGB decode would bend every value in it.
     *
     * `flipY` true, and it was worth two renders to be sure. glTF UVs are
     * top-left and three turns flipY off for every texture that arrives inside
     * a .glb, but this one does not arrive inside it: it is an EXR Blender
     * wrote in its own bottom-left convention, so it needs the flip the glTF
     * textures do not. Left false, the ceiling came back black and the bounce
     * off the floor landed on the wall behind the bed.
     */
    tex.colorSpace = NoColorSpace
    /*
     * The second UV set, and this is the line the whole reset has been warning
     * about. `Texture.channel` defaults to 0, so a lightmap assigned and left
     * alone samples the atlas through the wallpaper's UVs: the room came back
     * with the atlas cells printed on the walls as rectangles.
     *
     * Channel 1 is `uv1`, which is what the exporter wrote TEXCOORD_1 into.
     */
    tex.channel = 1
    tex.flipY = true
    tex.needsUpdate = true
    out[name] = tex
  })
  return out
}

/** Which bake group a node sits in, by walking up to a name we know. */
function bakeGroupOf(object: Object3D): BakeGroup | undefined {
  for (let node: Object3D | null = object; node !== null; node = node.parent) {
    const name = node.name
    if (SHELL.some((p) => name.startsWith(p))) return 'shell'
    if (JOINERY.some((p) => name.startsWith(p))) return 'joinery'
    if (FURNITURE.some((p) => name.startsWith(p))) return 'furniture'
  }
  return undefined
}

/**
 * Put the baked indirect light on every material.
 *
 * Materials are cloned per group. `timber` is on the skirting and on the sash,
 * which are in two different atlases, and a material carries one `lightMap`, so
 * sharing them would light one of the two off the other's map.
 */
function applyLightmaps(root: Object3D, maps: Record<BakeGroup, Texture>): number {
  const cache = new Map<string, MeshStandardMaterial>()
  let unlit = 0

  root.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return
    }
    object.castShadow = true
    object.receiveShadow = true

    const group = bakeGroupOf(object)
    if (group === undefined) {
      unlit += 1
      return
    }

    const source = object.material
    if (!(source instanceof MeshStandardMaterial)) {
      return
    }
    const key = `${source.uuid}:${group}`
    let material = cache.get(key)
    if (material === undefined) {
      material = source.clone()
      material.lightMap = maps[group]
      material.lightMapIntensity = LIGHTMAP_INTENSITY
      material.needsUpdate = true
      cache.set(key, material)
    }
    object.material = material
  })

  return unlit
}

/** The named node, or a throw. A missing id is a wiring bug, not a warning. */
function need(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name)
  if (found === undefined) {
    throw new Error(`room1a.glb has no node called "${name}"`)
  }
  return found
}

/**
 * An invisible box the look ray can hit.
 *
 * The drawer is the one examinable in this room with no geometry of its own:
 * the sourced dresser's drawer fronts are part of one mesh with the carcass, so
 * there is nothing to name. A pad is what the room already used for the props
 * on the dresser top, and it is an interaction volume rather than art, which is
 * why it lives here and not in the .glb.
 */
function lookPad(name: string, size: Vector3, at: Vector3): Object3D {
  const pad = new Mesh(
    new BoxGeometry(size.x, size.y, size.z),
    new MeshBasicMaterial({ visible: false, depthWrite: false }),
  )
  pad.name = name
  pad.position.copy(at)
  return pad
}

export async function buildRoom1A(placement: Room1APlacement): Promise<Room1A> {
  const [scene, maps] = await Promise.all([loadModel(), loadLightmaps()])

  const group = new Group()
  group.name = 'room1a'
  group.add(scene)

  /*
   * Placed before anything is measured. `Box3.setFromObject` reads the matrix
   * chain, so every solid below would otherwise be baked at the origin and the
   * room would collide four metres from where it is drawn.
   */
  group.position.copy(placement.position)
  group.rotation.y = placement.rotationY
  group.updateMatrixWorld(true)

  const unlit = applyLightmaps(scene, maps)
  if (unlit > 0 && import.meta.env.DEV) {
    console.warn(`room1a: ${unlit} meshes matched no bake group and are unlit`)
  }

  const dresser = need(scene, 'dresser')

  /*
   * The drawer pad, on the front face of the sourced dresser and clear of the
   * mirror. Sized and placed off the dresser's own box so it follows if the
   * dresser is ever swapped for another one.
   */
  const dresserBox = new Box3().setFromObject(dresser)
  const dresserSize = dresserBox.getSize(new Vector3())
  const dresserMid = dresserBox.getCenter(new Vector3())
  const drawer = lookPad(
    'drawer',
    new Vector3(0.06, 0.2, dresserSize.z * 0.7),
    group.worldToLocal(
      new Vector3(dresserBox.min.x - 0.02, dresserBox.min.y + 0.34, dresserMid.z),
    ),
  )
  group.add(drawer)
  group.updateMatrixWorld(true)

  /*
   * Crystal on the bed, head to the headboard.
   *
   * She is loaded and placed here rather than baked into the room, because the
   * room is a lit box and she is a body in it: she has to be examinable, she
   * has to be able to not be there in some other scene, and she must never end
   * up in the indirect map.
   *
   * The yaw of pi is what puts her head at -Z. She is modelled standing and the
   * tilt in `crystal.ts` lays her out along +Z, so without it she would be head
   * to the foot of the bed. Her root is at her heels, so the head end works out
   * at BED_HEAD_Z + CRYSTAL_LENGTH.
   */
  const crystal = await buildCrystalProp()
  crystal.root.position.set(
    BED_CENTRE_X,
    SPREAD_TOP + CRYSTAL_SPINE_OFFSET,
    BED_HEAD_Z + CRYSTAL_LENGTH,
  )
  crystal.root.rotation.y = Math.PI
  group.add(crystal.root)
  group.updateMatrixWorld(true)

  /*
   * Collision, baked in world space off the placed geometry.
   *
   * One box per named piece rather than one per mesh. Walls are already split
   * into piers and lintels by the build script, which is what gives the doorway
   * headroom instead of bricking it up: the solver is height aware and a lintel
   * whose underside is above head height is something Miller walks under.
   */
  const solids: Box3[] = []
  for (const child of scene.children) {
    if (SOLID.some((p) => child.name.startsWith(p))) {
      solids.push(new Box3().setFromObject(child))
    }
  }

  const floors: WalkableRegion[] = [
    { box: new Box3().setFromObject(need(scene, 'floor')), surface: 'floorboard' },
  ]

  return {
    group,
    solids,
    floors,
    // Just inside the door, facing the sash and the bed. Local; the caller
    // transforms it if it wants to drop Miller straight into the room.
    spawn: new Vector3(0, 0, -2.3 + 0.55),
    // Yaw 0 looks down -Z (out the door). π faces the verandah sash.
    spawnYaw: Math.PI,
    crystal,
    props: {
      bed: need(scene, 'bed'),
      dresser,
      drawer,
      wardrobe: need(scene, 'wardrobe'),
      chair: need(scene, 'chair'),
      sideTable: need(scene, 'sideTable'),
      sash: need(scene, 'sash'),
      sill: need(scene, 'sill'),
      frontWindow: need(scene, 'frontWindow'),
      frame: need(scene, 'frame'),
      magazines: need(scene, 'magazines'),
      map: need(scene, 'map'),
      note: need(scene, 'note'),
      lighter: need(scene, 'lighter'),
      door: need(scene, 'door'),
      verandahDoor: need(scene, 'verandahDoor'),
    },
  }
}
