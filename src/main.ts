import './style.css'
import * as THREE from 'three'

/**
 * Toolchain smoke test only. Confirms Vite, TypeScript strict, and a WebGL2
 * context on three r180. Delete this file when build order step 1 (the player
 * controller) lands. See CLAUDE.md.
 */

const canvas = document.querySelector<HTMLCanvasElement>('#game')
const hud = document.querySelector<HTMLDivElement>('#hud')

if (canvas === null || hud === null) {
  throw new Error('index.html is missing #game or #hud')
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight, false)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)

renderer.render(scene, camera)

const webgl2 = renderer.getContext() instanceof WebGL2RenderingContext

hud.textContent = [
  'THE PARADISE LODGE',
  `three r${THREE.REVISION}`,
  webgl2 ? 'WebGL2 ok' : 'WebGL2 UNAVAILABLE',
  'scaffold only, nothing built yet',
].join('  //  ')
hud.style.padding = '1rem'
hud.style.fontSize = '0.75rem'
hud.style.letterSpacing = '0.08em'

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.render(scene, camera)
})
