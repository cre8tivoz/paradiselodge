import {
  EquirectangularReflectionMapping,
  Euler,
  PMREMGenerator,
  type DataTexture,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

/**
 * Image-based lighting.
 *
 * The room used to be lit by two AmbientLights and a HemisphereLight standing
 * in for bounce. Flat fill has no direction and no colour variation, so every
 * shaded surface came back the same muddy value and the only thing separating
 * anything from anything else was the sun. That is why the room read as a
 * render and not as a photograph.
 *
 * An HDRI is that fill measured off the real world: sky above, warm ground
 * bounce below, greenery and terracotta round the sides. It costs one texture
 * and it replaces every fill light in the scene.
 *
 * Poly Haven `balcony`, CC0, Greg Zaal. Partly cloudy morning-afternoon on a
 * suburban deck. Trees and a tiled roof are what a first floor sash looks out
 * at, so it works as the view as well as the light.
 */

const HDRI_URL = 'env/balcony_2k.hdr'

/**
 * How much of the environment lands.
 *
 * Below 1 on purpose. Three applies an environment map with no occlusion at
 * all, so a wall two rooms deep inside the lodge takes the full open sky the
 * same as the verandah does. At 1 the interior floods and goes flat, which is
 * the same failure the ambient lights had, only better coloured.
 *
 * The complete interior now carries baked indirect maps. Keep this paired with
 * the lightmap intensity until the authored exterior is complete, then balance
 * both once in the Scene 1 release-candidate pass.
 */
const INTENSITY = 0.3

/**
 * Yaw applied to both the lighting and the backdrop.
 *
 * The HDRI's sun sits over its own deck. Turning it puts the bright quarter of
 * the sky on +X, which is the side 1A's sash faces and where the directional
 * sun comes from, so the fill agrees with the beam instead of fighting it.
 */
const ROTATION = new Euler(0, Math.PI * 0.62, 0)

export interface Environment {
  /** PMREM output. Assign to `scene.environment`. */
  readonly envMap: Texture
  /** Full resolution equirect. Assign to `scene.background`. */
  readonly background: Texture
  /** Wires both onto a scene, with the intensity and rotation that go with them. */
  apply(scene: Scene): void
  dispose(): void
}

/**
 * Loads the HDRI and prefilters it.
 *
 * The PMREM output is a small mip chain and looks smeared if it is used as the
 * backdrop, so the raw equirect is kept for `scene.background` and the
 * prefiltered one is used for lighting. That is the standard split and it is
 * two textures on purpose.
 */
export async function loadEnvironment(renderer: WebGLRenderer): Promise<Environment> {
  const hdr: DataTexture = await new RGBELoader().loadAsync(HDRI_URL)
  hdr.mapping = EquirectangularReflectionMapping

  const pmrem = new PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const target = pmrem.fromEquirectangular(hdr)
  pmrem.dispose()

  return {
    envMap: target.texture,
    background: hdr,
    apply(scene: Scene): void {
      scene.environment = target.texture
      scene.background = hdr
      scene.environmentIntensity = INTENSITY
      scene.environmentRotation.copy(ROTATION)
      scene.backgroundRotation.copy(ROTATION)
    },
    dispose(): void {
      target.dispose()
      hdr.dispose()
    },
  }
}
