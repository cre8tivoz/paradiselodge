import { Group, Object3D } from 'three'
import type { Mesh } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/**
 * Crystal. Twelve hours dead, on the bed in room 1A.
 *
 * Geometry comes from public/models/crystal.glb. This file is the only one that
 * knows about the glTF. See the Crystal mesh section of CLAUDE.md.
 *
 * She is not a character controller and she has no update. She does not breathe,
 * she does not track, and nothing about her moves. Head, arm, needle and sling
 * are separate named nodes so an examine can land on each, and that is the whole
 * runtime.
 *
 * ## She is modelled standing and laid down here
 *
 * Every helper in `tools/blender/kit.py` lathes around Z and runs limbs down -Z,
 * so modelling her already horizontal would mean fighting the toolkit for no
 * gain. The pose is baked into the joints in Blender and the transform that puts
 * her on her back is here.
 *
 * **It is two nested groups on purpose.** Euler order makes a combined lay-down
 * and turn-along-the-bed ambiguous to read and easy to get wrong by 90 degrees.
 * `root` carries the yaw along the bed, `tilt` lays her on her back, and neither
 * rotation has to be reasoned about in terms of the other.
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
 * Her head, turned toward the sash so the left temple faces the light.
 *
 * BRIEF.md: the room is beautifully lit and everything in it happened at 2am in
 * the dark, and the one wound is on the left temple under the hair. If her head
 * were straight the wound would face the ceiling and the sun would do nothing
 * with it. Turned, the light rakes across it and the fringe still half hides it,
 * which is exactly the amount of help the player should get.
 *
 * In her own frame this is a yaw about her spine, which after the tilt is a roll
 * about Z.
 */
const HEAD_TURN = 0.62
const HEAD_TIP = 0.12

let templatePromise: Promise<Object3D> | undefined

export function loadCrystalTemplate(): Promise<Object3D> {
  if (templatePromise === undefined) {
    templatePromise = new GLTFLoader().loadAsync(MODEL_URL).then((gltf) => gltf.scene)
  }
  return templatePromise
}

export async function buildCrystalProp(): Promise<CrystalProp> {
  const template = await loadCrystalTemplate()
  const body = template

  body.traverse((object) => {
    const mesh = object as Mesh
    if (mesh.isMesh === true) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
  })

  const root = new Group()
  root.name = 'crystal'

  const tilt = new Group()
  tilt.name = 'crystal.tilt'
  tilt.rotation.x = Math.PI / 2
  tilt.add(body)
  root.add(tilt)

  const head = requireNode(body, 'head')
  head.rotation.z = HEAD_TURN
  head.rotation.x = HEAD_TIP

  return {
    root,
    head,
    // The arm the tie and the needle are on. `arm_l_0` is the shoulder, so the
    // lookable covers the whole limb, which is what the player aims at.
    arm: requireNode(body, 'arm_l_0'),
    needle: requireNode(body, 'needle'),
    sling: requireNode(body, 'sling'),
  }
}

function requireNode(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name)
  if (found === undefined) {
    throw new Error(`Crystal glTF is missing node "${name}"`)
  }
  return found
}
