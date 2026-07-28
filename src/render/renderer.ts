import { PCFSoftShadowMap, PerspectiveCamera, WebGLRenderer } from 'three'
import { CAMERA, RENDER } from '../core/config.ts'

export interface Viewport {
  readonly renderer: WebGLRenderer
  readonly camera: PerspectiveCamera
  dispose(): void
}

/**
 * Renderer and camera. Deliberately thin.
 *
 * No tone mapping and no post yet. Room 1A's fixed sun is the thing that
 * decides the grade, and that is build order step 6. Setting it here would be
 * guessing at it three steps early.
 */
export function createViewport(canvas: HTMLCanvasElement): Viewport {
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.maxPixelRatio))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap

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
