import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { EXTERIOR, ROOM_1A } from '../materials/palette.ts'
import { plasterMap, mapped } from '../materials/surfaces.ts'
import { tiled, windowed } from '../materials/textures.ts'
import { chamferBoxGeometry } from './kit.ts'
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

  const wallpaper = new MeshStandardMaterial({
    color: 0xffffff,
    map: tiled('wallpaper-floral', 2.8, 1.7),
    roughness: 0.92,
  })
  const timber = new MeshStandardMaterial({
    color: 0xffffff,
    map: tiled('timber-dark', 1.4, 1.8),
    roughness: 0.78,
  })
  const spread = new MeshStandardMaterial({
    color: 0xffffff,
    map: tiled('bedspread-rose', 2.6, 4.0),
    roughness: 0.88,
  })
  const floorMat = new MeshStandardMaterial({
    color: 0xffffff,
    map: tiled('floorboards-oak', 2.2, 3.4),
    roughness: 0.92,
  })
  // Ceiling stays off the floral: stained plaster above the picture rail.
  const ceilingMat = mapped(ROOM_1A.wallpaperFloral, 0.95, plasterMap(ROOM_1A.wallpaperFloral))

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

  const ceiling = box(WIDTH, 0.08, DEPTH, ceilingMat)
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

  // Skirting, picture rail, and a simple crown. The reference reads as trim
  // before it reads as furniture — without these the textured walls still look
  // like a greybox with a stamp on them.
  const skirtingH = 0.12
  const crownH = 0.08
  for (const z of [-halfD + 0.03, halfD - 0.03]) {
    const skirt = box(WIDTH - WALL * 2, skirtingH, 0.04, timber)
    skirt.position.set(0, skirtingH / 2, z)
    group.add(skirt)
    const rail = box(WIDTH - WALL * 2, 0.04, 0.03, timber)
    rail.position.set(0, 2.15, z)
    group.add(rail)
    const crown = box(WIDTH - WALL * 2, crownH, 0.05, timber)
    crown.position.set(0, HEIGHT - crownH / 2, z)
    group.add(crown)
  }
  for (const x of [-halfW + 0.03, halfW - 0.03]) {
    const skirt = box(0.04, skirtingH, DEPTH - WALL * 2, timber)
    skirt.position.set(x, skirtingH / 2, 0)
    group.add(skirt)
    const rail = box(0.03, 0.04, DEPTH - WALL * 2, timber)
    rail.position.set(x, 2.15, 0)
    group.add(rail)
    const crown = box(0.05, crownH, DEPTH - WALL * 2, timber)
    crown.position.set(x, HEIGHT - crownH / 2, 0)
    group.add(crown)
  }

  // --- Furniture ---

  const iron = mat(EXTERIOR.ironLace, 0.55)
  iron.metalness = 0.65

  // Bed along the west wall, head toward -Z. Sun should cross it from the sash.
  // Iron frame: the target is a black metal single, not a timber box headboard.
  const bed = new Group()
  bed.name = 'bed'
  const mattress = box(1.35, 0.32, 2.05, spread)
  mattress.position.set(0, 0.4, 0)
  bed.add(mattress)
  // Chenille drop / fringe lip.
  const skirt = box(1.38, 0.16, 2.08, spread)
  skirt.position.set(0, 0.22, 0)
  bed.add(skirt)
  const pillow = box(0.55, 0.12, 0.32, spread)
  pillow.position.set(0, 0.62, -0.78)
  bed.add(pillow)
  bed.add(ironEnd(-1.02, 0.95))
  bed.add(ironEnd(1.02, 0.72))
  const bedBase = box(1.3, 0.08, 1.95, iron)
  bedBase.position.set(0, 0.12, 0)
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
  const dresserBody = new Mesh(chamferBoxGeometry(0.48, 0.85, 1.15, 0.01), timber)
  dresserBody.castShadow = true
  dresserBody.receiveShadow = true
  dresser.add(placed(dresserBody, 0, 0.425, 0))
  // Drawer fronts and knobs so it reads as furniture, not a timber slab.
  for (const y of [0.22, 0.42, 0.62]) {
    dresser.add(placed(box(0.02, 0.16, 1.05, timber), -0.25, y, 0))
    dresser.add(placed(box(0.03, 0.03, 0.03, timber), -0.27, y, -0.28))
    dresser.add(placed(box(0.03, 0.03, 0.03, timber), -0.27, y, 0.28))
  }
  // Standing mirror.
  const mirrorGlass = mat(0xc8d0d4, 0.15)
  mirrorGlass.metalness = 0.4
  dresser.add(placed(box(0.04, 0.42, 0.32, timber), 0.1, 1.08, 0))
  dresser.add(placed(box(0.01, 0.34, 0.24, mirrorGlass), 0.07, 1.08, 0))
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
  const magazines = box(
    0.28,
    0.04,
    0.36,
    new MeshStandardMaterial({ color: 0xffffff, map: windowed('magazines'), roughness: 0.7 }),
  )
  magazines.name = 'magazines'
  magazines.position.set(dresserX + 0.03, 0.875, dresserZ - 0.04)
  magazines.rotation.y = -0.25
  magazines.castShadow = true
  group.add(magazines)

  const map = box(
    0.28,
    0.005,
    0.34,
    new MeshStandardMaterial({ color: 0xffffff, map: windowed('map-pins'), roughness: 0.85 }),
  )
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
  const wardrobeBody = new Mesh(chamferBoxGeometry(1.05, 2.15, 0.55, 0.012), timber)
  wardrobeBody.castShadow = true
  wardrobeBody.receiveShadow = true
  wardrobe.add(placed(wardrobeBody, 0, 1.075, 0))
  wardrobe.add(placed(box(0.03, 0.03, 0.03, timber), -0.28, 1.05, 0))
  wardrobe.position.set(-halfW + WALL / 2 + 0.53, 0, -halfD + WALL / 2 + 0.28)
  addGroupSolid(group, solids, wardrobe)

  // Chair near the sash.
  const chair = new Group()
  chair.name = 'chair'
  chair.add(placed(box(0.48, 0.08, 0.48, timber), 0, 0.42, 0))
  chair.add(placed(box(0.48, 0.55, 0.06, timber), 0, 0.72, -0.21))
  for (const [x, z] of [
    [-0.18, -0.18],
    [0.18, -0.18],
    [-0.18, 0.18],
    [0.18, 0.18],
  ] as const) {
    chair.add(placed(box(0.05, 0.42, 0.05, timber), x, 0.21, z))
  }
  chair.position.set(-0.15, 0, 1.55)
  addGroupSolid(group, solids, chair)

  // Second chair near the front window — the target has a pair.
  const chair2 = new Group()
  chair2.name = 'chair2'
  chair2.add(placed(box(0.42, 0.08, 0.42, timber), 0, 0.4, 0))
  chair2.add(placed(box(0.42, 0.5, 0.05, timber), 0, 0.68, -0.18))
  for (const [x, z] of [
    [-0.16, -0.16],
    [0.16, -0.16],
    [-0.16, 0.16],
    [0.16, 0.16],
  ] as const) {
    chair2.add(placed(box(0.045, 0.4, 0.045, timber), x, 0.2, z))
  }
  chair2.position.set(0.85, 0, 1.35)
  chair2.rotation.y = -0.4
  addGroupSolid(group, solids, chair2)

  // Side table by the bed head.
  const sideTable = new Group()
  sideTable.name = 'sideTable'
  const sideBody = new Mesh(chamferBoxGeometry(0.42, 0.55, 0.42, 0.008), timber)
  sideBody.castShadow = true
  sideBody.receiveShadow = true
  sideTable.add(placed(sideBody, 0, 0.275, 0))
  sideTable.position.set(-0.55, 0, -1.35)
  addGroupSolid(group, solids, sideTable)

  // Small bedside lamp — the target's nightstand is not empty.
  const lamp = new Group()
  lamp.name = 'lamp'
  const brass = mat(0x8a7348, 0.35)
  brass.metalness = 0.5
  lamp.add(placed(cyl(0.05, 0.05, 0.04, brass), 0, 0.02, 0))
  lamp.add(placed(cyl(0.012, 0.012, 0.28, brass), 0, 0.18, 0))
  const shade = mat(0xc4a882, 0.9)
  lamp.add(placed(cyl(0.11, 0.08, 0.14, shade), 0, 0.38, 0))
  lamp.position.set(-0.55, 0.55, -1.35)
  group.add(lamp)

  lighter.position.set(-0.38, 0.58, -1.22)
  lighter.rotation.z = 0.2
  lighter.castShadow = true
  group.add(lighter)

  // Floor rug in the sun path.
  const rug = box(
    1.6,
    0.015,
    2.2,
    new MeshStandardMaterial({
      color: 0xffffff,
      map: tiled('carpet-brown', 1.2, 1.5),
      roughness: 0.95,
    }),
  )
  rug.name = 'rug'
  rug.position.set(0.15, 0.01, 0.1)
  rug.rotation.y = 0.08
  rug.castShadow = false
  group.add(rug)

  // Small table under the verandah sash.
  const windowTable = new Group()
  windowTable.name = 'windowTable'
  windowTable.add(placed(box(0.55, 0.48, 0.35, timber), 0, 0.24, 0))
  windowTable.position.set(0.35, 0, 1.85)
  addGroupSolid(group, solids, windowTable)

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
  // Stiles and a deeper outer liner so the cut through the wallpaper is not a knife edge.
  sash.add(placed(box(0.05, WINDOW_HEIGHT, 0.05, timber), -WINDOW_WIDTH / 2 + 0.04, WINDOW_SILL + WINDOW_HEIGHT / 2, 0))
  sash.add(placed(box(0.05, WINDOW_HEIGHT, 0.05, timber), WINDOW_WIDTH / 2 - 0.04, WINDOW_SILL + WINDOW_HEIGHT / 2, 0))
  sash.add(placed(box(WINDOW_WIDTH, 0.04, 0.08, timber), 0, WINDOW_SILL + 0.02, 0.02))
  sash.add(placed(box(WINDOW_WIDTH, 0.04, 0.08, timber), 0, WINDOW_SILL + WINDOW_HEIGHT - 0.02, 0.02))
  sash.add(placed(box(0.04, WINDOW_HEIGHT, 0.08, timber), -WINDOW_WIDTH / 2 + 0.02, WINDOW_SILL + WINDOW_HEIGHT / 2, 0.02))
  sash.add(placed(box(0.04, WINDOW_HEIGHT, 0.08, timber), WINDOW_WIDTH / 2 - 0.02, WINDOW_SILL + WINDOW_HEIGHT / 2, 0.02))
  sash.position.set(0, 0, sashZ)
  group.add(sash)

  // Roller blind, half down — the target always has one, and a naked sash
  // reads as unfinished joinery.
  const blind = box(WINDOW_WIDTH - 0.1, WINDOW_HEIGHT * 0.42, 0.02, mat(0xc4a882, 0.9))
  blind.position.set(0, WINDOW_SILL + WINDOW_HEIGHT - WINDOW_HEIGHT * 0.21, sashZ - 0.04)
  blind.castShadow = true
  group.add(blind)
  const blindRoll = cyl(0.03, 0.03, WINDOW_WIDTH - 0.08, mat(0xa88860, 0.7))
  blindRoll.rotation.z = Math.PI / 2
  blindRoll.position.set(0, WINDOW_SILL + WINDOW_HEIGHT - 0.02, sashZ - 0.04)
  group.add(blindRoll)

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

function cyl(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: MeshStandardMaterial,
): Mesh {
  const mesh = new Mesh(new CylinderGeometry(radiusTop, radiusBottom, height, 10), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** Iron bed end: posts, top rail, vertical spindles. */
function ironEnd(z: number, height: number): Group {
  const iron = mat(EXTERIOR.ironLace, 0.55)
  iron.metalness = 0.65
  const end = new Group()
  const postL = cyl(0.025, 0.025, height, iron)
  postL.position.set(-0.62, height / 2, z)
  end.add(postL)
  const postR = cyl(0.025, 0.025, height, iron)
  postR.position.set(0.62, height / 2, z)
  end.add(postR)
  const top = cyl(0.018, 0.018, 1.28, iron)
  top.rotation.z = Math.PI / 2
  top.position.set(0, height - 0.04, z)
  end.add(top)
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue
    const spindle = cyl(0.012, 0.012, height - 0.12, iron)
    spindle.position.set(i * 0.12, (height - 0.12) / 2, z)
    end.add(spindle)
  }
  const knobL = cyl(0.035, 0.035, 0.05, iron)
  knobL.position.set(-0.62, height + 0.02, z)
  end.add(knobL)
  const knobR = cyl(0.035, 0.035, 0.05, iron)
  knobR.position.set(0.62, height + 0.02, z)
  end.add(knobR)
  return end
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
