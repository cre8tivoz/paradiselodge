import { Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'
import { HAND } from '../../core/config.ts'
import { buildHand } from './rig.ts'
import type { FingerCurl, HandRig } from './rig.ts'
import { createSampledPose, sampleTrack } from './clip.ts'
import type { HandClip, SampledPose } from './clip.ts'

/**
 * Miller's hands.
 *
 * They are children of the camera and they live in the main scene, so they are
 * lit by the same lights as everything else. That is deliberate. The reference
 * repo in SETUP.md ships a known viewmodel bug where the first person rig
 * receives roughly twenty times the irradiance of the world, which is what
 * happens when the viewmodel gets its own scene and its own lights and the two
 * drift apart. There is no second light rig here, so they cannot drift.
 *
 * The trade is that a hand can intersect world geometry. It is a small trade,
 * because the hands are only in frame during an examine, and an examine only
 * happens when Miller is close to and facing the thing he is examining.
 */
export class Hands {
  private readonly camera: PerspectiveCamera
  private readonly right: HandRig
  private readonly left: HandRig

  private clip: HandClip | undefined = undefined
  private time = 0
  private objectId: string | undefined = undefined

  private readonly anchor = new Vector3()
  private readonly sampled: SampledPose = createSampledPose()
  private readonly scratchWorld = new Vector3()

  /** Fired once when a clip runs to its end. Not fired when cancelled. */
  onComplete: ((objectId: string) => void) | undefined = undefined

  constructor(camera: PerspectiveCamera) {
    this.camera = camera

    this.right = buildHand(false)
    this.left = buildHand(true)

    camera.add(this.right.root)
    camera.add(this.left.root)

    this.right.setVisible(false)
    this.left.setVisible(false)
  }

  get isPlaying(): boolean {
    return this.clip !== undefined
  }

  get currentObjectId(): string | undefined {
    return this.objectId
  }

  /**
   * @param target World position of the thing being examined. The hand reaches
   *   toward it, clamped to arm's length, so a bespoke clip lands on the object
   *   that is actually there rather than on a fixed point in front of the face.
   */
  play(clip: HandClip, objectId: string, target: Vector3): void {
    this.clip = clip
    this.objectId = objectId
    this.time = 0
    this.setAnchor(target)
    this.right.setVisible(clip.right !== undefined)
    this.left.setVisible(clip.left !== undefined)
    this.apply(0)
  }

  cancel(): void {
    this.clip = undefined
    this.objectId = undefined
    this.right.setVisible(false)
    this.left.setVisible(false)
  }

  update(delta: number): void {
    const clip = this.clip
    if (clip === undefined) {
      return
    }

    this.time += delta
    const finished = this.time >= clip.duration
    this.apply(Math.min(this.time, clip.duration))

    if (!finished) {
      return
    }

    const completedId = this.objectId
    this.clip = undefined
    this.objectId = undefined
    this.right.setVisible(false)
    this.left.setVisible(false)

    if (completedId !== undefined) {
      this.onComplete?.(completedId)
    }
  }

  private setAnchor(target: Vector3): void {
    // Into camera space, then pulled back to something an arm can reach.
    this.scratchWorld.copy(target)
    this.camera.worldToLocal(this.scratchWorld)

    const distance = this.scratchWorld.length()
    if (distance < 1e-4) {
      this.anchor.set(0, 0, -HAND.reachMin)
      return
    }

    const clamped = Math.min(Math.max(distance, HAND.reachMin), HAND.reachMax)
    this.anchor.copy(this.scratchWorld).multiplyScalar(clamped / distance)
  }

  private apply(time: number): void {
    const clip = this.clip
    if (clip === undefined) {
      return
    }
    if (clip.right !== undefined) {
      sampleTrack(clip.right, time, this.anchor, this.sampled)
      writePose(this.right, this.sampled)
    }
    if (clip.left !== undefined) {
      sampleTrack(clip.left, time, this.anchor, this.sampled)
      writePose(this.left, this.sampled)
    }
  }
}

function writePose(hand: HandRig, pose: SampledPose): void {
  hand.root.position.copy(pose.position)
  // Roll goes to the wrist, not the root, or the forearm swings across frame.
  hand.root.rotation.set(pose.rotation.x, pose.rotation.y, 0, 'YXZ')
  hand.setRoll(pose.rotation.z)
  const c = pose.curl
  const curl: FingerCurl = [c[0], c[1], c[2], c[3], c[4]]
  hand.setCurl(curl)
}
