import {
  CapsuleGeometry,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from 'three'
import { HANDS } from '../../materials/palette.ts'

/**
 * One gloved hand, built as rigid segments in a joint hierarchy.
 *
 * Rigid segments rather than a skinned mesh, on purpose. ASSETS.md is explicit
 * that gloves are what make CG hands read as right, because a glove hides the
 * knuckle and fingernail detail that gives bare hands away. A glove also hides
 * the seam between rigid segments, so the cheap rig and the correct look are
 * the same decision.
 *
 * Proportions are taken from images/characters/miller-hands.png: a large adult
 * male hand, thick fingers, broad palm. Miller is built like a front-rower and
 * the hands should read that way in frame.
 */

/** Curl per digit, 0 straight and 1 fully closed. Thumb first. */
export type FingerCurl = readonly [number, number, number, number, number]

const PALM_WIDTH = 0.098
const PALM_LENGTH = 0.104
const PALM_THICKNESS = 0.034

/** Proximal, intermediate, distal. Index, middle, ring, little. */
const FINGER_SEGMENTS: ReadonlyArray<readonly [number, number, number]> = [
  [0.048, 0.031, 0.023],
  [0.052, 0.034, 0.024],
  [0.048, 0.031, 0.023],
  [0.038, 0.024, 0.020],
]

const FINGER_RADII: readonly number[] = [0.0125, 0.0130, 0.0122, 0.0107]

/** Maximum bend per joint at full curl, radians. */
const CURL_LIMITS: readonly [number, number, number] = [1.40, 1.65, 1.20]

const THUMB_SEGMENTS: readonly [number, number] = [0.042, 0.030]
const THUMB_RADIUS = 0.0145

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

/**
 * @param mirrored Left hand. Built by negating X rather than scaling the root,
 *   so the matrix determinant stays positive and lighting is not flipped.
 */
export function buildHand(mirrored: boolean): HandRig {
  const side = mirrored ? -1 : 1

  const gloveMat = new MeshStandardMaterial({ color: HANDS.glove, roughness: 0.55 })
  const seamMat = new MeshStandardMaterial({ color: HANDS.gloveSeam, roughness: 0.6 })
  const cuffMat = new MeshStandardMaterial({ color: HANDS.cuff, roughness: 0.92 })

  const root = new Group()

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

  /*
   * A stub, not a whole forearm. It is the nearest thing to the lens and the
   * thickest, so at any real length it becomes the shot. Hand and a bit of
   * sleeve is what a first person view actually shows. The rest of the arm is
   * off screen, which is where arms live.
   *
   * Capped, not open ended: an open cylinder shows its own inside face the
   * moment the camera catches the end of it.
   */
  const forearmGeo = new CylinderGeometry(0.038, 0.042, 0.07, 12)
  forearmGeo.rotateX(Math.PI / 2)
  const forearm = new Mesh(forearmGeo, cuffMat)
  forearm.position.z = 0.072
  forearmPivot.add(forearm)

  // The shirt cuff. Scene 1 is clean and buttoned, per CLAUDE.md's ageing table.
  const cuffGeo = new CylinderGeometry(0.048, 0.044, 0.034, 14)
  cuffGeo.rotateX(Math.PI / 2)
  const cuff = new Mesh(cuffGeo, cuffMat)
  cuff.position.z = 0.046
  forearmPivot.add(cuff)

  const cuffEdgeGeo = new CylinderGeometry(0.0495, 0.0495, 0.007, 14)
  cuffEdgeGeo.rotateX(Math.PI / 2)
  const cuffEdge = new Mesh(cuffEdgeGeo, seamMat)
  cuffEdge.position.z = 0.030
  forearmPivot.add(cuffEdge)

  // Everything from the wrist out. Rolls independently of the forearm.
  const handPivot = new Object3D()
  root.add(handPivot)

  // Wrist, bridging the gap the pivot opens between cuff and palm.
  const wristGeo = new CylinderGeometry(0.040, 0.042, 0.036, 12)
  wristGeo.rotateX(Math.PI / 2)
  const wrist = new Mesh(wristGeo, gloveMat)
  wrist.position.z = 0.014
  handPivot.add(wrist)

  // Palm. Fingers run down -Z, palm faces -Y.
  const palm = new Mesh(
    new BoxGeometry(PALM_WIDTH, PALM_THICKNESS, PALM_LENGTH),
    gloveMat,
  )
  palm.position.z = -PALM_LENGTH / 2
  handPivot.add(palm)

  const digits: Digit[] = []

  // Four fingers, spread across the knuckle line and splayed slightly outward.
  const knuckleZ = -PALM_LENGTH
  for (let i = 0; i < FINGER_SEGMENTS.length; i += 1) {
    const spread = (i - 1.5) * (PALM_WIDTH / 4.1)
    const knuckle = new Object3D()
    knuckle.position.set(side * spread, 0, knuckleZ)
    // A little splay and a little droop, so a flat hand is not a rake.
    knuckle.rotation.y = side * (i - 1.5) * 0.045
    handPivot.add(knuckle)

    const segments = FINGER_SEGMENTS[i]
    const radius = FINGER_RADII[i]
    const joints = buildChain(knuckle, segments, radius, gloveMat)
    digits.push({ joints, limits: CURL_LIMITS })
  }

  // Thumb. Sits off the side of the palm and rotates across it.
  const thumbBase = new Object3D()
  thumbBase.position.set(side * (PALM_WIDTH / 2 - 0.004), 0.002, -PALM_LENGTH * 0.34)
  thumbBase.rotation.set(0.20, side * -0.95, side * -0.35)
  handPivot.add(thumbBase)
  const thumbJoints = buildChain(
    thumbBase,
    [THUMB_SEGMENTS[0], THUMB_SEGMENTS[1]],
    THUMB_RADIUS,
    gloveMat,
  )
  const thumb: Digit = { joints: thumbJoints, limits: [1.05, 0.95] }

  // Thumb first, to match FingerCurl.
  const ordered: Digit[] = [thumb, ...digits]

  return {
    root,
    setCurl(curl: FingerCurl): void {
      for (let d = 0; d < ordered.length; d += 1) {
        const digit = ordered[d]
        const amount = clamp01(curl[d])
        for (let j = 0; j < digit.joints.length; j += 1) {
          digit.joints[j].rotation.x = amount * digit.limits[j]
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

/**
 * Build a chain of segments running down -Z, each parented to the one before,
 * so rotating a joint carries everything past it. Returns the joints.
 */
function buildChain(
  parent: Object3D,
  lengths: readonly number[],
  radius: number,
  material: MeshStandardMaterial,
): Object3D[] {
  const joints: Object3D[] = []
  let attachTo = parent

  for (let i = 0; i < lengths.length; i += 1) {
    const length = lengths[i]
    // Taper toward the tip, the way a finger does.
    const segmentRadius = radius * (1 - i * 0.11)

    const joint = new Object3D()
    joint.position.z = i === 0 ? 0 : -lengths[i - 1]
    attachTo.add(joint)

    const geo = new CapsuleGeometry(segmentRadius, Math.max(length - segmentRadius, 0.001), 2, 8)
    // Capsules are built along +Y. Lay it along -Z.
    geo.rotateX(-Math.PI / 2)
    const mesh = new Mesh(geo, material)
    mesh.position.z = -length / 2
    joint.add(mesh)

    joints.push(joint)
    attachTo = joint
  }

  return joints
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}
