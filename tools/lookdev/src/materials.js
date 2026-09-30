// Surface treatments for the lodge interior, all in code.
// World-space triplanar sampling (kills UV dependence + tiling), procedural nicotine / grime,
// stained dark timber. Port target: src/render/materials/ in the game repo.
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const cache = new Map();
export function tex(url, { srgb = true, repeat = true } = {}) {
  const k = url + srgb;
  if (cache.has(k)) return cache.get(k);
  const t = loader.load(url);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  cache.set(k, t);
  return t;
}

// Shared GLSL: hashing noise + fbm in world space.
export const NOISE_GLSL = /* glsl */`
float ld_hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float ld_noise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(ld_hash(i+vec3(0,0,0)),ld_hash(i+vec3(1,0,0)),f.x),mix(ld_hash(i+vec3(0,1,0)),ld_hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(ld_hash(i+vec3(0,0,1)),ld_hash(i+vec3(1,0,1)),f.x),mix(ld_hash(i+vec3(0,1,1)),ld_hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float ld_fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*ld_noise(p); p*=2.03; a*=0.5; } return s; }
`;

const TRI_VERT_PARS = `varying vec3 vLdWPos; varying vec3 vLdWNrm;`;
const TRI_VERT = `
  vec4 ldW = modelMatrix * vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    ldW = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  #endif
  vLdWPos = ldW.xyz; vLdWNrm = normalize(mat3(modelMatrix) * objectNormal);`;

/**
 * Patch a MeshStandardMaterial so its colour comes from `fragBody` (GLSL that must set vec3 ldAlbedo
 * and float ldRough) evaluated in world space. Uniform textures are passed in `uniforms`.
 */
export function worldShader(mat, uniforms, fragPars, fragBody, key) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + TRI_VERT_PARS)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + TRI_VERT);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + TRI_VERT_PARS + NOISE_GLSL + fragPars)
      .replace('#include <map_fragment>', `{ vec3 ldAlbedo; float ldRough = roughness; ${fragBody}
          diffuseColor.rgb *= ldAlbedo; ldRoughOut = ldRough; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = ldRoughOut;')
      .replace('void main() {', 'void main() { float ldRoughOut = roughness;');
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

export const TRIPLANAR_GLSL = /* glsl */`
vec3 ld_tri(sampler2D t, vec3 p, vec3 n, float s){
  vec3 b = pow(abs(n), vec3(6.0)); b /= (b.x+b.y+b.z);
  return texture2D(t, p.zy*s).rgb*b.x + texture2D(t, p.xz*s).rgb*b.y + texture2D(t, p.xy*s).rgb*b.z; }
// rotated / offset second sample to break periodicity
vec3 ld_tri2(sampler2D t, vec3 p, vec3 n, float s){
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  vec3 b = pow(abs(n), vec3(6.0)); b /= (b.x+b.y+b.z);
  return texture2D(t, r*p.zy*s + 0.37).rgb*b.x + texture2D(t, r*p.xz*s + 0.37).rgb*b.y + texture2D(t, r*p.xy*s+0.37).rgb*b.z; }
`;

/** Wallpaper below the picture rail, nicotine plaster above; smoke-stained toward the ceiling. */
export function wallMaterial() {
  const u = {
    tWall: { value: tex('./assets/tex/wallpaper-floral.jpg') },
    tPlaster: { value: tex('./assets/tex/painted_plaster_wall_diff.jpg') },
    tDecay: { value: tex('./assets/tex/decrepit_wallpaper_diff.jpg') },
  };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, name: 'ld_wall' });
  return worldShader(m, u, `uniform sampler2D tWall, tPlaster, tDecay;` + TRIPLANAR_GLSL, /* glsl */`
    vec3 p = vLdWPos; vec3 n = normalize(vLdWNrm);
    float yl = p.y >= 3.40 ? p.y - 3.45 : p.y;            // height within the storey
    float ceilH = p.y >= 3.40 ? 3.0 : 3.2;
    vec3 paper = ld_tri(tWall, p, n, 1.0/0.62);
    // pull the repo print toward faded khaki / ochre
    float pl = dot(paper, vec3(0.333));
    paper = mix(vec3(pl), paper, 1.3); paper = (paper - pl*0.55) * 1.6 + pl*0.55*1.0; paper = paper * vec3(1.25, 1.02, 0.62);
    vec3 decay = ld_tri2(tDecay, p, n, 1.0/1.7);
    float dl = dot(decay, vec3(0.333));
    paper *= mix(0.78, 1.12, smoothstep(0.15, 0.55, dl));
    vec3 plaster = ld_tri2(tPlaster, p, n, 1.0/2.3);
    float pll = dot(plaster, vec3(0.333));
    plaster = vec3(0.86, 0.72, 0.44) * (0.75 + 0.45*pll);
    float rail = smoothstep(2.36, 2.40, yl);
    vec3 col = mix(paper, plaster, rail);
    // nicotine: large blotches, vertical drips, darkening toward ceiling
    float big = ld_fbm(p*vec3(0.9, 0.6, 0.9));
    float drip = ld_fbm(vec3(p.x*7.0 + p.z*7.0, p.y*0.35, p.z*3.0));
    float topStain = smoothstep(ceilH - 1.4, ceilH, yl);
    float lowStain = 1.0 - smoothstep(0.0, 0.5, yl);
    float stain = clamp(0.35*big + 0.25*drip + 0.55*topStain + 0.3*lowStain - 0.25, 0.0, 1.0);
    col *= mix(vec3(1.0), vec3(0.62, 0.47, 0.26), stain);
    col *= 0.85 + 0.3*ld_noise(p*23.0);     // fine mottling
    ldAlbedo = col;
    ldRough = 0.85 - 0.15*stain;
  `, 'ld_wall');
}

/** Cornice + ceiling: yellowed plaster that darkens with smoke. */
export function ceilingMaterial() {
  const u = { tPlaster: { value: tex('./assets/tex/painted_plaster_wall_diff.jpg') } };
  const m = new THREE.MeshStandardMaterial({ roughness: 0.92, name: 'ld_ceiling' });
  return worldShader(m, u, `uniform sampler2D tPlaster;` + TRIPLANAR_GLSL, `
    vec3 p = vLdWPos; vec3 n = normalize(vLdWNrm);
    float l = dot(ld_tri2(tPlaster, p, n, 0.5), vec3(0.333));
    float st = ld_fbm(p*0.8);
    ldAlbedo = vec3(0.74, 0.62, 0.40) * (0.8 + 0.35*l) * mix(1.0, 0.62, smoothstep(0.35, 0.8, st));
  `, 'ld_ceiling');
}

/** Old dark stained timber (stairs, skirting, desk, jambs). */
export function darkWoodMaterial({ shine = 0.45 } = {}) {
  const u = { tWood: { value: tex('./assets/tex/dark_wood_diff.jpg') } };
  const m = new THREE.MeshStandardMaterial({ roughness: shine, name: 'ld_darkwood' });
  return worldShader(m, u, `uniform sampler2D tWood;` + TRIPLANAR_GLSL, `
    vec3 p = vLdWPos; vec3 n = normalize(vLdWNrm);
    vec3 w = ld_tri(tWood, p, n, 0.9);
    float l = dot(w, vec3(0.333));
    // oxblood-brown shellac, nearly black in the grain
    vec3 c = vec3(0.27, 0.13, 0.062) * (0.3 + 1.0*l);
    float wear = ld_fbm(p*3.0);
    c *= mix(0.8, 1.2, wear);
    ldAlbedo = c;
    ldRough = roughness + 0.25*(1.0 - wear);
  `, 'ld_darkwood' + shine);
}

/** Worn floorboards: planar world UVs so boards run along X. */
export function floorMaterial() {
  const u = { tFloor: { value: tex('./assets/tex/old_wood_floor_diff.jpg') } };
  const m = new THREE.MeshStandardMaterial({ roughness: 0.55, name: 'ld_floor' });
  return worldShader(m, u, `uniform sampler2D tFloor;`, `
    vec3 p = vLdWPos;
    vec3 w = texture2D(tFloor, p.xz*0.42).rgb;
    float traffic = ld_fbm(p*vec3(0.7,0.0,0.7) + 3.0);
    vec3 c = w * vec3(0.78, 0.55, 0.34);
    c *= mix(1.0, 0.65, smoothstep(0.4, 0.75, traffic));
    ldAlbedo = c;
    ldRough = 0.45 + 0.4*traffic;
  `, 'ld_floor');
}

/** Tint an existing glTF material toward the warm, worn palette. */
export function ageMaterial(mat, tint = [0.9, 0.78, 0.6], rough = null) {
  if (!mat || !mat.color) return;
  mat.color.multiply(new THREE.Color(...tint));
  if (rough !== null) mat.roughness = rough;
  mat.needsUpdate = true;
}

/** Faded floral upholstery (repo bedspread print), triplanar so any imported chair works. */
export function upholsteryMaterial() {
  const u = { tFab: { value: tex('./assets/tex/bedspread-rose.jpg') } };
  const m = new THREE.MeshStandardMaterial({ roughness: 0.95, name: 'ld_upholstery' });
  return worldShader(m, u, `uniform sampler2D tFab;` + TRIPLANAR_GLSL, `
    vec3 p = vLdWPos; vec3 n = normalize(vLdWNrm);
    vec3 f = ld_tri(tFab, p, n, 1.0/0.45);
    float l = dot(f, vec3(0.333));
    f = mix(vec3(l), f, 0.6) * vec3(0.62, 0.46, 0.42);
    f *= 0.8 + 0.35*ld_fbm(p*4.0);
    ldAlbedo = f;
  `, 'ld_upholstery');
}
