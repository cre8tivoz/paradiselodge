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
import { INTERIOR, ROOM_1A } from '../materials/palette.ts'
import { CRYSTAL_LENGTH, CRYSTAL_SPINE_OFFSET, buildCrystalProp } from './crystal.ts'
import type { CrystalProp } from './crystal.ts'
import type { WalkableRegion } from './collision.ts'

/**
 * Room 1A. Corner room, upstairs. Fixed 3pm sun through the sash.
 *
 * BRIEF.md: the light is the point. Everything in here happened at 2am in the
 * dark. Whoever arranged it never saw it like this.
 *
 * Furniture is kit geometry against the locked palette. Crystal and the
 * examinable set live here.
 *
 * Built at the origin and placed into the lodge by the caller. Local -Z is the
 * hall door and local +Z is the sash, so the placement rotation decides which
 * way the room faces; collision boxes are baked after the transform is applied,
 * which is why the placement is an argument and not something you set later.
 */

/** Where the room sits in the lodge. */
export interface Room1APlacement {
  readonly position: Vector3
  readonly rotationY: number
}

export interface Room1A {
  readonly group: Group
  readonly solids: Box3[]
  readonly floors: WalkableRegion[]
  readonly spawn: Vector3
  /** Initial yaw so Miller faces into the room toward the window. */
  readonly spawnYaw: number
  readonly crystal: CrystalProp
  readonly props: {
    readonly bed: Object3D
    readonly dresser: Object3D
    readonly drawer: Object3D
    readonly wardrobe: Object3D
    readonly chair: Object3D
    readonly sideTable: Object3D
    readonly sash: Object3D
    readonly sill: Object3D
    /** The second sash, in the street elevation. Shut. */
    readonly frontWindow: Object3D
    readonly frame: Object3D
    readonly magazines: Object3D
    readonly map: Object3D
    readonly note: Object3D
    readonly lighter: Object3D
    /** Hall door leaf, standing open against the wall. */
    readonly door: Object3D
    /** The way out onto the verandah. Also standing open. */
    readonly verandahDoor: Object3D
  }
}

const WIDTH = 5.2
const DEPTH = 4.6
const HEIGHT = 3.05
const WALL = 0.14
const DOOR_WIDTH = 0.9
const DOOR_HEIGHT = 2.15
const WINDOW_WIDTH = 1.35
const WINDOW_HEIGHT = 1.45
const WINDOW_SILL = 0.95

/*
 * The second sash, in the local +X wall.
 *
 * Local +X is the street elevation once the room is placed: the quarter turn
 * that puts the door on the hall puts this wall on the front of the building.
 * A corner room with nothing in its front wall reads as a mistake from the
 * footpath, and BRIEF.md has 1A on the corner of the front and the side.
 *
 * It is over the dresser, so the travel pile gets the front light. It is shut,
 * and it stays shut: the verandah sash is the one Sterling came in through and
 * the one the `sill` evidence hangs off. Two openable windows in a room whose
 * whole point is how somebody got in would be a second answer to a solved
 * question.
 *
 * The lodge cuts a matching hole in the exterior wall in front of it. Move one,
 * move the other.
 */
const FRONT_WINDOW_Z0 = -1.41
const FRONT_WINDOW_Z1 = -0.39
const FRONT_WINDOW_SILL = 0.95
const FRONT_WINDOW_TOP = 2.55

/*
 * The verandah door, beside the sash in the same wall.
 *
 * BRIEF.md: "a verandah runs off 1A". Something has to run off it, and the sash
 * is not it. It opens a hand's width, `pushSash` gives another inch and stops,
 * and the toe print on the sill is the whole point of the `sill` evidence. A
 * detective climbing out of the murder scene's window would also be wrong.
 *
 * So 1A has a verandah door, which is what a Victorian first-floor room with a
 * verandah has. It changes nothing about how Sterling got in: he came through
 * the sash, and this is the door he did not use.
 */
const VERANDAH_DOOR_X0 = 1.1
const VERANDAH_DOOR_X1 = 2.0
const VERANDAH_DOOR_HEIGHT = 2.15

export async function buildRoom1A(placement: Room1APlacement): Promise<Room1A> {
  const group = new Group()
  const solids: Box3[] = []
  const floors: WalkableRegion[] = []

  // Placed first. Box3.setFromObject walks the matrix chain, so every solid
  // baked below is already in world space.
  group.name = 'room1a'
  group.position.copy(placement.position)
  group.rotation.y = placement.rotationY
  group.updateMatrixWorld(true)

  const wallpaper = mat(ROOM_1A.wallpaperFloral, 0.92)
  const timber = mat(INTERIOR.timberDark, 0.78)
  const spread = mat(ROOM_1A.bedspreadRose, 0.88)
  const floorMat = mat(INTERIOR.carpetBrown, 0.95)

  /*
   * Glass, not board. Both sashes used to be solid timber boxes filling their
   * openings, which made the window a black rectangle and, worse, made the sash
   * a shadow caster, so the 3pm sun was reduced to what leaked around the edges.
   *
   * Unlit and barely opaque: you look through it, with just enough sheen left
   * to read as glass rather than a hole. It casts nothing.
   */
  const glass = new MeshBasicMaterial({
    color: ROOM_1A.daylight,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  })

  const halfW = WIDTH / 2
  const halfD = DEPTH / 2

  // Floor and ceiling.
  const floor = box(WIDTH, 0.08, DEPTH, floorMat)
  floor.position.set(0, -0.04, 0)
  floor.receiveShadow = true
  group.add(floor)

  const ceiling = box(WIDTH, 0.08, DEPTH, wallpaper)
  ceiling.position.set(0, HEIGHT + 0.04, 0)
  ceiling.receiveShadow = true
  group.add(ceiling)

  // Walls. Door in -Z (hall). Sash in +Z (verandah). Corner room read.
  // North (-Z): two segments either side of the door.
  const doorHalf = DOOR_WIDTH / 2
  const northLeftWidth = halfW - doorHalf
  addSolid(
    group,
    solids,
    box(northLeftWidth, HEIGHT, WALL, wallpaper),
    -halfW + northLeftWidth / 2,
    HEIGHT / 2,
    -halfD,
  )
  addSolid(
    group,
    solids,
    box(northLeftWidth, HEIGHT, WALL, wallpaper),
    halfW - northLeftWidth / 2,
    HEIGHT / 2,
    -halfD,
  )
  // Lintel above the door.
  addSolid(
    group,
    solids,
    box(DOOR_WIDTH, HEIGHT - DOOR_HEIGHT, WALL, wallpaper),
    0,
    DOOR_HEIGHT + (HEIGHT - DOOR_HEIGHT) / 2,
    -halfD,
  )

  /*
   * Door leaf, standing open into the room.
   *
   * Hinged on a pivot at the jamb rather than rotated on its own centre, or the
   * leaf swings through the wall it is hung on. It is not in `solids`: the
   * doorway is the route in and out of 1A, and a leaf you can walk through is
   * better than a room you cannot leave.
   */
  const door = new Group()
  door.name = 'door'
  door.position.set(-doorHalf, 0, -halfD + 0.06)
  door.rotation.y = -1.75
  const leaf = box(DOOR_WIDTH - 0.04, DOOR_HEIGHT - 0.04, 0.04, timber)
  leaf.position.set((DOOR_WIDTH - 0.04) / 2, DOOR_HEIGHT / 2, 0)
  door.add(leaf)
  group.add(door)

  // South (+Z): the verandah wall. Sash in the middle, verandah door beside it.
  const winHalf = WINDOW_WIDTH / 2
  const southSide = halfW - winHalf
  addSolid(
    group,
    solids,
    box(southSide, HEIGHT, WALL, wallpaper),
    -halfW + southSide / 2,
    HEIGHT / 2,
    halfD,
  )
  // Between the sash and the verandah door.
  const southMid = VERANDAH_DOOR_X0 - winHalf
  addSolid(
    group,
    solids,
    box(southMid, HEIGHT, WALL, wallpaper),
    winHalf + southMid / 2,
    HEIGHT / 2,
    halfD,
  )
  // Beyond the verandah door, to the corner.
  const southEnd = halfW - VERANDAH_DOOR_X1
  addSolid(
    group,
    solids,
    box(southEnd, HEIGHT, WALL, wallpaper),
    VERANDAH_DOOR_X1 + southEnd / 2,
    HEIGHT / 2,
    halfD,
  )
  // Over the verandah door.
  const verandahDoorWidth = VERANDAH_DOOR_X1 - VERANDAH_DOOR_X0
  addSolid(
    group,
    solids,
    box(verandahDoorWidth, HEIGHT - VERANDAH_DOOR_HEIGHT, WALL, wallpaper),
    (VERANDAH_DOOR_X0 + VERANDAH_DOOR_X1) / 2,
    VERANDAH_DOOR_HEIGHT + (HEIGHT - VERANDAH_DOOR_HEIGHT) / 2,
    halfD,
  )

  // Its leaf, hinged at the far jamb and standing open into the room.
  const verandahDoor = new Group()
  verandahDoor.name = 'verandahDoor'
  verandahDoor.position.set(VERANDAH_DOOR_X1, 0, halfD - 0.06)
  verandahDoor.rotation.y = 1.7
  const verandahLeaf = box(verandahDoorWidth - 0.04, VERANDAH_DOOR_HEIGHT - 0.04, 0.04, timber)
  verandahLeaf.position.set(-(verandahDoorWidth - 0.04) / 2, VERANDAH_DOOR_HEIGHT / 2, 0)
  verandahDoor.add(verandahLeaf)
  group.add(verandahDoor)

  // Below sill.
  addSolid(
    group,
    solids,
    box(WINDOW_WIDTH, WINDOW_SILL, WALL, wallpaper),
    0,
    WINDOW_SILL / 2,
    halfD,
  )
  // Above sash.
  const above = HEIGHT - (WINDOW_SILL + WINDOW_HEIGHT)
  addSolid(
    group,
    solids,
    box(WINDOW_WIDTH, above, WALL, wallpaper),
    0,
    WINDOW_SILL + WINDOW_HEIGHT + above / 2,
    halfD,
  )

  // West wall (-X). Solid: it is an internal party wall.
  addSolid(group, solids, box(WALL, HEIGHT, DEPTH, wallpaper), -halfW, HEIGHT / 2, 0)

  // East wall (+X) is the street elevation, with the second sash in it.
  const frontNear = FRONT_WINDOW_Z0 + halfD
  addSolid(
    group,
    solids,
    box(WALL, HEIGHT, frontNear, wallpaper),
    halfW,
    HEIGHT / 2,
    -halfD + frontNear / 2,
  )
  const frontFar = halfD - FRONT_WINDOW_Z1
  addSolid(
    group,
    solids,
    box(WALL, HEIGHT, frontFar, wallpaper),
    halfW,
    HEIGHT / 2,
    halfD - frontFar / 2,
  )
  const frontWidth = FRONT_WINDOW_Z1 - FRONT_WINDOW_Z0
  const frontMidZ = (FRONT_WINDOW_Z0 + FRONT_WINDOW_Z1) / 2
  addSolid(
    group,
    solids,
    box(WALL, FRONT_WINDOW_SILL, frontWidth, wallpaper),
    halfW,
    FRONT_WINDOW_SILL / 2,
    frontMidZ,
  )
  const frontAbove = HEIGHT - FRONT_WINDOW_TOP
  addSolid(
    group,
    solids,
    box(WALL, frontAbove, frontWidth, wallpaper),
    halfW,
    FRONT_WINDOW_TOP + frontAbove / 2,
    frontMidZ,
  )

  /*
   * The second sash. Shut, so it is one pane and a meeting rail rather than the
   * two sliding leaves of the verandah window.
   */
  const frontWindow = new Group()
  frontWindow.name = 'frontWindow'
  frontWindow.position.set(halfW - 0.03, 0, 0)
  const frontHeight = FRONT_WINDOW_TOP - FRONT_WINDOW_SILL
  const frontMidY = (FRONT_WINDOW_SILL + FRONT_WINDOW_TOP) / 2
  const frontPane = new Mesh(
    new BoxGeometry(0.012, frontHeight - 0.08, frontWidth - 0.08),
    glass,
  )
  frontPane.position.set(0, frontMidY, frontMidZ)
  frontWindow.add(frontPane)
  frontWindow.add(
    placed(box(0.05, 0.055, frontWidth - 0.08, timber), 0, frontMidY, frontMidZ),
  )
  for (const z of [FRONT_WINDOW_Z0 + 0.04, FRONT_WINDOW_Z1 - 0.04]) {
    frontWindow.add(placed(box(0.05, frontHeight, 0.05, timber), 0, frontMidY, z))
  }
  group.add(frontWindow)

  const frontSill = box(0.16, 0.05, frontWidth + 0.08, timber)
  frontSill.position.set(halfW - 0.08, FRONT_WINDOW_SILL, frontMidZ)
  group.add(frontSill)

  // Skirting, picture-rail height band.
  for (const z of [-halfD + 0.02, halfD - 0.02]) {
    const rail = box(WIDTH - WALL * 2, 0.04, 0.03, timber)
    rail.position.set(0, 2.15, z)
    group.add(rail)
  }

  // --- Furniture ---

  // Bed along the west wall, head toward -Z. Sun should cross it from the sash.
  const bed = new Group()
  bed.name = 'bed'
  const mattress = box(1.35, 0.42, 2.05, spread)
  mattress.position.set(0, 0.35, 0)
  bed.add(mattress)
  const headboard = box(1.35, 0.85, 0.08, timber)
  headboard.position.set(0, 0.72, -1.02)
  bed.add(headboard)
  const bedBase = box(1.4, 0.28, 2.1, timber)
  bedBase.position.set(0, 0.14, 0)
  bed.add(bedBase)
  bed.position.set(-1.45, 0, 0.15)
  addGroupSolid(group, solids, bed)

  /*
   * Crystal on the bed, head to the headboard.
   *
   * The mattress top is 0.56 and her root lands on her spine rather than her
   * back, so it sits `CRYSTAL_SPINE_OFFSET` above that. The yaw of pi is what
   * puts her head at -Z: she is modelled standing and the tilt lays her out
   * along +Z, so without it she would be head to the foot of the bed.
   *
   * Her root is therefore at her heels, and the head end works out at
   * mattressFoot - CRYSTAL_LENGTH.
   */
  const MATTRESS_TOP = 0.56
  const HEAD_END = -0.75
  const crystal = await buildCrystalProp()
  crystal.root.position.set(-1.45, MATTRESS_TOP + CRYSTAL_SPINE_OFFSET, HEAD_END + CRYSTAL_LENGTH)
  crystal.root.rotation.y = Math.PI
  group.add(crystal.root)

  /*
   * Dresser, back to the street wall and under the new window.
   *
   * It used to stand across the room with its long side pointing at the wall,
   * which nobody notices in a blank wall and everybody notices under a window.
   * Turned so its length runs along the wall, and pushed back to it. The travel
   * pile on top now gets the front light, which is the right thing for the one
   * group of objects in this room that is evidence of a life rather than
   * evidence of a crime.
   */
  const dresserX = halfW - WALL / 2 - 0.24
  const dresserZ = (FRONT_WINDOW_Z0 + FRONT_WINDOW_Z1) / 2
  const dresser = new Group()
  dresser.name = 'dresser'
  dresser.add(placed(box(0.48, 0.85, 1.15, timber), 0, 0.425, 0))
  dresser.position.set(dresserX, 0, dresserZ)
  addGroupSolid(group, solids, dresser)

  // Top drawer face — examinable on its own. Faces into the room, so -X.
  const drawer = box(0.02, 0.18, 1.05, timber)
  drawer.name = 'drawer'
  drawer.position.set(dresserX - 0.25, 0.62, dresserZ)
  drawer.castShadow = true
  group.add(drawer)

  // Frame on the dresser — face down.
  const frame = box(0.17, 0.022, 0.125, timber)
  frame.name = 'frame'
  frame.position.set(dresserX + 0.04, 0.862, dresserZ + 0.35)
  frame.rotation.y = 0.18
  frame.castShadow = true
  frame.receiveShadow = true
  group.add(frame)

  // Travel pile: magazines, map with pins, note.
  const magazines = box(0.28, 0.04, 0.36, mat(ROOM_1A.crystalDress, 0.7))
  magazines.name = 'magazines'
  magazines.position.set(dresserX + 0.03, 0.875, dresserZ - 0.04)
  magazines.rotation.y = -0.25
  magazines.castShadow = true
  group.add(magazines)

  const map = box(0.28, 0.005, 0.34, mat(0xd2c4a8, 0.85))
  map.name = 'map'
  map.position.set(dresserX + 0.02, 0.855, dresserZ - 0.38)
  map.rotation.y = 0.15
  map.castShadow = true
  group.add(map)

  const note = box(0.16, 0.002, 0.12, mat(ROOM_1A.crystalDress, 0.85))
  note.name = 'note'
  note.position.set(dresserX - 0.11, 0.855, dresserZ + 0.2)
  note.rotation.y = 0.4
  group.add(note)

  // Lighter on the side table.
  const lighter = box(0.025, 0.06, 0.018, mat(0xc0a060, 0.4))
  lighter.name = 'lighter'

  /*
   * Wardrobe, in the corner by the hall door.
   *
   * It used to stand across the room on the verandah wall, where the verandah
   * door now is: it blocked the doorway outright, and the solver only got
   * Miller through it by ejecting him sideways. It was also standing with its
   * long side into the room, the same fault the dresser had.
   *
   * Back to a wall, and out of the route between the two doors.
   */
  const wardrobe = new Group()
  wardrobe.name = 'wardrobe'
  wardrobe.add(placed(box(1.05, 2.15, 0.55, timber), 0, 1.075, 0))
  wardrobe.position.set(-halfW + WALL / 2 + 0.53, 0, -halfD + WALL / 2 + 0.28)
  addGroupSolid(group, solids, wardrobe)

  // Chair near the sash.
  const chair = new Group()
  chair.name = 'chair'
  chair.add(placed(box(0.48, 0.45, 0.48, timber), 0, 0.225, 0))
  chair.add(placed(box(0.48, 0.55, 0.06, timber), 0, 0.7, -0.21))
  chair.position.set(-0.15, 0, 1.55)
  addGroupSolid(group, solids, chair)

  // Side table by the bed head.
  const sideTable = new Group()
  sideTable.name = 'sideTable'
  sideTable.add(placed(box(0.42, 0.55, 0.42, timber), 0, 0.275, 0))
  sideTable.position.set(-0.55, 0, -1.35)
  addGroupSolid(group, solids, sideTable)

  lighter.position.set(-0.55, 0.58, -1.35)
  lighter.rotation.z = 0.2
  lighter.castShadow = true
  group.add(lighter)

  // Sash: two sliding panes, open a hand's width. Sill is the lookable ledge.
  const sash = new Group()
  sash.name = 'sash'
  const sashZ = halfD - 0.02

  const pane = (w: number, h: number): Mesh => {
    const mesh = new Mesh(new BoxGeometry(w, h, 0.012), glass)
    mesh.castShadow = false
    mesh.receiveShadow = false
    return mesh
  }

  const paneHeight = WINDOW_HEIGHT / 2 - 0.05
  const lower = pane(WINDOW_WIDTH - 0.08, paneHeight)
  lower.position.set(0, WINDOW_SILL + WINDOW_HEIGHT * 0.28, 0)
  sash.add(lower)
  const upper = pane(WINDOW_WIDTH - 0.08, paneHeight)
  // Open a hand's width — upper pane raised.
  upper.position.set(0, WINDOW_SILL + WINDOW_HEIGHT * 0.78, -0.03)
  sash.add(upper)

  // Meeting rail and the bottom rail of the raised upper sash, so the joinery
  // still reads now the panes are see-through.
  const meetingRail = box(WINDOW_WIDTH - 0.08, 0.055, 0.05, timber)
  meetingRail.position.set(0, WINDOW_SILL + WINDOW_HEIGHT * 0.28 + paneHeight / 2, 0)
  sash.add(meetingRail)
  const upperRail = box(WINDOW_WIDTH - 0.08, 0.05, 0.05, timber)
  upperRail.position.set(0, WINDOW_SILL + WINDOW_HEIGHT * 0.78 - paneHeight / 2, -0.03)
  sash.add(upperRail)
  // Stiles.
  sash.add(placed(box(0.05, WINDOW_HEIGHT, 0.05, timber), -WINDOW_WIDTH / 2 + 0.04, WINDOW_SILL + WINDOW_HEIGHT / 2, 0))
  sash.add(placed(box(0.05, WINDOW_HEIGHT, 0.05, timber), WINDOW_WIDTH / 2 - 0.04, WINDOW_SILL + WINDOW_HEIGHT / 2, 0))
  sash.position.set(0, 0, sashZ)
  group.add(sash)

  const sill = box(WINDOW_WIDTH + 0.08, 0.05, 0.16, timber)
  sill.name = 'sill'
  sill.position.set(0, WINDOW_SILL, halfD - 0.08)
  sill.castShadow = true
  sill.receiveShadow = true
  group.add(sill)

  /*
   * What is outside the sash.
   *
   * Without this the window is a black rectangle, and a room whose whole point
   * is 3pm sun has a hole where its brightest thing should be. No amount of
   * light inside fixes that: the eye reads the darkest area as the exposure
   * reference and calls the room dim.
   *
   * Gone at step 10, as promised. The verandah stands where the card did, and a
   * sunlit deck, a sunlit balustrade and the sky above them are a real bright
   * thing to look at. Keeping the card would have hidden the thing it was
   * standing in for.
   */

  // The sun and the fill used to live here. They are the whole scene's now, in
  // render/lighting.ts, because a DirectionalLight was never room-scoped.

  // Walkable floor, inside the skirtings. Baked in world space like the solids.
  floors.push({
    box: new Box3().setFromObject(floor),
    surface: 'floorboard',
  })

  return {
    group,
    solids,
    floors,
    // Just inside the door, facing the sash and the bed. Local; the caller
    // transforms it if it wants to drop Miller straight into the room.
    spawn: new Vector3(0, 0, -halfD + 0.55),
    // Yaw 0 looks down -Z (out the door). π faces the verandah sash.
    spawnYaw: Math.PI,
    crystal,
    props: {
      bed,
      dresser,
      drawer,
      wardrobe,
      chair,
      sideTable,
      sash,
      sill,
      frontWindow,
      frame,
      magazines,
      map,
      note,
      lighter,
      door,
      verandahDoor,
    },
  }
}

function mat(color: number, roughness: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness })
}

function box(w: number, h: number, d: number, material: MeshStandardMaterial): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function placed(mesh: Mesh, x: number, y: number, z: number): Mesh {
  mesh.position.set(x, y, z)
  return mesh
}

function addSolid(group: Group, solids: Box3[], mesh: Mesh, x: number, y: number, z: number): Mesh {
  mesh.position.set(x, y, z)
  group.add(mesh)
  solids.push(new Box3().setFromObject(mesh))
  return mesh
}

function addGroupSolid(group: Group, solids: Box3[], obj: Object3D): void {
  group.add(obj)
  obj.updateMatrixWorld(true)
  solids.push(new Box3().setFromObject(obj))
}
