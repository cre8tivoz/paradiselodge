import { Euler, Vector3 } from 'three'
import type { FingerCurl } from './rig.ts'

/**
 * Bespoke examine animations.
 *
 * BRIEF.md is explicit that these are authored per object and not physics.
 * "Contextual, not physics. Each examinable object has a bespoke hand
 * animation. Do not build free-form physics grabbing." So a clip is a short
 * list of hand poses over time and nothing simulates anything.
 */

export type Ease = 'linear' | 'in' | 'out' | 'inOut'

export interface HandKeyframe {
  /** Seconds from the start of the clip. */
  readonly t: number
  /** Metres, in camera space, or relative to the object when `anchored`. */
  readonly position: readonly [number, number, number]
  /** Radians, camera space. */
  readonly rotation: readonly [number, number, number]
  readonly curl: FingerCurl
  /**
   * Anchored keyframes are placed relative to the object Miller is examining
   * rather than to the camera, so the hand reaches the thing that is actually
   * there instead of a fixed point in front of the face.
   */
  readonly anchored?: boolean
  /** Easing into this keyframe from the one before. */
  readonly ease?: Ease
}

export interface HandClip {
  readonly id: string
  readonly duration: number
  readonly right?: readonly HandKeyframe[]
  readonly left?: readonly HandKeyframe[]
}

export interface SampledPose {
  readonly position: Vector3
  readonly rotation: Euler
  readonly curl: number[]
}

const scratchA = new Vector3()
const scratchB = new Vector3()

/**
 * Sample a track at time `t`, writing into `out`.
 *
 * `anchor` is the examined object's position in camera space. Keyframes that
 * are not anchored ignore it.
 */
export function sampleTrack(
  track: readonly HandKeyframe[],
  time: number,
  anchor: Vector3,
  out: SampledPose,
): void {
  if (track.length === 0) {
    return
  }

  const first = track[0]
  if (time <= first.t) {
    writeKeyframe(first, anchor, 0, first, out)
    return
  }

  const last = track[track.length - 1]
  if (time >= last.t) {
    writeKeyframe(last, anchor, 1, last, out)
    return
  }

  for (let i = 0; i < track.length - 1; i += 1) {
    const a = track[i]
    const b = track[i + 1]
    if (time < a.t || time > b.t) {
      continue
    }
    const span = b.t - a.t
    const raw = span <= 0 ? 1 : (time - a.t) / span
    writeKeyframe(a, anchor, applyEase(raw, b.ease ?? 'inOut'), b, out)
    return
  }
}

function writeKeyframe(
  a: HandKeyframe,
  anchor: Vector3,
  blend: number,
  b: HandKeyframe,
  out: SampledPose,
): void {
  resolvePosition(a, anchor, scratchA)
  resolvePosition(b, anchor, scratchB)
  out.position.lerpVectors(scratchA, scratchB, blend)

  out.rotation.set(
    lerp(a.rotation[0], b.rotation[0], blend),
    lerp(a.rotation[1], b.rotation[1], blend),
    lerp(a.rotation[2], b.rotation[2], blend),
    'YXZ',
  )

  for (let i = 0; i < 5; i += 1) {
    out.curl[i] = lerp(a.curl[i], b.curl[i], blend)
  }
}

function resolvePosition(key: HandKeyframe, anchor: Vector3, out: Vector3): void {
  out.set(key.position[0], key.position[1], key.position[2])
  if (key.anchored === true) {
    out.add(anchor)
  }
}

function applyEase(t: number, ease: Ease): number {
  switch (ease) {
    case 'linear':
      return t
    case 'in':
      return t * t * t
    case 'out': {
      const inv = 1 - t
      return 1 - inv * inv * inv
    }
    case 'inOut':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    default: {
      const _exhaustive: never = ease
      return _exhaustive
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function createSampledPose(): SampledPose {
  return {
    position: new Vector3(),
    rotation: new Euler(0, 0, 0, 'YXZ'),
    curl: [0, 0, 0, 0, 0],
  }
}
