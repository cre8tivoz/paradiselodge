import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import { INTERIOR } from '../materials/palette.ts'

/**
 * STUB. A few metres of first-floor hall outside 1A's door.
 *
 * This exists because Rosie has to stand somewhere and a doorway needs
 * something behind it. It is not the hallway. The real one arrives at step 11
 * with the stairs, the numbered doors and the rest of the lodge, and this file
 * is deleted whole when it does.
 *
 * Deliberately dim. There is no window on it, so the only light it gets is the
 * room's fill, which is the point: 1A is the bright thing.
 */

export interface HallStub {
  readonly group: Group
  readonly solids: Box3[]
}

const WIDTH = 3.4
const DEPTH = 2.9
const HEIGHT = 3.05
const WALL = 0.14

/** @param mouthZ World z of the outer face of 1A's north wall. */
export function buildHallStub(mouthZ: number): HallStub {
  const group = new Group()
  group.name = 'hall.stub'
  const solids: Box3[] = []

  const wallpaper = mat(INTERIOR.nicotine, 0.94)
  const carpet = mat(INTERIOR.carpetBrown, 0.98)
  const timber = mat(INTERIOR.timberDark, 0.8)

  const halfW = WIDTH / 2
  const midZ = mouthZ - DEPTH / 2

  const floor = new Mesh(new BoxGeometry(WIDTH, 0.1, DEPTH), carpet)
  floor.position.set(0, -0.05, midZ)
  floor.receiveShadow = true
  group.add(floor)

  // Casts, or the sun comes straight through the ceiling and lights the back
  // wall from above. A lid that does not block light is not a lid.
  const ceiling = new Mesh(new BoxGeometry(WIDTH, 0.1, DEPTH), wallpaper)
  ceiling.position.set(0, HEIGHT + 0.05, midZ)
  ceiling.castShadow = true
  ceiling.receiveShadow = true
  group.add(ceiling)

  // Back wall and both sides. Solid, so Miller cannot wander into step 11.
  addSolid(group, solids, box(WIDTH, HEIGHT, WALL, wallpaper), 0, HEIGHT / 2, mouthZ - DEPTH)
  addSolid(group, solids, box(WALL, HEIGHT, DEPTH, wallpaper), -halfW, HEIGHT / 2, midZ)
  addSolid(group, solids, box(WALL, HEIGHT, DEPTH, wallpaper), halfW, HEIGHT / 2, midZ)

  // Close the gap either side of 1A's doorway so the hall is not open to the void.
  const doorwayHalf = 0.47
  const sideWidth = halfW - doorwayHalf
  for (const sign of [-1, 1]) {
    addSolid(
      group,
      solids,
      box(sideWidth, HEIGHT, WALL, wallpaper),
      sign * (doorwayHalf + sideWidth / 2),
      HEIGHT / 2,
      mouthZ,
    )
  }

  // Runner down the middle, worn. Skirting on the back wall.
  const runner = new Mesh(new BoxGeometry(1.1, 0.012, DEPTH - 0.2), timber)
  runner.position.set(0, 0.006, midZ)
  runner.receiveShadow = true
  group.add(runner)

  const skirting = new Mesh(new BoxGeometry(WIDTH - WALL * 2, 0.14, 0.03), timber)
  skirting.position.set(0, 0.07, mouthZ - DEPTH + WALL / 2 + 0.02)
  group.add(skirting)

  return { group, solids }
}

function box(w: number, h: number, d: number, material: MeshStandardMaterial): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function addSolid(
  group: Group,
  solids: Box3[],
  mesh: Mesh,
  x: number,
  y: number,
  z: number,
): void {
  mesh.position.set(x, y, z)
  group.add(mesh)
  solids.push(new Box3().setFromObject(mesh))
}

function mat(color: number, roughness: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness })
}

export const HALL_STUB_DEPTH = DEPTH

export function hallStandPoint(mouthZ: number): Vector3 {
  return new Vector3(0, 0, mouthZ - 1.05)
}
