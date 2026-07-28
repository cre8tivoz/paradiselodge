import { Box3, Vector3 } from 'three'
import { PLAYER } from '../core/config.ts'

/**
 * What the player controller asks for when it wants to move. The controller
 * knows nothing about how the answer is worked out.
 *
 * The lodge will eventually walk a navmesh (see CLAUDE.md). Swapping this
 * implementation out must not touch player/controller.ts.
 */
export interface CollisionSolver {
  /** Slide a vertical cylinder from `from` toward `to`. Returns where it got. */
  resolve(from: Vector3, to: Vector3, radius: number): Vector3
  /** Is a cylinder at `at` clear of everything solid? Lean uses this. */
  isClear(at: Vector3, radius: number): boolean
}

/**
 * PROVISIONAL. Axis-aligned boxes, circle-vs-AABB pushout in XZ.
 *
 * Good enough for room shells and kit furniture. The lodge will eventually
 * walk a navmesh; swapping this out must not touch player/controller.ts.
 */
export class BoxCollisionSolver implements CollisionSolver {
  private readonly solids: Box3[]

  /** How many times to re-run pushout, so corners settle instead of jittering. */
  private static readonly ITERATIONS = 3

  constructor(solids: Box3[]) {
    this.solids = solids
  }

  resolve(from: Vector3, to: Vector3, radius: number): Vector3 {
    // Resolve one axis at a time so a wall stops that axis and lets the other
    // one slide, which is what makes sliding along a wall feel right.
    const result = from.clone()

    result.x = to.x
    this.pushOut(result, radius)

    result.z = to.z
    this.pushOut(result, radius)

    result.y = to.y
    return result
  }

  isClear(at: Vector3, radius: number): boolean {
    const r2 = radius * radius
    for (const box of this.solids) {
      const dx = at.x - clamp(at.x, box.min.x, box.max.x)
      const dz = at.z - clamp(at.z, box.min.z, box.max.z)
      if (dx * dx + dz * dz < r2) {
        return false
      }
    }
    return true
  }

  private pushOut(point: Vector3, radius: number): void {
    for (let i = 0; i < BoxCollisionSolver.ITERATIONS; i += 1) {
      let moved = false
      for (const box of this.solids) {
        const closestX = clamp(point.x, box.min.x, box.max.x)
        const closestZ = clamp(point.z, box.min.z, box.max.z)
        const dx = point.x - closestX
        const dz = point.z - closestZ
        const distSq = dx * dx + dz * dz

        if (distSq >= radius * radius) {
          continue
        }

        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq)
          const push = (radius - dist) / dist
          point.x += dx * push
          point.z += dz * push
        } else {
          // Centre is inside the box. Eject along the shallowest face.
          const toMinX = point.x - box.min.x
          const toMaxX = box.max.x - point.x
          const toMinZ = point.z - box.min.z
          const toMaxZ = box.max.z - point.z
          const smallest = Math.min(toMinX, toMaxX, toMinZ, toMaxZ)
          if (smallest === toMinX) {
            point.x = box.min.x - radius
          } else if (smallest === toMaxX) {
            point.x = box.max.x + radius
          } else if (smallest === toMinZ) {
            point.z = box.min.z - radius
          } else {
            point.z = box.max.z + radius
          }
        }
        moved = true
      }
      if (!moved) {
        return
      }
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Nothing is solid. Useful for isolating a movement bug from a collision bug. */
export class NoClipSolver implements CollisionSolver {
  resolve(_from: Vector3, to: Vector3, _radius: number): Vector3 {
    return to.clone()
  }

  isClear(_at: Vector3, _radius: number): boolean {
    return true
  }
}

export const PLAYER_RADIUS = PLAYER.radius
