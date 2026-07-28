import {
  AmbientLight,
  Box3,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import { GREYBOX } from '../materials/palette.ts'

/**
 * A grey box room to prove the controller in. Throwaway.
 *
 * The dimensions are deliberately known so movement can be read against them:
 * the room is 12 x 9, walls are 3 high, the crouch bar clears at 1.3, and the
 * gap between the pillar and the wall is 0.9 wide.
 */

export interface Greybox {
  readonly group: Group
  readonly solids: Box3[]
  readonly spawn: Vector3
  /**
   * Named so something can be registered as lookable without world/ having to
   * know that interact/ exists. main.ts wires the two together.
   */
  readonly props: Record<string, Mesh>
}

const ROOM_WIDTH = 12
const ROOM_DEPTH = 9
const WALL_HEIGHT = 3
const WALL_THICKNESS = 0.3

export function buildGreybox(): Greybox {
  const group = new Group()
  const solids: Box3[] = []

  const floorMat = new MeshStandardMaterial({ color: GREYBOX.floor, roughness: 0.95 })
  const wallMat = new MeshStandardMaterial({ color: GREYBOX.wall, roughness: 0.9 })
  const propMat = new MeshStandardMaterial({ color: GREYBOX.prop, roughness: 0.8 })
  const propAltMat = new MeshStandardMaterial({ color: GREYBOX.propAlt, roughness: 0.8 })

  const floor = new Mesh(new BoxGeometry(ROOM_WIDTH, 0.2, ROOM_DEPTH), floorMat)
  floor.position.set(0, -0.1, 0)
  floor.receiveShadow = true
  group.add(floor)

  // No ceiling. One directional light from above is the whole lighting budget,
  // and a lid on the room turns the interior into flat ambient with a black
  // slab overhead. Room 1A gets a real ceiling and a real sun at step 6.

  const halfW = ROOM_WIDTH / 2
  const halfD = ROOM_DEPTH / 2
  const t = WALL_THICKNESS

  addSolidBox(group, solids, wallMat, ROOM_WIDTH, WALL_HEIGHT, t, 0, WALL_HEIGHT / 2, -halfD)
  addSolidBox(group, solids, wallMat, ROOM_WIDTH, WALL_HEIGHT, t, 0, WALL_HEIGHT / 2, halfD)
  addSolidBox(group, solids, wallMat, t, WALL_HEIGHT, ROOM_DEPTH, -halfW, WALL_HEIGHT / 2, 0)
  addSolidBox(group, solids, wallMat, t, WALL_HEIGHT, ROOM_DEPTH, halfW, WALL_HEIGHT / 2, 0)

  // Pillar with a 0.9 gap to the north wall. Tests sliding and lean-around.
  const pillar = addSolidBox(
    group, solids, propMat, 0.8, WALL_HEIGHT, 0.8, 2.5, WALL_HEIGHT / 2, -halfD + 0.3 + 0.9 + 0.4,
  )

  // Waist-high block. Crouch behind it, lean over it.
  const block = addSolidBox(group, solids, propAltMat, 2.4, 0.9, 0.6, -3, 0.45, -1.5)

  // A one metre cube, for judging scale and eye height against.
  const cube = addSolidBox(group, solids, propMat, 1, 1, 1, -1.5, 0.5, 2.5)

  // Doorway-width slot: two stubs 0.85 apart.
  const jambLeft = addSolidBox(group, solids, propAltMat, 0.4, WALL_HEIGHT, 2, 4.5, WALL_HEIGHT / 2, 2)
  addSolidBox(group, solids, propAltMat, 0.4, WALL_HEIGHT, 2, 4.5 + 0.4 + 0.85, WALL_HEIGHT / 2, 2)

  // One directional light and a flat ambient. Per CLAUDE.md that is the whole
  // budget. No TAA, no cascades, no motion blur.
  const sun = new DirectionalLight(0xffffff, 2.6)
  sun.position.set(4, 8, 3)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -halfW
  sun.shadow.camera.right = halfW
  sun.shadow.camera.top = halfD
  sun.shadow.camera.bottom = -halfD
  sun.shadow.camera.far = 25
  sun.shadow.bias = -0.0005
  group.add(sun)
  group.add(new AmbientLight(0xffffff, 1.1))

  return {
    group,
    solids,
    spawn: new Vector3(0, 0, 3),
    props: { pillar, block, cube, jambLeft },
  }
}

function addSolidBox(
  group: Group,
  solids: Box3[],
  material: MeshStandardMaterial,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), material)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  solids.push(new Box3().setFromObject(mesh))
  return mesh
}
