import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RectAreaLight,
  ShaderMaterial,
  SphereGeometry,
  SpotLight,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  AdditiveBlending,
  BufferAttribute,
} from 'three'
import type { Light, Object3D } from 'three'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { NOISE_GLSL } from '../materials/look.ts'

/**
 * Tungsten practicals, window rect lights, and the fake sun shaft.
 * Ported from the look test. Shadow maps are limited to the banker's lamp;
 * the sun is the other caster, and both stay static between updates.
 */

export const TUNGSTEN = new Color().setRGB(1.0, 0.62, 0.3)
export const TUNGSTEN_WARM = new Color().setRGB(1.0, 0.52, 0.2)
export const SKY_FILL = new Color().setRGB(0.55, 0.7, 0.95)
export const SUN = new Color().setRGB(1.0, 0.72, 0.42)
export const SODIUM = new Color().setRGB(1.0, 0.55, 0.18)
export const NEON_PINK = new Color().setRGB(1.0, 0.08, 0.42)
export const NEON_CYAN = new Color().setRGB(0.1, 0.85, 1.0)

let areaLightsReady = false

export function initAreaLights(): void {
  if (areaLightsReady) return
  RectAreaLightUniformsLib.init()
  areaLightsReady = true
}

export interface Practical {
  readonly root: Group
  readonly lights: Light[]
}

const emissive = (c: Color, i: number): MeshStandardMaterial =>
  new MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i, toneMapped: false })

function shadowSpot(light: SpotLight, size: number): void {
  light.castShadow = true
  light.shadow.mapSize.set(size, size)
  light.shadow.bias = -0.0006
  light.shadow.normalBias = 0.02
  light.shadow.camera.near = 0.08
  light.shadow.camera.far = 8
}

export function bankersLamp(pos: Vector3, rotY = 0, intensity = 7, spill = 2.2): Practical {
  const g = new Group()
  g.position.copy(pos)
  g.rotation.y = rotY
  g.name = 'ld_bankers_lamp'
  const brass = new MeshStandardMaterial({ color: 0x8a6a32, metalness: 0.9, roughness: 0.35 })
  const base = new Mesh(new CylinderGeometry(0.09, 0.1, 0.03, 20), brass)
  base.position.y = 0.015
  const stem = new Mesh(new CylinderGeometry(0.012, 0.012, 0.32, 8), brass)
  stem.position.y = 0.17
  const shadeGeo = new CylinderGeometry(0.085, 0.085, 0.34, 20, 1, true, -Math.PI / 2, Math.PI)
  shadeGeo.rotateX(-Math.PI / 2)
  shadeGeo.rotateY(Math.PI / 2)
  const shade = new Mesh(
    shadeGeo,
    new MeshPhysicalMaterial({
      color: 0x0a3f1c,
      roughness: 0.15,
      clearcoat: 1,
      emissive: 0x0c4a20,
      emissiveIntensity: 0.6,
      side: DoubleSide,
    }),
  )
  shade.position.set(0, 0.34, 0.03)
  const inner = new Mesh(new PlaneGeometry(0.3, 0.12), emissive(TUNGSTEN, 5))
  inner.rotation.x = Math.PI / 2
  inner.position.set(0, 0.335, 0.03)
  const arm = new Mesh(new CylinderGeometry(0.008, 0.008, 0.1, 6), brass)
  arm.position.set(0, 0.36, 0)
  arm.rotation.x = Math.PI / 2
  g.add(arm)
  for (const m of [base, stem, shade]) {
    m.castShadow = true
    m.receiveShadow = true
    g.add(m)
  }
  g.add(inner)
  const spot = new SpotLight(TUNGSTEN, intensity, 6, Math.PI * 0.42, 0.75, 2)
  spot.position.set(0, 0.32, 0.03)
  spot.target.position.set(0, -1, 0.2)
  shadowSpot(spot, 512)
  g.add(spot, spot.target)
  const spillL = new PointLight(TUNGSTEN, spill, 3.5, 2)
  spillL.position.set(0, 0.28, 0.12)
  g.add(spillL)
  return { root: g, lights: [spot, spillL] }
}

export function pendant(pos: Vector3, intensity = 10, drop = 0.7): Practical {
  const g = new Group()
  g.position.copy(pos)
  g.name = 'ld_pendant'
  const flex = new Mesh(
    new CylinderGeometry(0.005, 0.005, drop, 6),
    new MeshStandardMaterial({ color: 0x1b140e }),
  )
  flex.position.y = drop / 2
  g.add(flex)
  const shade = new Mesh(
    new CylinderGeometry(0.14, 0.3, 0.26, 24, 1, true),
    new MeshStandardMaterial({
      color: 0xd9b98a,
      roughness: 0.9,
      side: DoubleSide,
      emissive: TUNGSTEN,
      emissiveIntensity: 0.55,
    }),
  )
  g.add(shade)
  const bulb = new Mesh(new SphereGeometry(0.045, 12, 10), emissive(TUNGSTEN, 18))
  bulb.position.y = -0.04
  g.add(bulb)
  const spot = new SpotLight(TUNGSTEN, intensity, 9, Math.PI * 0.36, 0.6, 2)
  spot.position.set(0, -0.02, 0)
  spot.target.position.set(0, -2, 0)
  g.add(spot, spot.target)
  const up = new PointLight(TUNGSTEN, intensity * 0.18, 5, 2)
  up.position.y = 0.05
  g.add(up)
  return { root: g, lights: [spot, up] }
}

export function sconce(pos: Vector3, facing: Vector3, intensity = 2.2): Practical {
  const g = new Group()
  g.position.copy(pos)
  g.name = 'ld_sconce'
  const brass = new MeshStandardMaterial({ color: 0x7a5a28, metalness: 0.9, roughness: 0.4 })
  const plate = new Mesh(new CylinderGeometry(0.05, 0.05, 0.02, 12), brass)
  plate.rotation.x = Math.PI / 2
  g.add(plate)
  const arm = new Mesh(new CylinderGeometry(0.008, 0.008, 0.16, 6), brass)
  arm.rotation.x = Math.PI / 2
  arm.position.z = 0.08
  g.add(arm)
  const tulip = new Mesh(
    new SphereGeometry(0.075, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
    new MeshStandardMaterial({
      color: 0xf0d8a8,
      emissive: TUNGSTEN,
      emissiveIntensity: 3.5,
      side: DoubleSide,
      transparent: true,
      opacity: 0.95,
    }),
  )
  tulip.position.set(0, 0.04, 0.16)
  g.add(tulip)
  g.lookAt(pos.clone().add(facing))
  const light = new PointLight(TUNGSTEN, intensity, 4.5, 2)
  light.position.set(0, 0.06, 0.16)
  g.add(light)
  return { root: g, lights: [light] }
}

export function standardLamp(pos: Vector3, intensity = 6): Practical {
  const g = new Group()
  g.position.copy(pos)
  g.name = 'ld_standard_lamp'
  const brass = new MeshStandardMaterial({ color: 0x6e5226, metalness: 0.85, roughness: 0.45 })
  const base = new Mesh(new CylinderGeometry(0.12, 0.16, 0.05, 16), brass)
  base.position.y = 0.025
  g.add(base)
  const pole = new Mesh(new CylinderGeometry(0.014, 0.018, 1.45, 8), brass)
  pole.position.y = 0.75
  g.add(pole)
  const shade = new Mesh(
    new CylinderGeometry(0.17, 0.27, 0.32, 24, 1, true),
    new MeshStandardMaterial({
      color: 0xf2dcae,
      emissive: new Color(1.0, 0.68, 0.36),
      emissiveIntensity: 2.4,
      side: DoubleSide,
      roughness: 1,
    }),
  )
  shade.position.y = 1.62
  g.add(shade)
  const fringe = new Mesh(
    new CylinderGeometry(0.275, 0.285, 0.05, 32, 1, true),
    new MeshStandardMaterial({
      color: 0xd9bb88,
      emissive: new Color(1.0, 0.62, 0.3),
      emissiveIntensity: 1.2,
      side: DoubleSide,
      transparent: true,
      opacity: 0.85,
    }),
  )
  fringe.position.y = 1.44
  g.add(fringe)
  base.castShadow = true
  pole.castShadow = true
  const light = new PointLight(TUNGSTEN_WARM, intensity, 7, 2)
  light.position.y = 1.6
  g.add(light)
  return { root: g, lights: [light] }
}

export function tableLamp(pos: Vector3, intensity = 3.2): Practical {
  const g = new Group()
  g.position.copy(pos)
  g.name = 'ld_table_lamp'
  const body = new Mesh(
    new SphereGeometry(0.09, 16, 12),
    new MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.3 }),
  )
  body.scale.y = 1.3
  body.position.y = 0.12
  g.add(body)
  const shade = new Mesh(
    new CylinderGeometry(0.13, 0.2, 0.22, 20, 1, true),
    new MeshStandardMaterial({
      color: 0xe8c690,
      emissive: TUNGSTEN_WARM,
      emissiveIntensity: 1.6,
      side: DoubleSide,
      roughness: 1,
    }),
  )
  shade.position.y = 0.43
  g.add(shade)
  const light = new PointLight(TUNGSTEN_WARM, intensity, 6, 2)
  light.position.y = 0.41
  g.add(light)
  return { root: g, lights: [light] }
}

export function windowFill(
  center: Vector3,
  width: number,
  height: number,
  intensity: number,
  color: Color,
  facing: Vector3,
): Practical {
  const g = new Group()
  g.name = 'ld_window_fill'
  const ra = new RectAreaLight(color, intensity, width, height)
  ra.position.copy(center).addScaledVector(facing, 0.02)
  ra.lookAt(center.clone().add(facing))
  g.add(ra)
  return { root: g, lights: [ra] }
}

const BEAM_STEPS = 12

export function sunBeam(corners: [Vector3, Vector3, Vector3, Vector3], dir: Vector3, length: number, strength: number): Mesh {
  const d = dir.clone().normalize()
  const far = corners.map((c) => c.clone().addScaledVector(d, length))
  const pos: number[] = []
  const quad = (a: Vector3, b: Vector3, c: Vector3, e: Vector3): void => {
    pos.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...e.toArray())
  }
  for (let i = 0; i < 4; i += 1) {
    const j = (i + 1) % 4
    const a = corners[i]
    const b = corners[j]
    const c = far[j]
    const e = far[i]
    if (a === undefined || b === undefined || c === undefined || e === undefined) continue
    quad(a, b, c, e)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.computeBoundingSphere()
  const o = corners[0]
  const ax = corners[1].clone().sub(o)
  const ay = corners[3].clone().sub(o)
  const mat = new ShaderMaterial({
    uniforms: {
      uO: { value: o },
      uAx: { value: ax },
      uAy: { value: ay },
      uD: { value: d },
      uLen: { value: length },
      uColor: { value: SUN.clone().multiplyScalar(strength) },
      uTime: { value: 0 },
    },
    vertexShader:
      'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader:
      NOISE_GLSL +
      `
      uniform vec3 uO, uAx, uAy, uD, uColor; uniform float uLen, uTime; varying vec3 vW;
      void main(){
        vec3 ro = cameraPosition; vec3 rd = normalize(vW - ro);
        float tEnd = length(vW - ro);
        float acc = 0.0; const int N = ${BEAM_STEPS};
        float t0 = tEnd; float t1 = tEnd + 4.0;
        for(int i=0;i<N;i++){
          float t = mix(t0, t1, (float(i)+0.5)/float(N));
          vec3 p = ro + rd*t;
          vec3 n = normalize(cross(uAx, uAy));
          float s = dot(p - uO, n) / dot(uD, n);
          if (s < 0.0 || s > uLen) continue;
          vec3 q = p - uD*s - uO;
          float u = dot(q, uAx)/dot(uAx,uAx), v = dot(q, uAy)/dot(uAy,uAy);
          float edge = smoothstep(0.0, 0.08, u)*smoothstep(1.0, 0.92, u)*smoothstep(0.0, 0.06, v)*smoothstep(1.0, 0.94, v);
          edge *= 1.0 - 0.85*exp(-pow((v-0.51)*38.0, 2.0));
          float fall = exp(-s*0.35) * smoothstep(0.0, 0.3, s);
          float dust = 0.55 + 0.9*ld_fbm(p*2.2 + vec3(0.0, uTime*0.05, uTime*0.03));
          acc += edge*fall*dust;
        }
        acc *= (t1 - t0)/float(N);
        gl_FragColor = vec4(uColor*acc, 1.0);
      }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    fog: false,
  })
  const mesh = new Mesh(geo, mat)
  mesh.name = 'ld_sun_beam'
  mesh.renderOrder = 10
  return mesh
}

export function dustMotes(corners: [Vector3, Vector3, Vector3, Vector3], dir: Vector3, length: number, count: number): Points {
  const d = dir.clone().normalize()
  const o = corners[0]
  const ax = corners[1].clone().sub(o)
  const ay = corners[3].clone().sub(o)
  const P = new Float32Array(count * 3)
  const R = new Float32Array(count)
  const spread = 0.25
  for (let i = 0; i < count; i += 1) {
    const u = -spread + Math.random() * (1 + 2 * spread)
    const v = -spread + Math.random() * (1 + 2 * spread)
    const s = Math.random() * length
    const p = o.clone().addScaledVector(ax, u).addScaledVector(ay, v).addScaledVector(d, s)
    P.set(p.toArray(), i * 3)
    R[i] = Math.random()
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(P, 3))
  geo.setAttribute('seed', new BufferAttribute(R, 1))
  geo.computeBoundingSphere()
  const n = new Vector3().crossVectors(ax, ay).normalize()
  const mat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uO: { value: o },
      uAx: { value: ax },
      uAy: { value: ay },
      uD: { value: d },
      uN: { value: n },
      uLen: { value: length },
      uColor: { value: SUN.clone().multiplyScalar(2.2) },
      uScale: { value: 1080 },
    },
    vertexShader: `attribute float seed; uniform float uTime, uLen, uScale; uniform vec3 uO, uAx, uAy, uD, uN; varying float vLit; varying float vA;
      void main(){
        vec3 p = position + vec3(sin(uTime*0.21 + seed*40.0), sin(uTime*0.13 + seed*17.0) - uTime*0.012, cos(uTime*0.17 + seed*29.0))*0.06;
        float s = dot(p - uO, uN)/dot(uD, uN); vec3 q = p - uD*s - uO;
        float u = dot(q,uAx)/dot(uAx,uAx), v = dot(q,uAy)/dot(uAy,uAy);
        vLit = step(0.0,u)*step(u,1.0)*step(0.0,v)*step(v,1.0)*step(0.0,s)*exp(-s*0.3);
        vA = 0.5 + 0.5*sin(uTime*1.3 + seed*60.0);
        vec4 mv = viewMatrix*modelMatrix*vec4(p,1.0);
        gl_Position = projectionMatrix*mv;
        gl_PointSize = min((0.004 + 0.006*seed) * uScale / -mv.z, 7.0);
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vLit; varying float vA;
      void main(){ vec2 c = gl_PointCoord - 0.5; float r = exp(-dot(c,c)*14.0);
        gl_FragColor = vec4(uColor*r*(0.006 + vLit)*(0.55+0.45*vA), 1.0); }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  })
  const pts = new Points(geo, mat)
  pts.name = 'ld_dust'
  pts.frustumCulled = false
  return pts
}

export function tickShaders(objects: readonly Object3D[], time: number): void {
  for (const object of objects) {
    const mat = 'material' in object ? object.material : undefined
    if (mat instanceof ShaderMaterial) {
      const u = mat.uniforms.uTime
      if (u !== undefined) u.value = time
    }
  }
}

export function corners(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z: number,
): [Vector3, Vector3, Vector3, Vector3] {
  return [
    new Vector3(x0, y0, z),
    new Vector3(x1, y0, z),
    new Vector3(x1, y1, z),
    new Vector3(x0, y1, z),
  ]
}
