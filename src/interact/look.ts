import { Raycaster, Vector2 } from 'three'
import type { Object3D, PerspectiveCamera } from 'three'
import { INTERACT } from '../core/config.ts'
import { emit } from '../core/events.ts'
import type { LookRegistry } from './lookable.ts'
import type { Lookable } from './lookable.ts'

/**
 * The centre-screen raycast.
 *
 * Emits look:enter and look:exit as the thing under the centre of the screen
 * changes. It creates no evidence and it signals no importance. The one line
 * of text is the entire feedback.
 *
 * The ray is cast against the whole world, not just the lookable things, and
 * only the nearest hit counts. Testing lookables alone would let Miller read a
 * description through a wall, which matters the moment room 1A has a hallway
 * outside it.
 */
export class LookRaycaster {
  private readonly camera: PerspectiveCamera
  private readonly registry: LookRegistry
  private readonly world: Object3D
  private readonly raycaster = new Raycaster()
  private readonly centre = new Vector2(0, 0)

  private current: Lookable | undefined = undefined

  constructor(camera: PerspectiveCamera, registry: LookRegistry, world: Object3D) {
    this.camera = camera
    this.registry = registry
    this.world = world
    this.raycaster.far = INTERACT.lookRange
  }

  /** The lookable under the centre of the screen, or undefined. */
  get target(): Lookable | undefined {
    return this.current
  }

  update(): void {
    this.raycaster.setFromCamera(this.centre, this.camera)

    const hits = this.raycaster.intersectObject(this.world, true)

    // Nearest hit only. If the closest thing in front of Miller is a wall, he
    // is looking at a wall, whatever is behind it.
    const nearest = hits[0]
    const found =
      nearest === undefined ? undefined : this.registry.forObject(nearest.object)

    if (found === this.current) {
      return
    }

    if (this.current !== undefined) {
      emit('look:exit', { objectId: this.current.id })
    }
    if (found !== undefined) {
      emit('look:enter', { objectId: found.id })
    }
    this.current = found
  }
}
