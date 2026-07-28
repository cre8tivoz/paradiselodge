import type { Object3D } from 'three'

/**
 * Something Miller can look at.
 *
 * `description` is tier one only. It is the surface, nothing more. Per the
 * writing rules in CLAUDE.md it never editorialises and it never tells the
 * player that a thing matters.
 *
 * `examine`, when present, is tier two. Holding the examine input on this
 * object plays the hand animation and writes that line.
 *
 * `dialogueId`, when present, means F talks instead of examining. The id names
 * a graph registered with the dialogue runner.
 *
 * `clipId`, when present with `examine`, names a clip from `player/hands/clips`.
 * Resolved at play time so this module stays free of the hands internals.
 *
 * `evidenceId`, when present, is the case-file ID filed on a completed examine.
 * Only tier two creates evidence.
 */
export interface Lookable {
  readonly id: string
  readonly description: string
  readonly examine?: string
  readonly dialogueId?: string
  readonly clipId?: string
  readonly evidenceId?: string
  readonly object: Object3D
}

/**
 * The set of things currently lookable. The world registers into this and the
 * raycaster reads it. Neither knows about the other.
 */
export class LookRegistry {
  private readonly byId = new Map<string, Lookable>()
  private readonly byObjectId = new Map<number, Lookable>()

  add(lookable: Lookable): void {
    this.byId.set(lookable.id, lookable)
    // Register descendants too, so a lookable can be a group of meshes.
    lookable.object.traverse((child) => {
      this.byObjectId.set(child.id, lookable)
    })
  }

  remove(id: string): void {
    const lookable = this.byId.get(id)
    if (lookable === undefined) {
      return
    }
    this.byId.delete(id)
    lookable.object.traverse((child) => {
      this.byObjectId.delete(child.id)
    })
  }

  get(id: string): Lookable | undefined {
    return this.byId.get(id)
  }

  /** Which lookable, if any, does this hit object belong to? */
  forObject(object: Object3D): Lookable | undefined {
    return this.byObjectId.get(object.id)
  }

  get objects(): Object3D[] {
    return [...this.byId.values()].map((lookable) => lookable.object)
  }

  clear(): void {
    this.byId.clear()
    this.byObjectId.clear()
  }
}
