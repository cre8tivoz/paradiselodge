import { Group, Mesh, MeshBasicMaterial, BoxGeometry, Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { prepareCharacterLook } from '../npc/character-look.ts'

/**
 * Crystal. Twelve hours dead, on the bed in room 1A.
 *
 * Geometry comes from public/models/crystal.glb, generated from
 * images/characters/crystal-sheet.png. This file is the only one that knows
 * about the glTF. See the Characters section of CLAUDE.md.
 *
 * She is not a character controller and she has no update. She does not breathe,
 * she does not track, and nothing about her moves. Head, arm, needle and sling
 * are separate named nodes so an examine can land on each, and that is the whole
 * runtime.
 *
 * ## She is built standing and laid down here
 *
 * The cast rig is generated upright (+Y up, -Z forward, -X left) and laid flat
 * onto her back by `tilt` (`rotation.x = Math.PI / 2`), with `root` carrying yaw
 * along the bed so neither rotation has to be reasoned about together.
 *
 * After the tilt:
 *
 * - her standing up axis runs along **+Z**, so she lies down the bed
 * - her standing forward axis becomes **+Y**, so she is on her back
 * - a point at standing height `h` sits at `z = h` from the root
 * - her back is 0.13 **below** the root, which is why the root sits at spine
 *   height and not at the mattress
 */

const MODEL_URL = '/models/crystal.glb'

export interface CrystalProp {
  readonly root: Group
  readonly head: Object3D
  readonly arm: Object3D
  readonly needle: Object3D
  readonly sling: Object3D
}

/**
 * Half her body depth. The root lands on her spine, so this is how far the root
 * has to sit above whatever she is lying on.
 */
export const CRYSTAL_SPINE_OFFSET = 0.13

/** Head to heel, for placing her against the head of the bed. */
export const CRYSTAL_LENGTH = 1.62

/**
 * Her head, turned about her spine so the left temple (-X in standing frame)
 * rises toward the sash light and observer side while remaining partly under hair.
 */
const HEAD_TURN = 0.58
const HEAD_TIP = 0.08

export function loadCrystalTemplate(): Promise<Object3D> {
  return new GLTFLoader().loadAsync(MODEL_URL).then((gltf) => gltf.scene)
}

export async function buildCrystalProp(): Promise<CrystalProp> {
  const body = await loadCrystalTemplate()

  prepareCharacterLook(body, {
    contactShadow: false,
    roughness: 0.78,
    rimStrength: 0.2,
  })

  const root = new Group()
  root.name = 'crystal'

  const tilt = new Group()
  tilt.name = 'crystal.tilt'
  tilt.rotation.x = Math.PI / 2
  tilt.add(body)
  root.add(tilt)

  const head = requireNode(body, 'head')
  head.rotation.z = 0
  head.rotation.y = -HEAD_TURN
  head.rotation.x = HEAD_TIP
  attachLookPad(head, 0.45, 0.4, 0.4)

  /*
   * The arm carries no pad.
   *
   * It used to have the biggest one on her, 0.28 by 0.35 by 0.55 hung off the
   * shoulder, and the arm is not a registered lookable: every hit on it walked
   * up to the root and came back as the generic body. So it sat over the needle
   * and the sling, which are the two things actually worth aiming at down there,
   * and answered for both of them with "a woman on the bed".
   *
   * Measured over three stances beside the bed, sweeping yaw and pitch: taking
   * it out moved the temple from 71 aim cells to 132 and the sling from 29 to
   * 46, and cost nothing, because the body is a whole person and needs no help
   * being hit.
   */
  const arm = requireNode(body, 'arm_l_0')

  /*
   * The needle and the sling are about fifteen centimetres apart on the same
   * forearm, so their pads are sized against each other rather than separately.
   * Grow one and it eats the other: at 2x the needle took the sling to zero.
   *
   * These two are 1.35x and 1.2x of what they were, which came out of a grid
   * sweep as the pair that lifts both without either winning. Needle 30 cells
   * to 54, sling 29 to 51.
   *
   * The needle is the one that had to move. Gate 1 needs it filed, and a target
   * you can only hit from 1% of where you might be looking is a fail state for
   * anybody who does not already know it is there.
   */
  const needle = requireNode(body, 'needle')
  attachLookPad(needle, 0.30, 0.30, 0.47)

  const sling = requireNode(body, 'sling')
  attachLookPad(sling, 0.42, 0.34, 0.42)

  return {
    root,
    head,
    arm,
    needle,
    sling,
  }
}

/** Invisible volume so a small mesh still wins the look ray. */
function attachLookPad(parent: Object3D, sx: number, sy: number, sz: number): void {
  const pad = new Mesh(
    new BoxGeometry(sx, sy, sz),
    new MeshBasicMaterial({ visible: false, depthWrite: false }),
  )
  pad.name = `${parent.name}.lookPad`
  parent.add(pad)
}

function requireNode(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name)
  if (found === undefined) {
    throw new Error(`Crystal glTF is missing node "${name}"`)
  }
  return found
}
