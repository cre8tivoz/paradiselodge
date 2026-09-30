// Look-dev harness: ?shot=<name> for stills, ?shot=walk for the walkthrough.
// Exposes window.__ready, __renderFrame(n) -> PNG dataURL, __bench() -> per-effect timings.
import * as THREE from 'three';
import { installHeightFog, captureEnvironment, initAreaLights } from './lighting.js';
import { buildPost, GRADES } from './post.js';
import { SHOTS, walkCamera, WALK_DURATION } from './shots.js';

const q = new URLSearchParams(location.search);
const shot = q.get('shot') || 'reception-rosie';
const W = +(q.get('w') || 1920), H = +(q.get('h') || 1080);
const FPS = +(q.get('fps') || 30);
const exterior = shot.startsWith('exterior');
const flag = (k, d = true) => (q.has(k) ? q.get(k) !== '0' : d);

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;          // film pass owns the tone curve
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
initAreaLights();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, exterior ? 400 : 60);
let world, grade;

const gameLook = q.get('look') === 'game' && !exterior;
if (gameLook) {
  const { buildGameLook } = await import('./gamelook.js');
  world = await buildGameLook(scene, renderer);
  grade = { ...GRADES.interior };
} else if (exterior) {
  installHeightFog({ baseY: -0.85, falloff: 0.12 });
  const { buildExterior } = await import('./exterior.js');
  world = await buildExterior(scene, renderer);
  grade = { ...GRADES.exterior };
} else {
  installHeightFog({ baseY: 0.0, falloff: 0.55 });
  scene.fog = new THREE.FogExp2(new THREE.Color(0.20, 0.13, 0.07), 0.02);
  scene.background = new THREE.Color(0x000000);
  const { buildInterior } = await import('./interior.js');
  world = await buildInterior(scene, { rosie: q.get('rosie'), rigUrl: q.get('rig') });
  grade = { ...GRADES.interior };
}
['exposure', 'contrast', 'saturation', 'vignette', 'grain', 'ca', 'bloomStrength'].forEach((k) => { if (q.has(k)) grade[k] = +q.get(k); });

function placeCamera(t) {
  if (shot === 'walk') { camera.fov = 55; walkCamera(t, camera); }
  else {
    const s = SHOTS[shot]; camera.fov = s.fov; camera.position.copy(s.pos);
    // ?push=<metres>&pushdur=<s>: slow dolly toward the target over the clip (t starts at 2.0)
    if (q.has('push')) { const k = THREE.MathUtils.smoothstep(Math.min(1, Math.max(0, (t - 2.0) / +(q.get('pushdur') || 7))), 0, 1); camera.position.add(s.target.clone().sub(s.pos).normalize().multiplyScalar(+q.get('push') * k)); }
    camera.lookAt(s.target);
  }
  camera.updateProjectionMatrix();
}
placeCamera(0);
if (q.get('debug') === 'sunonly') scene.traverse((o) => { if (o.isLight && !o.isDirectionalLight) o.intensity = 0; });
if (q.has('cam')) { const c = q.get('cam').split(',').map(Number); SHOTS[shot].pos.set(c[0], c[1], c[2]); SHOTS[shot].target.set(c[3], c[4], c[5]); placeCamera(0); }

// wait for textures
await new Promise((r) => { const m = THREE.DefaultLoadingManager; if (!m.itemsLoading) return setTimeout(r, 300); const iv = setInterval(() => { if (m.itemsLoaded >= m.itemsTotal) { clearInterval(iv); r(); } }, 100); setTimeout(r, 15000); });
await new Promise((r) => setTimeout(r, 500));

// local environment capture instead of the open-sky HDRI
if (!exterior && !gameLook && flag('probe')) {
  const probePos = shot === 'walk' ? new THREE.Vector3(1.4, 1.6, 2.4) : SHOTS[shot].probe;
  world.update(0, camera);
  captureEnvironment(renderer, scene, probePos, { bounces: 2, intensity: +(q.get('env') || 0.5), hide: world.fx });
}

const dof = shot !== 'walk' && flag('dof', false) && SHOTS[shot]?.dof;
const post = buildPost(renderer, scene, camera, { width: W, height: H, grade, ao: flag('ao'), bloom: flag('bloom'), dof, getFx: () => world.fx });

function frame(t) {
  placeCamera(t);
  world.update(t, camera);
  post.setTime(t);
  if (gameLook) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.85; renderer.render(scene, camera); }
  else if (flag('post')) post.composer.render(); else { renderer.toneMapping = THREE.AgXToneMapping; renderer.render(scene, camera); }
}

window.__renderFrame = async (n) => { const t = shot === 'walk' ? n / FPS : 2.0 + n / FPS; frame(t); return renderer.domElement.toDataURL('image/png'); };
window.__frames = shot === 'walk' ? Math.round(WALK_DURATION * FPS) : 1;

/** Rough per-effect cost: time N frames with each stage toggled (gl.finish via readPixels). */
window.__bench = async (n = 3) => {
  const gl = renderer.getContext(); const px = new Uint8Array(4);
  const time = (fn) => { fn(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t0 = performance.now(); for (let i = 0; i < n; i++) { fn(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return (performance.now() - t0) / n; };
  const P = post.passes; const res = {};
  const setAll = (on) => Object.values(P).forEach((p) => (p.enabled = on));
  setAll(true); res.full = time(() => frame(2));
  if (P.gtao) { P.gtao.enabled = false; res.noAO = time(() => frame(2)); P.gtao.enabled = true; }
  if (P.bloom) { P.bloom.enabled = false; res.noBloom = time(() => frame(2)); P.bloom.enabled = true; }
  if (P.dof) { P.dof.enabled = false; res.noDoF = time(() => frame(2)); P.dof.enabled = true; }
  P.film.enabled = false; res.noFilm = time(() => frame(2)); P.film.enabled = true;
  const sm = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false; res.staticShadows = time(() => frame(2)); renderer.shadowMap.autoUpdate = sm;
  res.rawRender = time(() => { placeCamera(2); world.update(2, camera); renderer.render(scene, camera); });
  const sceneInfo = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
  const fxv = world.fx.map((o) => o.visible); world.fx.forEach((o) => { if (!o.userData.view) o.visible = false; }); res.noBeamsDust = time(() => frame(2)); world.fx.forEach((o, i) => (o.visible = fxv[i]));
  res.info = { ...sceneInfo, W, H, programs: renderer.info.programs.length, lights: (() => { let c = 0; scene.traverse((o) => { if (o.isLight) c++; }); return c; })(), shadowLights: (() => { let c = 0; scene.traverse((o) => { if (o.isLight && o.castShadow) c++; }); return c; })() };
  return res;
};
frame(2.0);
window.__ready = true;
