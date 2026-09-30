// Builds the reception / hall / parlour look-test scene from the game's own unit-a.glb.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { wallMaterial, ceilingMaterial, darkWoodMaterial, floorMaterial, ageMaterial, upholsteryMaterial } from './materials.js';
import { bankersLamp, pendant, tableLamp, sconce, standardLamp, windowFill, sunLight, sunBeam, dustMotes, SKY, TUNGSTEN_WARM } from './lighting.js';
import { papers, cigarettes, keysInRack, crt, curtain, frontDoorWall, frostedWindow } from './dressing.js';
import { photoCharacter } from './billboard.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export async function buildInterior(scene, opts = {}) {
  const gltf = await new GLTFLoader().loadAsync('./assets/unit-a.glb');
  const root = gltf.scene; scene.add(root);
  const M = {
    wall: wallMaterial(), ceiling: ceilingMaterial(), wood: darkWoodMaterial({ shine: 0.42 }),
    floor: floorMaterial(), panel: darkWoodMaterial({ shine: 0.6 }), fabric: upholsteryMaterial(),
  };
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.08, depthWrite: false });
  const byName = {};
  root.traverse((o) => {
    if (o.name) byName[o.name] = o;
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m) => {
      const n = m.name;
      if (n === 'plaster_nicotine' || n === 'wallpaper') return M.wall;
      if (n === 'plaster_cornice' || n === 'plaster') return M.ceiling;
      if (n === 'timber_dark' || n === 'timber') return M.wood;
      if (n === 'boards_worn' || n === 'floorboards') return M.floor;
      if (n === 'unit_a_glass' || n === 'glass') { o.castShadow = false; return glass; }
      if (n === 'unit_a_parlour_upholstery' || n === 'DefaultMaterial') return M.fabric;
      if (n.startsWith('carpet')) { ageMaterial(m, [1.0, 0.7, 0.5], 0.95); return m; }
      if (n === 'unit_a_brass_verdigris') { ageMaterial(m, [0.9, 0.75, 0.5], 0.4); return m; }
      ageMaterial(m, [0.92, 0.82, 0.66]);
      if (m.lightMap) m.lightMap = null;
      return m;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
  // staircase / hall walls use their own material names in some builds: force by node name
  root.traverse((o) => { if (o.isMesh && /staircase_wall|hall_wall/.test(o.name)) o.material = M.wall; });
  byName.desk?.traverse((o) => { if (o.isMesh) o.material = M.panel; });

  scene.add(frontDoorWall({ wall: M.wall, wood: M.wood, panel: M.panel }));

  const fx = [];
  const lights = [];
  const updaters = [];

  // ---------- reception ----------
  const desk = bankersLamp(V(4.9, 1.14, 2.42), 0, { intensity: 7, spill: 2.2 }); scene.add(desk); lights.push(...desk.userData.lights);
  const pend = pendant(V(4.35, 2.5, 2.1), { intensity: 8, drop: 0.7 }); scene.add(pend); lights.push(...pend.userData.lights);
  for (const x of [2.25, 5.75]) { const sc = sconce(V(x, 2.05, 5.03), V(0, 0, -1), { intensity: 2.2 }); scene.add(sc); lights.push(...sc.userData.lights); }
  scene.add(papers(V(4.35, 1.2, 2.35), 3, 3));             // loose sheets on the ledger side
  scene.add(papers(V(5.35, 1.14, 2.5), 5, 11));
  scene.add(cigarettes(V(3.65, 1.14, 2.28), 5));
  scene.add(keysInRack(new THREE.Box3(V(2.62, 1.37, 4.78), V(5.18, 2.48, 5.0)), 10, 4));
  const tv = crt(V(6.05, 0.0, 3.9), -Math.PI / 2 + 0.35); tv.position.y = 0.72; scene.add(tv); updaters.push(tv.userData.update);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.45), M.wood); cab.position.set(6.05, 0.36, 3.9); cab.castShadow = cab.receiveShadow = true; scene.add(cab);
  // reception window: nets + heavy drapes, sky fill, sun
  const rw = { x0: 2.55, x1: 3.65, y0: 0.95, y1: 2.75, z: -0.06 };
  const net = curtain({ width: 1.0, height: 1.72, folds: 14, depth: 0.012, sheer: true }); net.position.set(3.1, 0.99, 0.02); scene.add(net);
  for (const [x, flip] of [[2.3, 1], [3.9, -1]]) {
    const d = curtain({ width: 0.55, height: 2.5, folds: 5, depth: 0.05, color: 0x4a1410 }); d.position.set(x, 0.3, 0.1); scene.add(d);
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.1, 8), new THREE.MeshStandardMaterial({ color: 0x6a4a20, metalness: 0.8, roughness: 0.4 }));
  rail.rotation.z = Math.PI / 2; rail.position.set(3.1, 2.82, 0.12); scene.add(rail);
  const recWin = windowFill(V(3.1, 1.85, rw.z), 1.1, 1.8, { intensity: 2.2, color: SKY }); scene.add(recWin); lights.push(...recWin.userData.lights);

  // ---------- sun through the reception + parlour windows ----------
  const sunDir = V(0.12, -0.5, 1.0).normalize();
  const sun = sunLight(sunDir, V(0.5, 0.5, 2.5), { intensity: 7.5, extent: 8 }); scene.add(sun, sun.target); lights.push(sun);
  const winCorners = (x0, x1, y0, y1, z) => [V(x0, y0, z), V(x1, y0, z), V(x1, y1, z), V(x0, y1, z)];
  const beamR = sunBeam({ corners: winCorners(2.63, 3.57, 1.01, 2.68, -0.02), dir: sunDir, length: 4.2, strength: +(new URLSearchParams(location.search).get('beam') || 0.35) });
  const dustR = dustMotes({ corners: winCorners(2.63, 3.57, 1.01, 2.68, -0.02), dir: sunDir, length: 4.2, count: 1100 });
  scene.add(beamR, dustR); fx.push(beamR, dustR);

  // ---------- hall ----------
  const hallP = pendant(V(0.15, 2.55, 3.6), { intensity: 14, drop: 0.65 });
  for (const z of [6.6]) { const sc = sconce(V(1.6, 2.3, z), V(-1, 0, 0), { intensity: 2.5 }); scene.add(sc); lights.push(...sc.userData.lights); }
  { const sc = sconce(V(-1.0, 5.2, 10.47), V(0, 0, -1), { intensity: 3 }); scene.add(sc); lights.push(...sc.userData.lights); } scene.add(hallP); lights.push(...hallP.userData.lights);
  const hallP2 = pendant(V(-0.6, 5.75, 8.6), { intensity: 9, drop: 0.6, shadow: false }); scene.add(hallP2); lights.push(...hallP2.userData.lights);
  const doorFill = windowFill(V(0, 1.2, -0.1), 1.15, 2.1, { intensity: 1.6, color: new THREE.Color(1.0, 0.86, 0.66), plate: false }); scene.add(doorFill);
  const landingWin = windowFill(V(-1.0, 4.9, 10.48), 0.9, 1.4, { intensity: 2.5, color: SKY, facing: V(0, 0, -1) }); scene.add(landingWin);
  const rearWin = frostedWindow(V(0.75, 1.75, 10.47), 0.75, 1.3, V(0, 0, -1), M.wood, { glow: 2.2, light: 4 }); scene.add(rearWin);
  const beamD = sunBeam({ corners: winCorners(-0.55, 0.55, 0.05, 2.15, -0.1), dir: sunDir, length: 4.5, strength: 0.07 });
  const dustD = dustMotes({ corners: winCorners(-0.55, 0.55, 0.05, 2.15, -0.1), dir: sunDir, length: 4.5, count: 500 });
  scene.add(beamD, dustD); fx.push(beamD, dustD);

  // ---------- parlour ----------
  if (byName.standardLamp) byName.standardLamp.visible = false;   // replaced by a code lamp with a glowing fringed shade
  const stdL = standardLamp(V(-6.0, 0, 1.65), { intensity: 8 }); scene.add(stdL); lights.push(...stdL.userData.lights);
  const tl = tableLamp(V(-4.0, 0.48, 2.2), { intensity: 3.2 }); scene.add(tl); lights.push(...tl.userData.lights);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshStandardMaterial({ color: 0, emissive: new THREE.Color(0.5, 0.72, 1.0), emissiveIntensity: 2.0, toneMapped: false }));
  scr.position.set(-5.51, 0.6, 2.78); scr.rotation.y = Math.PI / 2; scene.add(scr);
  const tvLight = new THREE.PointLight(new THREE.Color(0.5, 0.7, 1.0), 0.9, 4, 2); tvLight.position.set(-5.2, 0.75, 2.55); scene.add(tvLight);
  updaters.push((t) => { const f = 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 2.9); scr.material.emissiveIntensity = 2.0 * f; tvLight.intensity = 0.9 * f; });
  for (const [x0, x1] of [[-5.9, -4.8], [-3.6, -2.5]]) {
    const cx = (x0 + x1) / 2;
    const n2 = curtain({ width: 1.0, height: 1.72, folds: 14, depth: 0.012, sheer: true }); n2.position.set(cx, 0.99, 0.02); scene.add(n2);
    // heavy velvet drapes drawn almost closed; a hand-width gap lets a blade of sun in
    for (const dx of [-0.36, 0.36]) { const d = curtain({ width: 0.66, height: 2.52, folds: 7, depth: 0.045, color: 0x4a1210 }); d.position.set(cx + dx + Math.sign(dx) * 0.06, 0.28, 0.12); scene.add(d); }
    const wf = windowFill(V(cx, 1.85, -0.06), 0.14, 1.7, { intensity: 3, color: SKY }); scene.add(wf);
    const b = sunBeam({ corners: winCorners(cx - 0.05, cx + 0.07, 1.01, 2.68, -0.02), dir: sunDir, length: 4.0, strength: 0.5 });
    const dm = dustMotes({ corners: winCorners(cx - 0.05, cx + 0.07, 1.01, 2.68, -0.02), dir: sunDir, length: 4.0, count: 200 });
    scene.add(b, dm); fx.push(b, dm);
  }

  // ---------- Rosie ----------
  const rosie = photoCharacter({ name: 'rosie', position: V(4.2, 0, 3.0), facing: 0, height: 1.64 });
  scene.add(rosie); fx.push(...Object.values(rosie.userData.planes));
  // phase 2: ?rosie=3d swaps the billboard for the baked 3D model, ?rosie=both stands them side by side
  if (opts.rosie === 'rigged') {   // Mixamo-rigged v2 Rosie, idle loop, at the v2 spot by the lamp facing the camera
    const { characterRigged } = await import('./character_rigged.js');
    const rr = await characterRigged({ url: opts.rigUrl || './mixamo/rosie-idle.fbx', position: V(4.5, 0, 2.9), yaw: 2.91, height: 1.65 });
    scene.add(rr); fx.push(...rr.userData.fx); updaters.push((t) => rr.userData.update(t));
    console.log('rosie rigged tris', rr.userData.tris, 'kinds', rr.userData.kinds.join(','), 'reattached', rr.userData.reattached.join(',') || 'none',
      'clips', rr.userData.clips.map((c) => c.name + ':' + c.duration.toFixed(2)).join(','), 'head', rr.userData.head?.name, 'rhand', rr.userData.rhand?.name);
    rosie.visible = false;
  }
  if (opts.rosie === '3dv2') {   // v2: A-pose model with arms lowered for the shot, stood nearer the desk lamp
    const { character3d } = await import('./character3d.js');
    const r3 = await character3d({ url: './assets/rosie3d-v2-armsdown.glb', position: V(4.5, 0, 2.9), yaw: 2.91 });
    scene.add(r3); fx.push(...r3.userData.fx); console.log('rosie3d v2 tris', r3.userData.tris, 'fx', r3.userData.fx.length);
    rosie.visible = false;
  }
  if (opts.rosie === '3d' || opts.rosie === 'both') {
    const { character3d } = await import('./character3d.js');
    const r3 = await character3d({ position: opts.rosie === '3d' ? V(4.2, 0, 3.0) : V(3.45, 0, 3.05), yaw: Math.PI + (opts.rosie === 'both' ? 0.25 : 0) });
    scene.add(r3); console.log('rosie3d tris', r3.userData.tris);
    if (opts.rosie === '3d') { rosie.visible = false; Object.values(rosie.userData.planes).forEach((p) => (p.userData.hidden = true)); }
  }

  return {
    root, fx, lights, rosie, byName,
    update(t, camera) {
      rosie.userData.update(camera);
      updaters.forEach((u) => u(t));
      fx.forEach((o) => { if (o.material?.uniforms?.uTime) o.material.uniforms.uTime.value = t; });
    },
  };
}
