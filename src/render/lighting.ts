import { AmbientLight, Color, DirectionalLight, Group, Vector3 } from 'three'
import { EXTERIOR, INTERIOR, ROOM_1A } from '../materials/palette.ts'

/**
 * Scene 1's light rig. One fixed 3pm sun and the fill that stands in for bounce.
 *
 * This used to live inside room1a.ts, which was right while room 1A was the
 * whole world and wrong the moment there was a building around it. A
 * DirectionalLight lights everything regardless of where it sits; only its
 * shadow camera is local. So the room-scoped rig was already lighting the
 * street, and its shadow volume was a seven metre box around one bedroom.
 *
 * One sun, one shadow camera over the lot.
 *
 * The direction is unchanged: it is the vector that put the beam across
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
  /** 3pm February, blown on purpose. Assign to `scene.background`. */
  readonly sky: Color
}

export function buildSceneLighting(): SceneLighting {
  const group = new Group()
  group.name = 'lighting'

  /*
   * Strong. A sash only lets a small patch in, and everything it does not touch
   * is carried by fill, so the beam has to sit well clear of the fill or there
   * is no beam, only a warm room.
   */
  const sun = new DirectionalLight(ROOM_1A.sunWarm, 8.0)
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
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.025
  // Not quite full, so shade keeps a little shape instead of going flat.
  sun.shadow.intensity = 0.85
  group.add(sun)
  group.add(sun.target)

  /*
   * Baked-feel fill, standing in for the bounce we do not compute. Nicotine
   * keeps the walls alive in shade, a little sun-warm on top so the afternoon
   * carries.
   *
   * Left high on purpose. Cutting fill to make the beam stand out is the wrong
   * instinct and was tried: it buys contrast and spends the whole room, and a
   * real sunlit interior is bright everywhere because light bounces. Raise the
   * sun to separate the beam, do not lower this.
   */
  group.add(new AmbientLight(INTERIOR.nicotine, 0.72))
  group.add(new AmbientLight(ROOM_1A.sunWarm, 0.28))

  return { group, sun, sky: new Color(EXTERIOR.sky) }
}
