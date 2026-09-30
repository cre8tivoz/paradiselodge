import {
  HalfFloatType,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three'
import type { Camera, Object3D, Scene, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { Pass } from 'three/addons/postprocessing/Pass.js'

/**
 * Film post. GTAO, bloom, then one grade pass: tungsten or dusk split-tone,
 * vignette, grain, a little chromatic aberration. DOF stays off in play.
 * The composer pixel ratio is capped so a retina framebuffer does not
 * quadruple the cost of the stack.
 */

export const POST_PIXEL_RATIO_CAP = 1.25

export interface Grade {
  exposure: number
  contrast: number
  saturation: number
  lift: readonly [number, number, number]
  gamma: readonly [number, number, number]
  gain: readonly [number, number, number]
  shadowTint: readonly [number, number, number]
  highlightTint: readonly [number, number, number]
  splitAmt: number
  vignette: number
  grain: number
  ca: number
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
}

export const GRADES: { readonly interior: Grade; readonly exterior: Grade } = {
  interior: {
    exposure: 0.72,
    contrast: 1.18,
    saturation: 0.9,
    lift: [0.016, 0.009, 0.003],
    gamma: [1.0, 1.02, 1.1],
    gain: [1.06, 0.97, 0.8],
    shadowTint: [0.52, 0.38, 0.22],
    highlightTint: [1.0, 0.86, 0.62],
    splitAmt: 0.22,
    vignette: 0.45,
    grain: 0.045,
    ca: 0.0016,
    bloomStrength: 0.35,
    bloomRadius: 0.55,
    bloomThreshold: 1.4,
  },
  exterior: {
    exposure: 1.2,
    contrast: 1.12,
    saturation: 1.02,
    lift: [0.012, 0.012, 0.028],
    gamma: [1.0, 1.0, 0.97],
    gain: [1.05, 0.97, 0.9],
    shadowTint: [0.3, 0.34, 0.5],
    highlightTint: [1.0, 0.8, 0.58],
    splitAmt: 0.25,
    vignette: 0.5,
    grain: 0.05,
    ca: 0.002,
    bloomStrength: 0.55,
    bloomRadius: 0.5,
    bloomThreshold: 2.2,
  },
}

const filmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new Vector2(1920, 1080) },
    uExposure: { value: 1 },
    uContrast: { value: 1 },
    uSat: { value: 1 },
    uLift: { value: new Vector3() },
    uGamma: { value: new Vector3(1, 1, 1) },
    uGain: { value: new Vector3(1, 1, 1) },
    uShadowTint: { value: new Vector3(1, 1, 1) },
    uHighTint: { value: new Vector3(1, 1, 1) },
    uSplit: { value: 0 },
    uVignette: { value: 0.4 },
    uGrain: { value: 0.04 },
    uCA: { value: 0.0015 },
  },
  vertexShader:
    'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime, uExposure, uContrast, uSat, uSplit, uVignette, uGrain, uCA; uniform vec2 uRes;
    uniform vec3 uLift, uGamma, uGain, uShadowTint, uHighTint; varying vec2 vUv;
    vec3 filmic(vec3 x){
      x = max(x, 0.0);
      vec3 l = clamp((log2(x + 1e-5) + 10.0) / 16.5, 0.0, 1.0);
      vec3 l2 = l*l, l4 = l2*l2;
      return clamp(15.5*l4*l2 - 40.14*l4*l + 31.96*l4 - 6.868*l2*l + 0.4298*l2 + 0.1191*l - 0.00232, 0.0, 1.0);
    }
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x+p3.y)*p3.z); }
    void main(){
      vec2 d = vUv - 0.5; float r2 = dot(d, d);
      vec2 off = d * uCA * (0.5 + 3.0*r2);
      vec3 hdr = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      vec3 c = filmic(hdr * uExposure);
      c = pow(max(c*uGain + uLift*(1.0 - c), 0.0), 1.0/uGamma);
      float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
      vec3 tint = mix(uShadowTint, uHighTint, smoothstep(0.05, 0.75, Y));
      c = mix(c, c * tint / max(dot(tint, vec3(0.2126,0.7152,0.0722)), 1e-3), uSplit);
      Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(Y), c, uSat);
      c = clamp((c - 0.42) * uContrast + 0.42, 0.0, 1.0);
      c = c*c*(3.0 - 2.0*c)*0.25 + c*0.75;
      float v = 1.0 - uVignette * smoothstep(0.08, 0.75, r2*1.9);
      c *= vec3(v, v*0.985, v*0.96);
      float g = h12(gl_FragCoord.xy + fract(uTime*7.13)*vec2(1733.0, 911.0)) + h12(gl_FragCoord.xy*1.7 + uTime*3.1) - 1.0;
      c += g * uGrain * (0.35 + 0.65*(1.0 - abs(Y*2.0 - 1.0)));
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
}

class VisibilityPass extends Pass {
  private readonly getObjects: () => readonly Object3D[]
  private readonly shown: boolean

  constructor(getObjects: () => readonly Object3D[], shown: boolean) {
    super()
    this.getObjects = getObjects
    this.shown = shown
    this.needsSwap = false
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ): void {
    void renderer
    void writeBuffer
    void readBuffer
    void deltaTime
    void maskActive
    for (const object of this.getObjects()) {
      if (this.shown) {
        if (object.userData.ldWasVisible === true) object.visible = true
      } else {
        object.userData.ldWasVisible = object.visible
        object.visible = false
      }
    }
  }
}

export interface PostStack {
  readonly composer: EffectComposer
  setSize(width: number, height: number): void
  applyGrade(grade: Grade): void
  setTime(time: number): void
  render(): void
}

export function postPixelRatio(): number {
  const dpr = window.devicePixelRatio
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1
  return Math.min(ratio, POST_PIXEL_RATIO_CAP)
}

export function buildPost(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  getFx: () => readonly Object3D[],
): PostStack {
  const pr = postPixelRatio()
  const width = window.innerWidth
  const height = window.innerHeight
  const rt = new WebGLRenderTarget(Math.floor(width * pr), Math.floor(height * pr), {
    type: HalfFloatType,
    samples: 0,
  })
  const composer = new EffectComposer(renderer, rt)
  composer.setPixelRatio(pr)
  composer.setSize(width, height)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new VisibilityPass(getFx, false))
  const gtao = new GTAOPass(scene, camera, width, height)
  gtao.updateGtaoMaterial({ radius: 0.4, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 8 })
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 8 })
  gtao.blendIntensity = 0.9
  composer.addPass(gtao)
  composer.addPass(new VisibilityPass(getFx, true))
  const sanitize = new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader:
      'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0); gl_FragColor = vec4(min(c.rgb, vec3(200.0)), 1.0); }`,
  })
  composer.addPass(sanitize)
  const bloom = new UnrealBloomPass(new Vector2(width, height), 0.35, 0.55, 1.4)
  composer.addPass(bloom)
  const film = new ShaderPass(filmShader)
  composer.addPass(film)
  const uniforms = film.uniforms

  const applyGrade = (grade: Grade): void => {
    uniforms.uExposure.value = grade.exposure
    uniforms.uContrast.value = grade.contrast
    uniforms.uSat.value = grade.saturation
    uniforms.uLift.value.set(grade.lift[0], grade.lift[1], grade.lift[2])
    uniforms.uGamma.value.set(grade.gamma[0], grade.gamma[1], grade.gamma[2])
    uniforms.uGain.value.set(grade.gain[0], grade.gain[1], grade.gain[2])
    uniforms.uShadowTint.value.set(grade.shadowTint[0], grade.shadowTint[1], grade.shadowTint[2])
    uniforms.uHighTint.value.set(grade.highlightTint[0], grade.highlightTint[1], grade.highlightTint[2])
    uniforms.uSplit.value = grade.splitAmt
    uniforms.uVignette.value = grade.vignette
    uniforms.uGrain.value = grade.grain
    uniforms.uCA.value = grade.ca
    bloom.strength = grade.bloomStrength
    bloom.radius = grade.bloomRadius
    bloom.threshold = grade.bloomThreshold
  }

  applyGrade(GRADES.exterior)

  return {
    composer,
    setSize(w: number, h: number): void {
      const ratio = postPixelRatio()
      composer.setPixelRatio(ratio)
      composer.setSize(w, h)
      uniforms.uRes.value.set(w, h)
    },
    applyGrade,
    setTime(time: number): void {
      uniforms.uTime.value = time
    },
    render(): void {
      composer.render()
    },
  }
}
