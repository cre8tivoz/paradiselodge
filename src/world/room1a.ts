import {
  AmbientLight,
  Box3,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { INTERIOR, ROOM_1A } from '../materials/palette.ts'
import { buildCrystalProp } from './crystal.ts'
import type { CrystalProp } from './crystal.ts'

/**
 * Room 1A. Corner room, upstairs. Fixed 3pm sun through the sash.
 *
 * BRIEF.md: the light is the point. Everything in here happened at 2am in the
 * dark. Whoever arranged it never saw it like this.
 *
 * Furniture is kit geometry against the locked palette. Crystal and the
 * examinable set live here.
 */

export interface Room1A {
  readonly group: Group
  readonly solids: Box3[]
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
    readonly frame: Object3D
    readonly magazines: Object3D
    readonly map: Object3D
    readonly note: Object3D
    readonly lighter: Object3D
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

export function buildRoom1A(): Room1A {
  const group = new Group()
  const solids: Box3[] = []

  const wallpaper = mat(ROOM_1A.wallpaperFloral, 0.92)
  const timber = mat(INTERIOR.timberDark, 0.78)
  const spread = mat(ROOM_1A.bedspreadRose, 0.88)
  const floorMat = mat(INTERIOR.carpetBrown, 0.95)

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

  // South (+Z): wall with sash opening.
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
  addSolid(
    group,
    solids,
    box(southSide, HEIGHT, WALL, wallpaper),
    halfW - southSide / 2,
    HEIGHT / 2,
    halfD,
  )
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

  // East and west solid walls.
  addSolid(group, solids, box(WALL, HEIGHT, DEPTH, wallpaper), -halfW, HEIGHT / 2, 0)
  addSolid(group, solids, box(WALL, HEIGHT, DEPTH, wallpaper), halfW, HEIGHT / 2, 0)

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

  // Crystal on the bed. Head to the headboard, face turned toward the sash.
  const crystal = buildCrystalProp()
  crystal.root.position.set(-1.45, 0.58, 0.05)
  crystal.root.rotation.y = Math.PI
  group.add(crystal.root)

  // Dresser opposite the bed, under the picture rail on the east wall.
  const dresser = new Group()
  dresser.name = 'dresser'
  dresser.add(placed(box(1.15, 0.85, 0.48, timber), 0, 0.425, 0))
  dresser.position.set(1.7, 0, -0.85)
  addGroupSolid(group, solids, dresser)

  // Top drawer face — examinable on its own.
  const drawer = box(1.05, 0.18, 0.02, timber)
  drawer.name = 'drawer'
  drawer.position.set(1.7, 0.62, -0.85 - 0.24)
  drawer.castShadow = true
  group.add(drawer)

  // Frame on the dresser — face down.
  const frame = box(0.17, 0.022, 0.125, timber)
  frame.name = 'frame'
  frame.position.set(1.55, 0.862, -0.85)
  frame.rotation.y = 0.18
  frame.castShadow = true
  frame.receiveShadow = true
  group.add(frame)

  // Travel pile: magazines, map with pins, note.
  const magazines = box(0.28, 0.04, 0.36, mat(ROOM_1A.crystalDress, 0.7))
  magazines.name = 'magazines'
  magazines.position.set(1.85, 0.875, -0.72)
  magazines.rotation.y = -0.25
  magazines.castShadow = true
  group.add(magazines)

  const map = box(0.34, 0.005, 0.28, mat(0xd2c4a8, 0.85))
  map.name = 'map'
  map.position.set(1.95, 0.855, -1.0)
  map.rotation.y = 0.15
  map.castShadow = true
  group.add(map)

  const note = box(0.12, 0.002, 0.16, mat(ROOM_1A.crystalDress, 0.85))
  note.name = 'note'
  note.position.set(1.72, 0.855, -0.98)
  note.rotation.y = 0.4
  group.add(note)

  // Lighter on the side table.
  const lighter = box(0.025, 0.06, 0.018, mat(0xc0a060, 0.4))
  lighter.name = 'lighter'

  // Wardrobe in the far corner.
  const wardrobe = new Group()
  wardrobe.name = 'wardrobe'
  wardrobe.add(placed(box(1.05, 2.15, 0.55, timber), 0, 1.075, 0))
  wardrobe.position.set(1.75, 0, 1.45)
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
  const lower = box(WINDOW_WIDTH - 0.08, WINDOW_HEIGHT / 2 - 0.05, 0.04, timber)
  lower.position.set(0, WINDOW_SILL + WINDOW_HEIGHT * 0.28, 0)
  sash.add(lower)
  const upper = box(WINDOW_WIDTH - 0.08, WINDOW_HEIGHT / 2 - 0.05, 0.04, timber)
  // Open a hand's width — upper pane raised.
  upper.position.set(0, WINDOW_SILL + WINDOW_HEIGHT * 0.78, -0.03)
  sash.add(upper)
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

  // --- Fixed 3pm sun ---
  // Low and warm, through the verandah sash (+Z), crossing the bed.
  const sun = new DirectionalLight(ROOM_1A.sunWarm, 2.9)
  sun.position.set(2.2, 3.6, 7.2)
  sun.target.position.set(-1.2, 0.5, 0.0)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -7
  sun.shadow.camera.right = 7
  sun.shadow.camera.top = 7
  sun.shadow.camera.bottom = -7
  sun.shadow.camera.near = 2
  sun.shadow.camera.far = 24
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.025
  // Soften so the beam reads without turning the rest of the room black.
  sun.shadow.intensity = 0.72
  group.add(sun)
  group.add(sun.target)

  // Baked-feel fill. Nicotine keeps the walls alive in shade; a little sun-warm
  // on top so the whole room stays afternoon rather than dusk.
  group.add(new AmbientLight(INTERIOR.nicotine, 0.7))
  group.add(new AmbientLight(ROOM_1A.sunWarm, 0.28))

  return {
    group,
    solids,
    // Just inside the door, facing the sash and the bed.
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
      frame,
      magazines,
      map,
      note,
      lighter,
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
