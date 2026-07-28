import { DoubleSide, Group, Object3D } from 'three'
import type { Mesh, MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/**
 * One gloved hand. Geometry comes from public/models/miller-hand.glb, authored
 * in Blender as rigid segments. The joint hierarchy is what the clips drive.
 *
 * Segmented rather than skinned, on purpose. ASSETS.md is explicit that gloves
 * hide the knuckle and fingernail detail that gives bare CG hands away, and a
 * glove also hides the seam between rigid segments.
 *
 * clip.ts, clips.ts and hands.ts stay mesh-agnostic. Only this file knows about
 * the glTF.
 */

/** Curl per digit, 0 straight and 1 fully closed. Thumb first. */
export type FingerCurl = readonly [number, number, number, number, number]

/** Maximum bend per joint at full curl, radians. */
const CURL_LIMITS: readonly [number, number, number] = [1.40, 1.65, 1.20]
const THUMB_LIMITS: readonly [number, number] = [1.05, 0.95]

const FINGER_NAMES = ['index', 'middle', 'ring', 'little'] as const
const MODEL_URL = '/models/miller-hand.glb'

export interface HandRig {
  readonly root: Group
  setCurl(curl: FingerCurl): void
  /**
   * Roll about the forearm axis, which is what turning an object over is.
   *
   * This is not the same as rolling the whole rig. Rotate the root and the
   * forearm swings with it, straight across the camera. A real wrist pronates:
   * the hand turns, the forearm follows part of the way, and the elbow stays
   * where it is.
   */
  setRoll(radians: number): void
  setVisible(visible: boolean): void
}

interface Digit {
  readonly joints: Object3D[]
  readonly limits: readonly number[]
}

let templatePromise: Promise<Object3D> | undefined

/** Load once. Both hands clone from the same template. */
export function loadHandTemplate(): Promise<Object3D> {
  if (templatePromise === undefined) {
    templatePromise = new GLTFLoader().loadAsync(MODEL_URL).then((gltf) => {
      const root = gltf.scene
      root.updateMatrixWorld(true)
      return root
    })
  }
  return templatePromise
}

/**
 * @param mirrored Left hand. Mirrored by negating X on the root. Materials go
 *   double-sided so the flipped winding still lights.
 */
export function buildHand(template: Object3D, mirrored: boolean): HandRig {
  const source = template.clone(true)
  const side = mirrored ? -1 : 1

  const root = new Group()
  if (mirrored) {
    root.scale.x = -1
    source.traverse((obj) => {
      const mesh = obj as Mesh
      if (mesh.isMesh !== true) {
        return
      }
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((entry) => {
          const cloned = entry.clone() as MeshStandardMaterial
          cloned.side = DoubleSide
          return cloned
        })
        return
      }
      const cloned = mesh.material.clone() as MeshStandardMaterial
      cloned.side = DoubleSide
      mesh.material = cloned
    })
  }

  /*
   * The forearm hangs off its own pivot rather than running straight back from
   * the palm. An arm arrives at the wrist from the shoulder, which is below and
   * outboard of the hand, so a forearm parented rigidly to a palm-down hand
   * points itself at the lens and the player looks down the barrel of it.
   *
   * Steep on purpose. An examine pose tips the wrist forward to reach down at
   * a surface, and that same rotation swings the forearm back up toward the
   * camera. Anything shallower and the player spends the animation looking
   * down the length of Miller's own arm.
   */
  const forearmPivot = new Object3D()
  forearmPivot.rotation.set(1.45, side * 0.40, 0)
  root.add(forearmPivot)

  const handPivot = new Object3D()
  root.add(handPivot)

  const sleeve = requireChild(source, 'sleeve')
  const hand = requireChild(source, 'hand')

  // Adopt the authored groups under the runtime pivots. Keep their local bind.
  forearmPivot.add(sleeve)
  handPivot.add(hand)

  const digits: Digit[] = []

  const thumbJoints = [
    requireChild(hand, 'thumb_j0'),
    requireChild(hand, 'thumb_j1'),
  ]
  digits.push({ joints: thumbJoints, limits: THUMB_LIMITS })

  for (const name of FINGER_NAMES) {
    const joints = [
      requireChild(hand, `${name}_j0`),
      requireChild(hand, `${name}_j1`),
      requireChild(hand, `${name}_j2`),
    ]
    digits.push({ joints, limits: CURL_LIMITS })
  }

  return {
    root,
    setCurl(curl: FingerCurl): void {
      for (let d = 0; d < digits.length; d += 1) {
        const digit = digits[d]
        const amount = clamp01(curl[d])
        for (let j = 0; j < digit.joints.length; j += 1) {
          // Fingers run -Z, palm faces -Y. Positive local X would curl toward
          // the back of the hand; negate so curl closes into the palm.
          digit.joints[j].rotation.x = -amount * digit.limits[j]
        }
      }
    },
    setRoll(radians: number): void {
      handPivot.rotation.z = radians
      // Partial pronation. The radius rolls over the ulna, so the forearm
      // follows some of the way, and the elbow does not travel.
      forearmPivot.rotation.z = radians * 0.35
    },
    setVisible(visible: boolean): void {
      root.visible = visible
    },
  }
}

function requireChild(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name)
  if (found === undefined) {
    throw new Error(`Hand glTF is missing node "${name}"`)
  }
  return found
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}
