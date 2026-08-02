import { Mesh, type Group } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const MODEL_URL = `${import.meta.env.BASE_URL}models/commodore.glb`

/** Load the photo-matched VP Commodore at the existing street placement. */
export async function loadCommodore(): Promise<Group> {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL)
  const scene = gltf.scene
  scene.name = 'commodore-authored'
  scene.position.set(-3.8, -0.85, -5.2)
  scene.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow = true
      object.receiveShadow = true
    }
  })
  return scene
}
