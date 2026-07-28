import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { EXTERIOR, INTERIOR } from '../materials/palette.ts'
import type { Surface } from '../core/events.ts'
import type { WalkableRegion } from './collision.ts'

/**
 * The Paradise Lodge: the approach and the ground floor, plus the staircase and
 * the first-floor hall that room 1A opens off.
 *
 * BRIEF.md cold open: marble steps, neon sign, in through the front door,
 * parlour to the left, reception to the right, central staircase, turn right
 * at the top to 1A. This is the route in and the route back down, so it is
 * built as one piece of geometry rather than a room at a time.
 *
 * Kit primitives against the locked palette, like room 1A. Everything here is
 * scaffolding until modelled pieces land.
 *
 * ## Plan
 *
 * -Z is the street. +X is the side the verandah wraps onto, which is where 1A's
 * sash looks and where the 3pm sun comes from.
 *
 * ```
 *              x -6.5          -1.7   0   1.7          +6.4
 *   z = -1.75   .. footpath, marble steps, police tape ..
 *   z =  0      +---------------+------+---------------+
 *               |               |      |               |
 *               |    PARLOUR    | HALL |   RECEPTION   |
 *   z =  5.0    +---------------+      +---------------+
 *                               | STAIR| passage
 *   z = 10.5                    +------+
 * ```
 *
 * The flight climbs the -X half of the hall toward the back, so the passage
 * runs beside it rather than under it, and the stairwell above is open on that
 * side. At the top you turn around, walk back toward the street, and 1A is the
 * first door on the right.
 */

export interface Lodge {
  readonly group: Group
  readonly solids: Box3[]
  readonly floors: WalkableRegion[]
  /** On the footpath, facing the steps. Where the cold open will start. */
  readonly spawn: Vector3
  readonly spawnYaw: number
  readonly props: {
    readonly frontDoor: Object3D
    readonly neon: Object3D
    readonly tape: Object3D
    readonly steps: Object3D
    readonly stairs: Object3D
    readonly desk: Object3D
    readonly keyRack: Object3D
    readonly ledger: Object3D
    readonly phone: Object3D
    readonly ashtray: Object3D
    readonly armchair: Object3D
    readonly parlourTable: Object3D
    readonly television: Object3D
    readonly standardLamp: Object3D
  }
  /** One tube in the sign is crook. Called once a frame with elapsed seconds. */
  update(elapsed: number): void
}

// --- Plan ---

const HALL_X0 = -1.75
const HALL_X1 = 1.75
/**
 * The flight, and the stairwell open above it, sit in x < STAIR_EDGE. The
 * passage runs beside it in the rest of the hall, which is what stops the route
 * to the foot of the stairs going underneath them.
 */
const STAIR_EDGE = -0.3
const STAIR_X0 = -1.7

const FRONT = -0.1
const BACK = 10.5
/** Back of the parlour and reception. The stair hall carries on past it. */
const ROOM_BACK = 5.05

const LEFT = -6.5
const RIGHT = 6.4

// --- Section ---

const GROUND = 0
const CEIL_GROUND = 3.2
const FIRST = 3.45
const CEIL_FIRST = 6.5
const PARAPET = 6.9

/** Footpath. The marble steps are the difference between this and the floor. */
const PATH = -0.72
const ROAD = -0.85

const INT = 0.14

const DOOR_H = 2.15
const OPENING_W = 1.15

// --- Staircase ---

/**
 * Eighteen risers to the first floor, seventeen of them treads. The last riser
 * steps onto the landing.
 *
 * `RISE` has to stay under `PLAYER.stepUp` or the flight becomes a wall, and
 * over half of `PLAYER.stepDown` or coming down skips a tread.
 */
const TREADS = 17
const RISE = FIRST / 18
const GOING = 0.28
const STAIR_Z0 = 5.2
const STAIR_Z1 = STAIR_Z0 + TREADS * GOING

export function buildLodge(): Lodge {
  const group = new Group()
  group.name = 'lodge'
  const solids: Box3[] = []
  const floors: WalkableRegion[] = []

  const render = mat(EXTERIOR.renderCream, 0.94)
  const stain = mat(EXTERIOR.renderStain, 0.96)
  const marble = mat(EXTERIOR.marbleStep, 0.5)
  const iron = mat(EXTERIOR.ironLace, 0.55, 0.4)
  const bitumen = mat(EXTERIOR.bitumen, 0.62)
  const nicotine = mat(INTERIOR.nicotine, 0.95)
  const carpet = mat(INTERIOR.carpetBrown, 0.98)
  const timber = mat(INTERIOR.timberDark, 0.76)
  const brass = mat(INTERIOR.brassVerdigris, 0.42, 0.55)
  const maroon = mat(INTERIOR.curtainMaroon, 0.9)
  const tapeBlue = mat(EXTERIOR.tapeBlue, 0.8)

  // === The street ===

  slab(group, bitumen, -22, 22, ROAD - 0.4, ROAD, -26, FRONT - 0.35).receiveShadow = true
  walk(floors, 'bitumen', -20, 20, -24, -1.45, ROAD)

  // Footpath, kerb proud of the road.
  slab(group, marble, -14, 14, PATH - 0.35, PATH, -4.0, FRONT - 0.35)
  walk(floors, 'bitumen', -13.8, 13.8, -3.95, -1.4, PATH)

  // === Marble steps ===
  // Four risers from the footpath to the threshold. Worn hollow at the centre
  // is a texture job, not geometry, so they are square for now.

  const steps = new Group()
  steps.name = 'steps'
  group.add(steps)
  for (let i = 0; i < 4; i += 1) {
    // Highest against the wall, stepping down toward the footpath.
    const top = GROUND - i * ((GROUND - PATH) / 4)
    const z1 = FRONT - 0.35 - i * 0.35
    const z0 = z1 - 0.35
    slab(steps, marble, -1.7, 1.7, top - 0.4, top, z0, z1)
    walk(floors, 'marble', -1.65, 1.65, z0, z1, top)
  }
  // Cheek walls either side, so the flight reads as a flight.
  wall(group, solids, marble, -2.05, -1.68, PATH - 0.1, GROUND + 0.55, -1.75, FRONT - 0.35)
  wall(group, solids, marble, 1.68, 2.05, PATH - 0.1, GROUND + 0.55, -1.75, FRONT - 0.35)

  // === Police tape ===
  // Already parted at the centre. Two uniforms lifted it and the cold open at
  // step 15 will animate that; until then the gap is the staging.

  const tape = new Group()
  tape.name = 'tape'
  group.add(tape)
  for (const [x0, x1] of [
    [-4.6, -0.95],
    [0.95, 4.6],
  ] as const) {
    slab(tape, tapeBlue, x0, x1, PATH + 0.94, PATH + 1.02, -2.35, -2.32)
    for (const x of [x0, x1]) {
      slab(tape, iron, x - 0.03, x + 0.03, PATH, PATH + 1.15, -2.36, -2.3)
    }
  }

  // === Exterior shell ===
  // Rendered Victorian, sun-bleached, damp rising up the front.

  /*
   * Front elevation. Built as piers between openings rather than as three
   * boxes, because a facade with only a door in it reads as a wall with a hole,
   * not a house.
   *
   * The ground-floor windows are real openings: the sun comes from the front
   * right, so they are the only daylight the parlour and reception get, and
   * without them both rooms are lit by fill alone and go flat.
   */
  const frontZ0 = FRONT - 0.35
  const frontZ1 = FRONT - 0.1
  const SILL = 0.95
  const HEAD = 2.75

  /*
   * The first-floor opening is room 1A's street window. It sits inside the
   * head over the reception window, which is why the elevation is built by
   * scanline and not as piers: openings here stack as well as sit side by side.
   *
   * Keep FIRST_WINDOW in step with FRONT_WINDOW_* in room1a.ts. This is the
   * hole in the outside wall; that is the hole in the room's own wall, and they
   * have to be the same hole.
   */
  const FIRST_WINDOW = { x0: 2.55, x1: 3.65, y0: 4.32, y1: 6.08 }

  /*
   * Three bays and a centred entrance. The upstairs windows sit directly over
   * the downstairs ones, because they are meant to be the same house twice and
   * a facade where they do not line up reads as a mistake before it reads as
   * anything else.
   */
  const BAYS = [-5.9, -3.6, 2.55] as const
  const BAY_WIDTH = 1.1

  const openings = [
    { x0: BAYS[0], x1: BAYS[0] + BAY_WIDTH, y0: SILL, y1: HEAD, glazed: true },
    { x0: BAYS[1], x1: BAYS[1] + BAY_WIDTH, y0: SILL, y1: HEAD, glazed: true },
    { x0: -0.62, x1: 0.62, y0: PATH - 0.4, y1: DOOR_H, glazed: false },
    { x0: BAYS[2], x1: BAYS[2] + BAY_WIDTH, y0: SILL, y1: HEAD, glazed: true },
  ] as const

  elevation(group, solids, render, LEFT - 0.25, RIGHT + 0.25, PATH - 0.4, PARAPET, frontZ0, frontZ1, [
    ...openings,
    FIRST_WINDOW,
  ])

  // Rising damp. Unlit-flat would be wrong; it is a stain on render.
  slab(group, stain, LEFT - 0.25, RIGHT + 0.25, PATH - 0.4, PATH + 0.72, frontZ0 - 0.01, frontZ0)

  /*
   * Glass, not board. Same trap as room 1A's sash: a solid pane makes the
   * window an opaque black rectangle and, worse, a shadow caster, so the room
   * behind it gets nothing.
   */
  const glass = new MeshBasicMaterial({
    color: 0xf6efe0,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  })

  for (const o of openings) {
    if (!o.glazed) {
      continue
    }
    const mid = (o.y0 + o.y1) / 2
    const pane = new Mesh(new BoxGeometry(o.x1 - o.x0 - 0.1, o.y1 - o.y0 - 0.08, 0.012), glass)
    pane.position.set((o.x0 + o.x1) / 2, mid, frontZ1 - 0.06)
    group.add(pane)
    // Meeting rail and stiles, so the joinery still reads through clear glass.
    slab(group, timber, o.x0 + 0.05, o.x1 - 0.05, mid - 0.03, mid + 0.03, frontZ1 - 0.09, frontZ1 - 0.03)
    slab(group, timber, o.x0, o.x0 + 0.06, o.y0, o.y1, frontZ1 - 0.09, frontZ1 - 0.03)
    slab(group, timber, o.x1 - 0.06, o.x1, o.y0, o.y1, frontZ1 - 0.09, frontZ1 - 0.03)
    // Sill, proud of the render.
    slab(group, marble, o.x0 - 0.12, o.x1 + 0.12, o.y0 - 0.09, o.y0, frontZ0 - 0.08, frontZ1)
    // Curtains, hung either side and sun-rotted at the leading edge.
    slab(group, maroon, o.x0 - 0.2, o.x0 + 0.16, o.y0 - 0.1, o.y1 + 0.2, FRONT, FRONT + 0.12)
    slab(group, maroon, o.x1 - 0.16, o.x1 + 0.2, o.y0 - 0.1, o.y1 + 0.2, FRONT, FRONT + 0.12)
  }

  /*
   * The other two first-floor windows are applied, not cut. At 3pm an unlit
   * upstairs room photographs as a black rectangle from the street, which is
   * exactly what these are, so there is nothing behind them worth a hole.
   *
   * 1A's is the real one, and it only gets a surround here.
   */
  for (const x0 of BAYS) {
    const x1 = x0 + BAY_WIDTH
    const cut = x0 === FIRST_WINDOW.x0
    slab(group, marble, x0 - 0.12, x1 + 0.12, FIRST_WINDOW.y0 - 0.1, FIRST_WINDOW.y0, frontZ0 - 0.16, frontZ0)
    slab(group, timber, x0 - 0.09, x0, FIRST_WINDOW.y0, FIRST_WINDOW.y1, frontZ0 - 0.08, frontZ0)
    slab(group, timber, x1, x1 + 0.09, FIRST_WINDOW.y0, FIRST_WINDOW.y1, frontZ0 - 0.08, frontZ0)
    slab(group, timber, x0 - 0.09, x1 + 0.09, FIRST_WINDOW.y1, FIRST_WINDOW.y1 + 0.1, frontZ0 - 0.08, frontZ0)
    if (!cut) {
      slab(group, mat(0x2a2620, 0.35, 0.1), x0, x1, FIRST_WINDOW.y0, FIRST_WINDOW.y1, frontZ0 - 0.02, frontZ0)
    }
  }

  // Sides and back. The right side stops short of 1A's sash: that opening is in
  // room 1A's own wall, and doubling it here would brick the window up.
  wall(group, solids, render, LEFT - 0.25, LEFT, PATH - 0.4, PARAPET, frontZ0, BACK + 0.25)
  wall(group, solids, render, RIGHT, RIGHT + 0.25, PATH - 0.4, FIRST, frontZ0, BACK + 0.25)
  wall(group, solids, render, RIGHT, RIGHT + 0.25, FIRST, PARAPET, STAIR_Z0, BACK + 0.25)
  wall(group, solids, render, RIGHT, RIGHT + 0.25, CEIL_FIRST, PARAPET, frontZ0, STAIR_Z0)
  wall(group, solids, render, LEFT - 0.25, RIGHT + 0.25, PATH - 0.4, PARAPET, BACK, BACK + 0.25)

  // Roof lid. Has to cast, or the sun comes straight through it and lights the
  // first-floor hall from above in a slab that reads as a render fault.
  slab(group, render, LEFT - 0.25, RIGHT + 0.25, PARAPET - 0.2, PARAPET, frontZ0, BACK + 0.25)

  // === Neon ===
  // Two lines over the entrance. Unlit, because a tube is a light source, not a
  // lit surface, and at 3pm it is barely winning against the sun anyway.
  // Letterforms want a texture; these are the tubes they will be bent into.

  const neon = new Group()
  neon.name = 'neon'
  group.add(neon)
  // Narrow enough to clear the first-floor bays either side of it. The board
  // used to run into the window at -2.5.
  slab(neon, mat(EXTERIOR.signBoard, 0.85), -2.1, 2.1, 3.55, 5.0, frontZ0 - 0.16, frontZ0 - 0.02)
  const pinkMat = new MeshBasicMaterial({ color: EXTERIOR.neonPink })
  const cyanMat = new MeshBasicMaterial({ color: EXTERIOR.neonCyan })
  unlit(neon, pinkMat, -1.85, 1.85, 4.36, 4.52, frontZ0 - 0.22, frontZ0 - 0.16)
  unlit(neon, cyanMat, -1.15, 1.15, 3.85, 3.95, frontZ0 - 0.22, frontZ0 - 0.16)

  // === Front door ===

  const frontDoor = new Group()
  frontDoor.name = 'frontDoor'
  frontDoor.position.set(-0.58, GROUND, frontZ1)
  frontDoor.rotation.y = -1.85
  const leaf = slab(frontDoor, timber, 0.02, 1.14, 0.02, DOOR_H - 0.03, -0.05, 0.0)
  leaf.castShadow = true
  group.add(frontDoor)
  // Threshold, so the doorway is not a hole in the floor plan.
  walk(floors, 'marble', -0.6, 0.6, frontZ0, FRONT + 0.1, GROUND)

  // === Ground floor ===

  slab(group, carpet, LEFT, RIGHT, GROUND - 0.1, GROUND, FRONT, BACK).receiveShadow = true
  walk(floors, 'carpet', HALL_X0, HALL_X1, FRONT - 0.2, STAIR_Z0 + 0.05, GROUND)
  walk(floors, 'carpet', STAIR_EDGE - 0.05, HALL_X1, STAIR_Z0 + 0.05, BACK, GROUND)
  walk(floors, 'carpet', LEFT, HALL_X0 + 0.15, FRONT, ROOM_BACK, GROUND)
  walk(floors, 'floorboard', HALL_X1 - 0.15, RIGHT, FRONT, ROOM_BACK, GROUND)

  // Reception is boards, not runner.
  slab(group, timber, HALL_X1, RIGHT, GROUND - 0.09, GROUND + 0.005, FRONT, ROOM_BACK)

  // Hall walls, one opening each into the parlour and reception.
  for (const side of [-1, 1] as const) {
    const x1 = side < 0 ? HALL_X0 + INT : HALL_X1
    const x0 = x1 - INT
    wall(group, solids, nicotine, x0, x1, GROUND, CEIL_GROUND, FRONT - 0.2, 1.9)
    wall(group, solids, nicotine, x0, x1, GROUND, CEIL_GROUND, 1.9 + OPENING_W, ROOM_BACK + INT)
    wall(group, solids, nicotine, x0, x1, DOOR_H, CEIL_GROUND, 1.9, 1.9 + OPENING_W)
    // Architrave, so an opening reads as a doorway and not a missing wall.
    slab(group, timber, x0 - 0.02, x1 + 0.02, DOOR_H, DOOR_H + 0.09, 1.86, 1.94 + OPENING_W)
  }

  // Backs of the parlour and reception.
  wall(group, solids, nicotine, LEFT, HALL_X0 + INT, GROUND, CEIL_GROUND, ROOM_BACK, ROOM_BACK + INT)
  wall(group, solids, nicotine, HALL_X1 - INT, RIGHT, GROUND, CEIL_GROUND, ROOM_BACK, ROOM_BACK + INT)

  // Ground-floor ceiling over the rooms and the front of the hall. Casts, for
  // the same reason the roof does.
  slab(group, nicotine, LEFT, RIGHT, CEIL_GROUND, CEIL_GROUND + 0.09, FRONT, ROOM_BACK + INT)

  // Skirting round the hall, and the picture rail the nicotine stops at.
  for (const x of [HALL_X0 + INT + 0.01, HALL_X1 - INT - 0.01]) {
    slab(group, timber, x - 0.02, x + 0.02, GROUND, GROUND + 0.16, FRONT, ROOM_BACK)
  }

  // === Staircase ===

  const stairs = new Group()
  stairs.name = 'stairs'
  group.add(stairs)

  for (let n = 1; n <= TREADS; n += 1) {
    const top = n * RISE
    const z0 = STAIR_Z0 + (n - 1) * GOING
    const z1 = z0 + GOING
    slab(stairs, timber, STAIR_X0, STAIR_EDGE, top - RISE, top, z0, z1)
    // Runner, worn through on the treads. Inset, so the boards show at the edge.
    slab(stairs, carpet, STAIR_X0 + 0.16, STAIR_EDGE - 0.16, top, top + 0.012, z0, z1)
    walk(floors, 'carpet', STAIR_X0, STAIR_EDGE, z0, z1, top)
  }

  /*
   * Closed string and handrail down the open side. Both rake, so they are
   * rotated meshes and carry no collision of their own. The upright box below
   * is what actually keeps Miller off the edge.
   *
   * The line runs from the middle of tread one to the middle of tread
   * seventeen, which is why the rise and run are counted over TREADS - 1.
   */
  const run = (TREADS - 1) * GOING
  const climb = (TREADS - 1) * RISE
  const rake = Math.atan2(climb, run)
  const rakeLength = Math.hypot(run, climb)
  const rakeMidY = RISE + climb / 2
  const rakeMidZ = STAIR_Z0 + GOING / 2 + run / 2

  const string = raked(stairs, timber, 0.14, 0.4, rakeLength)
  string.position.set(STAIR_EDGE, rakeMidY - 0.22, rakeMidZ)
  string.rotation.x = -rake

  const rail = raked(stairs, timber, 0.1, 0.09, rakeLength)
  rail.position.set(STAIR_EDGE, rakeMidY + 0.92, rakeMidZ)
  rail.rotation.x = -rake

  // Newel at the foot, and the solid that keeps Miller off the open side. That
  // solid starts past the bottom two treads: the gap is how you get onto the
  // flight from the passage.
  slab(stairs, timber, STAIR_EDGE - 0.09, STAIR_EDGE + 0.09, 0, 1.2, STAIR_Z0 + 0.52, STAIR_Z0 + 0.7)
  solids.push(
    aabb(STAIR_EDGE - 0.02, STAIR_EDGE + 0.14, GROUND, CEIL_FIRST, STAIR_Z0 + 0.58, STAIR_Z1),
  )

  // Balusters, one a tread, from the newel up.
  for (let n = 3; n <= TREADS; n += 1) {
    const top = n * RISE
    const z = STAIR_Z0 + (n - 0.5) * GOING
    slab(stairs, timber, STAIR_EDGE - 0.03, STAIR_EDGE + 0.03, top, top + 0.82, z - 0.025, z + 0.025)
  }

  // === First floor ===

  // Slab under the hall and landing. This is also the ceiling over the passage.
  slab(group, nicotine, STAIR_EDGE - 0.16, HALL_X1, FIRST - 0.16, FIRST, FRONT, BACK)
  slab(group, nicotine, STAIR_X0 - 0.05, HALL_X1, FIRST - 0.16, FIRST, STAIR_Z1 - 0.06, BACK)
  slab(group, carpet, STAIR_EDGE - 0.16, HALL_X1, FIRST, FIRST + 0.008, FRONT, BACK)
  slab(group, carpet, STAIR_X0 - 0.05, HALL_X1, FIRST, FIRST + 0.008, STAIR_Z1 - 0.06, BACK)

  walk(floors, 'carpet', STAIR_EDGE - 0.02, HALL_X1, FRONT, BACK, FIRST)
  walk(floors, 'carpet', STAIR_X0, HALL_X1, STAIR_Z1 - 0.06, BACK, FIRST)

  // Hall walls. The right-hand one only runs behind 1A; 1A's own wall carries
  // the doorway in front of it.
  wall(group, solids, nicotine, STAIR_EDGE - 0.16, STAIR_EDGE - 0.02, FIRST, CEIL_FIRST, FRONT, STAIR_Z0)
  wall(group, solids, nicotine, HALL_X1 - INT, HALL_X1, FIRST, CEIL_FIRST, STAIR_Z0, BACK)
  wall(group, solids, nicotine, STAIR_X0 - 0.05, STAIR_X0 + 0.09, FIRST, CEIL_FIRST, STAIR_Z1 - 0.06, BACK)

  // Numbered doors, shut. 1A is the first on the right and is a real room; these
  // are the neighbours and they stay closed for the whole game.
  for (const z of [6.0, 8.1]) {
    slab(group, timber, HALL_X1 - INT - 0.05, HALL_X1 - INT, FIRST, FIRST + DOOR_H, z, z + 0.9)
    slab(group, brass, HALL_X1 - INT - 0.09, HALL_X1 - INT - 0.05, FIRST + 1.02, FIRST + 1.1, z + 0.72, z + 0.8)
  }

  // First-floor ceiling.
  slab(group, nicotine, STAIR_X0 - 0.05, HALL_X1, CEIL_FIRST, CEIL_FIRST + 0.09, FRONT, BACK)

  // === Reception ===

  const desk = new Group()
  desk.name = 'desk'
  group.add(desk)
  slab(desk, timber, 2.4, 5.4, GROUND, 1.06, 1.9, 2.5)
  slab(desk, timber, 2.32, 5.48, 1.06, 1.14, 1.82, 2.62)

  const keyRack = new Group()
  keyRack.name = 'keyRack'
  group.add(keyRack)
  slab(keyRack, timber, 2.6, 5.2, 1.35, 2.5, ROOM_BACK - 0.22, ROOM_BACK - 0.06)
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const x = 2.72 + col * 0.31
      const y = 1.46 + row * 0.27
      slab(keyRack, mat(0x1a1512, 1), x, x + 0.25, y, y + 0.21, ROOM_BACK - 0.245, ROOM_BACK - 0.215)
    }
  }

  const ledger = slab(group, mat(0xd8cfbc, 0.9), 3.5, 4.2, 1.14, 1.2, 2.0, 2.42)
  ledger.name = 'ledger'
  const phone = new Group()
  phone.name = 'phone'
  group.add(phone)
  slab(phone, mat(0x17130f, 0.5), 4.6, 5.05, 1.14, 1.28, 2.02, 2.34)
  slab(phone, mat(0x17130f, 0.5), 4.62, 5.03, 1.28, 1.36, 2.04, 2.14)
  const ashtray = slab(group, mat(EXTERIOR.marbleStep, 0.35), 2.62, 2.94, 1.14, 1.2, 2.06, 2.38)
  ashtray.name = 'ashtray'

  solids.push(aabb(2.32, 5.48, GROUND, 1.14, 1.82, 2.62))
  solids.push(aabb(2.6, 5.2, GROUND, 2.5, ROOM_BACK - 0.22, ROOM_BACK))

  // === Parlour ===

  const armchair = new Group()
  armchair.name = 'armchair'
  group.add(armchair)
  for (const [cx, cz, turn] of [
    [-4.6, 1.6, 0.5],
    [-4.5, 3.6, -0.4],
    [-2.5, 3.9, -1.5],
  ] as const) {
    const chair = new Group()
    chair.position.set(cx, GROUND, cz)
    chair.rotation.y = turn
    slab(chair, maroon, -0.42, 0.42, 0.28, 0.5, -0.42, 0.42)
    slab(chair, maroon, -0.42, 0.42, 0.5, 1.02, -0.44, -0.28)
    slab(chair, maroon, -0.5, -0.36, 0.5, 0.72, -0.42, 0.42)
    slab(chair, maroon, 0.36, 0.5, 0.5, 0.72, -0.42, 0.42)
    slab(chair, timber, -0.4, 0.4, 0, 0.28, -0.4, 0.4)
    armchair.add(chair)
    solids.push(aabb(cx - 0.55, cx + 0.55, GROUND, 1.02, cz - 0.55, cz + 0.55))
  }

  const parlourTable = new Group()
  parlourTable.name = 'parlourTable'
  group.add(parlourTable)
  slab(parlourTable, timber, -3.9, -2.9, 0.42, 0.48, 2.1, 2.9)
  for (const [x, z] of [
    [-3.85, 2.15],
    [-3.0, 2.15],
    [-3.85, 2.8],
    [-3.0, 2.8],
  ] as const) {
    slab(parlourTable, timber, x, x + 0.05, GROUND, 0.42, z, z + 0.05)
  }
  solids.push(aabb(-3.95, -2.85, GROUND, 0.48, 2.05, 2.95))

  const television = new Group()
  television.name = 'television'
  group.add(television)
  slab(television, mat(0x2a2521, 0.7), -6.2, -5.5, 0.4, 1.02, 2.3, 2.9)
  slab(television, mat(0x0a0a0b, 0.25), -5.53, -5.49, 0.52, 0.94, 2.4, 2.82)
  slab(television, timber, -6.15, -5.55, GROUND, 0.4, 2.35, 2.85)
  solids.push(aabb(-6.25, -5.45, GROUND, 1.02, 2.25, 2.95))

  const standardLamp = new Group()
  standardLamp.name = 'standardLamp'
  group.add(standardLamp)
  slab(standardLamp, timber, -5.34, -5.26, GROUND, 1.5, 3.96, 4.04)
  slab(standardLamp, mat(0xbfa87e, 0.9), -5.55, -5.05, 1.5, 1.86, 3.75, 4.25)
  slab(standardLamp, timber, -5.5, -5.1, GROUND, 0.03, 3.8, 4.2)

  return {
    group,
    solids,
    floors,
    // Out on the footpath, back far enough that the neon and the parapet are in
    // frame. BRIEF.md's cold open is Miller getting out of the car and looking
    // up, so the first thing he can see has to be the whole building.
    spawn: new Vector3(0.6, ROAD, -7.4),
    // Yaw 0 looks down -Z. π turns him round to face the lodge.
    spawnYaw: Math.PI,
    props: {
      frontDoor,
      neon,
      tape,
      steps,
      stairs,
      desk,
      keyRack,
      ledger,
      phone,
      ashtray,
      armchair,
      parlourTable,
      television,
      standardLamp,
    },
    update(elapsed: number): void {
      /*
       * ASSETS.md: one tube flickering. A sine would read as a pulse, which is
       * a working sign. A failing tube is mostly on, occasionally gone, and the
       * gap is short. Two out-of-phase waves beaten together give that without
       * a random number and without any state to keep.
       */
      const beat = Math.sin(elapsed * 11.3) + Math.sin(elapsed * 4.1)
      pinkMat.color.setHex(beat < -1.72 ? 0x3a1220 : EXTERIOR.neonPink)
    },
  }
}

// --- Kit ---

function mat(color: number, roughness: number, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness })
}

/**
 * A box given by its extents rather than its centre. A building is a list of
 * edges, and converting each one to a size and a midpoint by hand is where the
 * mistakes live.
 */
function slab(
  parent: Object3D,
  material: MeshStandardMaterial,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material)
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

/**
 * A box sized rather than placed, for the pieces that rake with the stairs.
 * Extents are no help once a thing is rotated.
 */
function raked(
  parent: Object3D,
  material: MeshStandardMaterial,
  width: number,
  height: number,
  length: number,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(width, height, length), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

/** Same as `slab`, for something that is a light source, not a lit surface. */
function unlit(
  parent: Object3D,
  material: MeshBasicMaterial,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material)
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  parent.add(mesh)
  return mesh
}

function wall(
  parent: Object3D,
  solids: Box3[],
  material: MeshStandardMaterial,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
): Mesh {
  const mesh = slab(parent, material, x0, x1, y0, y1, z0, z1)
  solids.push(aabb(x0, x1, y0, y1, z0, z1))
  return mesh
}

interface Opening {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

/**
 * A wall with holes in it. Scanline over the opening edges in x, then over
 * their y ranges within each column, emitting the solid between them.
 *
 * The pier-and-lintel version this replaced could only do openings that sat
 * side by side. The front elevation stacks them: room 1A's street window is
 * directly over the head of the reception window.
 */
function elevation(
  parent: Object3D,
  solids: Box3[],
  material: MeshStandardMaterial,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  openings: readonly Opening[],
): void {
  const columns = [...new Set([x0, x1, ...openings.flatMap((o) => [o.x0, o.x1])])]
    .filter((x) => x > x0 && x < x1)
    .sort((a, b) => a - b)
  columns.unshift(x0)
  columns.push(x1)

  for (let i = 0; i < columns.length - 1; i += 1) {
    const left = columns[i]
    const right = columns[i + 1]
    if (left === undefined || right === undefined || right - left < 1e-6) {
      continue
    }
    const mid = (left + right) / 2
    const bands = openings
      .filter((o) => o.x0 < mid && o.x1 > mid)
      .map((o) => ({ y0: Math.max(o.y0, y0), y1: Math.min(o.y1, y1) }))
      .filter((o) => o.y1 > o.y0)
      .sort((a, b) => a.y0 - b.y0)

    let cursor = y0
    for (const band of bands) {
      if (band.y0 > cursor) {
        wall(parent, solids, material, left, right, cursor, band.y0, z0, z1)
      }
      cursor = Math.max(cursor, band.y1)
    }
    if (cursor < y1) {
      wall(parent, solids, material, left, right, cursor, y1, z0, z1)
    }
  }
}

function aabb(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box3 {
  return new Box3(new Vector3(x0, y0, z0), new Vector3(x1, y1, z1))
}

/**
 * A patch of floor. Only the top face matters, so the box is a thin lid: the
 * solver asks what is under a point and takes the highest lid within a step.
 */
function walk(
  floors: WalkableRegion[],
  surface: Surface,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y: number,
): void {
  floors.push({ box: aabb(x0, x1, y - 0.2, y, z0, z1), surface })
}
