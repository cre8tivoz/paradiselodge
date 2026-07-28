import {
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from 'three'
import { ROOM_1A } from '../materials/palette.ts'

/**
 * Crystal as a prop. Twelve hours dead. Segmented kit geometry against
 * images/characters/crystal-sheet.png — petite, cream dress, blonde.
 *
 * She is not a character controller. She does not move. Head, arm, needle and
 * sling are separate lookables so examine can land on each.
 */

export interface CrystalProp {
  readonly root: Group
  readonly head: Object3D
  readonly arm: Object3D
  readonly needle: Object3D
  readonly sling: Object3D
}

const SKIN = 0xc4a484
const HAIR = 0xc9a86c
const DRESS = ROOM_1A.crystalDress
const RUBBER = 0x2a2a2a
const STEEL = 0xb0b0b0

export function buildCrystalProp(): CrystalProp {
  const dress = mat(DRESS, 0.75)
  const skin = mat(SKIN, 0.65)
  const hair = mat(HAIR, 0.7)
  const rubber = mat(RUBBER, 0.55)
  const steel = mat(STEEL, 0.35)

  const root = new Group()
  root.name = 'crystal'

  // Lying on her back along +Z (toward the sash). Head at -Z (headboard).
  const torso = new Mesh(new CapsuleGeometry(0.14, 0.32, 4, 8), dress)
  torso.rotation.z = Math.PI / 2
  torso.position.set(0, 0.14, 0.05)
  torso.castShadow = true
  root.add(torso)

  const hips = new Mesh(new CapsuleGeometry(0.13, 0.12, 4, 8), dress)
  hips.rotation.z = Math.PI / 2
  hips.position.set(0, 0.12, 0.38)
  hips.castShadow = true
  root.add(hips)

  // Legs toward the foot of the bed (+Z).
  for (const side of [-1, 1]) {
    const thigh = new Mesh(new CapsuleGeometry(0.055, 0.28, 3, 8), skin)
    thigh.rotation.z = Math.PI / 2
    thigh.position.set(side * 0.07, 0.09, 0.72)
    thigh.castShadow = true
    root.add(thigh)
    const shin = new Mesh(new CapsuleGeometry(0.045, 0.26, 3, 8), skin)
    shin.rotation.z = Math.PI / 2
    shin.position.set(side * 0.07, 0.08, 1.05)
    shin.castShadow = true
    root.add(shin)
  }

  // Left arm (her left, -X) across the torso — sling and needle land here.
  const arm = new Group()
  arm.name = 'crystal.arm'
  const upper = new Mesh(new CapsuleGeometry(0.04, 0.18, 3, 8), skin)
  upper.rotation.z = Math.PI / 2
  upper.position.set(-0.22, 0.16, 0.02)
  upper.rotation.y = 0.35
  upper.castShadow = true
  arm.add(upper)
  const forearm = new Mesh(new CapsuleGeometry(0.035, 0.16, 3, 8), skin)
  forearm.rotation.z = Math.PI / 2
  forearm.position.set(-0.38, 0.14, 0.12)
  forearm.rotation.y = 0.55
  forearm.castShadow = true
  arm.add(forearm)
  root.add(arm)

  // Right arm by her side.
  const rightArm = new Mesh(new CapsuleGeometry(0.038, 0.34, 3, 8), skin)
  rightArm.rotation.z = Math.PI / 2
  rightArm.position.set(0.22, 0.12, 0.15)
  rightArm.castShadow = true
  root.add(rightArm)

  // Head, turned toward the window (+Z / +X a little) so the left temple faces the light.
  const head = new Group()
  head.name = 'crystal.head'
  const skull = new Mesh(new SphereGeometry(0.105, 12, 10), skin)
  skull.scale.set(0.92, 1.05, 1.0)
  skull.castShadow = true
  head.add(skull)
  const hairMesh = new Mesh(new SphereGeometry(0.112, 12, 10), hair)
  hairMesh.scale.set(0.95, 0.7, 1.05)
  hairMesh.position.set(0, 0.04, -0.02)
  hairMesh.castShadow = true
  head.add(hairMesh)
  head.position.set(0.02, 0.22, -0.28)
  head.rotation.set(0.15, 0.55, 0.1)
  root.add(head)

  // Rubber tie on the upper left arm.
  const sling = new Mesh(new CylinderGeometry(0.048, 0.048, 0.025, 12), rubber)
  sling.name = 'crystal.sling'
  sling.rotation.z = Math.PI / 2
  sling.position.set(-0.22, 0.16, -0.02)
  sling.castShadow = true
  root.add(sling)

  // Syringe in the crook — seated, wrong angle. Do not make it look careful.
  const needle = new Group()
  needle.name = 'crystal.needle'
  const barrel = new Mesh(new CylinderGeometry(0.008, 0.008, 0.07, 8), steel)
  barrel.position.set(0, 0.02, 0)
  needle.add(barrel)
  const plunger = new Mesh(new CylinderGeometry(0.012, 0.012, 0.015, 8), mat(0xd8d8d8, 0.5))
  plunger.position.set(0, 0.055, 0)
  needle.add(plunger)
  const tip = new Mesh(new CylinderGeometry(0.0015, 0.004, 0.035, 6), steel)
  tip.position.set(0, -0.045, 0)
  needle.add(tip)
  needle.position.set(-0.34, 0.15, 0.1)
  needle.rotation.set(0.9, 0.4, 1.1)
  needle.castShadow = true
  root.add(needle)

  return { root, head, arm, needle, sling }
}

function mat(color: number, roughness: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness })
}
