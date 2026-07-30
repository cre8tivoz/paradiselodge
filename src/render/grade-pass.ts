/**
 * Fullscreen LUT grade pass.
 *
 * Scene renders with ACES into a target (display-referred). This pass samples
 * the 33³ LUT and blits to the canvas. Strength is how much of the grade lands;
 * 0.85 leaves a little of the raw ACES so blacks do not go nicotine-soup.
 */

import {
  LinearFilter,
  Mesh,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Scene as ThreeScene,
  type WebGLRenderer,
  type Texture,
} from 'three'
import { createGradeLut } from './grade.ts'

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAG = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform sampler2D tDiffuse;
uniform sampler3D tLut;
uniform float uStrength;
uniform float uLutSize;
varying vec2 vUv;

vec3 sampleLut(vec3 c) {
  float n = uLutSize;
  vec3 uvw = clamp(c, 0.0, 1.0) * ((n - 1.0) / n) + (0.5 / n);
  return texture(tLut, uvw).rgb;
}

void main() {
  vec3 src = texture2D(tDiffuse, vUv).rgb;
  vec3 graded = sampleLut(src);
  gl_FragColor = vec4(mix(src, graded, uStrength), 1.0);
}
`

export class GradePass {
  private readonly lut: Texture
  private readonly lutSize: number
  private readonly rt: WebGLRenderTarget
  private readonly fsScene = new Scene()
  private readonly fsCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly material: ShaderMaterial
  private readonly size = new Vector2()
  private readonly drawing = new Vector2()
  /** 0..1 blend toward the LUT. */
  strength = 0.85

  constructor() {
    const baked = createGradeLut()
    this.lut = baked.texture
    this.lutSize = baked.size

    this.rt = new WebGLRenderTarget(1, 1, {
      format: RGBAFormat,
      type: UnsignedByteType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: true,
    })
    this.rt.texture.name = 'grade-color'

    this.material = new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.rt.texture },
        tLut: { value: this.lut },
        uStrength: { value: this.strength },
        uLutSize: { value: this.lutSize },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
    })

    const quad = new Mesh(new PlaneGeometry(2, 2), this.material)
    quad.frustumCulled = false
    this.fsScene.add(quad)
  }

  setSize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width))
    const h = Math.max(1, Math.floor(height))
    if (this.size.x === w && this.size.y === h) {
      return
    }
    this.size.set(w, h)
    this.rt.setSize(w, h)
  }

  render(renderer: WebGLRenderer, scene: ThreeScene, camera: Camera): void {
    renderer.getDrawingBufferSize(this.drawing)
    this.setSize(this.drawing.x, this.drawing.y)

    const prevTone = renderer.toneMapping
    const prevTarget = renderer.getRenderTarget()

    renderer.setRenderTarget(this.rt)
    renderer.clear()
    renderer.render(scene, camera)

    this.material.uniforms.uStrength!.value = this.strength
    renderer.setRenderTarget(null)
    renderer.toneMapping = NoToneMapping
    renderer.render(this.fsScene, this.fsCamera)
    renderer.toneMapping = prevTone
    renderer.setRenderTarget(prevTarget)
  }

  dispose(): void {
    this.rt.dispose()
    this.lut.dispose()
    this.material.dispose()
  }
}
