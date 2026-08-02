import {
  Mesh,
  MeshStandardMaterial,
  type Group,
  type Material,
  type Object3D,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { tiled } from '../materials/textures.ts'

const MODEL_URL = `${import.meta.env.BASE_URL}models/lodge-exterior.glb`

export interface LodgeExterior {
  readonly scene: Group
  readonly neon: Object3D
}

function materialsOf(mesh: Mesh): Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material]
}

function tuneMaterial(material: Material): void {
  if (!(material instanceof MeshStandardMaterial)) return

  if (material.name === 'exterior_render_weathered') {
    material.color.set(0xb9ae98)
    material.map = tiled('render-cream', 4.5, 3.2)
    material.roughness = 0.92
  } else if (material.name === 'exterior_render_damp') {
    material.color.set(0x574f42)
    material.roughness = 0.98
  } else if (material.name === 'exterior_side_brick') {
    material.color.set(0x5c2d21)
    material.roughness = 0.94
  } else if (material.name === 'exterior_window_dark') {
    material.color.set(0x101820)
    material.metalness = 0.06
    material.roughness = 0.18
  } else if (material.name === 'exterior_iron') {
    material.color.set(0x151210)
    material.metalness = 0.72
    material.roughness = 0.44
  } else if (material.name.startsWith('exterior_neon_')) {
    material.toneMapped = false
    material.emissiveIntensity = 4.5
  } else if (material.name.startsWith('exterior_puddle')) {
    material.color.set(0x080d12)
    material.metalness = 0.12
    material.roughness = 0.08
  }
  material.needsUpdate = true
}

/** Load the Blender-authored facade over the collision-preserving lodge shell. */
export async function loadLodgeExterior(): Promise<LodgeExterior> {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL)
  const scene = gltf.scene
  scene.name = 'lodge-exterior'

  const remove: Object3D[] = []
  scene.traverse((object) => {
    if (
      object.name === 'exterior_front_door_dark' ||
      object.name.startsWith('exterior_front_door_panel_') ||
      object.name.startsWith('exterior_entry_step_') ||
      object.name === 'exterior_sidewalk' ||
      object.name === 'exterior_curb'
    ) {
      remove.push(object)
      return
    }
    if (object instanceof Mesh) {
      object.castShadow = !object.name.includes('road') && !object.name.includes('puddle')
      object.receiveShadow = true
      materialsOf(object).forEach(tuneMaterial)
    }
  })
  remove.forEach((object) => object.removeFromParent())

  const neon = scene.getObjectByName('exterior_neon_title')
  if (neon === undefined) throw new Error('Authored lodge exterior has no title neon')

  return { scene, neon }
}
