import { Group, Mesh, MeshBasicMaterial, BoxGeometry, Object3D } from 'three'
import type { MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { tiled } from '../materials/textures.ts'

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
    if (mesh.isMesh !== true) {
      return
    }
    mesh.castShadow = true
    mesh.receiveShadow = true
    // Cream dress and pale skin blow to mannequin-white under the 3pm sun.
    // Force the authored palette onto every mesh so a missing material name
    // cannot leave her unlit-looking.
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials) {
      const std = material as MeshStandardMaterial
      if (std.isMeshStandardMaterial !== true || std.color === undefined) {
        continue
      }
      const name = (std.name ?? '').toLowerCase()
      if (name.includes('dress') || name.includes('shoe')) {
        std.color.setHex(0xffffff)
        std.map = tiled('crystal-dress', 3, 4)
        std.roughness = 0.88
      } else if (name.includes('hair')) {
        std.color.setHex(0x7a6a52)
        std.roughness = 0.84
      } else if (name.includes('livid') || name.includes('bruise')) {
        std.color.setHex(0x6f5f66)
        std.roughness = 0.78
      } else if (name.includes('sling') || name.includes('rubber')) {
        std.color.setHex(0x1a1817)
        std.roughness = 0.55
      } else if (name.includes('gold') || name.includes('bracelet')) {
        std.color.setHex(0xb89650)
        std.metalness = 0.55
        std.roughness = 0.4
      } else {
        // Skin and anything unnamed.
        std.color.setHex(0x8f7d6e)
        std.roughness = 0.74
      }
      std.needsUpdate = true
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
  attachLookPad(head, 0.28, 0.28, 0.28)

  const arm = requireNode(body, 'arm_l_0')
  attachLookPad(arm, 0.18, 0.22, 0.35)

  const needle = requireNode(body, 'needle')
  attachLookPad(needle, 0.14, 0.14, 0.22)

  const sling = requireNode(body, 'sling')
  attachLookPad(sling, 0.22, 0.16, 0.22)

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
