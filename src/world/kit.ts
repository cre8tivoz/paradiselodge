import { Box3, BoxGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import type { Surface } from '../core/events.ts'
import type { WalkableRegion } from './collision.ts'

/**
 * Kit geometry. Boxes given by their extents, because a building is a list of
 * edges and converting each one to a size and a midpoint by hand is where the
 * mistakes live.
 *
 * Everything here is scaffolding against the locked palette, and it all goes as
 * modelled pieces land. Shared by the lodge, the verandah and the yard.
 */

export function mat(color: number, roughness: number, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness })
}

export function slab(
  parent: Object3D,
  material: MeshStandardMaterial,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material)
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

/** Same as `slab`, for something that is a light source, not a lit surface. */
export function unlit(
  parent: Object3D,
  material: MeshBasicMaterial,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material)
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  parent.add(mesh)
  return mesh
}

/**
 * A box sized rather than placed, for anything that gets rotated afterwards.
 * Extents are no help once a thing is on a rake.
 */
export function raked(
  parent: Object3D,
  material: MeshStandardMaterial,
  width: number,
  height: number,
  length: number,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(width, height, length), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

export function aabb(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
): Box3 {
  return new Box3(new Vector3(x0, y0, z0), new Vector3(x1, y1, z1))
}

/** A slab that is also solid. */
export function wall(
  parent: Object3D,
  solids: Box3[],
  material: MeshStandardMaterial,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
): Mesh {
  const mesh = slab(parent, material, x0, x1, y0, y1, z0, z1)
  solids.push(aabb(x0, x1, y0, y1, z0, z1))
  return mesh
}

/**
 * A patch of floor. Only the top face matters, so the box is a thin lid: the
 * solver asks what is under a point and takes the highest lid within a step.
 */
export function walk(
  floors: WalkableRegion[],
  surface: Surface,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y: number,
): void {
  floors.push({ box: aabb(x0, x1, y - 0.2, y, z0, z1), surface })
}

export interface Opening {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

/**
 * A wall with holes in it. Scanline over the opening edges in x, then over
 * their y ranges within each column, emitting the solid between them.
 *
 * A pier-and-lintel loop can only do openings that sit side by side. The lodge
 * front stacks them: room 1A's street window is directly over the head of the
 * reception window.
 */
export function elevation(
  parent: Object3D,
  solids: Box3[],
  material: MeshStandardMaterial,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  openings: readonly Opening[],
): void {
  const columns = [...new Set([x0, x1, ...openings.flatMap((o) => [o.x0, o.x1])])]
    .filter((x) => x > x0 && x < x1)
    .sort((a, b) => a - b)
  columns.unshift(x0)
  columns.push(x1)

  for (let i = 0; i < columns.length - 1; i += 1) {
    const left = columns[i]
    const right = columns[i + 1]
    if (left === undefined || right === undefined || right - left < 1e-6) {
      continue
    }
    const mid = (left + right) / 2
    const bands = openings
      .filter((o) => o.x0 < mid && o.x1 > mid)
      .map((o) => ({ y0: Math.max(o.y0, y0), y1: Math.min(o.y1, y1) }))
      .filter((o) => o.y1 > o.y0)
      .sort((a, b) => a.y0 - b.y0)

    let cursor = y0
    for (const band of bands) {
      if (band.y0 > cursor) {
        wall(parent, solids, material, left, right, cursor, band.y0, z0, z1)
      }
      cursor = Math.max(cursor, band.y1)
    }
    if (cursor < y1) {
      wall(parent, solids, material, left, right, cursor, y1, z0, z1)
    }
  }
}
