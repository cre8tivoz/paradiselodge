import { DirectionalLight, Group, Vector3 } from 'three'
import { ROOM_1A } from '../materials/palette.ts'

/**
 * Scene 1's light rig. One fixed 3pm sun. That is the whole file now.
 *
 * There used to be two AmbientLights and a HemisphereLight in here standing in
 * for bounce. They are gone: `render/environment.ts` loads an HDRI and every
 * surface in the scene now takes its fill from that instead. Flat ambient has
 * no direction, so a wall facing the window and a wall facing away from it were
 * lit identically and the room had no shape in it anywhere the sun did not
 * reach. An environment map has both direction and colour, which is most of the
 * difference between a render and a photograph.
 *
 * Do not add an AmbientLight back to lift the shade. If the shade is too dark
 * that is `scene.environmentIntensity`, and if it is the wrong colour that is
 * the wrong HDRI.
 *
 * The sun direction is unchanged: it is the vector that put the beam across
 * Crystal's bed, carried into world space now that 1A is rotated into the
 * building. Room 1A's sash faces +X, so the sun comes from the front right.
 */

/** Where the rig aims. Roughly the middle of the lodge. */
const FOCUS = new Vector3(0, 1.8, 4.4)

/** Unit vector the light travels along. From the front right, low and warm. */
const DIRECTION = new Vector3(-0.847, -0.365, 0.4).normalize()

/** How far back the light sits. Only affects where the shadow camera sits. */
const DISTANCE = 26

/**
 * Half-extent of the shadow camera, in metres. Has to cover the lodge, the
 * verandah side, and the approach out to the road.
 *
 * Texel size is 2 * EXTENT / mapSize. At 16 and 4096 that is 7.8mm, which is
 * what room 1A had at 7 and 2048. Change one, check the other.
 */
const SHADOW_EXTENT = 16

export interface SceneLighting {
  readonly group: Group
  readonly sun: DirectionalLight
}

export function buildSceneLighting(): SceneLighting {
  const group = new Group()
  group.name = 'lighting'

  /*
   * Direct sun only. The environment carries everything it does not touch, so
   * this no longer has to be loud enough to out-shout a pile of ambient: it has
   * to be the right stop above the sky, which is roughly the ratio a real
   * afternoon has between a sunlit patch of floor and the shaded floor beside
   * it.
   */
  const sun = new DirectionalLight(ROOM_1A.sunWarm, 4.2)
  sun.position.copy(FOCUS).addScaledVector(DIRECTION, -DISTANCE)
  sun.target.position.copy(FOCUS)
  sun.castShadow = true
  sun.shadow.mapSize.set(4096, 4096)
  sun.shadow.camera.left = -SHADOW_EXTENT
  sun.shadow.camera.right = SHADOW_EXTENT
  sun.shadow.camera.top = SHADOW_EXTENT
  sun.shadow.camera.bottom = -SHADOW_EXTENT
  sun.shadow.camera.near = 2
  sun.shadow.camera.far = DISTANCE + SHADOW_EXTENT * 2
  sun.shadow.bias = -0.00035
  sun.shadow.normalBias = 0.04
  group.add(sun)
  group.add(sun.target)

  return { group, sun }
}
