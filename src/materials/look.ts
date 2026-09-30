import {
  Color,
  LoadingManager,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three'
import type { Material } from 'three'

/**
 * Code materials for the dusk look. World-space projection, so a sourced mesh
 * with bad UVs still reads as nicotine plaster, shellac and worn boards.
 * Textures are the ones already shipped under public/textures/.
 */

export const NOISE_GLSL = /* glsl */ `
float ld_hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float ld_noise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(ld_hash(i+vec3(0,0,0)),ld_hash(i+vec3(1,0,0)),f.x),mix(ld_hash(i+vec3(0,1,0)),ld_hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(ld_hash(i+vec3(0,0,1)),ld_hash(i+vec3(1,0,1)),f.x),mix(ld_hash(i+vec3(0,1,1)),ld_hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float ld_fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*ld_noise(p); p*=2.03; a*=0.5; } return s; }
`

const TRI_VERT_PARS = 'varying vec3 vLdWPos; varying vec3 vLdWNrm;'
const TRI_VERT = `
  vec4 ldW = modelMatrix * vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    ldW = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  #endif
  vLdWPos = ldW.xyz; vLdWNrm = normalize(mat3(modelMatrix) * objectNormal);`

export const TRIPLANAR_GLSL = /* glsl */ `
vec3 ld_tri(sampler2D t, vec3 p, vec3 n, float s){
  vec3 b = pow(abs(n), vec3(6.0)); b /= (b.x+b.y+b.z);
  return texture2D(t, p.zy*s).rgb*b.x + texture2D(t, p.xz*s).rgb*b.y + texture2D(t, p.xy*s).rgb*b.z; }
vec3 ld_tri2(sampler2D t, vec3 p, vec3 n, float s){
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  vec3 b = pow(abs(n), vec3(6.0)); b /= (b.x+b.y+b.z);
  return texture2D(t, r*p.zy*s + 0.37).rgb*b.x + texture2D(t, r*p.xz*s + 0.37).rgb*b.y + texture2D(t, r*p.xy*s+0.37).rgb*b.z; }
`

let gate: Promise<void> = Promise.resolve()
let releaseGate: () => void = () => {}
let idle = true

const manager = new LoadingManager()
manager.onStart = () => {
  if (!idle) return
  idle = false
  gate = new Promise<void>((resolve) => {
    releaseGate = resolve
  })
}
manager.onLoad = () => {
  idle = true
  releaseGate()
}

const loader = new TextureLoader(manager)
const cache = new Map<string, Texture>()

/** Resolves when every look texture requested so far has finished or failed. */
export function whenLookTexturesReady(): Promise<void> {
  return gate
}

function tex(url: string, srgb = true): Texture {
  const key = `${url}:${srgb ? 1 : 0}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const t = loader.load(url)
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  t.anisotropy = 8
  cache.set(key, t)
  return t
}

type UniformMap = Record<string, { value: Texture }>

function worldShader(
  mat: MeshStandardMaterial,
  uniforms: UniformMap,
  fragPars: string,
  fragBody: string,
  key: string,
): MeshStandardMaterial {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${TRI_VERT_PARS}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${TRI_VERT}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${TRI_VERT_PARS}${NOISE_GLSL}${fragPars}`)
      .replace(
        '#include <map_fragment>',
        `{ vec3 ldAlbedo; float ldRough = roughness; ${fragBody}
          diffuseColor.rgb *= ldAlbedo; ldRoughOut = ldRough; }`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = ldRoughOut;')
      .replace('void main() {', 'void main() { float ldRoughOut = roughness;')
  }
  mat.customProgramCacheKey = () => key
  return mat
}

/** Wallpaper below the picture rail, nicotine plaster above. */
export function wallMaterial(): MeshStandardMaterial {
  const paper = tex('/textures/wallpaper-floral.jpg')
  const plaster = tex('/textures/render-cream.jpg')
  const u: UniformMap = { tWall: { value: paper }, tPlaster: { value: plaster }, tDecay: { value: paper } }
  const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, name: 'ld_wall', envMapIntensity: 0.45 })
  return worldShader(
    m,
    u,
    'uniform sampler2D tWall, tPlaster, tDecay;' + TRIPLANAR_GLSL,
    /* glsl */ `
    vec3 p = vLdWPos; vec3 n = normalize(vLdWNrm);
    float yl = p.y >= 3.40 ? p.y - 3.45 : p.y;
    float ceilH = p.y >= 3.40 ? 3.0 : 3.2;
    vec3 paper = ld_tri(tWall, p, n, 1.0/0.62);
    float pl = dot(paper, vec3(0.333));
    paper = mix(vec3(pl), paper, 1.3); paper = (paper - pl*0.55) * 1.6 + pl*0.55; paper = paper * vec3(1.25, 1.02, 0.62);
    vec3 decay = ld_tri2(tDecay, p, n, 1.0/1.7);
    float dl = dot(decay, vec3(0.333));
    paper *= mix(0.78, 1.12, smoothstep(0.15, 0.55, dl));
    vec3 plaster = ld_tri2(tPlaster, p, n, 1.0/2.3);
    float pll = dot(plaster, vec3(0.333));
    plaster = vec3(0.86, 0.72, 0.44) * (0.75 + 0.45*pll);
    float rail = smoothstep(2.36, 2.40, yl);
    vec3 col = mix(paper, plaster, rail);
    float big = ld_fbm(p*vec3(0.9, 0.6, 0.9));
    float drip = ld_fbm(vec3(p.x*7.0 + p.z*7.0, p.y*0.35, p.z*3.0));
    float topStain = smoothstep(ceilH - 1.4, ceilH, yl);
    float lowStain = 1.0 - smoothstep(0.0, 0.5, yl);
    float stain = clamp(0.35*big + 0.25*drip + 0.55*topStain + 0.3*lowStain - 0.25, 0.0, 1.0);
    col *= mix(vec3(1.0), vec3(0.62, 0.47, 0.26), stain);
    col *= 0.85 + 0.3*ld_noise(p*23.0);
    ldAlbedo = col;
    ldRough = 0.85 - 0.15*stain;
  `,
    'ld_wall',
  )
}

export function ceilingMaterial(): MeshStandardMaterial {
  const u: UniformMap = { tPlaster: { value: tex('/textures/render-cream.jpg') } }
  const m = new MeshStandardMaterial({ roughness: 0.92, name: 'ld_ceiling', envMapIntensity: 0.4 })
  return worldShader(
    m,
    u,
    'uniform sampler2D tPlaster;' + TRIPLANAR_GLSL,
    `
    vec3 p = vLdWPos; vec3 n = normalize(vLdWNrm);
    float l = dot(ld_tri2(tPlaster, p, n, 0.5), vec3(0.333));
    float st = ld_fbm(p*0.8);
    ldAlbedo = vec3(0.74, 0.62, 0.40) * (0.8 + 0.35*l) * mix(1.0, 0.62, smoothstep(0.35, 0.8, st));
  `,
    'ld_ceiling',
  )
}

export function darkWoodMaterial(shine = 0.45): MeshStandardMaterial {
  const u: UniformMap = { tWood: { value: tex('/textures/timber-dark.jpg') } }
  const m = new MeshStandardMaterial({ roughness: shine, name: 'ld_darkwood', envMapIntensity: 0.55 })
  return worldShader(
    m,
    u,
    'uniform sampler2D tWood;' + TRIPLANAR_GLSL,
    `
    vec3 p = vLdWPos; vec3 n = normalize(vLdWNrm);
    vec3 w = ld_tri(tWood, p, n, 0.9);
    float l = dot(w, vec3(0.333));
    vec3 c = vec3(0.27, 0.13, 0.062) * (0.3 + 1.0*l);
    float wear = ld_fbm(p*3.0);
    c *= mix(0.8, 1.2, wear);
    ldAlbedo = c;
    ldRough = roughness + 0.25*(1.0 - wear);
  `,
    `ld_darkwood${shine}`,
  )
}

export function floorMaterial(): MeshStandardMaterial {
  const u: UniformMap = { tFloor: { value: tex('/textures/floorboards-oak.jpg') } }
  const m = new MeshStandardMaterial({ roughness: 0.55, name: 'ld_floor', envMapIntensity: 0.4 })
  return worldShader(
    m,
    u,
    'uniform sampler2D tFloor;',
    `
    vec3 p = vLdWPos;
    vec3 w = texture2D(tFloor, p.xz*0.42).rgb;
    float traffic = ld_fbm(p*vec3(0.7,0.0,0.7) + 3.0);
    vec3 c = w * vec3(0.78, 0.55, 0.34);
    c *= mix(1.0, 0.65, smoothstep(0.4, 0.75, traffic));
    ldAlbedo = c;
    ldRough = 0.45 + 0.4*traffic;
  `,
    'ld_floor',
  )
}

export function upholsteryMaterial(): MeshStandardMaterial {
  const u: UniformMap = { tFab: { value: tex('/textures/bedspread-rose.jpg') } }
  const m = new MeshStandardMaterial({ roughness: 0.95, name: 'ld_upholstery', envMapIntensity: 0.35 })
  return worldShader(
    m,
    u,
    'uniform sampler2D tFab;' + TRIPLANAR_GLSL,
    `
    vec3 p = vLdWPos; vec3 n = normalize(vLdWNrm);
    vec3 f = ld_tri(tFab, p, n, 1.0/0.45);
    float l = dot(f, vec3(0.333));
    f = mix(vec3(l), f, 0.6) * vec3(0.62, 0.46, 0.42);
    f *= 0.8 + 0.35*ld_fbm(p*4.0);
    ldAlbedo = f;
  `,
    'ld_upholstery',
  )
}

/** Weathered render. Tint is compiled in, one program per tint. */
export function renderMaterial(tint: readonly [number, number, number]): MeshStandardMaterial {
  const cream = tex('/textures/render-cream.jpg')
  const u: UniformMap = { tR: { value: cream }, tW: { value: cream } }
  const m = new MeshStandardMaterial({ roughness: 0.9, name: 'ld_render', envMapIntensity: 0.85 })
  const tintLit = tint.join(',')
  return worldShader(
    m,
    u,
    'uniform sampler2D tR, tW;' + TRIPLANAR_GLSL,
    `
    vec3 p = vLdWPos; vec3 n = normalize(vLdWNrm);
    vec3 r = ld_tri(tR, p, n, 1.0/2.2);
    vec3 w = ld_tri2(tW, p, n, 1.0/3.1);
    float wl = dot(w, vec3(0.333));
    vec3 c = r * vec3(${tintLit});
    float peel = smoothstep(0.55, 0.62, ld_fbm(p*0.9 + 11.0));
    c = mix(c, c*vec3(0.55, 0.42, 0.34), peel);
    c *= 0.7 + 0.5*wl;
    float damp = 1.0 - smoothstep(-0.7, 1.4, p.y + 0.4*ld_fbm(p*1.3));
    float streak = ld_fbm(vec3(p.x*6.0, p.y*0.25, p.z*6.0));
    c *= mix(1.0, 0.45, damp) * mix(1.0, 0.7, smoothstep(0.5, 0.8, streak));
    ldAlbedo = c;
    ldRough = 0.92 - 0.35*damp;
  `,
    `ld_render${tintLit}`,
  )
}

/** Wet bitumen. Puddles go dark and sharp so the dusk sky sits in them. */
export function asphaltMaterial(): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ roughness: 0.4, name: 'ld_asphalt', envMapIntensity: 1.15 })
  return worldShader(
    m,
    {},
    '',
    `
    vec3 p = vLdWPos;
    float n = ld_fbm(vec3(p.xz * 3.2, 0.0));
    float g = ld_noise(vec3(p.xz * 16.0, 1.0));
    float puddle = smoothstep(0.5, 0.62, ld_fbm(vec3(p.xz*0.32, 2.0)));
    vec3 c = vec3(0.16, 0.15, 0.14) * (0.7 + 0.4*n) * (0.85 + 0.2*g);
    c *= mix(1.0, 0.42, puddle);
    ldAlbedo = c;
    ldRough = mix(0.48, 0.05, puddle);
  `,
    'ld_asphalt',
  )
}

const aged = new Map<string, MeshStandardMaterial>()

/** Clone before tinting. Unit A shares materials across rooms, and room 1A keeps its own. */
export function ageClone(
  source: MeshStandardMaterial,
  tint: readonly [number, number, number],
  rough: number | null,
): MeshStandardMaterial {
  const key = `${source.uuid}:${tint.join(',')}:${rough ?? 'r'}`
  const hit = aged.get(key)
  if (hit !== undefined) return hit
  const mat = source.clone()
  mat.color.multiply(new Color(tint[0], tint[1], tint[2]))
  if (rough !== null) mat.roughness = rough
  mat.lightMap = null
  mat.lightMapIntensity = 0
  mat.envMapIntensity = Math.min(mat.envMapIntensity, 0.55)
  mat.needsUpdate = true
  aged.set(key, mat)
  return mat
}

export function isStandard(material: Material): material is MeshStandardMaterial {
  return material instanceof MeshStandardMaterial
}
