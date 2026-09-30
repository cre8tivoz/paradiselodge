import {
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoToneMapping,
  Object3D,
  OrthographicCamera,
  PointLight,
  SpotLight,
  Vector3,
} from 'three'
import type { Light, Material, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { installHeightFog } from './height-fog.ts'
import {
  ageClone,
  ceilingMaterial,
  darkWoodMaterial,
  floorMaterial,
  isStandard,
  upholsteryMaterial,
  wallMaterial,
  whenLookTexturesReady,
} from '../materials/look.ts'
import {
  bankersLamp,
  corners,
  dustMotes,
  initAreaLights,
  pendant,
  sconce,
  SKY_FILL,
  sunBeam,
  SUN,
  tableLamp,
  tickShaders,
  TUNGSTEN,
  windowFill,
} from './practicals.ts'
import { buildPost, GRADES } from './post.ts'
import type { Grade } from './post.ts'
import { cigarettes, crt, curtain, frostedWindow, keysInRack, papers } from '../world/dusk-dressing.ts'
import { buildExteriorDressing, installSkyEnvironment, tuneExteriorMaterials } from '../world/exterior-dusk.ts'

/**
 * Dusk look for Scene 1. Code lights and a film grade replace the baked
 * indirect maps in reception, the parlour, the stairs and the hall. Room 1A
 * keeps its lightmaps, pulled down so the grade does not blow them out.
 * `?look=day` never calls this.
 *
 * Lights outside the room Miller is standing in are switched off. The sun
 * shadow map is not refreshed every frame.
 */

type Preset = 'outside' | 'reception' | 'parlour' | 'hall' | 'upstairs'
type UnitSpace = 'room1a' | 'parlour' | 'reception' | 'staircase' | 'hallway'

const SPACES: readonly UnitSpace[] = ['room1a', 'parlour', 'reception', 'staircase', 'hallway']
const DUSK_DIR = new Vector3(0.16, -0.4, 0.9).normalize()
const ROOM1A_LIGHTMAP = 6

interface ManagedLight {
  readonly light: Light
  readonly intensity: number
  readonly presets: readonly Preset[]
}

interface ManagedFx {
  readonly object: Object3D
  readonly presets: readonly Preset[]
}

export interface DuskLook {
  update(elapsed: number, playerPos: Vector3): void
  render(): void
}

export interface DuskInput {
  readonly renderer: WebGLRenderer
  readonly scene: Scene
  readonly camera: PerspectiveCamera
  readonly interior: Object3D
  readonly lodge: Object3D
  readonly exterior: Object3D
  readonly commodore: Object3D
  readonly sun: DirectionalLight
}

function spaceOf(object: Object3D): UnitSpace | undefined {
  for (let node: Object3D | null = object; node !== null; node = node.parent) {
    const tagged = node.userData.unit_a_space
    if (typeof tagged === 'string' && (SPACES as readonly string[]).includes(tagged)) {
      return tagged as UnitSpace
    }
    if (node.name.startsWith('reception_')) return 'reception'
    if (node.name.startsWith('parlour_')) return 'parlour'
    if (node.name.startsWith('staircase_')) return 'staircase'
    if (node.name.startsWith('first_floor_hall_')) return 'hallway'
  }
  return undefined
}

function presetAt(p: Vector3): Preset {
  const outside = p.z < 0.05 || p.x < -6.65 || p.x > 6.55 || p.z > 10.8 || p.y < -0.05
  if (outside) return 'outside'
  if (p.y > 3.15) return 'upstairs'
  if (p.x > 1.55 && p.z < 5.25) return 'reception'
  if (p.x < -1.55 && p.z < 5.25) return 'parlour'
  return 'hall'
}

function gradeFor(preset: Preset): Grade {
  return preset === 'outside' ? GRADES.exterior : GRADES.interior
}

export async function installDuskLook(input: DuskInput): Promise<DuskLook> {
  const { renderer, scene, camera, interior, sun } = input
  installHeightFog(-0.85, 0.28)
  initAreaLights()
  renderer.toneMapping = NoToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.autoUpdate = false
  renderer.setClearColor(0x07060a, 1)
  camera.far = 140
  camera.updateProjectionMatrix()

  scene.fog = new FogExp2(new Color(0.18, 0.11, 0.07), 0.013)
  const sky = installSkyEnvironment(renderer, scene, DUSK_DIR.clone().negate())
  tuneExteriorMaterials(input.exterior, input.lodge, input.commodore)
  restyleInterior(interior)

  const focus = new Vector3(0.2, 1.4, 3.4)
  sun.color.copy(SUN)
  sun.intensity = 2.05
  sun.position.copy(focus).addScaledVector(DUSK_DIR, -32)
  sun.target.position.copy(focus)
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.bias = -0.00045
  sun.shadow.normalBias = 0.045
  if (sun.shadow.camera instanceof OrthographicCamera) {
    sun.shadow.camera.left = -22
    sun.shadow.camera.right = 22
    sun.shadow.camera.top = 16
    sun.shadow.camera.bottom = -16
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 72
    sun.shadow.camera.updateProjectionMatrix()
  }

  const root = new Group()
  root.name = 'dusk-look'
  scene.add(root)

  const managed: ManagedLight[] = []
  const managedFx: ManagedFx[] = []
  const fx: Object3D[] = [sky]
  const shaders: Object3D[] = [sky]
  const updaters: Array<(time: number) => void> = []

  const track = (light: Light, presets: readonly Preset[]): void => {
    managed.push({ light, intensity: light.intensity, presets })
  }
  const trackMany = (lights: readonly Light[], presets: readonly Preset[]): void => {
    for (const light of lights) track(light, presets)
  }
  const addFx = (object: Object3D, presets: readonly Preset[]): void => {
    root.add(object)
    managedFx.push({ object, presets })
    fx.push(object)
    shaders.push(object)
  }

  const lamp = bankersLamp(new Vector3(4.9, 1.14, 2.42))
  root.add(lamp.root)
  const spot = lamp.lights[0]
  const spill = lamp.lights[1]
  if (spot !== undefined) track(spot, ['reception'])
  if (spill !== undefined) track(spill, ['reception', 'hall', 'outside'])

  const recPend = pendant(new Vector3(4.35, 2.55, 2.1), 8, 0.7)
  root.add(recPend.root)
  trackMany(recPend.lights, ['reception', 'hall', 'outside'])

  const sconceA = sconce(new Vector3(2.25, 2.05, 5.03), new Vector3(0, 0, -1), 2)
  const sconceB = sconce(new Vector3(5.75, 2.05, 5.03), new Vector3(0, 0, -1), 2)
  root.add(sconceA.root, sconceB.root)
  trackMany(sconceA.lights, ['reception'])
  trackMany(sconceB.lights, ['reception'])

  const recWin = windowFill(new Vector3(3.1, 1.85, -0.04), 1.1, 1.7, 2, SKY_FILL, new Vector3(0, 0, 1))
  root.add(recWin.root)
  trackMany(recWin.lights, ['reception', 'hall', 'outside'])

  const hallPend = pendant(new Vector3(0.15, 2.55, 3.6), 12, 0.65)
  root.add(hallPend.root)
  trackMany(hallPend.lights, ['hall', 'reception', 'parlour', 'outside', 'upstairs'])

  const hallSconce = sconce(new Vector3(1.55, 2.25, 6.6), new Vector3(-1, 0, 0), 2.2)
  root.add(hallSconce.root)
  trackMany(hallSconce.lights, ['hall', 'upstairs'])

  const landing = sconce(new Vector3(-1.0, 5.15, 10.35), new Vector3(0, 0, -1), 2.6)
  root.add(landing.root)
  trackMany(landing.lights, ['hall', 'upstairs'])

  const upper = pendant(new Vector3(-0.6, 5.7, 8.4), 7, 0.55)
  root.add(upper.root)
  trackMany(upper.lights, ['upstairs', 'hall'])

  const doorFill = windowFill(
    new Vector3(0, 1.35, -0.05),
    1.1,
    2.0,
    1.4,
    new Color(1, 0.84, 0.62),
    new Vector3(0, 0, 1),
  )
  root.add(doorFill.root)
  trackMany(doorFill.lights, ['hall', 'outside', 'reception'])

  const parlourLamp = glowExisting(interior.getObjectByName('standardLamp'), root)
  if (parlourLamp !== undefined) track(parlourLamp, ['parlour', 'hall', 'outside'])

  const table = tableLamp(new Vector3(-4.05, 0.5, 2.15), 2.8)
  root.add(table.root)
  trackMany(table.lights, ['parlour'])

  const tvLight = televisionGlow(interior.getObjectByName('television'), root, updaters)
  if (tvLight !== undefined) track(tvLight, ['parlour', 'hall'])

  const beamDir = DUSK_DIR.clone()
  const recCorners = corners(2.63, 3.57, 1.02, 2.65, -0.02)
  addFx(sunBeam(recCorners, beamDir, 4.2, 0.32), ['reception', 'hall', 'outside'])
  addFx(dustMotes(recCorners, beamDir, 4.2, 500), ['reception', 'hall', 'outside'])
  const doorCorners = corners(-0.5, 0.5, 0.1, 2.1, -0.08)
  addFx(sunBeam(doorCorners, beamDir, 4.2, 0.06), ['hall', 'outside'])
  addFx(dustMotes(doorCorners, beamDir, 4.2, 220), ['hall', 'outside'])
  for (const cx of [-5.35, -3.05]) {
    const gap = corners(cx - 0.06, cx + 0.08, 1.05, 2.6, -0.02)
    addFx(sunBeam(gap, beamDir, 3.8, 0.42), ['parlour', 'hall', 'outside'])
    addFx(dustMotes(gap, beamDir, 3.8, 140), ['parlour', 'outside'])
    const fill = windowFill(new Vector3(cx, 1.8, -0.04), 0.2, 1.6, 2.4, SKY_FILL, new Vector3(0, 0, 1))
    root.add(fill.root)
    trackMany(fill.lights, ['parlour', 'hall', 'outside'])
    hangCurtains(root, cx)
  }
  hangCurtains(root, 3.1)

  root.add(papers(new Vector3(5.2, 1.16, 2.55), 4, 4))
  root.add(cigarettes(cigarettePoint(interior), 4))
  root.add(keysInRack(new Box3(new Vector3(2.62, 1.45, 4.82), new Vector3(5.15, 2.45, 5.02)), 8, 4))
  const screen = crt(new Vector3(6.0, 0.78, 3.85), -0.4)
  root.add(screen.root)
  updaters.push(screen.update)
  screen.root.traverse((object) => {
    if (object instanceof PointLight) track(object, ['reception', 'hall'])
  })
  const cabinet = new Mesh(new BoxGeometry(0.48, 0.72, 0.42), darkWoodMaterial(0.5))
  cabinet.position.set(6.0, 0.36, 3.85)
  cabinet.castShadow = true
  cabinet.receiveShadow = true
  root.add(cabinet)
  root.add(frostedWindow(new Vector3(0.7, 1.75, 10.32), 0.7, 1.15, new Vector3(0, 0, -1)))

  const outside = buildExteriorDressing()
  root.add(outside.root)
  for (const light of outside.lights) {
    const presets: readonly Preset[] = light instanceof SpotLight ? ['outside'] : ['outside', 'hall', 'reception']
    track(light, presets)
  }
  fx.push(...outside.fx)
  shaders.push(...outside.fx)
  updaters.push(outside.update)

  const post = buildPost(renderer, scene, camera, () => fx)
  let preset: Preset = 'outside'
  let grade: Grade = GRADES.exterior
  let frame = 0
  let shadowDirty = true
  let elapsed = 0

  const applyPreset = (next: Preset): void => {
    for (const item of managed) {
      const on = item.presets.includes(next)
      item.light.visible = on
      if (on) item.light.intensity = item.intensity
    }
    for (const item of managedFx) item.object.visible = item.presets.includes(next)
    const nextGrade = gradeFor(next)
    if (nextGrade !== grade) {
      grade = nextGrade
      post.applyGrade(grade)
    }
  }
  applyPreset('outside')

  const onResize = (): void => {
    post.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  await waitForTextures()

  return {
    update(time: number, playerPos: Vector3): void {
      elapsed = time
      const next = presetAt(playerPos)
      if (next !== preset) {
        preset = next
        applyPreset(next)
        shadowDirty = true
      }
      tickShaders(shaders, time)
      for (const fn of updaters) fn(time)
    },
    render(): void {
      frame += 1
      if (shadowDirty || frame <= 2 || frame % 8 === 0) {
        renderer.shadowMap.needsUpdate = true
        shadowDirty = false
      }
      post.setTime(elapsed)
      post.render()
    },
  }
}

function hangCurtains(parent: Group, cx: number): void {
  const net = curtain(1.05, 1.65, 10, 0.012, 0xf2e6cc, true)
  net.position.set(cx, 1.02, 0.08)
  parent.add(net)
  for (const dx of [-0.4, 0.4]) {
    const drape = curtain(0.58, 2.4, 5, 0.04, 0x4a1210, false)
    drape.position.set(cx + dx, 0.32, 0.14)
    parent.add(drape)
  }
}

function cigarettePoint(interior: Object3D): Vector3 {
  const ash = interior.getObjectByName('ashtray')
  if (ash === undefined) return new Vector3(3.65, 1.16, 2.28)
  const box = new Box3().setFromObject(ash)
  const center = box.getCenter(new Vector3())
  center.y = box.max.y + 0.005
  return center
}

function glowExisting(object: Object3D | undefined, parent: Group): PointLight | undefined {
  if (object === undefined) return undefined
  const box = new Box3().setFromObject(object)
  if (box.isEmpty()) return undefined
  const light = new PointLight(TUNGSTEN, 6, 7, 2)
  light.position.set((box.min.x + box.max.x) * 0.5, box.max.y - 0.08, (box.min.z + box.max.z) * 0.5)
  parent.add(light)
  const seen = new Map<string, MeshStandardMaterial>()
  object.traverse((node) => {
    if (!(node instanceof Mesh) || !isStandard(node.material)) return
    let mat = seen.get(node.material.uuid)
    if (mat === undefined) {
      mat = node.material.clone()
      mat.emissive.setRGB(1, 0.6, 0.28)
      mat.emissiveIntensity = 0.65
      mat.lightMap = null
      seen.set(node.material.uuid, mat)
    }
    node.material = mat
  })
  return light
}

function televisionGlow(
  object: Object3D | undefined,
  parent: Group,
  updaters: Array<(time: number) => void>,
): PointLight | undefined {
  if (object === undefined) return undefined
  const box = new Box3().setFromObject(object)
  if (box.isEmpty()) return undefined
  const center = box.getCenter(new Vector3())
  const intoRoom = new Vector3(-3.2, center.y, 2.4).sub(center)
  if (intoRoom.lengthSq() < 1e-4) intoRoom.set(1, 0, 0)
  intoRoom.normalize()
  const light = new PointLight(new Color(0.5, 0.7, 1), 0.85, 4, 2)
  light.position.copy(center).addScaledVector(intoRoom, 0.35)
  parent.add(light)
  updaters.push((time) => {
    const f = 0.8 + 0.2 * Math.sin(time * 7.3) * Math.sin(time * 2.9)
    if (light.visible) light.intensity = 0.85 * f
  })
  return light
}

function restyleInterior(root: Object3D): void {
  const wall = wallMaterial()
  const ceiling = ceilingMaterial()
  const wood = darkWoodMaterial(0.42)
  const boards = floorMaterial()
  const panel = darkWoodMaterial(0.55)
  const fabric = upholsteryMaterial()
  const glass = new MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.06,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
  })

  const materialsOf = (mesh: Mesh): Material[] =>
    Array.isArray(mesh.material) ? mesh.material : [mesh.material]

  root.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const space = spaceOf(object)
    if (space === 'room1a') {
      for (const material of materialsOf(object)) {
        if (isStandard(material) && material.lightMap !== null) material.lightMapIntensity = ROOM1A_LIGHTMAP
      }
      return
    }
    if (space === undefined) return
    object.castShadow = true
    object.receiveShadow = true
    const next = materialsOf(object).map((material) => {
      if (!isStandard(material)) return material
      const name = material.name
      if (name === 'plaster_nicotine' || name === 'wallpaper') return wall
      if (name === 'plaster_cornice' || name === 'plaster') return ceiling
      if (name === 'timber_dark' || name === 'timber') return wood
      if (name === 'boards_worn' || name === 'floorboards') return boards
      if (name === 'unit_a_glass' || name === 'glass') {
        object.castShadow = false
        return glass
      }
      if (name === 'unit_a_parlour_upholstery') return fabric
      if (name.startsWith('carpet')) return ageClone(material, [1, 0.72, 0.52], 0.95)
      if (name === 'unit_a_brass_verdigris') return ageClone(material, [0.9, 0.75, 0.5], 0.4)
      return ageClone(material, [0.92, 0.8, 0.64], null)
    })
    const first = next[0]
    if (first === undefined) return
    object.material = Array.isArray(object.material) ? next : first
  })

  root.traverse((object) => {
    if (!(object instanceof Mesh)) return
    if (spaceOf(object) === 'room1a') return
    if (/staircase_wall|hall_wall|first_floor_hall_wall/.test(object.name)) object.material = wall
  })

  const desk = root.getObjectByName('desk')
  desk?.traverse((object) => {
    if (object instanceof Mesh) object.material = panel
  })
}

function waitForTextures(): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, 8000)
    void whenLookTexturesReady().then(() => {
      window.clearTimeout(timer)
      resolve()
    })
  })
}
