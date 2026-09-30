// Interior lighting kit: tungsten practicals, window sky fill (RectAreaLight), warm sun shaft with a
// volumetric-looking beam + dust motes, analytic height haze, and a local environment capture.
// Port target: src/render/lighting.ts in the game repo.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { NOISE_GLSL } from './materials.js';

export const TUNGSTEN = new THREE.Color().setRGB(1.0, 0.62, 0.30);   // ~2400 K practical
export const TUNGSTEN_WARM = new THREE.Color().setRGB(1.0, 0.52, 0.20);
export const SKY = new THREE.Color().setRGB(0.55, 0.70, 0.95);
export const SUN = new THREE.Color().setRGB(1.0, 0.72, 0.42);

/** Replace three's fog with exponential height fog (denser near the floor / street). */
export function installHeightFog({ baseY = 0, falloff = 0.35 } = {}) {
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = `#ifdef USE_FOG\n varying float vFogDepth; varying vec3 vFogWorld;\n#endif`;
  C.fog_vertex = `#ifdef USE_FOG\n vFogDepth = -mvPosition.z; vFogWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif`;
  C.fog_pars_fragment = `#ifdef USE_FOG\n uniform vec3 fogColor; varying float vFogDepth; varying vec3 vFogWorld;\n uniform float fogDensity; uniform float fogNear; uniform float fogFar;\n#endif`;
  C.fog_fragment = `#ifdef USE_FOG
    vec3 ldRay = vFogWorld - cameraPosition; float ldDist = length(ldRay);
    float ldB = ${falloff.toFixed(4)};
    float ldH0 = cameraPosition.y - (${baseY.toFixed(3)});
    float ldDy = ldRay.y; float ldK = abs(ldDy) > 1e-3 ? (1.0 - exp(-ldB*ldDy)) / (ldB*ldDy) : 1.0;
    float ldAmt = fogDensity * exp(-ldB*ldH0) * ldK * ldDist;
    float fogFactor = 1.0 - exp(-max(ldAmt, 0.0));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
  #endif`;
}

function shadowSetup(light, size = 1024, bias = -0.0004, normalBias = 0.02) {
  light.castShadow = true;
  light.shadow.mapSize.set(size, size);
  light.shadow.bias = bias;
  light.shadow.normalBias = normalBias;
}

const emissive = (c, i) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i, toneMapped: false });

/** Green glass banker's lamp with a downward shadowed spot. */
export function bankersLamp(pos, rotY = 0, { intensity = 9, spill = 1.0 } = {}) {
  const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = rotY; g.name = 'ld_bankers_lamp';
  const brass = new THREE.MeshStandardMaterial({ color: 0x8a6a32, metalness: 0.9, roughness: 0.35 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.03, 24), brass); base.position.y = 0.015;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), brass); stem.position.y = 0.17;
  // half-cylinder green glass shade, axis along X, open side down
  const shadeGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.34, 24, 1, true, -Math.PI / 2, Math.PI);
  shadeGeo.rotateX(-Math.PI / 2); shadeGeo.rotateY(Math.PI / 2);
  const shadeOuter = new THREE.MeshPhysicalMaterial({ color: 0x0a3f1c, roughness: 0.15, clearcoat: 1, emissive: 0x0c4a20, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const shade = new THREE.Mesh(shadeGeo, shadeOuter); shade.position.set(0, 0.34, 0.03);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), emissive(TUNGSTEN, 5)); inner.rotation.x = Math.PI / 2; inner.position.set(0, 0.335, 0.03);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6), brass); arm.position.set(0, 0.36, 0.0); arm.rotation.x = Math.PI / 2;
  g.add(arm);
  [base, stem, shade].forEach((m) => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
  g.add(inner);
  const spot = new THREE.SpotLight(TUNGSTEN, intensity, 6, Math.PI * 0.42, 0.75, 2);
  spot.position.set(0, 0.32, 0.03); spot.target.position.set(0, -1, 0.2);
  shadowSetup(spot, 1024, -0.0006, 0.015); spot.shadow.camera.near = 0.05;
  g.add(spot, spot.target);
  // soft glow bleeding out of the shade onto the face in front of the desk
  const spillL = new THREE.PointLight(TUNGSTEN, spill, 3.5, 2); spillL.position.set(0, 0.28, 0.12); g.add(spillL);
  g.userData.lights = [spot, spillL];
  return g;
}

/** Pendant with a pleated fabric shade; spot down (shadowed) + point for the ceiling bounce. */
export function pendant(pos, { intensity = 22, shadeColor = 0xd9b98a, drop = 0.7, shadow = true } = {}) {
  const g = new THREE.Group(); g.position.copy(pos); g.name = 'ld_pendant';
  const flex = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, drop, 6), new THREE.MeshStandardMaterial({ color: 0x1b140e }));
  flex.position.y = drop / 2; g.add(flex);
  const shadeMat = new THREE.MeshStandardMaterial({ color: shadeColor, roughness: 0.9, side: THREE.DoubleSide, emissive: TUNGSTEN, emissiveIntensity: 0.55 });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, 0.26, 32, 1, true), shadeMat);
  shade.castShadow = false; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), emissive(TUNGSTEN, 30)); bulb.position.y = -0.04; g.add(bulb);
  const spot = new THREE.SpotLight(TUNGSTEN, intensity, 9, Math.PI * 0.36, 0.6, 2);
  spot.position.set(0, -0.02, 0); spot.target.position.set(0, -2, 0);
  if (shadow) { shadowSetup(spot, 1024, -0.0005, 0.02); spot.shadow.camera.near = 0.1; }
  g.add(spot, spot.target);
  const up = new THREE.PointLight(TUNGSTEN, intensity * 0.18, 5, 2); up.position.y = 0.05; g.add(up);
  g.userData.lights = [spot, up];
  return g;
}

/** Standard lamp: turned brass pole, fringed cream drum shade glowing from inside. */
export function standardLamp(pos, { intensity = 6 } = {}) {
  const g = new THREE.Group(); g.position.copy(pos); g.name = 'ld_standard_lamp';
  const brass = new THREE.MeshStandardMaterial({ color: 0x6e5226, metalness: 0.85, roughness: 0.45 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.05, 24), brass); base.position.y = 0.025; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.45, 10), brass); pole.position.y = 0.75; g.add(pole);
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf2dcae, emissive: new THREE.Color(1.0, 0.68, 0.36), emissiveIntensity: 2.4, side: THREE.DoubleSide, roughness: 1 });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.32, 32, 1, true), shadeMat); shade.position.y = 1.62; g.add(shade);
  const fringe = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.285, 0.05, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xd9bb88, emissive: new THREE.Color(1.0, 0.62, 0.3), emissiveIntensity: 1.2, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  fringe.position.y = 1.44; g.add(fringe);
  [base, pole].forEach((m) => (m.castShadow = true));
  const light = new THREE.PointLight(TUNGSTEN_WARM, intensity, 7, 2); light.position.y = 1.6; g.add(light);
  const down = new THREE.SpotLight(TUNGSTEN_WARM, intensity * 1.5, 6, Math.PI * 0.3, 0.8, 2); down.position.y = 1.5; down.target.position.set(0, -1, 0); g.add(down, down.target);
  g.userData.lights = [light, down];
  return g;
}

/** Wall sconce: tulip glass shade, warm pool on the wall behind. */
export function sconce(pos, facing = new THREE.Vector3(0, 0, -1), { intensity = 2.5 } = {}) {
  const g = new THREE.Group(); g.position.copy(pos); g.name = 'ld_sconce';
  const brass = new THREE.MeshStandardMaterial({ color: 0x7a5a28, metalness: 0.9, roughness: 0.4 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), brass); plate.rotation.x = Math.PI / 2; g.add(plate);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), brass); arm.rotation.x = Math.PI / 2; arm.position.z = 0.08; g.add(arm);
  const tulip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
    new THREE.MeshStandardMaterial({ color: 0xf0d8a8, emissive: TUNGSTEN, emissiveIntensity: 3.5, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
  tulip.position.set(0, 0.04, 0.16); g.add(tulip);
  g.lookAt(pos.clone().add(facing)); // local +Z points out of the wall
  const light = new THREE.PointLight(TUNGSTEN, intensity, 4.5, 2); light.position.set(0, 0.06, 0.16); g.add(light);
  g.userData.lights = [light];
  return g;
}

/** Parlour table lamp: fringed drum shade glowing, unshadowed point. */
export function tableLamp(pos, { intensity = 5, h = 0.55 } = {}) {
  const g = new THREE.Group(); g.position.copy(pos); g.name = 'ld_table_lamp';
  const ceramic = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), ceramic); body.scale.y = 1.3; body.position.y = 0.12; g.add(body);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.22, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe8c690, emissive: TUNGSTEN_WARM, emissiveIntensity: 1.6, side: THREE.DoubleSide, roughness: 1 }));
  shade.position.y = h - 0.12; g.add(shade);
  const light = new THREE.PointLight(TUNGSTEN_WARM, intensity, 6, 2); light.position.y = h - 0.14; g.add(light);
  g.userData.lights = [light];
  return g;
}

/** A blown-out daylight window: sky RectAreaLight inward + bright backdrop plate outside. */
export function windowFill(center, width, height, { intensity = 3.0, color = SKY, facing = new THREE.Vector3(0, 0, 1), plate = true } = {}) {
  const g = new THREE.Group(); g.name = 'ld_window_fill';
  const ra = new THREE.RectAreaLight(color, intensity, width, height);
  ra.position.copy(center).addScaledVector(facing, 0.02);
  ra.lookAt(center.clone().add(facing));
  g.add(ra);
  if (plate) {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.93, 0.80).multiplyScalar(3.2), toneMapped: false, fog: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(width * 3, height * 2.2), m);
    p.position.copy(center).addScaledVector(facing, -1.6); p.lookAt(center);
    g.add(p);
  }
  g.userData.lights = [ra];
  return g;
}

/** Warm directional sun with a tight shadow frustum around a room. */
export function sunLight(dir, target, { intensity = 6, extent = 6 } = {}) {
  const s = new THREE.DirectionalLight(SUN, intensity);
  s.position.copy(target).addScaledVector(dir, -12);
  s.target.position.copy(target);
  shadowSetup(s, 2048, -0.0003, 0.03);
  Object.assign(s.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: 30 });
  return s;
}

/**
 * Light shaft through a window: the window rectangle extruded along the sun direction, shaded
 * additively with soft edges, length falloff, animated noise. Cheap fake of volumetric scattering.
 */
export function sunBeam({ corners, dir, length = 5, color = SUN, strength = 0.22 }) {
  // corners: 4 world points of the window (bl, br, tr, tl)
  const d = dir.clone().normalize();
  const pos = [];
  const far = corners.map((c) => c.clone().addScaledVector(d, length));
  const quad = (a, b, c, e) => pos.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...e.toArray());
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(corners[i], corners[j], far[j], far[i]); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const o = corners[0]; const ax = corners[1].clone().sub(o); const ay = corners[3].clone().sub(o);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uO: { value: o }, uAx: { value: ax }, uAy: { value: ay }, uD: { value: d }, uLen: { value: length },
      uColor: { value: color.clone().multiplyScalar(strength) }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: NOISE_GLSL + `
      uniform vec3 uO, uAx, uAy, uD, uColor; uniform float uLen, uTime; varying vec3 vW;
      // march the view ray through the slab, accumulate soft-edged density
      void main(){
        vec3 ro = cameraPosition; vec3 rd = normalize(vW - ro);
        float tEnd = length(vW - ro);
        float acc = 0.0; const int N = 24;
        float t0 = tEnd; float t1 = tEnd + 4.0;
        for(int i=0;i<N;i++){
          float t = mix(t0, t1, (float(i)+0.5)/float(N));
          vec3 p = ro + rd*t;
          // project p back along the sun direction onto the window plane
          vec3 n = normalize(cross(uAx, uAy));
          float s = dot(p - uO, n) / dot(uD, n);
          if (s < 0.0 || s > uLen) continue;
          vec3 q = p - uD*s - uO;
          float u = dot(q, uAx)/dot(uAx,uAx), v = dot(q, uAy)/dot(uAy,uAy);
          float edge = smoothstep(0.0, 0.08, u)*smoothstep(1.0, 0.92, u)*smoothstep(0.0, 0.06, v)*smoothstep(1.0, 0.94, v);
          // window mullions (vertical centre bar, horizontal meeting rail)
          edge *= 1.0 - 0.85*exp(-pow((v-0.51)*38.0, 2.0));
          float fall = exp(-s*0.35) * smoothstep(0.0, 0.3, s);
          float dust = 0.55 + 0.9*ld_fbm(p*2.2 + vec3(0.0, uTime*0.05, uTime*0.03));
          acc += edge*fall*dust;
        }
        acc *= (t1 - t0)/float(N);
        gl_FragColor = vec4(uColor*acc, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, side: THREE.DoubleSide, fog: false,
  });
  const m = new THREE.Mesh(geo, mat); m.name = 'ld_sun_beam'; m.frustumCulled = false; m.renderOrder = 10;
  m.userData.fx = true;
  return m;
}

/** Floating dust motes: bright inside the beam, faint outside. */
export function dustMotes({ corners, dir, length = 5, count = 900, spread = 0.25 }) {
  const d = dir.clone().normalize();
  const o = corners[0]; const ax = corners[1].clone().sub(o); const ay = corners[3].clone().sub(o);
  const P = new Float32Array(count * 3); const R = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = -spread + Math.random() * (1 + 2 * spread), v = -spread + Math.random() * (1 + 2 * spread), s = Math.random() * length;
    const p = o.clone().addScaledVector(ax, u).addScaledVector(ay, v).addScaledVector(d, s);
    P.set(p.toArray(), i * 3); R[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(R, 1));
  const n = new THREE.Vector3().crossVectors(ax, ay).normalize();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uO: { value: o }, uAx: { value: ax }, uAy: { value: ay }, uD: { value: d }, uN: { value: n }, uLen: { value: length }, uColor: { value: SUN.clone().multiplyScalar(2.2) }, uScale: { value: 1080 } },
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
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const pts = new THREE.Points(geo, mat); pts.name = 'ld_dust'; pts.frustumCulled = false; pts.userData.fx = true;
  return pts;
}

/** Bake a local light probe: cube capture at `pos` -> PMREM -> scene.environment. Two bounces. */
export function captureEnvironment(renderer, scene, pos, { bounces = 2, intensity = 1.0, hide = [] } = {}) {
  const rt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
  const cam = new THREE.CubeCamera(0.05, 60, rt);
  cam.position.copy(pos);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let env = null;
  hide.forEach((o) => (o.visible = false));
  for (let b = 0; b < bounces; b++) {
    cam.update(renderer, scene);
    const next = pmrem.fromCubemap(rt.texture);
    if (env) env.dispose();
    env = next;
    scene.environment = env.texture;
    scene.environmentIntensity = intensity;
  }
  hide.forEach((o) => (o.visible = true));
  pmrem.dispose();
  return env.texture;
}

export function initAreaLights() { RectAreaLightUniformsLib.init(); }
