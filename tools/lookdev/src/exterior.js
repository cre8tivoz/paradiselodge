// Exterior dusk look: sky dome + PMREM env, low golden sun, sodium streetlights, pink/cyan neon with
// light spill, wet road (lit asphalt + additive planar reflection with ripples and streaks), rain,
// procedural palms, neighbouring terraces, the game's facade glb and the Commodore.
// Port target: src/world/exterior-dusk.ts in the game repo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { tex, worldShader, TRIPLANAR_GLSL, NOISE_GLSL } from './materials.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ROAD_Y = -0.85, PATH_Y = -0.72;
export const SODIUM = new THREE.Color(1.0, 0.55, 0.18);
export const NEON_PINK = new THREE.Color(1.0, 0.08, 0.42);
export const NEON_CYAN = new THREE.Color(0.1, 0.85, 1.0);

// ---------------------------------------------------------------- sky
export function skyDome(sunDir) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: sunDir.clone().normalize() }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: NOISE_GLSL + /* glsl */`
      uniform vec3 uSun; uniform float uTime; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        float s = max(dot(d, uSun), 0.0);
        vec3 zenith = vec3(0.07, 0.065, 0.11);
        vec3 mid = vec3(0.62, 0.32, 0.22);
        vec3 horizon = vec3(2.1, 0.85, 0.3);
        float az = pow(s, 3.0);                       // sunset glow concentrated toward the sun
        vec3 col = mix(mid, zenith, smoothstep(0.0, 0.45, h));
        col = mix(col, horizon, (1.0 - smoothstep(-0.02, 0.42, h)) * (0.3 + 0.7*az));
        col += vec3(2.2, 1.0, 0.35) * pow(s, 60.0) * 1.5;            // sun halo
        col += vec3(6.0, 3.4, 1.5) * smoothstep(0.9993, 0.9998, s);   // disc
        // storm clouds: dark bands, lit edges toward the sun
        vec2 cp = d.xz / max(h + 0.12, 0.05);
        float c = ld_fbm(vec3(cp*0.55, 1.0)) ;
        float c2 = ld_fbm(vec3(cp*1.7 + 4.0, 2.0));
        float cloud = smoothstep(0.42, 0.75, c*0.75 + c2*0.35) * smoothstep(-0.02, 0.12, h);
        vec3 cloudCol = mix(vec3(0.03, 0.028, 0.035), vec3(0.9, 0.4, 0.16), pow(s, 6.0) * (1.0 - smoothstep(0.0, 0.3, h)) );
        col = mix(col, cloudCol, cloud * 0.92);
        // below horizon: sea / distance
        if (h < 0.0) col = mix(vec3(0.06, 0.04, 0.05), horizon*0.35*(0.3 + 0.7*az), exp(h*30.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), mat); m.name = 'ld_sky'; m.renderOrder = -1; m.frustumCulled = false;
  return m;
}

// ---------------------------------------------------------------- materials
function renderMaterial(tint = [0.72, 0.62, 0.5]) {
  const u = { tR: { value: tex('./assets/tex/render-cream.jpg') }, tW: { value: tex('./assets/tex/worn_plaster_wall_diff.jpg') } };
  const m = new THREE.MeshStandardMaterial({ roughness: 0.9, name: 'ld_render' });
  return worldShader(m, u, `uniform sampler2D tR, tW;` + TRIPLANAR_GLSL, `
    vec3 p = vLdWPos; vec3 n = normalize(vLdWNrm);
    vec3 r = ld_tri(tR, p, n, 1.0/2.2);
    vec3 w = ld_tri2(tW, p, n, 1.0/3.1);
    float wl = dot(w, vec3(0.333));
    vec3 c = r * vec3(${tint.join(',')});
    // peeling patches expose darker render / brick
    float peel = smoothstep(0.55, 0.62, ld_fbm(p*0.9 + 11.0));
    c = mix(c, c*vec3(0.55, 0.42, 0.34), peel);
    c *= 0.7 + 0.5*wl;
    // damp rising from the footpath + soot streaks from sills
    float damp = 1.0 - smoothstep(-0.7, 1.4, p.y + 0.4*ld_fbm(p*1.3));
    float streak = ld_fbm(vec3(p.x*6.0, p.y*0.25, p.z*6.0));
    c *= mix(1.0, 0.45, damp) * mix(1.0, 0.7, smoothstep(0.5, 0.8, streak));
    ldAlbedo = c;
    ldRough = 0.92 - 0.35*damp;
  `, 'ld_render' + tint.join(''));
}

function asphaltMaterial() {
  const u = { tA: { value: tex('./assets/tex/asphalt_02_diff.jpg') } };
  const m = new THREE.MeshStandardMaterial({ roughness: 0.4, name: 'ld_asphalt', envMapIntensity: 1.0 });
  return worldShader(m, u, `uniform sampler2D tA;`, `
    vec3 p = vLdWPos;
    vec3 a = texture2D(tA, p.xz*0.25).rgb;
    float puddle = smoothstep(0.52, 0.6, ld_fbm(vec3(p.xz*0.35, 0.0)));
    vec3 c = a * 0.32 * mix(1.0, 0.45, puddle);         // wet asphalt goes dark
    // faded lane line along the road centre
    float lane = step(abs(p.z + 9.8), 0.06) * step(0.5, fract(p.x*0.12));
    c = mix(c, vec3(0.55, 0.5, 0.4), lane*0.6);
    ldAlbedo = c;
    ldRough = mix(0.42, 0.04, puddle);
  `, 'ld_asphalt');
}

/** Additive planar reflection layer for the wet road: ripples, vertical streaking, puddle mask, fresnel. */
function wetReflection(width, depth, center, res) {
  const shader = {
    name: 'WetRoadReflection',
    uniforms: { color: { value: new THREE.Color(1, 1, 1) }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 } },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      void main(){ vUv = textureMatrix*vec4(position,1.0); vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: NOISE_GLSL + /* glsl */`
      uniform vec3 color; uniform sampler2D tDiffuse; uniform float uTime; varying vec4 vUv; varying vec3 vW;
      void main(){
        float puddle = smoothstep(0.52, 0.6, ld_fbm(vec3(vW.xz*0.35, 0.0)));
        float wet = mix(0.5, 1.0, puddle);
        // rain ripples: animated cellular-ish noise, weaker in open asphalt
        vec3 q = vec3(vW.xz*5.0, uTime*3.0);
        vec2 rip = vec2(ld_noise(q), ld_noise(q + 17.0)) - 0.5;
        vec4 uv = vUv; uv.xy += rip * mix(0.05, 0.018, puddle) * uv.w;
        vec3 acc = vec3(0.0); float ws = 0.0;
        float streak = mix(0.09, 0.02, puddle);
        for (int i = -5; i <= 5; i++) { float o = float(i)/5.0; float w = exp(-o*o*2.5);
          vec4 u2 = uv; u2.y += o*streak*uv.w; acc += texture2DProj(tDiffuse, u2).rgb*w; ws += w; }
        vec3 refl = acc/ws;
        vec3 Vd = normalize(cameraPosition - vW);
        float f = 0.03 + 0.97*pow(1.0 - clamp(Vd.y, 0.0, 1.0), 5.0);
        gl_FragColor = vec4(refl * f * wet * color, 1.0);
      }`,
  };
  const r = new Reflector(new THREE.PlaneGeometry(width, depth), { textureWidth: res[0], textureHeight: res[1], clipBias: 0.003, shader, multisample: 0 });
  r.rotation.x = -Math.PI / 2; r.position.copy(center);
  r.material.transparent = true; r.material.blending = THREE.AdditiveBlending; r.material.depthWrite = false;
  r.userData.fx = true;
  return r;
}

// ---------------------------------------------------------------- props
function frondTexture() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 512; const c = cv.getContext('2d');
  c.clearRect(0, 0, 128, 512); c.strokeStyle = '#fff'; c.fillStyle = '#fff';
  c.lineWidth = 6; c.beginPath(); c.moveTo(64, 0); c.lineTo(64, 512); c.stroke();
  for (let y = 12; y < 500; y += 9) {
    const len = 60 * Math.sin((y / 512) * Math.PI) + 8;
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(64, y); c.lineTo(64 - len, y + 26); c.stroke();
    c.beginPath(); c.moveTo(64, y); c.lineTo(64 + len, y + 26); c.stroke();
  }
  const t = new THREE.CanvasTexture(cv); return t;
}
let _frond;
export function palm(pos, h = 11, lean = 0.8, seed = 1) {
  _frond ??= frondTexture();
  const g = new THREE.Group(); g.position.copy(pos); g.name = 'ld_palm';
  const trunkGeo = new THREE.CylinderGeometry(0.17, 0.3, h, 10, 24);
  const p = trunkGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) + h / 2; const k = y / h; p.setX(i, p.getX(i) + lean * k * k); p.setY(i, y); const ring = 1 + 0.06 * Math.sin(y * 9); p.setX(i, p.getX(i) * 1); p.setZ(i, p.getZ(i) * ring); }
  trunkGeo.computeVertexNormals();
  const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.95 })); trunk.castShadow = true; g.add(trunk);
  const crown = new THREE.Group(); crown.position.set(lean, h, 0); g.add(crown);
  const fm = new THREE.MeshStandardMaterial({ color: 0x1b2412, alphaMap: _frond, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
  let s = seed * 97; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const L = 3.2 + rnd() * 0.8;
    const geo = new THREE.PlaneGeometry(1.0, L, 1, 10);
    const a = geo.attributes.position;
    for (let j = 0; j < a.count; j++) { const y = a.getY(j) + L / 2; const k = y / L; a.setY(j, y); a.setZ(j, -Math.pow(k, 2) * L * 0.55 + k * 0.6); a.setX(j, a.getX(j) * (1 - 0.3 * k)); }
    geo.rotateX(-Math.PI / 2 + 0.25);
    geo.computeVertexNormals();
    const f = new THREE.Mesh(geo, fm);
    f.rotation.y = (i / n) * Math.PI * 2 + rnd() * 0.3;
    f.rotation.x = -0.25 + rnd() * 0.5 - (i % 3 === 0 ? 0.5 : 0);
    f.castShadow = true;
    crown.add(f);
  }
  return g;
}

export function streetlight(pos, armDir = 1, { light = true, intensity = 60 } = {}) {
  const g = new THREE.Group(); g.position.copy(pos); g.name = 'ld_streetlight';
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a3a38, metalness: 0.6, roughness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 7.5, 8), metal); pole.position.y = 3.75; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.8), metal); arm.position.set(0, 7.4, armDir * 0.9); g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.6), metal); head.position.set(0, 7.35, armDir * 1.75); g.add(head);
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.52), new THREE.MeshBasicMaterial({ color: SODIUM.clone().multiplyScalar(14), toneMapped: false, fog: false }));
  lens.rotation.x = Math.PI / 2; lens.position.set(0, 7.27, armDir * 1.75); g.add(lens);
  pole.castShadow = true;
  if (light) {
    const s = new THREE.SpotLight(SODIUM, intensity, 22, Math.PI * 0.36, 0.7, 1.6);
    s.position.set(0, 7.2, armDir * 1.75); s.target.position.set(0, 0, armDir * 2.2); g.add(s, s.target);
    g.userData.lights = [s];
  }
  return g;
}

function terraceBlock(x0, width, height, seed) {
  const g = new THREE.Group(); g.name = 'ld_terrace';
  const mat = renderMaterial([0.5 + (seed % 3) * 0.06, 0.44, 0.38]);
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, 10), mat);
  body.position.set(x0 + width / 2, PATH_Y + height / 2, 4.8); body.castShadow = body.receiveShadow = true; g.add(body);
  const cor = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.35, 0.4), mat); cor.position.set(x0 + width / 2, PATH_Y + height - 0.4, -0.25); g.add(cor);
  let s = seed * 31 + 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.12, metalness: 0.2 });
  const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.6, 0.28).multiplyScalar(1.6), toneMapped: false });
  const floors = Math.floor(height / 3.3);
  for (let f = 0; f < floors; f++) for (let wx = x0 + 1.0; wx < x0 + width - 0.8; wx += 1.9) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), rnd() < 0.18 ? lit : dark);
    w.position.set(wx + 0.45, PATH_Y + 1.3 + f * 3.3 + 0.8, -0.21); w.rotation.y = Math.PI; g.add(w);
  }
  return g;
}

function policeTape(from, to) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 16; const c = cv.getContext('2d');
  for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#f2f2f2' : '#1c3fa0'; c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16 + 16, 0); c.lineTo(i * 16 + 8, 16); c.lineTo(i * 16 - 8, 16); c.fill(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  const len = from.distanceTo(to); t.repeat.set(len / 1.2, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.07), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.4 }));
  m.position.copy(from).lerp(to, 0.5); m.lookAt(to); m.rotateY(Math.PI / 2);
  return m;
}

function rain(count = 7000, box = { x: [-24, 16], y: [-1, 12], z: [-22, -0.5] }) {
  const P = new Float32Array(count * 6); const S = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = box.x[0] + Math.random() * (box.x[1] - box.x[0]), y = box.y[0] + Math.random() * (box.y[1] - box.y[0]), z = box.z[0] + Math.random() * (box.z[1] - box.z[0]);
    P.set([x, y, z, x, y, z], i * 6); S[i * 2] = 0; S[i * 2 + 1] = 1; // end flag
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('endf', new THREE.BufferAttribute(S, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uY0: { value: box.y[0] }, uH: { value: box.y[1] - box.y[0] } },
    vertexShader: `attribute float endf; uniform float uTime, uY0, uH; varying float vA;
      void main(){ vec3 p = position; float ph = fract(sin(dot(p.xz, vec2(12.9898,78.233)))*43758.5453);
        p.y = uY0 + mod(p.y - uY0 - uTime*9.5 - ph*uH, uH);
        p += vec3(0.07, 0.42, 0.0) * endf;         // streak length (motion blur at 1/48 s)
        vA = 0.5 + 0.5*ph;
        gl_Position = projectionMatrix*viewMatrix*vec4(p,1.0); }`,
    fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(0.55, 0.6, 0.7)*0.10*vA, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const l = new THREE.LineSegments(geo, mat); l.frustumCulled = false; l.name = 'ld_rain'; l.userData.fx = true;
  return l;
}

// ---------------------------------------------------------------- build
export async function buildExterior(scene, renderer) {
  const fx = []; const updaters = [];
  const sunDir = V(1.0, 0.03, -0.12).normalize();       // sun sitting on the horizon down the street
  const sky = skyDome(sunDir); scene.add(sky); sky.userData.fx = true; fx.push(sky);
  scene.fog = new THREE.FogExp2(new THREE.Color(0.16, 0.09, 0.09), 0.0035);

  // environment from the sky only (reflections in windows, car, wet road base)
  const pm = new THREE.PMREMGenerator(renderer);
  const skyScene = new THREE.Scene(); skyScene.add(skyDome(sunDir));
  scene.environment = pm.fromScene(skyScene, 0, 0.1, 400).texture; scene.environmentIntensity = 0.55;

  scene.add(new THREE.HemisphereLight(new THREE.Color(0.35, 0.3, 0.45), new THREE.Color(0.08, 0.05, 0.04), 0.35));
  const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.55, 0.25), 1.6);
  sun.position.copy(sunDir).multiplyScalar(60); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 20, bottom: -20, near: 1, far: 140 }); sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  // facade from the game
  const gltf = await new GLTFLoader().loadAsync('./assets/lodge-exterior.glb');
  const fac = gltf.scene; scene.add(fac);
  const R = renderMaterial([0.78, 0.66, 0.54]);
  const kill = [];
  fac.traverse((o) => {
    if (/exterior_front_door_(dark|panel_)|exterior_road$|exterior_puddle/.test(o.name)) kill.push(o);
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    const m = o.material; const n = m.name;
    if (n === 'exterior_render_weathered' || n === 'exterior_render_damp') o.material = R;
    else if (n === 'exterior_side_brick') { m.color.set(0x4a2a20); m.roughness = 0.95; }
    else if (n === 'exterior_stone_trim') { m.color.setRGB(0.62, 0.55, 0.46); m.roughness = 0.85; }
    else if (n === 'exterior_window_dark') { m.color.set(0x07090c); m.metalness = 0.1; m.roughness = 0.08; m.envMapIntensity = 1.4; }
    else if (n === 'exterior_iron') { m.color.set(0x0e0c0b); m.metalness = 0.7; m.roughness = 0.4; }
    else if (n === 'exterior_neon_pink') { m.color.set(0x000000); m.emissive.copy(NEON_PINK); m.emissiveIntensity = 9; m.toneMapped = false; o.castShadow = false; }
    else if (n === 'exterior_neon_cyan') { m.color.set(0x000000); m.emissive.copy(NEON_CYAN); m.emissiveIntensity = 7; m.toneMapped = false; o.castShadow = false; }
    else if (n === 'timber_dark') { m.color.setRGB(0.25, 0.16, 0.1); }
  });
  kill.forEach((o) => o.removeFromParent());
  // warm hall glow through the open front door
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 3.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.3).multiplyScalar(1.3), toneMapped: false }));
  doorGlow.position.set(0, 0.8, -0.05); doorGlow.rotation.y = Math.PI; scene.add(doorGlow);
  const doorLight = new THREE.PointLight(new THREE.Color(1.0, 0.6, 0.3), 3, 8, 2); doorLight.position.set(0, 1.4, -0.9); scene.add(doorLight);

  // neon spill onto the render
  const pinkWash = new THREE.RectAreaLight(NEON_PINK, 26, 6.6, 0.6); pinkWash.position.set(0, 7.1, -1.0); pinkWash.lookAt(0, 6.2, 0); scene.add(pinkWash);
  const pinkFill = new THREE.PointLight(NEON_PINK, 28, 16, 1.6); pinkFill.position.set(0, 6.6, -2.4); scene.add(pinkFill);
  const cyanFill = new THREE.PointLight(NEON_CYAN, 5, 7, 1.8); cyanFill.position.set(-5.05, 1.72, -1.3); scene.add(cyanFill);
  updaters.push((t) => { const f = 1.0 - 0.06 * (Math.sin(t * 50) > 0.97 ? 1 : 0); pinkFill.intensity = 28 * f; });

  // ground: long wet road + footpaths + foreshore
  const road = new THREE.Mesh(new THREE.PlaneGeometry(500, 19, 1, 1), asphaltMaterial()); road.rotation.x = -Math.PI / 2; road.position.set(150, ROAD_Y, -11.0); road.receiveShadow = true; scene.add(road);
  const refl = wetReflection(500, 19, V(150, ROAD_Y + 0.004, -11.0), [960, 540]); scene.add(refl); fx.push(refl);
  const pathMat = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.35, envMapIntensity: 0.8 });
  const nearPath = new THREE.Mesh(new THREE.BoxGeometry(500, 0.14, 1.3), pathMat); nearPath.position.set(150, PATH_Y - 0.07, -1.9 + 0.65 - 0.65); nearPath.receiveShadow = true; scene.add(nearPath);
  const farPath = new THREE.Mesh(new THREE.BoxGeometry(500, 0.14, 4), pathMat); farPath.position.set(150, PATH_Y - 0.07, -22.5); farPath.receiveShadow = true; scene.add(farPath);
  const kerbMat = new THREE.MeshStandardMaterial({ color: 0x5a554c, roughness: 0.6 });
  const kerb = new THREE.Mesh(new THREE.BoxGeometry(500, 0.18, 0.25), kerbMat); kerb.position.set(150, ROAD_Y + 0.07, -1.52); scene.add(kerb);
  const shore = new THREE.Mesh(new THREE.PlaneGeometry(600, 60), new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 0.9 })); shore.rotation.x = -Math.PI / 2; shore.position.set(150, PATH_Y - 0.1, -54); scene.add(shore);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1200, 400), new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.12, metalness: 0.0, envMapIntensity: 1.2 })); sea.rotation.x = -Math.PI / 2; sea.position.set(150, PATH_Y - 0.4, -290); scene.add(sea);

  // neighbouring terraces continuing down the street, brick building on the near side
  let x = 7.05; let seed = 1;
  for (const [w, h] of [[8.5, 9.5], [6.5, 7.2], [10, 11.5], [7, 8], [12, 10], [9, 6.5], [14, 12.5], [8, 7], [20, 9]]) { scene.add(terraceBlock(x, w, h, seed++)); x += w + 0.1; }
  scene.add(terraceBlock(-19.5, 12.4, 8.8, 11));

  // streetlights: real lights near camera, emissive-only further away
  const lights = [];
  for (const [lx, lit] of [[-12, true], [4, true], [20, true], [36, false], [52, false], [68, false], [84, false], [100, false]]) {
    const s = streetlight(V(lx, PATH_Y, -2.35), -1, { light: lit }); scene.add(s); if (lit) lights.push(...s.userData.lights);
  }
  for (const lx of [-4, 12, 28, 44, 60, 76, 92, 120, 150]) scene.add(streetlight(V(lx, PATH_Y, -21.0), 1, { light: lx < 20, intensity: 40 }));

  // palms along the foreshore, receding toward the sunset
  let ps = 3;
  for (const [px, pz, h, l] of [[-6, -24.5, 12, 0.9], [9, -25.5, 13.5, -0.7], [23, -24.2, 11, 1.1], [37, -26, 14, 0.5], [50, -24.8, 12.5, -0.9], [66, -25.5, 13, 0.7], [82, -24.5, 12, -0.6], [100, -26, 14, 1.0], [125, -25, 12, 0.4]]) {
    scene.add(palm(V(px, PATH_Y, pz), h, l, ps++));
  }

  // Commodore from the game
  const car = (await new GLTFLoader().loadAsync('./assets/commodore.glb')).scene;
  car.position.set(-3.8, 0, -5.2); scene.add(car); car.updateMatrixWorld(true);
  const bb = new THREE.Box3(); car.traverse((o) => { if (o.isMesh && /tyre/.test(o.name)) bb.expandByObject(o); });   // ground on the tyres
  car.position.y += ROAD_Y - bb.min.y;
  car.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material.name === 'commodore_fleet_beige') { o.material.roughness = 0.25; o.material.envMapIntensity = 1.2; } } });

  // contact shadow under the car (soft AO blob; the low sun throws the real shadow long)
  { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); const gr = c.createRadialGradient(64, 64, 10, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.set(-3.8, ROAD_Y + 0.008, -5.2); blob.renderOrder = 2; scene.add(blob); }
  // police tape across the footpath (concept 02)
  const tp = new THREE.Group();
  const post = (px) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), new THREE.MeshStandardMaterial({ color: 0x9a3a1a })); m.position.set(px, PATH_Y + 0.5, -2.2); tp.add(m); };
  post(-6.2); post(2.8); post(6.3);
  tp.add(policeTape(V(-6.2, PATH_Y + 0.9, -2.2), V(2.8, PATH_Y + 0.85, -2.2)), policeTape(V(2.8, PATH_Y + 0.85, -2.2), V(6.3, PATH_Y + 0.9, -2.2)));
  scene.add(tp);

  const r = rain(); scene.add(r); fx.push(r);
  return {
    fx, lights,
    update(t) { r.material.uniforms.uTime.value = t; refl.material.uniforms.uTime.value = t; updaters.forEach((u) => u(t)); },
  };
}
