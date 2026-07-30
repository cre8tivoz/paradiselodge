import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { CAMERA, RENDER } from '../core/config.ts'

export interface Viewport {
  readonly renderer: WebGLRenderer
  readonly camera: PerspectiveCamera
  dispose(): void
}

/**
 * Renderer and camera. Deliberately thin.
 *
 * Tone mapping is required once the sun is bright enough to make a beam: without
 * it, MeshStandardMaterial values above 1 clip to white and Crystal's cream
 * dress reads as a mannequin. ACES keeps the beam and stops the clip.
 */
export function createViewport(canvas: HTMLCanvasElement): Viewport {
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.maxPixelRatio))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = RENDER.exposure

  const camera = new PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)

  const resize = (): void => {
    const width = window.innerWidth
    const height = window.innerHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  resize()
  window.addEventListener('resize', resize)

  return {
    renderer,
    camera,
    dispose(): void {
      window.removeEventListener('resize', resize)
      renderer.dispose()
    },
  }
}
