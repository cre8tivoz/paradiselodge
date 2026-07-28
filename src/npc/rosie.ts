import {
  Box3,
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three'
import { ROSIE } from '../materials/palette.ts'

/**
 * Rosie Lodge. Rooted, smoking, mid fifties.
 *
 * Kit geometry against images/characters/rosie-sheet.png: heavy through the
 * middle, shoulder length red gone half grey, reading glasses pushed up on her
 * head, the hand-knitted cardigan worn open over a plain shirt, dark skirt
 * below the knee, flat shoes. Cigarette held low in her right hand in every
 * view of the sheet, so it is lit here and it stays lit.
 *
 * She is rooted. There is no pathing and no follow, and there is not going to
 * be: she is in one place per beat and the geometry does the rest.
 */

export interface RosieNpc {
  readonly root: Group
  /** What the look raycast and the talk verb hit. */
  readonly body: Object3D
  /** Cylinder footprint so Miller cannot walk through her. */
  readonly solid: Box3
  /** Idle. Breathing, a slow weight shift, and the cigarette working down. */
  update(elapsed: number): void
}

export function buildRosie(): RosieNpc {
  const skin = mat(ROSIE.skin, 0.72)
  const hairRed = mat(ROSIE.hairRed, 0.82)
  const hairGrey = mat(ROSIE.hairGrey, 0.85)
  const tan = mat(ROSIE.cardiganTan, 0.95)
  const mustard = mat(ROSIE.cardiganMustard, 0.95)
  const burgundy = mat(ROSIE.cardiganBurgundy, 0.95)
  const brown = mat(ROSIE.cardiganBrown, 0.95)
  const shirt = mat(ROSIE.shirt, 0.88)
  const skirt = mat(ROSIE.skirt, 0.9)
  const shoe = mat(ROSIE.shoe, 0.7)
  const glassesMat = mat(ROSIE.glasses, 0.4)
  const cig = mat(ROSIE.cigarette, 0.85)

  const root = new Group()
  root.name = 'rosie'

  // Built facing +Z: the cardigan fronts are on +Z. That puts her right hand
  // at -X, which is where the cigarette goes.
  const body = new Group()
  body.name = 'rosie.body'
  root.add(body)

  // Shoes and shins. The skirt sits below the knee, so only shins show.
  for (const side of [-1, 1]) {
    const foot = new Mesh(new CapsuleGeometry(0.045, 0.11, 3, 8), shoe)
    foot.rotation.x = Math.PI / 2
    foot.position.set(side * 0.09, 0.045, 0.01)
    foot.castShadow = true
    body.add(foot)

    const shin = new Mesh(new CapsuleGeometry(0.052, 0.20, 3, 8), skin)
    shin.position.set(side * 0.09, 0.24, 0)
    shin.castShadow = true
    body.add(shin)
  }

  // Skirt, A-line to below the knee.
  const skirtMesh = new Mesh(new CylinderGeometry(0.20, 0.27, 0.54, 14, 1, true), skirt)
  skirtMesh.position.set(0, 0.66, 0)
  skirtMesh.castShadow = true
  skirtMesh.material.side = 2
  body.add(skirtMesh)

  // Torso. Heavy through the middle, per the sheet.
  const torso = new Mesh(new CapsuleGeometry(0.185, 0.24, 5, 12), shirt)
  torso.position.set(0, 1.10, 0)
  torso.scale.set(1, 1, 0.86)
  torso.castShadow = true
  body.add(torso)

  /*
   * The cardigan, worn open. Back panel plus two front panels with a gap, so
   * the shirt shows down the middle the way it does in all three views. Patches
   * in the other three yarns, because a single colour would read as a coat.
   */
  const cardigan = new Group()
  const back = new Mesh(new BoxGeometry(0.40, 0.60, 0.07), tan)
  back.position.set(0, 1.10, -0.15)
  back.castShadow = true
  cardigan.add(back)

  for (const side of [-1, 1]) {
    const front = new Mesh(new BoxGeometry(0.155, 0.60, 0.07), tan)
    front.position.set(side * 0.13, 1.10, 0.145)
    front.castShadow = true
    cardigan.add(front)

    const flank = new Mesh(new BoxGeometry(0.075, 0.60, 0.30), tan)
    flank.position.set(side * 0.205, 1.10, 0)
    flank.castShadow = true
    cardigan.add(flank)
  }

  // Clashing patches.
  cardigan.add(patch(burgundy, -0.13, 1.24, 0.185, 0.13, 0.16))
  cardigan.add(patch(mustard, 0.13, 1.16, 0.185, 0.12, 0.20))
  cardigan.add(patch(brown, -0.13, 0.98, 0.185, 0.13, 0.13))
  cardigan.add(patch(mustard, -0.207, 1.05, 0, 0.02, 0.18, 0.22))
  cardigan.add(patch(burgundy, 0.207, 1.22, 0, 0.02, 0.14, 0.20))
  body.add(cardigan)

  // Arms. Cardigan sleeves down to the wrist, hands bare.
  const arms: Object3D[] = []
  for (const side of [-1, 1]) {
    const arm = new Group()
    const upper = new Mesh(new CapsuleGeometry(0.056, 0.17, 3, 8), tan)
    upper.position.set(0, -0.13, 0)
    upper.castShadow = true
    arm.add(upper)

    const sleevePatch = new Mesh(new BoxGeometry(0.115, 0.10, 0.115), side < 0 ? burgundy : mustard)
    sleevePatch.position.set(0, -0.17, 0)
    arm.add(sleevePatch)

    const fore = new Mesh(new CapsuleGeometry(0.05, 0.16, 3, 8), tan)
    fore.position.set(0, -0.36, 0.015)
    fore.castShadow = true
    arm.add(fore)

    const hand = new Mesh(new SphereGeometry(0.048, 8, 8), skin)
    hand.scale.set(1, 1.15, 0.8)
    hand.position.set(0, -0.50, 0.02)
    hand.castShadow = true
    arm.add(hand)

    arm.position.set(side * 0.262, 1.30, 0.01)
    arm.rotation.z = side * -0.10
    body.add(arm)
    arms.push(arm)

    // Cigarette in her right hand, low. Facing +Z, her right is -X.
    if (side === -1) {
      const stick = new Mesh(new CylinderGeometry(0.0045, 0.0045, 0.07, 6), cig)
      stick.rotation.set(0.25, 0, -0.5)
      stick.position.set(-0.03, -0.53, 0.05)
      arm.add(stick)

      const emberMat = new MeshStandardMaterial({
        color: ROSIE.ember,
        emissive: ROSIE.ember,
        emissiveIntensity: 1.4,
        roughness: 0.9,
      })
      const ember = new Mesh(new CylinderGeometry(0.0048, 0.0048, 0.008, 6), emberMat)
      ember.rotation.copy(stick.rotation)
      ember.position.set(-0.047, -0.562, 0.062)
      arm.add(ember)
      Reflect.set(root.userData, 'ember', emberMat)
    }
  }

  // Neck and head.
  const neck = new Mesh(new CylinderGeometry(0.045, 0.052, 0.07, 8), skin)
  neck.position.set(0, 1.40, 0)
  body.add(neck)

  const head = new Group()
  head.name = 'rosie.head'
  const skull = new Mesh(new SphereGeometry(0.105, 14, 12), skin)
  skull.scale.set(0.94, 1.06, 0.98)
  skull.castShadow = true
  head.add(skull)

  // Shoulder-length, red gone half grey. Grey shell under a red outer.
  const hairBack = new Mesh(new SphereGeometry(0.118, 14, 12), hairGrey)
  hairBack.scale.set(1.0, 1.0, 0.95)
  hairBack.position.set(0, 0.012, -0.012)
  hairBack.castShadow = true
  head.add(hairBack)

  const hairOuter = new Mesh(new SphereGeometry(0.121, 14, 12), hairRed)
  hairOuter.scale.set(0.99, 0.92, 0.9)
  hairOuter.position.set(0, 0.028, -0.028)
  hairOuter.castShadow = true
  head.add(hairOuter)

  for (const side of [-1, 1]) {
    const fall = new Mesh(new CapsuleGeometry(0.043, 0.10, 3, 8), hairRed)
    fall.position.set(side * 0.092, -0.07, -0.035)
    fall.castShadow = true
    head.add(fall)
  }

  // Reading glasses pushed up on her head, in all three views of the sheet.
  const glasses = new Mesh(new CylinderGeometry(0.106, 0.106, 0.022, 14, 1, true), glassesMat)
  glasses.rotation.x = Math.PI / 2
  glasses.rotation.z = 0.06
  glasses.position.set(0, 0.075, -0.01)
  glasses.material.side = 2
  head.add(glasses)

  head.position.set(0, 1.50, 0)
  body.add(head)

  // Footprint. A little generous so Miller stops before he is inside her.
  const solid = new Box3(new Vector3(-0.30, 0, -0.28), new Vector3(0.30, 1.65, 0.28))

  const emberMat = Reflect.get(root.userData, 'ember') as MeshStandardMaterial | undefined

  return {
    root,
    body,
    solid,
    update(elapsed: number): void {
      // Breathing.
      const breath = Math.sin(elapsed * 1.15)
      torso.scale.set(1, 1 + breath * 0.012, 0.86 + breath * 0.008)
      head.position.y = 1.50 + breath * 0.004

      // Slow weight shift. She has been standing here a while.
      const shift = Math.sin(elapsed * 0.31)
      body.rotation.z = shift * 0.012
      body.position.x = shift * 0.008

      // A slow look around the room, never far.
      head.rotation.y = Math.sin(elapsed * 0.23) * 0.16
      head.rotation.x = Math.sin(elapsed * 0.19) * 0.05

      // The cigarette hand drifts. The ember breathes with it.
      arms[0].rotation.x = Math.sin(elapsed * 0.41) * 0.05 - 0.03
      if (emberMat !== undefined) {
        emberMat.emissiveIntensity = 1.25 + Math.sin(elapsed * 2.3) * 0.25
      }
    },
  }
}

function patch(
  material: MeshStandardMaterial,
  x: number,
  y: number,
  z: number,
  depth: number,
  height: number,
  width = 0.12,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), material)
  mesh.position.set(x, y, z)
  return mesh
}

function mat(color: number, roughness: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness })
}
