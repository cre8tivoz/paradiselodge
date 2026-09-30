// "Before" reference: rebuilds the CURRENT game look for Unit A as faithfully as the repo code allows,
// so before/after sheets can use identical cameras. Mirrors ref/src/world/unit-a.ts (lightmaps x14 on uv1),
// ref/src/render/lighting.ts (single 3pm sun 4.2, 4096 shadow) and ref/src/render/environment.ts
// (balcony_2k.hdr, envIntensity 0.3, yaw 0.62*PI) with ACES @ 0.85 exposure (core/config.ts). No post.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const SPACES = ['room1a', 'parlour', 'reception', 'staircase', 'hallway'];
function spaceOf(o) {
  for (let n = o; n; n = n.parent) {
    const t = n.userData?.unit_a_space; if (SPACES.includes(t)) return t;
    if (n.name.startsWith('reception_')) return 'reception';
    if (n.name.startsWith('parlour_')) return 'parlour';
    if (n.name.startsWith('staircase_')) return 'staircase';
    if (n.name.startsWith('first_floor_hall_')) return 'hallway';
  }
}

export async function buildGameLook(scene, renderer) {
  const [gltf, hdr, ...lms] = await Promise.all([
    new GLTFLoader().loadAsync('./assets/unit-a.glb'),
    new RGBELoader().loadAsync('./assets/env/balcony_2k.hdr'),
    ...SPACES.map((s) => new EXRLoader().loadAsync(`./assets/bake/unit-a_${s}.exr`)),
  ]);
  const maps = {}; SPACES.forEach((s, i) => { const m = lms[i]; m.colorSpace = THREE.NoColorSpace; m.channel = 1; m.flipY = true; m.needsUpdate = true; maps[s] = m; });
  const cache = new Map();
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
    const s = spaceOf(o); if (!s || !o.geometry.getAttribute('uv1') || !o.material.isMeshStandardMaterial) return;
    const k = o.material.uuid + s; let m = cache.get(k);
    if (!m) { m = o.material.clone(); m.lightMap = maps[s]; m.lightMapIntensity = 14; cache.set(k, m); }
    o.material = m;
  });
  console.log('gamelook lightmapped materials', cache.size, 'lm0', lms[2].image.width, lms[2].image.height);
  scene.add(gltf.scene);

  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(hdr).texture;
  scene.background = hdr; scene.environmentIntensity = 0.3; scene.environmentRotation.set(0, Math.PI * 0.62, 0); scene.backgroundRotation.set(0, Math.PI * 0.62, 0);

  const FOCUS = new THREE.Vector3(0, 1.8, 4.4), DIR = new THREE.Vector3(-0.847, -0.365, 0.4).normalize();
  const sun = new THREE.DirectionalLight(0xffe0b0, 4.2);
  sun.position.copy(FOCUS).addScaledVector(DIR, -26); sun.target.position.copy(FOCUS);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 2, far: 58 });
  sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  return { fx: [], update() {} };
}
