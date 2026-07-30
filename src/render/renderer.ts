import {
  AgXToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { CAMERA, RENDER } from '../core/config.ts'

/**
 * Stops of exposure applied after AgX.
 *
 * Owned here rather than in core/config, because it is not a designer tunable
 * any more. It is the last number set in the render chain, after the
 * environment intensity and the sun, and it only means anything alongside them.
 */
const EXPOSURE = 1.0

export interface Viewport {
  readonly renderer: WebGLRenderer
  readonly camera: PerspectiveCamera
  dispose(): void
}

/**
 * Renderer and camera. Deliberately thin.
 *
 * AgX, not ACES. Both stop the sun clipping, but ACES pulls saturated highlights
 * hard toward orange, which on a room already carrying nicotine walls and a warm
 * sun turned every lit surface the same amber. AgX desaturates as it rolls off
 * instead, so a blown sash stays white and the dusty rose bedspread stays rose
 * where the beam lands on it.
 *
 * Exposure is tuned last, after the environment and the materials, because it is
 * the one control that hides mistakes in both.
 */
export function createViewport(canvas: HTMLCanvasElement): Viewport {
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.maxPixelRatio))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = AgXToneMapping
  renderer.toneMappingExposure = EXPOSURE

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
