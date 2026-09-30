import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  FogExp2,
  Group,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  RectAreaLight,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SpotLight,
  SRGBColorSpace,
  Vector3,
} from 'three'
import type { Light, Material, Object3D, WebGLRenderer } from 'three'
import { NOISE_GLSL } from '../materials/look.ts'
import { asphaltMaterial, isStandard, renderMaterial } from '../materials/look.ts'
import { NEON_CYAN, NEON_PINK, SODIUM } from '../render/practicals.ts'

/**
 * Dusk outside the lodge. Sky dome stands in for the balcony HDRI, the road
 * goes wet, sodium and the neon spill onto the render. Rain is a streak
 * field in front of the facade. No second scene render for the reflections:
 * the wet shader takes the sky probe, which is what an M1 can hold while
 * the post stack is on.
 */

const PATH_Y = -0.72

export function skyDome(sunDir: Vector3): Mesh {
  const mat = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uSun: { value: sunDir.clone().normalize() }, uTime: { value: 0 } },
    vertexShader:
      'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader:
      NOISE_GLSL +
      /* glsl */ `
      uniform vec3 uSun; uniform float uTime; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        float s = max(dot(d, uSun), 0.0);
        vec3 zenith = vec3(0.07, 0.065, 0.11);
        vec3 mid = vec3(0.62, 0.32, 0.22);
        vec3 horizon = vec3(2.1, 0.85, 0.3);
        float az = pow(s, 3.0);
        vec3 col = mix(mid, zenith, smoothstep(0.0, 0.45, h));
        col = mix(col, horizon, (1.0 - smoothstep(-0.02, 0.42, h)) * (0.3 + 0.7*az));
        col += vec3(2.2, 1.0, 0.35) * pow(s, 60.0) * 1.5;
        col += vec3(6.0, 3.4, 1.5) * smoothstep(0.9993, 0.9998, s);
        vec2 cp = d.xz / max(h + 0.12, 0.05);
        float c = ld_fbm(vec3(cp*0.55, 1.0));
        float c2 = ld_fbm(vec3(cp*1.7 + 4.0, 2.0));
        float cloud = smoothstep(0.42, 0.75, c*0.75 + c2*0.35) * smoothstep(-0.02, 0.12, h);
        vec3 cloudCol = mix(vec3(0.03, 0.028, 0.035), vec3(0.9, 0.4, 0.16), pow(s, 6.0) * (1.0 - smoothstep(0.0, 0.3, h)));
        col = mix(col, cloudCol, cloud * 0.92);
        if (h < 0.0) col = mix(vec3(0.06, 0.04, 0.05), horizon*0.35*(0.3 + 0.7*az), exp(h*30.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const mesh = new Mesh(new SphereGeometry(80, 32, 18), mat)
  mesh.name = 'ld_sky'
  mesh.frustumCulled = false
  mesh.renderOrder = -1
  return mesh
}

export interface ExteriorDusk {
  readonly root: Group
  readonly lights: Light[]
  readonly fx: Object3D[]
  readonly neonFlicker: PointLight
  update(time: number): void
}

export function installSkyEnvironment(renderer: WebGLRenderer, scene: Scene, sunDir: Vector3): Mesh {
  const sky = skyDome(sunDir)
  scene.add(sky)
  const probeScene = new Scene()
  probeScene.add(skyDome(sunDir))
  const pmrem = new PMREMGenerator(renderer)
  const target = pmrem.fromScene(probeScene, 0.04, 0.1, 90)
  pmrem.dispose()
  scene.environment = target.texture
  scene.environmentIntensity = 0.5
  scene.background = null
  scene.fog = new FogExp2(new Color(0.16, 0.1, 0.07), 0.012)
  return sky
}

export function buildExteriorDressing(): ExteriorDusk {
  const root = new Group()
  root.name = 'dusk-exterior'
  const lights: Light[] = []
  const fx: Object3D[] = []

  const pinkWash = new RectAreaLight(NEON_PINK, 18, 6.2, 0.55)
  pinkWash.position.set(0, 6.4, -1.15)
  pinkWash.lookAt(0, 5.4, 0.2)
  root.add(pinkWash)
  const pinkFill = new PointLight(NEON_PINK, 18, 14, 1.6)
  pinkFill.position.set(0, 5.8, -2.2)
  root.add(pinkFill)
  const cyanFill = new PointLight(NEON_CYAN, 4, 6.5, 1.8)
  cyanFill.position.set(-4.6, 1.7, -1.2)
  root.add(cyanFill)
  const doorLight = new PointLight(new Color(1, 0.58, 0.28), 2.4, 7, 2)
  doorLight.position.set(0, 1.5, -0.6)
  root.add(doorLight)
  lights.push(pinkWash, pinkFill, cyanFill, doorLight)

  const sl1 = streetlight(new Vector3(-9.5, PATH_Y, -5.4), -1, true)
  const sl2 = streetlight(new Vector3(8.2, PATH_Y, -5.6), -1, true)
  const sl3 = streetlight(new Vector3(18, PATH_Y, -6.2), -1, false)
  root.add(sl1.root, sl2.root, sl3.root)
  lights.push(...sl1.lights, ...sl2.lights)

  root.add(palm(new Vector3(-8, PATH_Y, -16), 11, 0.7, 2))
  root.add(palm(new Vector3(7, PATH_Y, -17), 12, -0.5, 5))
  root.add(palm(new Vector3(16, PATH_Y, -16.5), 10.5, 0.6, 9))

  const terraceMat = renderMaterial([0.55, 0.46, 0.4])
  root.add(terraceFront(-22, 12, 9.2, terraceMat, 3))
  root.add(terraceFront(14.5, 16, 10.5, terraceMat, 8))

  const rain = makeRain()
  root.add(rain)
  fx.push(rain)

  return {
    root,
    lights,
    fx,
    neonFlicker: pinkFill,
    update(time: number): void {
      const drop = Math.sin(time * 50) > 0.97 ? 0.55 : 1
      pinkFill.intensity = 18 * drop
      const rainMat = rain.material
      if (rainMat instanceof ShaderMaterial) rainMat.uniforms.uTime.value = time
    },
  }
}

export function tuneExteriorMaterials(exterior: Object3D, lodge: Object3D, commodore: Object3D): void {
  const render = renderMaterial([0.78, 0.66, 0.54])
  const asphalt = asphaltMaterial()
  const visit = (root: Object3D): void => {
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      const next = materials.map((material) => retint(material, render, asphalt))
      object.material = Array.isArray(object.material) ? next : next[0] ?? object.material
      if (!object.name.includes('puddle') && !object.name.includes('road')) object.castShadow = true
      object.receiveShadow = true
    })
  }
  visit(exterior)
  lodge.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const material = object.material
    if (!isStandard(material) && !(material instanceof MeshBasicMaterial)) return
    if (material.name === 'lodge_render' || material.name === 'lodge_stain') {
      object.material = render
    } else if (material.name === 'lodge_bitumen') {
      object.material = asphalt
      object.castShadow = false
    } else if (material.name === 'lodge_timber' && isStandard(material)) {
      material.color.setRGB(0.28, 0.16, 0.09)
      material.roughness = 0.62
    } else if (material.name === 'lodge_glass' && material instanceof MeshBasicMaterial) {
      material.opacity = 0.05
      material.color.setRGB(0.75, 0.82, 0.9)
    }
  })
  commodore.traverse((object) => {
    if (!(object instanceof Mesh) || !isStandard(object.material)) return
    object.castShadow = true
    object.receiveShadow = true
    if (object.material.name === 'commodore_fleet_beige') {
      object.material.roughness = 0.28
      object.material.envMapIntensity = 1.15
      object.material.color.multiply(new Color(0.92, 0.84, 0.7))
    }
  })
}

function retint(material: Material, render: MeshStandardMaterial, asphalt: MeshStandardMaterial): Material {
  if (!isStandard(material)) return material
  const n = material.name
  if (n === 'exterior_render_weathered' || n === 'exterior_render_damp' || n === 'exterior_runoff') return render
  if (n === 'exterior_wet_asphalt' || n.startsWith('exterior_puddle')) return asphalt
  if (n === 'exterior_side_brick') {
    material.color.set(0x4a2a20)
    material.roughness = 0.95
  } else if (n === 'exterior_stone_trim') {
    material.color.setRGB(0.62, 0.55, 0.46)
    material.roughness = 0.85
  } else if (n === 'exterior_window_dark') {
    material.color.set(0x07090c)
    material.metalness = 0.1
    material.roughness = 0.08
    material.envMapIntensity = 1.3
  } else if (n === 'exterior_iron') {
    material.color.set(0x0e0c0b)
    material.metalness = 0.7
    material.roughness = 0.4
  } else if (n === 'exterior_neon_pink') {
    material.color.set(0x000000)
    material.emissive.copy(NEON_PINK)
    material.emissiveIntensity = 8
    material.toneMapped = false
  } else if (n === 'exterior_neon_cyan') {
    material.color.set(0x000000)
    material.emissive.copy(NEON_CYAN)
    material.emissiveIntensity = 6.5
    material.toneMapped = false
  } else if (n === 'timber_dark') {
    material.color.setRGB(0.25, 0.16, 0.1)
  }
  return material
}

function streetlight(pos: Vector3, armDir: number, lit: boolean): { root: Group; lights: Light[] } {
  const g = new Group()
  g.position.copy(pos)
  g.name = 'ld_streetlight'
  const metal = new MeshStandardMaterial({ color: 0x3a3a38, metalness: 0.6, roughness: 0.5 })
  const pole = new Mesh(new CylinderGeometry(0.07, 0.1, 7.2, 8), metal)
  pole.position.y = 3.6
  pole.castShadow = true
  g.add(pole)
  const arm = new Mesh(new BoxGeometry(0.08, 0.08, 1.6), metal)
  arm.position.set(0, 7.1, armDir * 0.8)
  g.add(arm)
  const head = new Mesh(new BoxGeometry(0.32, 0.12, 0.55), metal)
  head.position.set(0, 7.05, armDir * 1.55)
  g.add(head)
  const lens = new Mesh(
    new PlaneGeometry(0.28, 0.46),
    new MeshBasicMaterial({ color: SODIUM.clone().multiplyScalar(8), toneMapped: false, fog: false }),
  )
  lens.rotation.x = Math.PI / 2
  lens.position.set(0, 6.98, armDir * 1.55)
  g.add(lens)
  const lights: Light[] = []
  if (lit) {
    const s = new SpotLight(SODIUM, 36, 20, Math.PI * 0.38, 0.7, 1.6)
    s.position.set(0, 6.9, armDir * 1.55)
    s.target.position.set(0, 0, armDir * 2)
    g.add(s, s.target)
    lights.push(s)
  }
  return { root: g, lights }
}

let frond: CanvasTexture | undefined

function palm(pos: Vector3, h: number, lean: number, seed: number): Group {
  frond ??= frondTexture()
  const g = new Group()
  g.position.copy(pos)
  const trunkGeo = new CylinderGeometry(0.16, 0.28, h, 7, 10)
  const attr = trunkGeo.attributes.position
  if (attr !== undefined) {
    for (let i = 0; i < attr.count; i += 1) {
      const y = attr.getY(i) + h / 2
      const k = y / h
      attr.setX(i, attr.getX(i) + lean * k * k)
      attr.setY(i, y)
    }
    trunkGeo.computeVertexNormals()
  }
  const trunk = new Mesh(trunkGeo, new MeshStandardMaterial({ color: 0x2a2018, roughness: 0.95 }))
  trunk.castShadow = true
  g.add(trunk)
  const crown = new Group()
  crown.position.set(lean, h, 0)
  g.add(crown)
  const fm = new MeshStandardMaterial({
    color: 0x1b2412,
    alphaMap: frond,
    alphaTest: 0.4,
    side: DoubleSide,
    roughness: 0.8,
  })
  const rand = mulberry(seed)
  for (let i = 0; i < 10; i += 1) {
    const length = 2.8 + rand() * 0.7
    const geo = new PlaneGeometry(0.85, length, 1, 6)
    const a = geo.attributes.position
    if (a !== undefined) {
      for (let j = 0; j < a.count; j += 1) {
        const y = a.getY(j) + length / 2
        const k = y / length
        a.setY(j, y)
        a.setZ(j, -k * k * length * 0.5)
      }
      geo.computeVertexNormals()
    }
    geo.rotateX(-Math.PI / 2 + 0.3)
    const f = new Mesh(geo, fm)
    f.rotation.y = (i / 10) * Math.PI * 2
    f.rotation.x = -0.2 + (i % 3) * 0.15
    crown.add(f)
  }
  return g
}

function terraceFront(x0: number, width: number, height: number, mat: MeshStandardMaterial, seed: number): Group {
  const g = new Group()
  const body = new Mesh(new BoxGeometry(width, height, 1.2), mat)
  body.position.set(x0 + width / 2, PATH_Y + height / 2, -0.9)
  body.castShadow = true
  body.receiveShadow = true
  g.add(body)
  const dark = new MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.2, metalness: 0.15 })
  const lit = new MeshBasicMaterial({ color: new Color(1, 0.6, 0.28).multiplyScalar(1.4), toneMapped: false })
  const rand = mulberry(seed)
  const floors = Math.floor(height / 3.2)
  for (let f = 0; f < floors; f += 1) {
    for (let wx = x0 + 0.8; wx < x0 + width - 0.8; wx += 1.8) {
      const w = new Mesh(new PlaneGeometry(0.7, 1.3), rand() < 0.16 ? lit : dark)
      w.position.set(wx, PATH_Y + 1.5 + f * 3.2, -0.28)
      g.add(w)
    }
  }
  return g
}

function makeRain(): LineSegments {
  const count = 2200
  const P = new Float32Array(count * 6)
  const S = new Float32Array(count * 2)
  for (let i = 0; i < count; i += 1) {
    const x = -28 + Math.random() * 56
    const y = -1 + Math.random() * 14
    const z = -22 + Math.random() * 20
    P.set([x, y, z, x, y, z], i * 6)
    S[i * 2] = 0
    S[i * 2 + 1] = 1
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(P, 3))
  geo.setAttribute('endf', new BufferAttribute(S, 1))
  const mat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uY0: { value: -1 }, uH: { value: 14 } },
    vertexShader: `attribute float endf; uniform float uTime, uY0, uH; varying float vA;
      void main(){ vec3 p = position; float ph = fract(sin(dot(p.xz, vec2(12.9898,78.233)))*43758.5453);
        p.y = uY0 + mod(p.y - uY0 - uTime*9.0 - ph*uH, uH);
        p += vec3(0.06, 0.38, 0.0) * endf;
        vA = 0.5 + 0.5*ph;
        gl_Position = projectionMatrix*viewMatrix*vec4(p,1.0); }`,
    fragmentShader:
      'varying float vA; void main(){ gl_FragColor = vec4(vec3(0.62, 0.66, 0.75)*0.09*vA, 1.0); }',
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  })
  const lines = new LineSegments(geo, mat)
  lines.frustumCulled = false
  lines.name = 'ld_rain'
  return lines
}

function frondTexture(): CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 64
  cv.height = 256
  const c = cv.getContext('2d')
  if (c !== null) {
    c.clearRect(0, 0, 64, 256)
    c.strokeStyle = '#fff'
    c.lineWidth = 4
    c.beginPath()
    c.moveTo(32, 0)
    c.lineTo(32, 256)
    c.stroke()
    for (let y = 8; y < 250; y += 12) {
      const len = 28 * Math.sin((y / 256) * Math.PI) + 4
      c.beginPath()
      c.moveTo(32, y)
      c.lineTo(32 - len, y + 16)
      c.moveTo(32, y)
      c.lineTo(32 + len, y + 16)
      c.stroke()
    }
  }
  const t = new CanvasTexture(cv)
  t.wrapS = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  return t
}

function mulberry(seed: number): () => number {
  let s = seed * 97 + 1
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}
